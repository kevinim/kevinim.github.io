#!/usr/bin/env python3
"""CFB official 2025–26 raster georeferencing QA. No automatic school assignment.

The 2025–26 approved map is a publisher illustration, NOT 2026–27 campus GIS.
Fit diagnostics for rough campus-symbol points must never be called independent QA.
"""
import argparse
import csv
import hashlib
import io
import json
import math
import urllib.parse
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
LEVELS = ("elementary", "middle", "high")
MIN_VERIFIED = 8
MAX_IMAGE_BYTES = 12 * 1024 * 1024


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def easting_northing(latlon, origin):
    lat, lon = latlon
    return np.array([(lon - origin[1]) * 111320 * math.cos(math.radians(origin[0])),
                     (lat - origin[0]) * 111320], dtype=float)


def model_matrix(points, kind):
    p = np.asarray(points, dtype=float)
    x, y = p[:, 0], p[:, 1]
    if kind == "affine":
        return np.column_stack((np.ones(len(x)), x, y))
    if kind == "quadratic":
        return np.column_stack((np.ones(len(x)), x, y, x*x, x*y, y*y))
    raise ValueError("unknown matrix type")


def fit(points, kind):
    """Fit pixels to east/north in metres. Pixels are scaled for numerical stability."""
    if kind not in ("affine", "projective", "quadratic"):
        raise ValueError(kind)
    required = {"affine": 4, "projective": 6, "quadratic": 8}[kind]
    if len(points) < required:
        raise ValueError("too few calibration points for " + kind)
    xy = np.asarray([p["pixel"] for p in points], dtype=float)
    ll = np.asarray([p["latlon"] for p in points], dtype=float)
    if not (np.isfinite(xy).all() and np.isfinite(ll).all()):
        raise ValueError("non-finite source coordinate")
    if not (np.logical_and(ll[:, 0] > 32.5, ll[:, 0] < 33.3).all()
            and np.logical_and(ll[:, 1] > -97.3, ll[:, 1] < -96.5).all()):
        raise ValueError("coordinate outside CFB vicinity")
    origin = ll.mean(axis=0)
    center = xy.mean(axis=0)
    scale = max(float(np.max(np.ptp(xy, axis=0))) / 2.0, 1.0)
    x = (xy - center) / scale
    y = np.stack([easting_northing(row, origin) for row in ll])
    if kind == "projective":
        # Ground coordinate = rational numerator / common denominator.
        m = np.zeros((2*len(points), 8))
        z = np.zeros(2*len(points))
        for i, ((u, v), (e, n)) in enumerate(zip(x, y)):
            m[2*i, :] = [1, u, v, 0, 0, 0, -e*u, -e*v]
            m[2*i+1, :] = [0, 0, 0, 1, u, v, -n*u, -n*v]
            z[2*i:2*i+2] = [e, n]
        h, _, rank, _ = np.linalg.lstsq(m, z, rcond=None)
        if rank != 8:
            raise ValueError("degenerate projective anchors")
        coeff = h.reshape(-1).tolist()
    else:
        m = model_matrix(x, kind)
        if np.linalg.matrix_rank(m) < m.shape[1]:
            raise ValueError("degenerate polynomial anchors")
        beta, _, _, _ = np.linalg.lstsq(m, y, rcond=None)
        coeff = beta.tolist()
    return {"kind": kind, "originLatLon": origin.tolist(),
            "centerPixel": center.tolist(), "pixelScale": scale,
            "coefficients": coeff}


def predict(model, xy):
    xy = (np.asarray(xy, dtype=float).reshape(-1, 2)
          - np.asarray(model["centerPixel"])) / model["pixelScale"]
    if model["kind"] == "projective":
        h = np.asarray(model["coefficients"])
        denominator = 1 + xy[:, 0]*h[6] + xy[:, 1]*h[7]
        if np.any(np.abs(denominator) < 1e-5):
            raise ValueError("projective transform approaches singularity")
        return np.column_stack(((h[0]+h[1]*xy[:, 0]+h[2]*xy[:, 1])/denominator,
                                (h[3]+h[4]*xy[:, 0]+h[5]*xy[:, 1])/denominator))
    return model_matrix(xy, model["kind"]) @ np.asarray(model["coefficients"])


def geographic(model, xy):
    en = predict(model, xy)
    lat, lon = model["originLatLon"]
    return np.column_stack((lon+en[:, 0]/(111320*math.cos(math.radians(lat))),
                            lat+en[:, 1]/111320))


def residual_rows(model, points, label):
    predicted = predict(model, [p["pixel"] for p in points])
    actual = np.stack([easting_northing(p["latlon"], model["originLatLon"])
                       for p in points])
    deltas = predicted - actual
    return [{"id": p.get("id", p.get("campusId", str(i))),
             "source": p.get("groundSource", p.get("school", "unspecified")),
             "role": label, "pixelX": float(p["pixel"][0]),
             "pixelY": float(p["pixel"][1]), "eastErrorM": round(float(d[0]), 2),
             "northErrorM": round(float(d[1]), 2),
             "distanceErrorM": round(float(np.linalg.norm(d)), 2)}
            for i, (p, d) in enumerate(zip(points, deltas))]


def rms(rows):
    return (math.sqrt(sum(r["distanceErrorM"]**2 for r in rows)/len(rows))
            if rows else None)


def proxy_spatial_holdout(points, kind):
    """Internal proxy ONLY: withheld rough anchors are not independently verified."""
    if len(points) < 12:
        return None
    xy = np.array([p["pixel"] for p in points])
    center = np.median(xy, axis=0)
    chosen = []
    # One farthest sample from each quadrant gives edge-spread, not random in-sample fit.
    for sx, sy in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        indices = [i for i, (x, y) in enumerate(xy)
                   if (x < center[0]) == (sx == -1)
                   and (y < center[1]) == (sy == -1)]
        if indices:
            chosen.append(max(indices, key=lambda i: float(np.sum((xy[i]-center)**2))))
    chosen = sorted(set(chosen))
    train = [p for i, p in enumerate(points) if i not in chosen]
    held = [points[i] for i in chosen]
    if len(held) < 3 or len(train) < {"affine": 4, "projective": 6,
                                     "quadratic": 8}[kind]:
        return None
    try:
        model = fit(train, kind)
        errors = residual_rows(model, held, "rough-spatial-proxy-holdout")
        return {"count": len(held), "rmseMeters": round(rms(errors), 2),
                "pointIds": [r["id"] for r in errors]}
    except (ValueError, np.linalg.LinAlgError):
        return None


def draw_svg(rows, image_size, output, label):
    width, height = image_size
    scale = 25  # display 25 metres of residual as 1 SVG pixel; not map-pixel scale
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width+120} {height+100}">',
             '<rect width="100%" height="100%" fill="#f7f7f7"/>',
             f'<rect x="40" y="40" width="{width}" height="{height}" fill="white" stroke="#555"/>',
             f'<text x="20" y="22" font-size="13">{escape(label)} — residual vectors</text>',
             '<text x="20" y="36" font-size="10">Arrow scale: 1 rendered px = 25 m error; not map scale</text>']
    for r in rows:
        x, y = 40+r["pixelX"], 40+r["pixelY"]
        endx = x+r["eastErrorM"]/scale
        endy = y-r["northErrorM"]/scale
        parts.extend([f'<line x1="{x:.2f}" y1="{y:.2f}" x2="{endx:.2f}" y2="{endy:.2f}" stroke="#c33" stroke-width="2"/>',
                      f'<circle cx="{x:.2f}" cy="{y:.2f}" r="3" fill="#146a9e"/>',
                      f'<text x="{x+5:.2f}" y="{y-5:.2f}" font-size="8">{escape(str(r["id"]))}</text>'])
    parts.append("</svg>")
    output.write_text("\n".join(parts), encoding="utf-8")


def approved_image(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "resources.finalsite.net" or parsed.port:
        raise ValueError("not a district CDN image")
    req = urllib.request.Request(url, headers={"User-Agent": "CFB-georeferencing-QA/1.0"})
    with urllib.request.urlopen(req, timeout=25) as resp:
        body = resp.read(MAX_IMAGE_BYTES+1)
        mime = resp.headers.get("Content-Type", "")
    if len(body) > MAX_IMAGE_BYTES:
        raise ValueError("image exceeds size cap")
    from PIL import Image
    img = Image.open(io.BytesIO(body)).convert("RGB")
    if img.width*img.height > 8_000_000:
        raise ValueError("unexpected image dimensions")
    return img, hashlib.sha256(body).hexdigest(), mime


def cross_grade_candidates(elementary, target):
    """Automated SIFT pilot: only proposes matching image coordinates, never GCP proof."""
    import cv2
    a = cv2.cvtColor(np.array(elementary), cv2.COLOR_RGB2GRAY)
    b = cv2.cvtColor(np.array(target), cv2.COLOR_RGB2GRAY)
    sift = cv2.SIFT_create(nfeatures=6000)
    ka, da = sift.detectAndCompute(a, None)
    kb, db = sift.detectAndCompute(b, None)
    if da is None or db is None:
        return {"status": "NO_FEATURES", "proposedControlPoints": 0}
    pairs = cv2.BFMatcher().knnMatch(da, db, k=2)
    good = [p for p, q in pairs if p.distance < .68*q.distance]
    if len(good) < 20:
        return {"status": "INSUFFICIENT_MATCHES", "rawMatches": len(good),
                "proposedControlPoints": 0}
    src = np.float32([ka[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([kb[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    H, inliers = cv2.findHomography(src, dst, cv2.RANSAC, 3.0)
    if H is None:
        return {"status": "HOMOGRAPHY_FAILED", "rawMatches": len(good),
                "proposedControlPoints": 0}
    keep = inliers.ravel().astype(bool)
    s, d = src[keep, 0, :], dst[keep, 0, :]
    spread = (float(np.prod(np.ptp(s, axis=0))) /
              max(elementary.width*elementary.height, 1))
    reprojection = cv2.perspectiveTransform(s.reshape(-1, 1, 2), H)[:, 0, :]
    median_error = float(np.median(np.linalg.norm(reprojection-d, axis=1)))
    ok = len(s) >= 12 and spread >= .10 and median_error <= 3.
    return {"status": "UNVERIFIED_CANDIDATE" if ok else "REJECTED_WEAK_DISTRIBUTION",
            "rawMatches": len(good), "ransacInliers": len(s),
            "elementaryImageCoverageRatio": round(spread, 4),
            "medianInlierReprojectionPx": round(median_error, 2),
            "sourceElementaryToTargetHomography": H.tolist() if ok else None,
            "proposedControlPoints": len(s) if ok else 0,
            "independentlyVerifiedControlPoints": 0,
            "note": "SIFT matches are NOT manually ground-verified street intersections"}


def main():
    cli = argparse.ArgumentParser()
    cli.add_argument("--output", default="artifacts/cfb-ag02-georef")
    cli.add_argument("--fetch-images", action="store_true")
    args = cli.parse_args()
    output = ROOT / args.output
    output.mkdir(parents=True, exist_ok=True)
    manifest = load(ROOT / "data/cfb-approved-zone-raster-reference-2026.json")
    elementary = load(ROOT / "data/cfb-elementary-raster-calibration-draft.json")
    if manifest["approvedSchoolYear"] != "2025-26" or not manifest["rasterReferenceOnly"]:
        raise ValueError("source year/status mismatch")
    images = {}
    checks = {}
    if args.fetch_images:
        for m in manifest["maps"]:
            try:
                img, digest, mime = approved_image(m["url"])
                images[m["level"]] = img
                checks[m["level"]] = {"status": "FETCHED", "size": list(img.size),
                                      "sha256": digest, "contentType": mime}
            except Exception as exc:
                checks[m["level"]] = {"status": "UNAVAILABLE", "reason": str(exc)[:250]}
    results = {}
    for level in LEVELS:
        pts = (elementary["controlPoints"] if level == "elementary" else [])
        vetted = [p for p in pts if p.get("pixelVerified") is True
                  and p.get("groundVerified") is True]
        independent = [p for p in vetted if p.get("role") == "independent-holdout"]
        fitpts = [p for p in pts if p.get("role") != "independent-holdout"]
        size = (elementary["rasterPixelSize"] if level == "elementary" else None)
        if level in images:
            size = list(images[level].size)
        report = {"district": "CFB", "level": level, "sourceYear": "2025-26",
                  "sourceStatus": "official_approved_raster_illustration",
                  "certified2026_27GIS": False, "residentialAssignmentApproved": False,
                  "totalCandidateGCP": len(pts), "verifiedGCP": len(vetted),
                  "independentHoldoutGCP": len(independent),
                  "image": checks.get(level, {"status": "NOT_FETCHED"}),
                  "modelComparisons": [], "independentHoldoutRMSEMeters": None,
                  "verdict": "NOT_CALIBRATED"}
        if len(fitpts) >= 4:
            for kind in ("affine", "projective", "quadratic"):
                try:
                    model = fit(fitpts, kind)
                    rows = residual_rows(model, fitpts, "fit-rough-or-vetted")
                    score = proxy_spatial_holdout(fitpts, kind)
                    report["modelComparisons"].append({
                        "model": kind, "fitRMSEMeters": round(rms(rows), 2),
                        "internalRoughSpatialHoldout": score})
                    if kind != "affine":
                        continue
                    with (output / f"{level}-residuals.csv").open("w", newline="") as f:
                        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
                        writer.writeheader()
                        writer.writerows(rows)
                    draw_svg(rows, size or [505, 609],
                             output / f"{level}-residuals.svg", "2025-26 CFB "+level)
                    report["affineTransform"] = model
                    report["transformFormat"] = "pixel_to_local_ENU_m_wgs84_origin"
                    if independent:
                        holdrows = residual_rows(model, independent, "independent-verified")
                        report["independentHoldoutRMSEMeters"] = round(rms(holdrows), 2)
                    if (level in images and size == elementary["rasterPixelSize"]
                            and level == "elementary"):
                        # World file maps pixel-centre to longitude/latitude, WGS84.
                        ll = geographic(model, [[0, 0], [1, 0], [0, 1]])
                        origin, along_x, along_y = ll
                        values = [along_x[0]-origin[0], along_x[1]-origin[1],
                                  along_y[0]-origin[0], along_y[1]-origin[1],
                                  origin[0], origin[1]]
                        (output / "elementary-DRAFT-UNVERIFIED.jgw").write_text(
                            "\n".join(f"{x:.12f}" for x in values)+"\n")
                        report["worldFile"] = "elementary-DRAFT-UNVERIFIED.jgw"
                    elif level == "elementary":
                        report["worldFileBlocked"] = "source image size not independently verified"
                except (ValueError, np.linalg.LinAlgError) as exc:
                    report["modelComparisons"].append({"model": kind, "error": str(exc)})
        report["verdict"] = ("RESEARCH_ONLY_UNVERIFIED" if pts else "NO_GCP")
        if len(vetted) >= MIN_VERIFIED and len(independent) >= 3:
            report["verdict"] = "HOLDOUT_REVIEW_REQUIRED"
        (output / f"{level}-calibration.json").write_text(json.dumps(report, indent=2)+"\n")
        results[level] = report
    matches = {}
    if args.fetch_images and "elementary" in images:
        for level in ("middle", "high"):
            if level in images:
                try:
                    matches[level] = cross_grade_candidates(images["elementary"], images[level])
                except Exception as exc:
                    matches[level] = {"status": "EXPERIMENT_FAILED",
                                      "reason": str(exc)[:250]}
    (output / "cross-grade-automated-candidates.json").write_text(
        json.dumps({"sourceYear": "2025-26", "status": "RESEARCH_ONLY",
                    "matches": matches}, indent=2)+"\n")
    summary = {"sourceYear": "2025-26", "isOfficialCampusGIS": False,
               "currentYearCertified": False, "automaticAddressAssignmentAllowed": False,
               "levels": {k: {"verdict": v["verdict"], "candidateGCP": v["totalCandidateGCP"],
                               "verifiedGCP": v["verifiedGCP"],
                               "independentRMSEMeters": v["independentHoldoutRMSEMeters"]}
                          for k, v in results.items()},
               "crossGrade": {k: v.get("status") for k, v in matches.items()}}
    (output / "summary.json").write_text(json.dumps(summary, indent=2)+"\n")
    print("CFB_AG02_GEOREF " + json.dumps(summary))


if __name__ == "__main__":
    main()
