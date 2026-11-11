#!/usr/bin/env python3
"""QA-only image overlay of stale 2020 polygon GIS vs approved 2025-26 rasters.

WARNING: visual reference, not new verified GCPs or 2025 zone certification.
Does not modify GIS polygons or dashboard UI and never writes to live /data.
"""
import importlib.util
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"artifacts/cfb-ag02-raster-legacy-comparison"
SOURCE=ROOT/"artifacts/cfb-ag02-georef/summary.json"
HIST=ROOT/"artifacts/cfb-ag02-legacy-gis"
geo_path=ROOT/"scripts/cfb-ag02-georeference-qa.py"
spec=importlib.util.spec_from_file_location("cfbag02", geo_path)
geo=importlib.util.module_from_spec(spec); spec.loader.exec_module(geo)


def affine_geo_to_pixel(model, lonlat):
    pts=np.asarray(lonlat,dtype=float).reshape(-1,2)
    source=np.stack([geo.easting_northing([lat,lon], model["originLatLon"])
                     for lon,lat in pts])
    beta=np.asarray(model["coefficients"], dtype=float)
    norm=(source-beta[0]) @ np.linalg.inv(beta[1:3])
    return norm*model["pixelScale"]+np.asarray(model["centerPixel"])


def project_ring(lonlat, model, homography=None):
    coords=affine_geo_to_pixel(model,lonlat)
    if homography is not None:
        H=np.asarray(homography,dtype=float)
        homo=np.column_stack([coords,np.ones(len(coords))]) @ H.T
        if np.any(np.abs(homo[:,2]) < 1e-8):
            raise ValueError("degenerate image-to-image homography")
        coords=homo[:,:2]/homo[:,2:3]
    return coords


def rings(geometry):
    kind=geometry.get("type")
    if kind=="Polygon":
        yield from geometry["coordinates"]
    elif kind=="MultiPolygon":
        for poly in geometry["coordinates"]:
            yield from poly


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    summary=json.loads(SOURCE.read_text())
    manifest=json.loads((ROOT/"data/cfb-approved-zone-raster-reference-2026.json").read_text())
    model=summary["levels"]["elementary"].get("models",[])
    elem=json.loads((ROOT/"artifacts/cfb-ag02-georef/elementary-calibration.json").read_text())
    model=elem["affineTransform"]
    info={"approvedRasterYear":"2025-26","legacyPolygonLastEditedYear":2020,
          "independentGCPs":0,"independentGeographicHoldoutRMSEMeters":None,
          "eligible2026SchoolAssignments":False,"levels":{}}
    for entry in manifest["maps"]:
        level=entry["level"]
        historic=HIST/f"{level}-2020-historical-CFB-NOT-LIVE.geojson"
        if not historic.exists():
            info["levels"][level]={"status":"HISTORICAL_SOURCE_UNAVAILABLE"}
            continue
        try:
            picture, sha, _=geo.approved_image(entry["url"])
            match=summary["crossGrade"].get(level)
            homography=(match["chosenTransform"] if match and
                        match.get("status")=="UNVERIFIED_CANDIDATE" else None)
            if level!="elementary" and homography is None:
                info["levels"][level]={"status":"NO_CROSS_GRADE_MATCH"}
                continue
            canvas=picture.copy()
            draw=ImageDraw.Draw(canvas)
            features=json.loads(historic.read_text())["features"]
            draw_count=0
            for feat in features:
                for ring in rings(feat["geometry"]):
                    try:
                        xy=project_ring(ring,model,homography)
                        # Historic School Zones: red line, no 2025 assignment meaning
                        if len(xy)>=3:
                            draw.line([tuple(float(v) for v in p) for p in xy],
                                      fill=(190,16,20),width=2,joint="curve")
                            draw_count+=1
                    except (ValueError,np.linalg.LinAlgError):
                        continue
            district=json.loads((ROOT/"data/carrollton-three-isd-boundaries-2025.geojson").read_text())
            for f in district["features"]:
                if f["properties"]["districtCode"]!="057903": continue
                for ring in rings(f["geometry"]):
                    xy=project_ring(ring,model,homography)
                    draw.line([tuple(float(v) for v in p) for p in xy],
                              fill=(0,180,180),width=2,joint="curve")
            # Legend located in overlay itself, outside the image pixel frame.
            legend=Image.new("RGB",(canvas.width,canvas.height+75),(245,245,245))
            legend.paste(canvas,(0,75))
            d=ImageDraw.Draw(legend)
            d.text((9,6),f"CFB {level} 2025-26 raster - UNVERIFIED overlay",fill=(0,0,0))
            d.text((9,24),"RED = 2020 school polygon (STALE, historic only)",fill=(160,12,20))
            d.text((9,41),"CYAN = 2025-26 district jurisdiction (not school zones)",fill=(0,110,120))
            d.text((9,58),"Fit rough E RMSE ~356m; independent geodetic QA: 0",fill=(60,60,60))
            p=OUT/f"{level}-2025-raster-vs-2020-HISTORICAL-NOT-LIVE.png"
            legend.save(p)
            info["levels"][level]={"status":"VISUAL_REFERENCE_ONLY","rasterSha256":sha,
                  "historicSchoolPolygonCount":len(features),
                  "projectedOutlineRings":draw_count,
                  "imageWidth":picture.width,"imageHeight":picture.height,
                  "renderPath":p.name,"rasterWarp":"rough E affine + ORB transfer" if homography else "rough E affine",
                  "isIndependentGeographicEvidence":False}
        except Exception as exc:
            info["levels"][level]={"status":"OVERLAY_FAILED","error":str(exc)[:220]}
    (OUT/"summary.json").write_text(json.dumps(info,indent=2)+"\n")
    print("AG02_LEGACY_OVERLAY "+json.dumps(info))


if __name__=="__main__":
    main()
