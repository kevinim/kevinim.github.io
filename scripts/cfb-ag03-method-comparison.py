#!/usr/bin/env python3
"""Compare free AG03 exploratory methods without asserting campus-zone identity.

- Pixel color segmentation: Phase 1 OpenCV extracted contour metrics.
- Vectorization: polygon validation/simplification in PIXEL units only.
- Manual geo-control: affine/projective measured error when grade controls exist.
Outputs research QA metadata, never an official vector boundary.
"""
import argparse
import importlib.util
import json
from pathlib import Path

from shapely.geometry import Polygon

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("ag03",ROOT/"scripts/cfb-ag03-reconstruct.py")
ag=importlib.util.module_from_spec(spec)
spec.loader.exec_module(ag)


def compare(level, pixel_dir, controls):
    path=pixel_dir/("pixel-contours-"+level+".json")
    result={"level":level,"status":ag.STATUS,"sourceRasterYear":"2025-26",
        "methods":{}, "readyForSchoolAssignments":False}
    if not path.exists():
        result["methods"]["color_segmentation"]={"available":False,"reason":"source trace unavailable"}
        result["methods"]["vector_outline"]={"available":False}
        return result
    d=ag.read(path)
    contours=d.get("contours",[])
    result["methods"]["color_segmentation"]={"available":True,
        "unlabeledContours":len(contours),
        "colorClusters":d.get("quantizedColorClusters"),
        "eligibleColorPixelPercent":d.get("eligibleColorPixelPercent"),
        "risk":"Colors, roads, labels and antialiasing can fragment or join distinct school zones"}
    accepted, invalid, area_delta, vertices_before, vertices_after=[],0,0.0,0,0
    for c in contours:
        ring=c.get("imagePixelRing",[])
        if not isinstance(ring,list) or len(ring)<3:
            invalid+=1
            continue
        p=Polygon(ring)
        if p.is_empty or not p.is_valid or p.area <= 0:
            invalid+=1
            continue
        # Preserve topology with tolerances in image pixels, NOT WGS84.
        simp=p.simplify(1.0,preserve_topology=True)
        accepted.append(simp)
        vertices_before+=len(p.exterior.coords)
        vertices_after+=len(simp.exterior.coords)
        area_delta+=abs(simp.area-p.area)
    result["methods"]["vector_outline"]={"available":True,
        "validSourcePixelContours":len(accepted),"invalidSourcePixelContours":invalid,
        "verticesOriginal":vertices_before,"verticesAfterSimplification":vertices_after,
        "absolutePixelAreaChange":round(area_delta,1),
        "risk":"Vector boundary is only a pixel contour; not a georeferenced or manually validated school zone"}
    if controls is None:
        result["methods"]["manual_control_georeference"]={"available":False,"reason":"No grade-specific AG02 control file"}
    else:
        try:
            pts=ag.control_points(controls,d["imageSize"])
            scores={}
            for method in ("affine","projective"):
                try:
                    _,metric=ag.fit_transform(pts,method)
                    scores[method]=metric
                except (ImportError,ValueError):
                    scores[method]={"unavailable":True}
            result["methods"]["manual_control_georeference"]={"available":True,
                "verifiedPixelAnchors":controls.get("verifiedPixelAnchors",0),
                "candidateFits":scores,
                "risk":"Training residual is not independent held-out accuracy; manual anchor and address Finder QA still required"}
        except ValueError as exc:
            result["methods"]["manual_control_georeference"]={"available":False,"reason":str(exc)}
    return result


def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--pixel-dir",type=Path,default=ROOT/"artifacts/cfb-reconstruction")
    p.add_argument("--out-dir",type=Path,default=ROOT/"artifacts/cfb-ag03")
    args=p.parse_args(argv)
    cal=ag.read(ag.DEFAULT_CALIBRATION) if ag.DEFAULT_CALIBRATION.exists() else None
    report={"status":ag.STATUS,"sourceSchoolYear":"2025-26",
        "comparisons":[compare(level,args.pixel_dir,cal if level=="elementary" else None)
            for level in ag.LEVELS],"productionReady":False}
    ag.write(args.out_dir/"cfb-method-comparison.json",report)
    print("CFB_AG03_METHODS "+json.dumps([{"level":r["level"],
        "contours":r["methods"]["color_segmentation"].get("unlabeledContours")}
        for r in report["comparisons"]]))
    return report


if __name__=="__main__":
    main()
