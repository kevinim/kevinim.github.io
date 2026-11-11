#!/usr/bin/env python3
"""CFB experimental 2025-26 elementary raster-to-GeoJSON (offline QA ONLY).

Reads:
  - official school district outer polygon from Texas Legislative Council
  - rough 14-campus symbol registration controls
  - unlabelled, extracted official raster color contours

Writes ephemeral artifacts, NOT a site asset or production attendance layer.
Contains NO 2026-27 residential-assignment assertions.
"""
import json
import math
from collections import Counter
from pathlib import Path

import numpy as np
from shapely.geometry import Polygon, Point, shape, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts/cfb-reconstruction"
CONTROL = ROOT / "data/cfb-elementary-raster-calibration-draft.json"
JURISDICTION = ROOT / "data/carrollton-three-isd-boundaries-2025.geojson"
PIXELS = OUT / "pixel-contours-elementary.json"
NCES = ROOT / "nces-locations-2024.json"
TEA = ROOT / "tea-ratings-2026.json"

def load_json(path):
    return json.loads(Path(path).read_text())

def fit_affine(points):
    if len(points) < 6:
        raise ValueError("Need at least six source control points")
    lat0 = float(np.mean([p["latlon"][0] for p in points]))
    lon0 = float(np.mean([p["latlon"][1] for p in points]))
    east = 111320.0 * math.cos(math.radians(lat0))
    north = 111320.0
    x = np.array([[1.0, *p["pixel"]] for p in points], dtype=float)
    y = np.array([[(p["latlon"][1] - lon0)*east, (p["latlon"][0] - lat0)*north] for p in points])
    coefficients = np.linalg.lstsq(x, y, rcond=None)[0]
    prediction = x @ coefficients
    rms = float(np.sqrt(np.mean(np.sum((prediction-y)**2, axis=1))))
    def project(pixel):
        e, n = np.array([1.0,*pixel]) @ coefficients
        return [round(float(lon0+e/east),6), round(float(lat0+n/north),6)]
    return project, rms

def build():
    control, jurisdiction, pixels = (load_json(p) for p in [CONTROL, JURISDICTION, PIXELS])
    if (control["status"] != "draft-calibration-only" or control["verifiedPixelAnchors"] != 0
            or jurisdiction["metadata"]["notSchoolAttendanceZones"] is not True
            or pixels["coordinateReference"] != "image_pixels_only"
            or pixels["level"] != "elementary"):
        raise ValueError("Source status mismatch - cannot convert unverified geometries")
    official = [f for f in jurisdiction["features"] if f["properties"]["districtCode"] == "057903"]
    if len(official) != 1:
        raise ValueError("No unique official district reference")
    district = shape(official[0]["geometry"])
    if not district.is_valid:
        raise ValueError("Official district GIS topology invalid")
    project, rms = fit_affine(control["controlPoints"])
    nces = {r["id"]:r for r in load_json(NCES)["data"] if r.get("ll")}
    schools = [
        (row["id"],row["name"],Point(nces[row["id"]]["ll"][1],nces[row["id"]]["ll"][0]))
        for row in load_json(TEA)["data"] if row.get("district") == "CFB"
        and row.get("name","").endswith((" EL"," ELE"))
        and row["id"] in nces
    ]
    features, rejects = [],Counter()
    for idx, region in enumerate(pixels["contours"]):
        ring = region.get("imagePixelRing")
        if not isinstance(ring,list) or len(ring)<3:
            rejects["bad_ring"]+=1
            continue
        raw = Polygon([project(p) for p in ring])
        if raw.is_empty:
            rejects["empty"]+=1
            continue
        if not raw.is_valid:
            raw = raw.buffer(0)
        if not raw.is_valid or raw.is_empty:
            rejects["invalid"]+=1
            continue
        clipped = raw.intersection(district)
        if clipped.is_empty:
            rejects["outside_official_district"]+=1
            continue
        if clipped.geom_type not in ("Polygon","MultiPolygon"):
            rejects["line_or_point"]+=1
            continue
        if clipped.area < 0.0000001:
            rejects["too_small"]+=1
            continue
        matches = [(id,name) for id,name,point in schools if clipped.contains(point)]
        unique = matches[0] if len(matches) == 1 else None
        features.append({
            "type":"Feature",
            "properties":{
                "source":"CFBISD board-approved 2025-26 elementary zone raster; not source GIS",
                "districtOuterBoundarySource":"Texas Legislative Council SY2526; distinct from per-school attendance",
                "schoolYear":"2025-26",
                "gradeLevel":"elementary",
                "labelFrom":"NCES school building point inside experimental color polygon, NOT a verified attendance-zone label",
                "provisionalCampusId": unique[0] if unique else None,
                "provisionalSchoolName": unique[1] if unique else None,
                "ambiguousSchoolPointCount":len(matches),
                "sourcePixelContourIndex":idx,
                "sourcePixelColorCluster":region.get("colorCluster"),
                "roughRegistrationRmsMeters":round(rms,1),
                "geometryStatus":"DRAFT_UNVERIFIED_VISUAL_ONLY",
                "isOfficialCampusBoundary":False,
                "liveFinderChecked":False,
                "currentYearCertified":False,
                "residenceAssignmentApproved":False,
                "releaseEligible":False
            },
            "geometry":mapping(clipped)
        })
    summary = {
        "district":"CFB","sourceSchoolYear":"2025-26","level":"elementary",
        "status":"DRAFT_UNVERIFIED_VISUAL_ONLY",
        "sourceColorPixelContours":len(pixels["contours"]),
        "draftGeographicContourFragments":len(features),
        "singleSchoolPointMatchFragments":sum(bool(f["properties"]["provisionalCampusId"]) for f in features),
        "uniqueProvisionalCampuses":sorted(set(f["properties"]["provisionalCampusId"] for f in features if f["properties"]["provisionalCampusId"])),
        "roughRegistrationRmsMeters":round(rms,1),
        "rejected":dict(rejects),
        "sourceLicense":"CFB original publisher raster; do not rehost as final GIS",
        "districtReference":"Texas Legislative Council, 2025-26, CC-BY",
        "true2026_27VerifiedCampusPolygons":0,
        "residenceFinderGeometryHoldoutMatches":0,
        "productionReady":False
    }
    OUT.mkdir(parents=True,exist_ok=True)
    featureCollection={
        "type":"FeatureCollection",
        "metadata":summary,
        "features":features
    }
    (OUT/"cfb-elementary-draft-unverified.geojson").write_text(json.dumps(featureCollection,separators=(",",":")))
    (OUT/"cfb-elementary-draft-summary.json").write_text(json.dumps(summary,indent=2)+"\n")
    print("CFB_ELEMENTARY_DRAFT_GEOJSON "+json.dumps(summary,ensure_ascii=True))
    return summary

if __name__=="__main__":
    build()
