#!/usr/bin/env python3
"""Read-only official Denton County CAD parcel comparison for ONE published address.

No owner, parcel number, full parcel geometry, address or personal data are
exported to logs or artifacts. CAD parcels and GeoPDF-derived zones are
approximate references, never evidence of eligibility to enroll.
"""
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from shapely.geometry import shape
from shapely.ops import transform
from pyproj import Transformer

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"artifacts/denton-geopdf-derived"
SOURCE="https://gis.dentoncounty.gov/arcgis/rest/services/Parcels_FC/MapServer/0/query"
WGS_TO_METERS=Transformer.from_crs("EPSG:4326","EPSG:32614",always_xy=True)
CASE="DENTON_BUENAVISTA"  # 3 grade-specific official Finder results already captured.
EXPECTED_NUMBER="1800"
EXPECTED_STREET="BUENA VISTA"
EXPECTED_CITY="DENTON"
REQUESTED_FIELDS="situsStreetNumb,situsStreetName,situsStreetSuff,situsCity,confidential,pYear"

def privacy_safe_lookup(features):
    """Return only one nonconfidential, address-verified parcel geometry."""
    if not isinstance(features,list) or len(features)!=1:
        return None,"NO_GO_NO_UNIQUE_PUBLIC_CAD_PARCEL"
    f=features[0]
    a=f.get("properties") or {}
    if a.get("confidential") not in (0,"0"):
        return None,"NO_GO_CAD_CONFIDENTIAL_OR_UNKNOWN"
    if str(a.get("situsStreetNumb","")).strip()!=EXPECTED_NUMBER:
        return None,"NO_GO_CAD_STREET_NUMBER_MISMATCH"
    name=re.sub(r"\s+"," ",str(a.get("situsStreetName","")).upper().strip())
    city=re.sub(r"\s+"," ",str(a.get("situsCity","")).upper().strip())
    if name!=EXPECTED_STREET or city!=EXPECTED_CITY:
        return None,"NO_GO_CAD_ADDRESS_NOT_EXACT"
    if f.get("geometry") is None:
        return None,"NO_GO_CAD_NO_GEOMETRY"
    g=shape(f["geometry"])
    if g.geom_type not in ("Polygon","MultiPolygon") or not g.is_valid or g.is_empty:
        return None,"NO_GO_CAD_GEOMETRY_INVALID"
    if not(-98.5<g.bounds[0]<-96.0 and -98.5<g.bounds[2]<-96.0
           and 32<g.bounds[1]<34 and 32<g.bounds[3]<34):
        return None,"NO_GO_CAD_PARCEL_OUT_OF_DENTON_BOUNDS"
    return g,"PUBLIC_CAD_PARCEL_APPROXIMATE_GEOMETRY_ONLY"

def parcel_match(parcel,school_id,level_features):
    """Strict whole-parcel containment, not point proximity or official enrollment."""
    expected=[shape(f["geometry"]) for f in level_features if f.get("properties",{}).get("campusId")==school_id]
    if len(expected)!=1:return {"status":"NO_GO_AMBIGUOUS_DERIVED_SCHOOL_ID"}
    target=expected[0]
    competing=[shape(f["geometry"]) for f in level_features if f.get("properties",{}).get("campusId")!=school_id]
    if not target.covers(parcel):
        return {"status":"NO_GO_PARCEL_PARTIALLY_OUTSIDE_FINDER_SCHOOL_DERIVED_ZONE"}
    if any(x.intersection(parcel).area>1e-12 for x in competing):
        return {"status":"NO_GO_PARCEL_INTERSECTS_COMPETING_SCHOOL_ZONE"}
    proj=transform(WGS_TO_METERS.transform,parcel)
    border=transform(WGS_TO_METERS.transform,target.boundary)
    margin=round(proj.distance(border),1)
    return {"status":("NO_GO_CAD_PARCEL_WITHIN_100M_DERIVED_ATTENDANCE_BOUNDARY"
              if margin < 100.0 else "PARCEL_INTERIOR_DERIVED_PDF_NOT_ENROLLMENT_CERTIFIED"),
            "approximateParcelToDerivedZoneBoundaryMeters":margin,
            "nearBorderThresholdMeters":100.0}

def public_query():
    # No owner name, PID/geoID, deed, mailing address or student data requested.
    where=(f"situsStreetNumb = '{EXPECTED_NUMBER}' AND "
           f"UPPER(situsStreetName) = '{EXPECTED_STREET}' AND "
           f"UPPER(situsCity) = '{EXPECTED_CITY}' AND confidential = 0")
    q=urllib.parse.urlencode({"where":where,"outFields":REQUESTED_FIELDS,
      "returnGeometry":"true","outSR":"4326","f":"geojson","resultRecordCount":"3"})
    request=urllib.request.Request(SOURCE+"?"+q,headers={"User-Agent":"TX-Denton-public-parcel-school-QA/1.0"})
    with urllib.request.urlopen(request,timeout=22) as response:
        if response.status!=200:raise ValueError("Official public GIS HTTP error")
        raw=response.read(1024*1024+1)
        if len(raw)>1024*1024:raise ValueError("CAD response unexpectedly large")
    data=json.loads(raw)
    if data.get("type")!="FeatureCollection" or not isinstance(data.get("features"),list):
        raise ValueError("CAD public GeoJSON contract unavailable")
    return data["features"]

def main():
    result={"addressId":CASE,"cadSource":"Denton County public GIS Parcels_FC MapServer/0",
      "sourceType":"DENTON_CAD_APPROXIMATE_PARCEL_NOT_SURVEY",
      "results":[],"release":"NO_GO","ownerFieldsDownloaded":False,
      "parcelGeometryPersisted":False,"residentialAssignmentCertified":False,
      "rightsToRedistributeDentonGeoPDFGISConfirmed":False}
    try:
        features=public_query()
        parcel,reason=privacy_safe_lookup(features)
        result["parcelLookupStatus"]=reason
        if parcel is not None:
            finder=json.loads((ROOT/"data/denton-independent-finder-evidence-20261109.json").read_text())
            rows=[r for r in finder["rows"] if r["addressId"]==CASE]
            assert len(rows)==3 and {r["level"] for r in rows}=={"elementary","middle","high"}
            for row in rows:
                data=json.loads((OUT/(row["level"]+"-2026-27-geopdf-derived-STAGING.geojson")).read_text())
                a=parcel_match(parcel,row["campusId"],data["features"])
                result["results"].append({"level":row["level"],"expectedOfficialFinderSchoolId":row["campusId"],
                   **a,"parcelSurveyVerified":False,"sourceGISLicensedForProduction":False})
    except Exception as err:
        result["parcelLookupStatus"]="NO_GO_CAD_LIVE_QUERY_UNAVAILABLE_OR_INVALID"
        result["exceptionType"]=type(err).__name__  # Never output full URL or address
    # Local audit contains status and uncertainty only, not home coordinates/polygons.
    (OUT/"public-cad-parcel-check-STAGING.json").write_text(json.dumps(result,indent=2)+"\n")
    print("DENTON_CAD_PARCEL_STAGING",json.dumps(result,separators=(",",":")),flush=True)

if __name__=="__main__":
    main()
