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


def rough_leave_one_out(points, kind):
    """Out-of-fit rough GCP diagnostic; not an independent survey."""
    required = {"affine": 4, "projective": 6, "quadratic": 8}[kind]
    if len(points) <= required:
        return None
    errors = []
    for i, p in enumerate(points):
        remaining = points[:i] + points[i+1:]
        try:
            m = fit(remaining, kind)
            rows = residual_rows(m, [p], "rough-leave-one-out")
            errors.extend(rows)
        except (ValueError, np.linalg.LinAlgError):
            return None
    return {"count": len(errors), "rmseMeters": round(rms(errors), 2),
            "maxMeters": round(max(r["distanceErrorM"] for r in errors), 2)}


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
    """SIFT and ORB trials; never certify GCPs from automated image matches."""
    import cv2
    a = cv2.cvtColor(np.array(elementary), cv2.COLOR_RGB2GRAY)
    b = cv2.cvtColor(np.array(target), cv2.COLOR_RGB2GRAY)
    attempts = {}
    for method in ("SIFT", "ORB"):
        if method == "SIFT":
            detector = cv2.SIFT_create(nfeatures=6000)
            norm, ratio = cv2.NORM_L2, .68
        else:
            detector = cv2.ORB_create(nfeatures=10000, fastThreshold=10)
            norm, ratio = cv2.NORM_HAMMING, .76
        ka, da = detector.detectAndCompute(a, None)
        kb, db = detector.detectAndCompute(b, None)
        if da is None or db is None or len(da) < 2 or len(db) < 2:
            attempts[method] = {"status": "NO_FEATURES"}
            continue
        pairs = cv2.BFMatcher(norm).knnMatch(da, db, k=2)
        good = [pair[0] for pair in pairs if len(pair) == 2
                and pair[0].distance < ratio*pair[1].distance]
        if len(good) < 20:
            attempts[method] = {"status": "INSUFFICIENT_MATCHES", "rawMatches": len(good)}
            continue
        src = np.float32([ka[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
        dst = np.float32([kb[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
        H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 3.0)
        if H is None or mask is None:
            attempts[method] = {"status": "HOMOGRAPHY_FAILED", "rawMatches": len(good)}
            continue
        keep = mask.ravel().astype(bool)
        sp, dp = src[keep, 0, :], dst[keep, 0, :]
        spread = (float(np.prod(np.ptp(sp, axis=0))) /
                  max(elementary.width*elementary.height, 1))
        pred = cv2.perspectiveTransform(sp.reshape(-1, 1, 2), H)[:, 0, :]
        median_px = float(np.median(np.linalg.norm(pred-dp, axis=1))) if len(sp) else math.inf
        source_quad = np.float32([[0, 0], [elementary.width, 0],
                                  [elementary.width, elementary.height],
                                  [0, elementary.height]]).reshape(-1, 1, 2)
        destination_quad = cv2.perspectiveTransform(source_quad, H)[:, 0, :]
        margins = np.array([target.width, target.height]) * .05
        frame_plausible = (np.isfinite(destination_quad).all()
            and bool(np.all(destination_quad >= -margins))
            and bool(np.all(destination_quad <= np.array(target.size)+margins))
            and .20 <= cv2.contourArea(destination_quad)/max(target.width*target.height,1) <= 1.20)
        ok = len(sp) >= 20 and spread >= .10 and median_px <= 3. and frame_plausible
        attempts[method] = {"status": "UNVERIFIED_CANDIDATE" if ok else
                            "REJECTED_WEAK_DISTRIBUTION",
                            "rawMatches": len(good), "ransacInliers": len(sp),
                            "sourceImageCoverageRatio": round(spread, 4),
                            "medianInlierReprojectionPx": round(median_px, 2),
                            "globalFramePlausible": frame_plausible,
                            "transformedSourceCorners": destination_quad.round(1).tolist(),
                            "elementaryToTargetHomography": H.tolist() if ok else None}
    accepted = [(k,v) for k,v in attempts.items()
                if v["status"] == "UNVERIFIED_CANDIDATE"]
    if accepted:
        winner = max(accepted, key=lambda t: (t[1]["sourceImageCoverageRatio"],
                                               t[1]["ransacInliers"]))
        return {"status": "UNVERIFIED_CANDIDATE", "chosenMethod": winner[0],
                "chosenTransform": winner[1]["elementaryToTargetHomography"],
                "attempts": attempts, "independentlyVerifiedControlPoints": 0}
    return {"status": "NO_RELIABLE_CROSS_GRADE_MATCH", "attempts": attempts,
            "independentlyVerifiedControlPoints": 0}

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
        gcp_path = ROOT / f"data/cfb-ag02-{level}-gcps.json"
        manual = load(gcp_path) if gcp_path.exists() else None
        if manual and (manual.get("sourceSchoolYear") != "2025-26"
                       or manual.get("level") != level):
            raise ValueError("GCP provenance year/level mismatch: " + str(gcp_path))
        pts = (manual["controlPoints"] if manual else
               elementary["controlPoints"] if level == "elementary" else [])
        # Flags alone are not proof: require documented pixel and ground evidence.
        vetted = [p for p in pts if p.get("pixelVerified") is True
                  and p.get("groundVerified") is True
                  and p.get("pixelEvidence") and p.get("groundSourceUrl")]
        independent = [p for p in vetted if p.get("role") == "independent-holdout"]
        fitpts = [p for p in pts if p.get("role") != "independent-holdout"]
        verified_fit = [p for p in vetted if p.get("role") != "independent-holdout"]
        size = (manual.get("rasterPixelSize") if manual else
                elementary["rasterPixelSize"] if level == "elementary" else None)
        declared_size = size
        if level in images:
            size = list(images[level].size)
        report = {"district": "CFB", "level": level, "sourceYear": "2025-26",
                  "sourceStatus": "official_approved_raster_illustration",
                  "certified2026_27GIS": False, "residentialAssignmentApproved": False,
                  "totalCandidateGCP": len(pts), "verifiedGCP": len(vetted),
                  "verifiedFitGCP": len(verified_fit),
                  "independentHoldoutGCP": len(independent),
                  "gcpEvidenceFile": str(gcp_path.relative_to(ROOT)) if manual else
                                     "data/cfb-elementary-raster-calibration-draft.json" if level == "elementary" else None,
                  "image": checks.get(level, {"status": "NOT_FETCHED"}),
                  "declaredControlImageSize": declared_size,
                  "modelComparisons": [], "independentHoldoutRMSEMeters": None,
                  "verdict": "NOT_CALIBRATED"}
        if len(fitpts) >= 4:
            for kind in ("affine", "projective", "quadratic"):
                try:
                    model = fit(fitpts, kind)
                    rows = residual_rows(model, fitpts, "fit-rough-or-vetted")
                    score = proxy_spatial_holdout(fitpts, kind)
                    independent_rows = residual_rows(
                        model, independent, "independent-vetted-holdout") if independent else []
                    report["modelComparisons"].append({
                        "model": kind, "fitRMSEMeters": round(rms(rows), 2),
                        "internalRoughSpatialHoldout": score,
                        "roughLeaveOneOut": rough_leave_one_out(fitpts, kind),
                        "verifiedIndependentRMSEMeters": round(rms(independent_rows), 2) if independent_rows else None})
                    if kind != "affine":
                        continue
                    with (output / f"{level}-residuals.csv").open("w", newline="") as f:
                        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
                        writer.writeheader()
                        writer.writerows(rows)
                    draw_svg(rows, size or [505, 609],
                             output / f"{level}-residuals.svg", "2025-26 CFB "+level)
                    report["highestRoughResiduals"] = sorted(
                        rows, key=lambda r: r["distanceErrorM"], reverse=True)[:4]
                    report["affineTransform"] = model
                    report["transformFormat"] = "pixel_to_local_ENU_m_wgs84_origin"
                    if independent_rows:
                        report["independentHoldoutRMSEMeters"] = round(rms(independent_rows), 2)
                        with (output / f"{level}-independent-holdout.csv").open("w", newline="") as f:
                            writer = csv.DictWriter(f, fieldnames=list(independent_rows[0]))
                            writer.writeheader()
                            writer.writerows(independent_rows)
                    if (level in images and declared_size is not None
                            and declared_size == list(images[level].size)
                            and (level == "elementary" or len(verified_fit) >= MIN_VERIFIED)):
                        # World file maps pixel-centre to longitude/latitude, WGS84.
                        ll = geographic(model, [[0, 0], [1, 0], [0, 1]])
                        origin, along_x, along_y = ll
                        values = [along_x[0]-origin[0], along_x[1]-origin[1],
                                  along_y[0]-origin[0], along_y[1]-origin[1],
                                  origin[0], origin[1]]
                        world = f"{level}-DRAFT-REVIEW-ONLY.wld"
                        (output / world).write_text(
                            "\n".join(f"{x:.12f}" for x in values)+"\n")
                        report["worldFile"] = world
                        report["worldFileCRS"] = "EPSG:4326 (pixel centers)"
                        w, h = size
                        corners = geographic(model, [[-.5, -.5], [w-.5, -.5],
                                                     [w-.5, h-.5], [-.5, h-.5], [-.5, -.5]])
                        footprint = {"type": "FeatureCollection", "features": [{
                            "type": "Feature", "properties": {"sourceYear": "2025-26",
                                "level": level, "status": "UNVERIFIED_DRAFT",
                                "notOfficialAttendanceGIS": True,
                                "residenceAssignmentAllowed": False},
                            "geometry": {"type": "Polygon", "coordinates": [corners.tolist()]}}]}
                        (output / f"{level}-DRAFT-footprint.geojson").write_text(
                            json.dumps(footprint, indent=2)+"\n")
                    else:
                        report["worldFileBlocked"] = "image dimensions absent/mismatched or fewer than 8 verified fit GCP"
                except (ValueError, np.linalg.LinAlgError) as exc:
                    report["modelComparisons"].append({"model": kind, "error": str(exc)})
        report["verdict"] = ("RESEARCH_ONLY_UNVERIFIED" if pts else "NO_GCP")
        if len(verified_fit) >= MIN_VERIFIED and len(independent) >= 3:
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
    # AG03-compatible inverse image homography + elementary candidate affine.
    # This is coordinate-equivalent JSON, not a 6-parameter World File or official GIS.
    for level, match in matches.items():
        if (match.get("status") != "UNVERIFIED_CANDIDATE"
                or "affineTransform" not in results["elementary"]):
            continue
        h = np.asarray(match["chosenTransform"], dtype=float)
        inv = np.linalg.inv(h)
        bridge = {
            "schemaVersion": 1, "grade": level, "sourceYear": "2025-26",
            "sourceType": "approved_publisher_raster_unverified_image_matching",
            "targetImageSize": checks[level]["size"],
            "targetImageSha256": checks[level]["sha256"],
            "sourceRasterURL": next(m["url"] for m in manifest["maps"] if m["level"] == level),
            "chain": "target_pixel -> inverse(E_to_target_H) -> elementary_pixel -> elementary_affine -> WGS84",
            "targetPixelToElementaryPixelHomography": inv.tolist(),
            "elementaryPixelToWGS84Model": results["elementary"]["affineTransform"],
            "automaticImageMatchAlgorithm": match["chosenMethod"],
            "independentVerifiedGCP": 0,
            "independentHoldoutRMSE": None,
            "isOfficialGIS": False, "residentialAssignmentApproved": False,
            "AG03Use": "DRAFT_VISUAL_ALIGNMENT_ONLY_NOT_FOR_ASSIGNMENT"
        }
        (output / f"{level}-DRAFT-composite-pixel-to-wgs84.json").write_text(
            json.dumps(bridge, indent=2)+"\n")
        results[level]["draftCompositeTransform"] = f"{level}-DRAFT-composite-pixel-to-wgs84.json"
        # Provide review-only transferred campus markers to make M/H manual GCP work
        # actionable; these inherit rough E points and are NOT independently verified.
        source_symbols = np.asarray([p["pixel"] for p in elementary["controlPoints"]], dtype=float)
        homog = np.column_stack((source_symbols, np.ones(len(source_symbols))))
        warped = (h @ homog.T).T
        if np.any(np.abs(warped[:, 2]) < 1e-6):
            raise ValueError("degenerate transferred campus symbol")
        warped = warped[:, :2] / warped[:, 2:3]
        candidates = []
        w, hh = checks[level]["size"]
        for p, q in zip(elementary["controlPoints"], warped):
            if 0 <= q[0] < w and 0 <= q[1] < hh:
                candidates.append({
                    "campusId": p["campusId"], "school": p["school"],
                    "pixel": [round(float(q[0]), 2), round(float(q[1]), 2)],
                    "latlon": p["latlon"], "sourceElementaryPixel": p["pixel"],
                    "pixelConfidence": "cross_grade_ORB_transferred_rough_elementary",
                    "pixelVerified": False, "groundVerified": False,
                    "role": "candidate-only", "eligibleIndependentHoldout": False})
        candidates_data = {
            "schemaVersion": 1, "level": level, "sourceSchoolYear": "2025-26",
            "rasterPixelSize": checks[level]["size"],
            "provenance": "ORB image-to-image transfer of 14 rough E school symbols; not fresh surveyed street GCPs",
            "originalElementaryApproximateAnchors": len(elementary["controlPoints"]),
            "transferredCandidatesInFrame": len(candidates),
            "independentlyVerifiedGCP": 0,
            "status": "SUGGESTIONS_ONLY_NOT_VALIDATED",
            "residentialAssignmentAllowed": False,
            "controlPoints": candidates}
        (output / f"{level}-DRAFT-transferred-marker-suggestions.json").write_text(
            json.dumps(candidates_data, indent=2)+"\n")
        results[level]["draftTransferredMarkers"] = len(candidates)

    (output / "cross-grade-automated-candidates.json").write_text(
        json.dumps({"sourceYear": "2025-26", "status": "RESEARCH_ONLY",
                    "matches": matches}, indent=2)+"\n")
    summary = {"sourceYear": "2025-26", "isOfficialCampusGIS": False,
               "currentYearCertified": False, "automaticAddressAssignmentAllowed": False,
               "levels": {k: {"verdict": v["verdict"], "candidateGCP": v["totalCandidateGCP"],
                               "verifiedGCP": v["verifiedGCP"],
                               "independentRMSEMeters": v["independentHoldoutRMSEMeters"],
                               "image": v["image"], "worldFile": v.get("worldFile"),
                               "compositeTransform": v.get("draftCompositeTransform"),
                               "transferredMarkerSuggestions": v.get("draftTransferredMarkers", 0),
                               "models": v["modelComparisons"]}
                          for k, v in results.items()},
               "crossGrade": matches}
    (output / "summary.json").write_text(json.dumps(summary, indent=2)+"\n")
    print("CFB_AG02_GEOREF " + json.dumps(summary))


if __name__ == "__main__":
    main()
