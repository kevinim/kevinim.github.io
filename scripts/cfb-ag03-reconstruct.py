#!/usr/bin/env python3
"""AG03: CFB 2025–26 school-zone raster reconstruction, QA artifacts ONLY.

Consumes label-free raster pixel contours created by the Phase-1 extractor.
Accepts AG02 independent control files per grade without modifying their files.
Never outputs files under the site's public data/ or features/ directory.

Requirements: numpy, shapely; OpenCV optional (for projective fit comparison).
"""
from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from shapely.geometry import Polygon, shape, mapping
from shapely.ops import unary_union
from shapely.validation import explain_validity

ROOT = Path(__file__).resolve().parents[1]
STATUS = "DRAFT_UNVERIFIED_VISUAL_ONLY"
LEVELS = ("elementary", "middle", "high")
DEFAULT_PIXEL_DIR = ROOT / "artifacts/cfb-reconstruction"
DEFAULT_OUT = ROOT / "artifacts/cfb-ag03"
DEFAULT_CALIBRATION = ROOT / "data/cfb-elementary-raster-calibration-draft.json"
MANIFEST = ROOT / "data/cfb-approved-zone-raster-reference-2026.json"
JURISDICTION = ROOT / "data/carrollton-three-isd-boundaries-2025.geojson"
TEA = ROOT / "tea-ratings-2026.json"
ROSTER = ROOT / "data/cfb-ag03-zone-roster-review.json"
REVIEW = ROOT / "data/cfb-ag03-contour-label-review.json"


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write(path, obj):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")


CAMPUS_OFFICIAL_NAME_ALIASES = {
    # CFB campus-directory name -> exact shorter 2026 TEA record name.
    "Barbara Bush Middle School": "BUSH MIDDLE",
    "Newman Smith High School": "SMITH H S",
    "R. L. Turner High School": "TURNER H S",
}

def normalized(name):
    name = re.sub(r"[^a-z0-9]+", " ", str(name).lower()).strip()
    return re.sub(r"\b(elementary|elem|ele|el|middle|high|school|h s|m s)\b", "", name).replace(" ", "")


def school_roster(level, tea_rows, roster):
    """2026 TEA identifiers are identity hints, NOT 2025–26 attendance proof."""
    refs = [r for r in tea_rows if r.get("district") in ("CFB", "057903")]
    result, unresolved = [], []
    for name in roster[level]:
        lookup_name = CAMPUS_OFFICIAL_NAME_ALIASES.get(name, name)
        matches = [r for r in refs if normalized(r.get("officialName") or r.get("name")) == normalized(lookup_name)]
        item = {"schoolName": name, "teaCampusId": matches[0]["id"] if len(matches) == 1 else None,
                "teaIdentityYear": 2026, "schoolYearZoneVerified": False,
                "identityResolution": "unique_2026_TEA_name" if len(matches) == 1 else "REQUIRES_REVIEW"}
        result.append(item)
        if len(matches) != 1:
            unresolved.append({"schoolName": name, "candidateTeaIds": [m["id"] for m in matches]})
    return result, unresolved


def validate_sources(manifest, jurisdiction):
    if (manifest.get("district") != "CFB" or manifest.get("approvedSchoolYear") != "2025-26"
            or manifest.get("georeferenced") is not False
            or manifest.get("validForAutomaticResidenceAssignment") is not False):
        raise ValueError("CFB manifest failed source/release guard")
    maps = {m["level"]: m for m in manifest["maps"]}
    if set(maps) != set(LEVELS):
        raise ValueError("Expected exact elementary/middle/high published raster sources")
    if any(not m["url"].startswith("https://resources.finalsite.net/images/") for m in maps.values()):
        raise ValueError("Unexpected raster publisher")
    if jurisdiction["metadata"].get("notSchoolAttendanceZones") is not True:
        raise ValueError("Official jurisdiction must not be misrepresented as attendance zones")
    district = [f for f in jurisdiction["features"] if f["properties"].get("districtCode") == "057903"]
    if len(district) != 1:
        raise ValueError("Expected exactly one CFB outer boundary")
    geom = shape(district[0]["geometry"])
    if not geom.is_valid or geom.is_empty:
        raise ValueError("Invalid reference jurisdiction geometry")
    return maps, geom


def control_points(config, image_size):
    if config.get("level") not in LEVELS:
        raise ValueError("Unknown calibration grade")
    size = config.get("rasterPixelSize", config.get("imageSize"))
    if size is None or list(size) != list(image_size):
        raise ValueError("Calibration image size differs from extracted source raster")
    pts = config.get("controlPoints", [])
    if len(pts) < 6:
        raise ValueError("Minimum 6 calibration controls for draft fit")
    for p in pts:
        xy = p.get("pixel")
        latlon = p.get("latlon")
        if not (isinstance(xy, list) and isinstance(latlon, list)
                and len(xy) == len(latlon) == 2 and
                all(isinstance(v, (int, float)) and math.isfinite(v) for v in xy + latlon)
                and 0 <= xy[0] < size[0] and 0 <= xy[1] < size[1]
                and 32.5 < latlon[0] < 33.2 and -97.2 < latlon[1] < -96.5):
            raise ValueError("Invalid or off-image georeferencing control")
    return pts


def fit_transform(pts, method="affine"):
    """Pixels -> local meters, measured residuals; no pixel position is certified."""
    lat0 = float(np.mean([p["latlon"][0] for p in pts]))
    lon0 = float(np.mean([p["latlon"][1] for p in pts]))
    e = 111320.0 * math.cos(math.radians(lat0))
    n = 111320.0
    src = np.asarray([p["pixel"] for p in pts], dtype=float)
    dst = np.asarray([[(p["latlon"][1] - lon0) * e, (p["latlon"][0] - lat0) * n] for p in pts])
    if method == "affine":
        X = np.column_stack([np.ones(len(src)), src])
        coef = np.linalg.lstsq(X, dst, rcond=None)[0]
        if np.linalg.matrix_rank(X) != 3:
            raise ValueError("Degenerate affine anchors")
        def project_many(coords):
            return np.column_stack([np.ones(len(coords)), coords]) @ coef
    elif method == "projective":
        if len(pts) < 8:
            raise ValueError("Projective exploratory fit requires at least 8 points")
        import cv2
        # normalize destination meters to avoid numeric instability in the homography
        mat, _ = cv2.findHomography(src.astype(np.float64), dst.astype(np.float64), 0)
        if mat is None:
            raise ValueError("Degenerate projective anchors")
        def project_many(coords):
            v = np.column_stack([coords, np.ones(len(coords))]) @ mat.T
            if np.any(np.abs(v[:, 2]) < 1e-9):
                raise ValueError("Projective singularity")
            return v[:, :2] / v[:, 2, None]
    else:
        raise ValueError("Unsupported transform")
    residual = np.linalg.norm(project_many(src) - dst, axis=1)
    def project_ring(ring):
        arr = np.asarray(ring, dtype=float)
        xy = project_many(arr)
        if not np.isfinite(xy).all():
            raise ValueError("Non-finite projection")
        return [(round(lon0 + x / e, 7), round(lat0 + y / n, 7)) for x, y in xy]
    return project_ring, {"method": method, "trainRmsMeters": round(float(np.sqrt(np.mean(residual ** 2))), 2),
        "p95Meters": round(float(np.percentile(residual, 95)), 2), "maxMeters": round(float(max(residual)), 2),
        "controlCount": len(pts), "verifiedPixelAnchors": None}


def geographic_sqkm(geom):
    """Approximate area in square kilometers around CFB; not a survey measurement."""
    if geom.is_empty:
        return 0.0
    from shapely.ops import transform
    scale_x = 111320.0 * math.cos(math.radians(32.96))
    scale_y = 111320.0
    return float(transform(lambda x, y, z=None: (np.asarray(x) * scale_x, np.asarray(y) * scale_y),
                           geom).area / 1e6)


def validate_review(review, level, campus_lookup):
    mapping_for_grade = review.get(level, {})
    if not isinstance(mapping_for_grade, dict):
        raise ValueError("Crosswalk must be a grade -> contour index dictionary")
    for idx, entry in mapping_for_grade.items():
        if not str(idx).isdigit():
            raise ValueError("Crosswalk contour index must be numeric")
        if entry.get("teaCampusId") not in campus_lookup:
            raise ValueError("Crosswalk references nonexistent TEA campus ID")
        if entry.get("reviewStatus") != "human_label_read_unverified_zone" or not entry.get("evidence"):
            raise ValueError("Crosswalk missing specific manually reviewed raster evidence")
    return mapping_for_grade


def reconstruct_grade(level, *, pixel_dir, output_dir, maps, district, calibration, roster,
                      tea_rows, review, method="affine"):
    candidates, unresolved = school_roster(level, tea_rows, roster)
    by_id = {r["teaCampusId"]: r for r in candidates if r["teaCampusId"]}
    crosswalk = validate_review(review, level, by_id)
    image_input = Path(pixel_dir) / ("pixel-contours-" + level + ".json")
    data = read(image_input) if image_input.is_file() else None
    features, rejected = [], Counter()
    error = None
    registration = None
    project = None
    if data is None:
        error = "PIXEL_CONTOURS_NOT_AVAILABLE"
    else:
        if (data.get("source") != maps[level]["url"] or data.get("level") != level
                or data.get("publisherImageYear") != "2025-26"
                or data.get("coordinateReference") != "image_pixels_only"
                or data.get("publishable") is not False):
            raise ValueError("Untrusted/stale raster trace input: " + level)
        if calibration is None:
            error = "AG02_CALIBRATION_MISSING"
        else:
            try:
                pts = control_points(calibration, data["imageSize"])
                project, registration = fit_transform(pts, method)
                registration["verifiedPixelAnchors"] = int(calibration.get("verifiedPixelAnchors", 0))
                # Training fit does not validate source anchors or current-year zones.
                if registration["verifiedPixelAnchors"] < 8:
                    error = "INSUFFICIENT_INDEPENDENT_VERIFIED_ANCHORS"
                elif registration["trainRmsMeters"] > 40:
                    error = "CALIBRATION_ERROR_EXCEEDS_REVIEW_THRESHOLD"
                else:
                    error = "FINDER_CROSSCHECK_NOT_COMPLETED"
            except (ValueError, ImportError) as exc:
                project, registration = None, None
                error = "CALIBRATION_REJECTED: " + str(exc)
    if data is not None and project:
        for idx, item in enumerate(data.get("contours", [])):
            ring = item.get("imagePixelRing")
            if not isinstance(ring, list) or len(ring) < 3 or len(ring) > 5000:
                rejected["bad_or_oversized_pixel_ring"] += 1
                continue
            try:
                raw = Polygon(project(ring))
                # Preserve invalid fragments as rejections; buffer(0) masks defects.
                if raw.is_empty:
                    rejected["empty_geometry"] += 1
                    continue
                if not raw.is_valid:
                    reason = explain_validity(raw).lower()
                    rejected["self_intersection" if "self-intersection" in reason else "invalid_geometry"] += 1
                    continue
                if raw.area <= 0:
                    rejected["zero_area"] += 1
                    continue
                clip = raw.intersection(district)
                if clip.is_empty:
                    rejected["outside_district"] += 1
                    continue
                if clip.geom_type not in ("Polygon", "MultiPolygon") or not clip.is_valid:
                    rejected["invalid_clip"] += 1
                    continue
                if geographic_sqkm(clip) < 0.0001:
                    rejected["sliver"] += 1
                    continue
            except (ValueError, TypeError, ArithmeticError):
                rejected["projection_failure"] += 1
                continue
            label = crosswalk.get(str(idx))
            campus = by_id.get(label["teaCampusId"]) if label else None
            features.append({"type": "Feature", "properties": {
                "districtCode": "057903", "schoolYear": "2025-26", "currentYear2026_27Verified": False,
                "gradeLevel": level, "sourceUrl": maps[level]["url"],
                "sourcePage": read(MANIFEST)["sourcePage"], "sourcePixelContourIndex": idx,
                "sourcePixelColorCluster": item.get("colorCluster"),
                "teaCampusId": campus["teaCampusId"] if campus else None,
                "schoolName": campus["schoolName"] if campus else None,
                "labelEvidence": label.get("evidence") if label else None,
                "labelStatus": "human_raster_label_hint_unverified" if label else "UNASSIGNED",
                "boundarySourceType": "color-segmented-raster-estimate-not-official_vector",
                "calibrationMethod": method, "geometryStatus": STATUS,
                "validForAutomaticResidenceAssignment": False,
                "liveFinderChecked": False, "isOfficialCampusBoundary": False, "releaseEligible": False
            }, "geometry": mapping(clip)})
    geometries = [shape(f["geometry"]) for f in features]
    merged = unary_union(geometries) if geometries else Polygon()
    area = geographic_sqkm(district)
    covered = geographic_sqkm(merged)
    overlap = max(0, sum(geographic_sqkm(g) for g in geometries) - covered)
    labeled_ids = {f["properties"]["teaCampusId"] for f in features if f["properties"]["teaCampusId"]}
    summary = {
        "level": level, "status": STATUS, "sourceSchoolYear": "2025-26",
        "sourceUrl": maps[level]["url"], "contoursAvailable": data is not None,
        "rawPixelContours": len(data.get("contours", [])) if data else 0,
        "draftGeographicFragments": len(features), "mappedCampusIds": sorted(labeled_ids),
        "mappedCampusCount": len(labeled_ids), "rosterCandidateCount": len(candidates),
        "unresolvedTeaIdentities": unresolved, "missingCampusBoundaryCandidates": [
            x for x in candidates if not x["teaCampusId"] or x["teaCampusId"] not in labeled_ids],
        "geometryRejected": dict(rejected), "selfIntersectionRejected": rejected.get("self_intersection", 0), "selfIntersectingAccepted": 0,
        "geometryTopology": {"districtAreaApproxSqKm": round(area, 3),
            "fragmentUnionAreaApproxSqKm": round(covered, 3),
            "districtUncoveredApproxSqKm": round(max(0, area - covered), 3),
            "fragmentAreaOvercountApproxSqKm": round(overlap, 3),
            "districtCoveragePercent": round(100 * covered / area, 2) if area else 0,
            "metricsMeaning": "candidate-fragment overlap/gap only; not certified school coverage"},
        "calibration": registration, "blocker": error,
        "currentYear2026_27Verified": False, "finderGeometryMatches": 0,
        "isOfficialCampusGIS": False, "validForAutomaticResidenceAssignment": False,
        "productionReady": False
    }
    collection = {"type": "FeatureCollection", "metadata": {
        "district": "CFB", "schoolYear": "2025-26", "gradeLevel": level, "status": STATUS,
        "sourceUrl": maps[level]["url"], "isEmptyBecause": error if not features else None,
        "currentYear2026_27Verified": False, "residentialAssignmentEnabled": False},
        "features": features}
    write(Path(output_dir) / ("cfb-" + level + "-DRAFT_UNVERIFIED.geojson"), collection)
    write(Path(output_dir) / ("cfb-" + level + "-coverage-qa.json"), summary)
    return summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pixel-dir", type=Path, default=DEFAULT_PIXEL_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--control", action="append", default=[], metavar="GRADE=FILE",
                        help="AG02 calibration override, e.g. middle=/tmp/grade-middle.json")
    parser.add_argument("--method", choices=("affine", "projective"), default="affine")
    args = parser.parse_args(argv)
    maps, district = validate_sources(read(MANIFEST), read(JURISDICTION))
    roster = read(ROSTER)
    review = read(REVIEW)
    tea_rows = read(TEA)["data"]
    controls = {}
    if DEFAULT_CALIBRATION.is_file():
        controls["elementary"] = read(DEFAULT_CALIBRATION)
    for item in args.control:
        if "=" not in item:
            parser.error("--control requires GRADE=FILE")
        level, filename = item.split("=", 1)
        if level not in LEVELS:
            parser.error("Unknown grade in --control")
        controls[level] = read(filename)
    reports = [reconstruct_grade(level, pixel_dir=args.pixel_dir, output_dir=args.out_dir,
        maps=maps, district=district, calibration=controls.get(level), roster=roster,
        tea_rows=tea_rows, review=review, method=args.method) for level in LEVELS]
    rollup = {"status": STATUS, "grades": reports, "sourceSchoolYear": "2025-26",
        "currentYearGeometryVerified": False, "finderGeometryMatches": 0,
        "productionReady": False, "validForAutomaticResidenceAssignment": False,
        "missingGradeCalibration": [r["level"] for r in reports if r["calibration"] is None]}
    write(args.out_dir / "cfb-ag03-summary.json", rollup)
    print("CFB_AG03_DRAFT_QA " + json.dumps({r["level"]: {
        "fragments": r["draftGeographicFragments"], "labeled": r["mappedCampusCount"],
        "topology": r["geometryTopology"], "rejected": r["geometryRejected"],
        "missingSchoolCandidates": len(r["missingCampusBoundaryCandidates"]),
        "unresolvedTEA": len(r["unresolvedTeaIdentities"]), "blocker": r["blocker"]} for r in reports}, sort_keys=True))
    return rollup


if __name__ == "__main__":
    main()
