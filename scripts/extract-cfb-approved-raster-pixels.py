#!/usr/bin/env python3
"""Offline (after fetching approved public images) CFB raster pixel-boundary tracing pilot.
This outputs ONLY rough image-pixel contours, never lon/lat, GeoJSON, assigned school
names, or any data loaded by the live app. User-facing source atlas remains unchanged.
"""
import io
import json
import os
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/cfb-approved-zone-raster-reference-2026.json"
OUTPUT = ROOT / "artifacts/cfb-reconstruction"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 3_000_000
MIN_REGION_PIXELS = 180

def approved_url(url: str) -> bool:
    p = urlparse(url)
    return p.scheme == "https" and p.hostname == "resources.finalsite.net" and p.port is None and p.path.startswith("/images/")

def read_image(url: str):
    if not approved_url(url):
        raise ValueError("not an approved official CDN")
    req = urllib.request.Request(url, headers={"User-Agent": "CFB-public-attendance-raster-reference-QA/1.0"})
    with urllib.request.urlopen(req, timeout=35) as response:
        body = response.read(MAX_IMAGE_BYTES + 1)
    if len(body) > MAX_IMAGE_BYTES:
        raise ValueError("raster exceeds 10 MB safety limit")
    image = Image.open(io.BytesIO(body))
    if image.width * image.height > MAX_PIXELS or image.width < 250 or image.height < 250:
        raise ValueError("unexpected raster dimensions")
    return np.array(image.convert("RGB"))

def extract_pixel_regions(rgb: np.ndarray):
    """Color quantization plus topology-preserving contours; label-free exploratory."""
    h, w, _ = rgb.shape
    smoothed = cv2.medianBlur(rgb, 5)
    hsv = cv2.cvtColor(smoothed, cv2.COLOR_RGB2HSV)
    eligible = (hsv[:, :, 1] > 32) & (hsv[:, :, 2] > 52) & (hsv[:, :, 2] < 250)
    samples = smoothed[eligible].astype(np.float32)
    if samples.shape[0] < 1200:
        raise ValueError("not enough colored map pixels to trace")
    rng = np.random.default_rng(2606)
    if len(samples) > 45000:
        samples = samples[rng.choice(len(samples), 45000, replace=False)]
    cv2.setRNGSeed(2606)
    k = min(22, max(5, len(samples) // 350))
    _, labels, centers = cv2.kmeans(samples, k, None,
        (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 22, 1.2),
        2, cv2.KMEANS_PP_CENTERS)
    # Bound allocations to >250k RGB distance elements per chunk.
    palette = centers.astype(np.uint8).tolist()
    contours = []
    points = smoothed.reshape(-1, 3).astype(np.float32)
    nearest = np.empty(len(points), dtype=np.uint8)
    for i in range(0, len(points), 5000):
        tile = points[i:i+5000]
        dist = ((tile[:, None, :] - centers[None, :, :]) ** 2).sum(2)
        nearest[i:i+5000] = dist.argmin(1)
    classes = nearest.reshape(h, w)
    for idx, color in enumerate(palette):
        mask = (eligible & (classes == idx)).astype(np.uint8) * 255
        # Close fine map roads/printed labels but do not artificially bridge
        # separate attendance regions across major roads/white-background holes.
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        regionContours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in regionContours:
            area = cv2.contourArea(c)
            if area < MIN_REGION_PIXELS:
                continue
            poly = cv2.approxPolyDP(c, max(1.3, cv2.arcLength(c, True) * 0.003), True)
            ring = [[int(p[0][0]), int(p[0][1])] for p in poly]
            if len(ring) < 3:
                continue
            x, y, bw, bh = cv2.boundingRect(c)
            contours.append({
                "colorCluster": int(idx),
                "paletteRGB": color,
                "pixelAreaApprox": round(float(area), 1),
                "pixelBbox": [int(x), int(y), int(bw), int(bh)],
                "imagePixelRing": ring,  # NOT longitude, latitude
                "school": None,
                "coordinateReference": "image_pixels_only",
                "georeferenced": False,
                "finderCrosschecked": False,
            })
    contours.sort(key=lambda f: f["pixelAreaApprox"], reverse=True)
    return {
        "imageSize": [w, h],
        "eligibleColorPixelPercent": round(float(eligible.mean() * 100), 2),
        "quantizedColorClusters": len(palette),
        "draftPixelContours": len(contours),
        "contours": contours,
    }

def main():
    manifest = json.loads(MANIFEST.read_text())
    if (manifest.get("district") != "CFB" or manifest.get("georeferenced") is not False
            or manifest.get("validForAutomaticResidenceAssignment") is not False):
        raise ValueError("manifest not fail-closed")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    summary = {"district": "CFB", "verdict": "UNVERIFIED_PIXEL_LINEWORK_NOT_GIS",
        "sourceYear": "2025-26", "approved": 0, "georeferenced": 0,
        "finderGeometryMatches": 0, "grades": []}
    for item in manifest["maps"]:
        rgb = read_image(item["url"])
        result = extract_pixel_regions(rgb)
        raw = {"source": item["url"], "district": "CFB", "level": item["level"],
            "publisherImageYear": "2025-26", "coordinateReference": "image_pixels_only",
            "publishable": False, "campusLabeling": "none",
            "reusePolicy": "internal_QA_artifact_only_not_website_assets", **result}
        (OUTPUT / ("pixel-contours-" + item["level"] + ".json")).write_text(json.dumps(raw, separators=(",", ":")))
        summary["grades"].append({"level": item["level"], "imageSize": result["imageSize"],
            "candidatePixelContours": result["draftPixelContours"],
            "eligibleColorPixelPercent": result["eligibleColorPixelPercent"]})
    (OUTPUT / "pixel-extraction-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print("CFB_RASTER_PIXEL_TRACE_RESEARCH " + json.dumps(summary))

if __name__ == "__main__":
    main()
