#!/usr/bin/env python3
"""Independently audit Carrollton city legacy (2020) school-zone GIS.

This extracts a historical E/M/H vector reference for calibrating CFB 2025–26
publisher raster illustrations. The historical vectors are not current zones
and may NEVER be used for 2026–27 residence assignment.
"""
import hashlib
import json
import math
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts/cfb-ag02-legacy-gis"
CITY_ROOT = ("https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/")
SERVICES = {"elementary": "ElementarySchoolZones",
            "middle": "MiddleSchoolZones",
            "high": "HighSchoolZones"}
ALLOWED_EDIT_YEAR = 2020
MAX_BYTES = 8 * 1024 * 1024
CFB = "Carrollton-Farmers Branch ISD"


def get_public_json(url, params=None):
    # Prevent unexpectedly following user-controlled URLs.
    parsed = urllib.parse.urlparse(url)
    if (parsed.scheme != "https" or parsed.hostname != "services7.arcgis.com"
            or parsed.path.count("/") < 7 or parsed.port):
        raise ValueError("GIS URL not allowlisted")
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "CFB-school-georef-historical-data-QA/1.0"})
    with urllib.request.urlopen(req, timeout=20) as response:
        raw = response.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("historical GIS query unexpectedly large")
    out = json.loads(raw)
    if "error" in out:
        raise ValueError("ArcGIS error: " + str(out["error"])[:260])
    return out, hashlib.sha256(raw).hexdigest()


def main():
    from shapely.geometry import shape, mapping
    from shapely.ops import transform, unary_union
    from pyproj import Transformer

    OUTPUT.mkdir(parents=True, exist_ok=True)
    district = json.loads((ROOT/"data/carrollton-three-isd-boundaries-2025.geojson").read_text())
    source_district = [f for f in district["features"] if f["properties"]["districtCode"] == "057903"]
    if len(source_district) != 1:
        raise ValueError("missing or duplicate CFB district jurisdiction")
    district_geom = shape(source_district[0]["geometry"])
    if not district_geom.is_valid:
        raise ValueError("district geometry invalid")
    project = Transformer.from_crs("EPSG:4326", "EPSG:32614", always_xy=True).transform
    inverse_project = Transformer.from_crs("EPSG:32614", "EPSG:4326", always_xy=True).transform
    district_metric = transform(project, district_geom)
    outer_area_sqkm = district_metric.area / 1e6
    summary = {
        "schoolYear": "NOT_DOCUMENTED_CURRENT_YEAR",
        "source": "City of Carrollton ArcGIS FeatureServer, 2020 legacy source last-edited",
        "official2025Zones": False,
        "official2026_27GIS": False,
        "residenceAssignmentApproved": False,
        "independentlyVerifiedGIS": False,
        "georeferenceUse": "HISTORICAL_COMPARISON_ONLY",
        "districtOuterBoundary": "Texas Legislative Council 2025–26 (not campus zones)",
        "districtAreaSqKm": round(outer_area_sqkm, 2),
        "grades": {}
    }
    for grade, service in SERVICES.items():
        url = CITY_ROOT + service + "/FeatureServer/0"
        row = {"sourceURL": url, "sourceVintage": "UNKNOWN",
               "status": "NOT_VERIFIED", "currentYearApproved": False,
               "residentialAssignmentAllowed": False}
        try:
            layer, meta_hash = get_public_json(url, {"f": "json"})
            row["metadataSha256"] = meta_hash
            row["serviceName"] = layer.get("name")
            row["geometryType"] = layer.get("geometryType")
            row["fieldNames"] = [f["name"] for f in layer.get("fields", [])]
            last_edit = (layer.get("editingInfo") or {}).get("lastEditDate")
            if last_edit:
                row["sourceLastEditedUTC"] = datetime.fromtimestamp(last_edit / 1000, tz=timezone.utc).isoformat()
            else:
                row["sourceLastEditedUTC"] = None
            if layer.get("geometryType") != "esriGeometryPolygon":
                raise ValueError("unexpected geometry type")
            if not {"SchoolName", "SCHOOLDISTRICT"}.issubset(row["fieldNames"]):
                raise ValueError("missing school/vintage fields")
            if last_edit and datetime.fromtimestamp(last_edit/1000, timezone.utc).year <= ALLOWED_EDIT_YEAR:
                row["sourceVintage"] = "2020_LAST_EDIT_HISTORICAL_ONLY"
            else:
                row["sourceVintage"] = "YEAR_UNCERTIFIED_NO_APPROVAL"
            data, source_hash = get_public_json(url + "/query", {
                "where": "1=1", "outFields": "SchoolName,SCHOOLDISTRICT,SchoolType,OBJECTID",
                "returnGeometry": "true", "outSR": "4326", "f": "geojson",
                "resultRecordCount": 300
            })
            if data.get("type") != "FeatureCollection":
                raise ValueError("GeoJSON feature collection not returned")
            if data.get("exceededTransferLimit"):
                raise ValueError("source truncation — pagination required")
            features = data.get("features") or []
            row["totalFetchedMultiDistrict"] = len(features)
            row["geojsonSha256"] = source_hash
            candidates = [f for f in features if f.get("properties", {}).get("SCHOOLDISTRICT") == CFB]
            others = [f for f in features if f.get("properties", {}).get("SCHOOLDISTRICT") != CFB]
            other_inside = []
            for f in others:
                try:
                    g = shape(f["geometry"])
                    if not g.is_valid or g.is_empty:
                        continue
                    intersected = transform(project, g).intersection(district_metric)
                    if not intersected.is_empty and intersected.area > 100:
                        other_inside.append(intersected)
                except (ValueError, TypeError):
                    continue
            row["cfbFeatureCount"] = len(candidates)
            row["cfbSchoolNames"] = sorted(set(str(f.get("properties", {}).get("SchoolName"))
                                            for f in candidates))
            polygons, invalid = [], []
            exported = []
            for f in candidates:
                geom = shape(f["geometry"])
                if not geom.is_valid or geom.is_empty:
                    invalid.append(str(f.get("properties", {}).get("SchoolName")))
                    continue
                projected = transform(project, geom)
                if projected.area <= 0:
                    invalid.append(str(f.get("properties", {}).get("SchoolName")))
                    continue
                polygons.append(projected.intersection(district_metric))
                exported.append({"type": "Feature", "geometry": f["geometry"],
                    "properties": {**f.get("properties", {}),
                        "sourceLastEditYear": row["sourceLastEditedUTC"],
                        "provenanceStatus": "HISTORICAL_2020_NOT_2025_REZONED",
                        "not2026_27GIS": True,
                        "geometryValidatedAgainst2025Finder": False,
                        "residentialAssignmentApproved": False}})
            row["topologyInvalidCampusPolygons"] = invalid
            if polygons:
                merged = unary_union(polygons)
                covered = merged.intersection(district_metric)
                remaining = district_metric.difference(covered)
                row["inside2025DistrictCoveredPct"] = round(100 * covered.area/district_metric.area, 2)
                row["inside2025DistrictGapSqKm"] = round(remaining.area/1e6, 3)
                row["inside2025DistrictOvercountSqKm"] = round(
                    max(sum(p.area for p in polygons) - merged.area, 0)/1e6, 3)
                if other_inside:
                    all_covered = unary_union([covered, *other_inside]).intersection(district_metric)
                    row["allOtherDistrictsFeaturesTouchingCFB"] = len(other_inside)
                    row["includingNonCFBLabelledZonesCoveragePct"] = round(
                        100 * all_covered.area/district_metric.area, 2)
                    row["otherDistrictsFillPreviousGapSqKm"] = round(
                        max(all_covered.area-covered.area, 0)/1e6, 3)
                remaining_pieces = list(remaining.geoms) if hasattr(remaining, "geoms") else [remaining]
                largest = sorted((g for g in remaining_pieces if g.area > 1000),
                                 key=lambda g: g.area, reverse=True)[:8]
                row["largestMissingLegacyAreas"] = [{
                    "areaSqKm": round(g.area/1e6, 3),
                    "centerLonLat": [round(v, 5) for v in
                                    transform(inverse_project, g.centroid).coords[0]]
                } for g in largest]
            row["status"] = "HISTORICAL_VECTORS_AVAILABLE_NOT_CURRENT_YEAR"
            (OUTPUT / f"{grade}-2020-historical-CFB-NOT-LIVE.geojson").write_text(
                json.dumps({"type": "FeatureCollection",
                    "metadata": {"source": url, "vintage": row["sourceVintage"],
                                 "releaseEligible": False,
                                 "not2025_26OfficialSchoolZones": True},
                    "features": exported}, separators=(",", ":")))
        except Exception as exc:
            row["status"] = "RESEARCH_FAILED_OR_SOURCE_UNAVAILABLE"
            row["error"] = str(exc)[:240]
        summary["grades"][grade] = row
    (OUTPUT/"legacy-2020-city-geojson-audit.json").write_text(
        json.dumps(summary, indent=2)+"\n")
    print("AG02_HISTORIC_GIS_AUDIT "+json.dumps(summary))
    return summary


if __name__ == "__main__":
    main()
