#!/usr/bin/env python3
"""Read-only forensic audit and PDF-local candidate extraction for the three OFFICIAL
2026-27 Denton ISD aggregate attendance maps. No unverified WGS84 output.

This script does not infer source georeferencing. Paths produced by this PoC are
PDF page-coordinate vectors ONLY, not official district GIS or parcel assignments.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
import re
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

import fitz

SOURCES = {
    "high": "https://resources.finalsite.net/images/v1777570662/dentonisdorg/j5syiqjmelhlufew9q6a/AllHighSchoolZoneMaps_26-27.pdf",
    "middle": "https://resources.finalsite.net/images/v1777570133/dentonisdorg/q7tnltynklrfsfhmsisi/AllMiddleSchoolZoneMaps_26-27.pdf",
    "elementary": "https://resources.finalsite.net/images/v1777570580/dentonisdorg/t3wht3nvxuf01iatrebo/AllElementaryMap_26-27.pdf",
}
COUNT = {"high": 4, "middle": 9, "elementary": 26}
PDF_GEO_TAGS = [b"/Measure", b"/GPTS", b"/LPTS", b"/LGIDict", b"/Viewport", b"/Projection", b"/GCS"]
MAX_DOWNLOAD_BYTES = 28_000_000


def read_public_pdf(url: str, target: Path) -> bytes:
    if urlparse(url).hostname != "resources.finalsite.net":
        raise ValueError("Only pinned official Finalsite PDF sources are allowed")
    request = urllib.request.Request(url, headers={"User-Agent": "Denton-ISD-open-PDF-map-geometry-audit/1.0"})
    with urllib.request.urlopen(request, timeout=35) as response:
        final = response.geturl()
        if urlparse(final).hostname != "resources.finalsite.net":
            raise ValueError("Unexpected PDF download redirect host")
        if response.status != 200:
            raise ValueError("Official PDF HTTP status was not 200")
        raw = response.read(MAX_DOWNLOAD_BYTES + 1)
    if len(raw) > MAX_DOWNLOAD_BYTES or not raw.startswith(b"%PDF-"):
        raise ValueError("Not a bounded valid-looking PDF")
    target.write_bytes(raw)
    return raw


def point_tuple(pt) -> list[float]:
    return [round(float(pt.x), 2), round(float(pt.y), 2)]


def split_path_into_closed_rings(drawing: dict) -> list[list[list[float]]]:
    """Reconstruct PDF-local polygons from straight lines and cubic Beziers.
    Deliberately do not auto-georeference, infer holes, or claim page path ==
    GIS attendance zone. Closed path list remains exploratory geometry only.
    """
    paths, points = [], []
    for cmd in drawing.get("items", []):
        if cmd[0] == "re":
            if points:
                paths.append(points)
                points = []
            rect = cmd[1]
            paths.append([[rect.x0, rect.y0], [rect.x1, rect.y0],
                          [rect.x1, rect.y1], [rect.x0, rect.y1],
                          [rect.x0, rect.y0]])
        elif cmd[0] in ("l", "c", "qu"):
            if cmd[0] == "l":
                segment = [point_tuple(cmd[1]), point_tuple(cmd[2])]
            elif cmd[0] == "c":
                p0, p1, p2, p3 = [point_tuple(cmd[i]) for i in range(1, 5)]
                segment = [
                    [
                        (1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t*t*p2[0] + t**3*p3[0],
                        (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t*t*p2[1] + t**3*p3[1],
                    ] for t in [i/10 for i in range(11)]
                ]
            else:
                # PyMuPDF curve types not certified as polygon geometry.
                continue
            if points and math.dist(points[-1], segment[0]) > 1.5:
                paths.append(points)
                points = []
            if not points:
                points.append(segment[0])
            points.extend(segment[1:])
    if points:
        paths.append(points)
    rings = []
    for coords in paths:
        if len(coords) < 4:
            continue
        if math.dist(coords[0], coords[-1]) > 1.5:
            if not drawing.get("closePath", False):
                continue
            coords.append(coords[0])
        rounded = [[round(x, 2), round(y, 2)] for x, y in coords]
        if len({tuple(v) for v in rounded}) < 3:
            continue
        rings.append(rounded)
    return rings


def color_key(rgb) -> str | None:
    if rgb is None:
        return None
    if not isinstance(rgb, (list, tuple)) or len(rgb) != 3:
        return None
    return "#" + "".join(f"{max(0, min(255, int(float(v) * 255 + 0.5))):02x}" for v in rgb)


def possibly_zone_fill(rgb) -> bool:
    if rgb is None or len(rgb) != 3:
        return False
    c = [float(x) for x in rgb]
    return max(c) - min(c) > 0.105 and min(c) >= 0.20 and max(c) >= 0.60


def inspect_one(level: str, raw: bytes, directory: Path) -> dict:
    pdf = fitz.open(stream=raw, filetype="pdf")
    if pdf.page_count != 1:
        raise ValueError(f"Expected one aggregate map page for {level}; saw {pdf.page_count}")
    p = pdf[0]
    rect = p.rect
    # Official aggregate maps: map frame is left ~72% of page;
    # right-hand legend is excluded from exploratory candidate selection.
    map_rect = fitz.Rect(rect.x0 + rect.width*.024, rect.y0 + rect.height*.030,
                         rect.x0 + rect.width*.715, rect.y0 + rect.height*.973)
    drawings = p.get_drawings()
    fills = collections.Counter()
    strokes = collections.Counter()
    colored_bbox_areas = collections.defaultdict(float)
    colored_path_counts = collections.Counter()
    samples = []
    for i, d in enumerate(drawings):
        fill = color_key(d.get("fill"))
        stroke = color_key(d.get("color"))
        if fill:
            fills[fill] += 1
        if stroke:
            strokes[stroke] += 1
        bbox = fitz.Rect(d.get("rect", (0,0,0,0)))
        inside = bbox & map_rect
        if fill and not inside.is_empty and inside.get_area() > 0:
            colored_bbox_areas[fill] += round(inside.get_area(), 1)
        if not d.get("fill") or not possibly_zone_fill(d.get("fill")):
            continue
        if inside.is_empty or inside.get_area() < 150:
            continue
        if bbox.get_area() > rect.get_area()*.98:
            continue
        colored_path_counts[fill] += 1
        if len(samples) >= 2500:
            continue
        rings = split_path_into_closed_rings(d)
        if not rings:
            continue
        samples.append({
            "drawingIndex": i, "fill": fill,
            "pdfPageBoundingBox": [round(v,2) for v in bbox],
            "rings": rings[:35], "coordinateSystem": "PDF_PAGE_POINTS_Y_DOWN_NOT_GEOGRAPHIC",
            "schoolId": None, "approved": False,
        })
    # Bound the artifact and retain the largest vector candidates.
    samples.sort(key=lambda x: (x["pdfPageBoundingBox"][2]-x["pdfPageBoundingBox"][0])*
                (x["pdfPageBoundingBox"][3]-x["pdfPageBoundingBox"][1]), reverse=True)
    samples = samples[:120]
    page_local = {
        "schemaVersion": 1, "sourceLevel": level,
        "sourcePdf": SOURCES[level],
        "coordinateSystem": "PDF_PAGE_POINTS_Y_DOWN_NOT_GEOGRAPHIC",
        "epsg": None, "officialGIS": False,
        "certifiedCurrentYearSchoolPolygons": 0,
        "imageToWorldCalibration": None,
        "features": samples,
        "warning": "These are EXPLORATORY native PDF drawing paths, not verified school boundaries or WGS84 geometries. Not for map load.",
    }
    (directory / f"{level}-pdf-local-vector-candidates.json").write_text(
        json.dumps(page_local, separators=(",", ":")) + "\n", encoding="utf-8")
    text = p.get_text()
    pix = p.get_pixmap(matrix=fitz.Matrix(.90, .90), alpha=False)
    pix.save(str(directory / f"{level}-original-map-preview.png"))
    metadata = p.get_textpage().extractDICT()
    return {
        "schoolLevel": level, "expectedOfficialCampusCount": COUNT[level],
        "sourcePdf": SOURCES[level], "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw), "pageCount": pdf.page_count, "pagePoints": [round(rect.width,2),round(rect.height,2)],
        "mapFramePdfPoints": [round(v,2) for v in map_rect],
        "geospatialPdfTagOccurrences": {tag.decode(): len(re.findall(re.escape(tag), raw)) for tag in PDF_GEO_TAGS},
        "pdfProducer": pdf.metadata.get("producer"), "pdfCreator": pdf.metadata.get("creator"),
        "textChars": len(text), "textBlocks": len(metadata.get("blocks", [])),
        "nativeDrawingPaths": len(drawings),
        "fillDrawingPaths": sum(fills.values()), "strokeDrawingPaths": sum(strokes.values()),
        "topFillColors": fills.most_common(24),
        "largestTotalMapFillBoundingBoxColors": sorted(colored_bbox_areas.items(), key=lambda q:-q[1])[:24],
        "pastelColoredCandidatePaths": sum(colored_path_counts.values()),
        "exploratoryClosedPathCandidatesSaved": len(samples),
        "imageOnly": len(drawings)<10,
        "extractedGISApproved": False, "WGS84GeoJSONProduced": False,
        "limitations": [
            "PDF page x/y is not latitude/longitude; a verified projection and >=4 independent geographic ground control points are required.",
            "Colored native drawing paths can contain roads, lakes, labels, school symbols and overlapping vector layers; colors do not independently establish school ID.",
            "PDF map may clip polygons; connected subpaths, interior holes, overlaps and no-data gaps need independent topology and official Finder control samples.",
            "This is a forensic staging study only. No verified current-year GIS source, license/permission or residential enrollment boundary is asserted.",
        ],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="artifacts/denton-pdf-vector-poc")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    stats = {}
    for level, url in SOURCES.items():
        raw = read_public_pdf(url, out / f"{level}.pdf")
        stats[level] = inspect_one(level, raw, out)
        print("DENTON_PDF_FORENSIC", json.dumps({
            "level":level, "drawings":stats[level]["nativeDrawingPaths"],
            "colors":stats[level]["topFillColors"][:8],
            "geotags":stats[level]["geospatialPdfTagOccurrences"],
            "closedCandidates":stats[level]["exploratoryClosedPathCandidatesSaved"],
            "imageOnly":stats[level]["imageOnly"],
        }, separators=(",", ":")), flush=True)
    audit={
        "schemaVersion":1,"academicYear":"2026-27",
        "source":"Published Denton ISD aggregate attendance maps (original PDFs)",
        "levels":stats,
        "status":"PDF_NATIVE_GEOMETRY_EXPLORATORY_NOT_GEORERENCED",
        "officialGisAcquired":False, "productionGo":False,
        "extractedCurrentSchoolPolygonCount":0,
    }
    (out / "vector-audit.json").write_text(json.dumps(audit, indent=2)+"\n",encoding="utf-8")
    print("DENTON_PDF_POC_SUMMARY",json.dumps({
        "pages":sum(x["pageCount"] for x in stats.values()),
        "drawings":sum(x["nativeDrawingPaths"] for x in stats.values()),
        "closedPdfLocalCandidates":sum(x["exploratoryClosedPathCandidatesSaved"] for x in stats.values()),
        "geographicPolygonsCertified":0, "production":"NO_GO",
    }),flush=True)


if __name__=="__main__":
    main()
