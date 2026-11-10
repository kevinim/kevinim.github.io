#!/usr/bin/env python3
"""Denton 2026-27 GeoPDF STAGING: independent boundary-margin/sensitivity QA.

No district-native GIS or reuse permission inferred. Does NOT publish geometry,
geocode private homes, approve residential assignments, or turn on main map zones.
"""
import json
import math
from pathlib import Path
from shapely.geometry import shape, Point
from shapely.ops import transform
from pyproj import Transformer

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"artifacts/denton-geopdf-derived"
TO_UTM=Transformer.from_crs("EPSG:4326","EPSG:26914",always_xy=True).transform
LEVELS=(("elementary",26),("middle",9),("high",4))
MAX_AUDIT_POLYGONS=39

def source_guard(data,level,expected):
    assert data.get("type")=="FeatureCollection"
    assert len(data.get("features",[]))==expected,(level,len(data.get("features",[])))
    meta=data.get("metadata") or {}
    assert meta.get("productionStatus")=="NO_GO"
    assert meta.get("officialGIS") is False
    assert meta.get("reuseAndRedistributionPermissionVerified") is False
    assert meta.get("originalDistrictGISReceived") is False
    ids=set()
    rows=[]
    for f in data["features"]:
        p=f.get("properties") or {}
        assert p.get("level")==level
        assert p.get("approvedForProduction") is False
        assert p.get("reusePermissionVerified") is False
        assert p.get("officialOriginalGIS") is False
        assert p.get("schoolYear")=="2026-27"
        sid=p.get("campusId")
        assert isinstance(sid,str) and sid.startswith("061901") and len(sid)==9
        assert sid not in ids
        ids.add(sid)
        geom=shape(f["geometry"])
        assert geom.is_valid and not geom.is_empty and geom.geom_type in ("Polygon","MultiPolygon")
        gm=transform(TO_UTM,geom)
        rows.append((sid,gm))
    return rows

def edge_sensitivity(geometry,steps=(3.0,30.0)):
    """Synthetic offsets along extracted boundary, not address observations."""
    polys=list(geometry.geoms) if geometry.geom_type=="MultiPolygon" else [geometry]
    samples=0
    two_sided_inside=0
    two_sided_outside=0
    count_by_step={str(int(step))+"m":0 for step in steps}
    # Every detached polygon >100 sq.m, no arbitrary one-part-only assumption.
    for poly in polys:
        if poly.area<100:continue
        ring=poly.exterior
        length=ring.length
        if length<=15:continue
        for fraction in (0.07,0.2,0.33,0.47,0.61,0.74,0.88):
            location=length*fraction
            ahead=ring.interpolate(min(length,location+0.5))
            behind=ring.interpolate(max(0,location-0.5))
            dx=ahead.x-behind.x;dy=ahead.y-behind.y
            norm=math.hypot(dx,dy)
            if norm<0.01:continue
            normal_x=-dy/norm;normal_y=dx/norm
            pt=ring.interpolate(location)
            for step in steps:
                a=Point(pt.x+normal_x*step,pt.y+normal_y*step)
                b=Point(pt.x-normal_x*step,pt.y-normal_y*step)
                inside_a=poly.covers(a);inside_b=poly.covers(b)
                samples+=1
                count_by_step[str(int(step))+"m"]+=1
                if inside_a and inside_b:two_sided_inside+=1
                if not inside_a and not inside_b:two_sided_outside+=1
    return {"syntheticEdgeOffsetChecks":samples,
      "bothSidesInside":two_sided_inside,"bothSidesOutside":two_sided_outside,
      "stepsMeters":list(steps),"countsByStep":count_by_step}

def classify_margin(distance_m):
    if distance_m is None:return "SOURCE_POINT_UNAVAILABLE"
    if distance_m<25:return "EDGE_ADJACENT_STRICT_HOLD"
    if distance_m<100:return "NEAR_EDGE_REVIEW_HOLD"
    if distance_m<250:return "STREET_INTERIOR_NONPARCEL_CHECK_ONLY"
    return "STREET_FAR_INTERIOR_NONPARCEL_CHECK_ONLY"

def analyze(out=ART):
    layers={}
    scan=[]
    for level,count in LEVELS:
        file=out/(level+"-2026-27-geopdf-derived-STAGING.geojson")
        parsed=json.loads(file.read_text())
        rows=source_guard(parsed,level,count)
        layers[level]=dict(rows)
        summary={"level":level,"campuses":count,"syntheticEdgeOffsetChecks":0,
         "bothSidesInside":0,"bothSidesOutside":0,"droppedTinyIslands":0}
        for campus_id,geom in rows:
            m=edge_sensitivity(geom)
            for key in ("syntheticEdgeOffsetChecks","bothSidesInside","bothSidesOutside"):
                summary[key]+=m[key]
        scan.append(summary)
    assert sum(len(x) for x in layers.values())==39
    census=json.loads((out/"census-street-holdout-report.json").read_text())
    assert census.get("samples")==3 and census.get("grades")==9
    results=[]
    for location in census["results"]:
        pt=location.get("censusGeocoder") or {}
        if pt.get("status")=="CENSUS_STREET_GEOCODE_MATCH":
            xy=transform(TO_UTM,Point(pt["x"],pt["y"]))
        else:xy=None
        for row in location["grades"]:
            level=row["level"]
            sid=row["officialFinderSchoolId"]
            target=layers[level].get(sid)
            margin=round(float(target.boundary.distance(xy)),1) if target is not None and xy is not None else None
            polygon_match=bool(target and xy and target.covers(xy))
            results.append({"publicAddressReferenceId":location["addressId"],
                "level":level,"campusId":sid,"censusStreetPointInsideExpectedSchool":polygon_match,
                "distanceToDerivedZoneBoundaryMeters":margin,
                "boundaryRisk":classify_margin(margin),
                "parcelBoundaryCertified":False,"sourceRedistributionAuthorized":False,
                "currentResidenceAssignmentApproved":False})
    assert len(results)==9
    outdata={"scope":"Denton 2026–27 GeoPDF STAGING - NO geometry redistribution",
      "publishedSchoolPolygons":39,"independentFinderStreetSamples":3,"gradeObservations":9,
      "geometryFilesUploadedToPublicSite":0,
      "sourceNativeGISAvailable":False,"officialDistributionLicenseVerified":False,
      "edgeParcelHoldoutsOfficialFinderVerified":0,
      "approvedForProduction":False,"residenceAssignmentCertified":False,
      "edgeDiagnostics":scan,"publicStreetHoldouts":results,
      "note":"Boundary distances measure street-interpolated Census points to PDF-derived boundaries. Neither 4-corner GeoPDF calibration RMS nor street margin proves parcel-side zoning."}
    assert all(not row["currentResidenceAssignmentApproved"] for row in results)
    (out/"edge-sensitivity-summary-STAGING.json").write_text(json.dumps(outdata,indent=2)+"\n")
    print("DENTON_GEOPDF_EDGE_SENSITIVITY",json.dumps({
      "sourcePolygons":39,"streetGradeChecks":9,
      "marginMeters":[x["distanceToDerivedZoneBoundaryMeters"] for x in results],
      "syntheticSamples":sum(x["syntheticEdgeOffsetChecks"] for x in scan),
      "edgeRiskClasses":[x["boundaryRisk"] for x in results],
      "rightsVerified":False,"parcelHoldoutsVerified":0,"production":"NO_GO"
    },separators=(",",":")),flush=True)
    return outdata

if __name__=="__main__":
    analyze()
