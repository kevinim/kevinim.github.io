#!/usr/bin/env python3
"""Numbered road-intersection pixel suggestions for manual CFB GCP review.

This is a *visual inspection worksheet*, not a verification or proof of map fit.
No pixel is certified by this script.
"""
import importlib.util
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"artifacts/cfb-ag02-road-gcp-scout"
SOURCE=ROOT/"artifacts/cfb-ag02-road-gcp-scout/municipal-road-intersection-UNVERIFIED-candidates.json"
CALIB=ROOT/"data/cfb-approved-zone-raster-reference-2026.json"
MODULE=ROOT/"scripts/cfb-ag02-georeference-qa.py"
spec=importlib.util.spec_from_file_location("ag02_georef",MODULE)
geo=importlib.util.module_from_spec(spec);spec.loader.exec_module(geo)


def main():
    source=json.loads(SOURCE.read_text())
    manifest=json.loads(CALIB.read_text())
    if source["status"]!="GROUND_COORDINATE_CANDIDATES_ONLY_NOT_GCP":
        raise ValueError("no source GIS street candidate audit")
    OUT.mkdir(parents=True,exist_ok=True)
    for m in manifest["maps"]:
        level=m["level"]
        image,_,_=geo.approved_image(m["url"])
        width=max(image.width+450,1000)
        height=max(image.height+85,740)
        panel=Image.new("RGB",(width,height),(248,248,248))
        panel.paste(image,(0,80))
        pen=ImageDraw.Draw(panel)
        pen.text((12,10),f"CFB {level} 2025-26 approved raster — ROAD GCP RESEARCH ONLY",fill=(20,20,20))
        pen.text((12,27),"32 road coordinate candidates from municipal street GIS (edited 2022)",fill=(80,40,20))
        pen.text((12,44),"Yellow question marks = rough predicted image pixels; NONE visually verified",fill=(140,15,15))
        pen.text((12,61),"DO NOT use these positions for address assignment or measured RMSE",fill=(140,15,15))
        for p in source["candidates"]:
            projected=p["pixelAutoPredictions"].get(level)
            if not projected or projected["isInsideRaster"] is not True:
                continue
            ix,iy=projected["pixel"]
            x,y=int(round(ix)),int(round(iy+80))
            pen.ellipse((x-6,y-6,x+6,y+6),fill=(255,214,0),outline=(24,24,24),width=1)
            pen.text((x+5,y-10),p["id"].split("-")[-1]+"?",fill=(145,20,20))
        for i,p in enumerate(source["candidates"]):
            x=image.width+20 + ((i//24)*220)
            y=90 + (i%24)*24
            names=" + ".join(p["streetNames"])[:31]
            pen.text((x,y),p["id"].split("-")[-1]+": "+names,fill=(25,25,25))
        dest=OUT/f"{level}-2025-road-control-candidates-UNVERIFIED.png"
        panel.save(dest)
    print("AG02_ROAD_VISUAL_REVIEW generated E/M/H annotated rasters with ALL pixelVerified=false")


if __name__=="__main__":
    main()
