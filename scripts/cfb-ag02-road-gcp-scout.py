#!/usr/bin/env python3
"""Bounded public-city street intersection scout for CFB raster GCP review.

Coordinates are sourced from historical City of Carrollton street centerlines,
but image pixel coordinates are **not independently visually verified**.
Automatically projected pixel guesses are NEVER eligible for GCP fitting.
"""
import importlib.util
import json
import math
from collections import defaultdict
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import Point, shape
from shapely.ops import transform

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"artifacts/cfb-ag02-road-gcp-scout"
OLD=ROOT/"scripts/cfb-ag02-legacy-gis-audit.py"
spec=importlib.util.spec_from_file_location("cfb_old",OLD)
old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
GEO=ROOT/"scripts/cfb-ag02-georeference-qa.py"
spec2=importlib.util.spec_from_file_location("cfb_geo",GEO)
geo=importlib.util.module_from_spec(spec2);spec2.loader.exec_module(geo)
URL=("https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/"
     "StreetCenterlines/FeatureServer/0")
WGS_TO_UTM=Transformer.from_crs("EPSG:4326","EPSG:32614",always_xy=True).transform
UTM_TO_WGS=Transformer.from_crs("EPSG:32614","EPSG:4326",always_xy=True).transform


def get_roads():
    layer,_=old.get_public_json(URL,{"f":"json"})
    if layer.get("geometryType")!="esriGeometryPolyline":
        raise ValueError("street source is not polylines")
    names={x["name"] for x in layer.get("fields",[])}
    if not {"StreetName","BaseClass","OBJECTID"}.issubset(names):
        raise ValueError("street name/class/id fields absent")
    features=[]
    for offset in range(0,5000,1000):
        page,_=old.get_public_json(URL+"/query",{
            "where":"BaseClass IN ('AR','CO')", # only major road intersections
            "outFields":"OBJECTID,StreetName,StreetType,BaseClass",
            "returnGeometry":"true","outSR":"4326","f":"geojson",
            "resultRecordCount":1000, "resultOffset":offset,
            "orderByFields":"OBJECTID"
        })
        if page.get("type")!="FeatureCollection":
            raise ValueError("GIS source returned non-GeoJSON")
        batch=page.get("features",[])
        features.extend(batch)
        if len(batch)<1000:
            break
    if len(features)>=5000:
        raise ValueError("street query limit reached; incomplete results")
    return features, layer


def major_intersections(features, district):
    buckets=defaultdict(list)
    eligible=0
    for f in features:
        props=f.get("properties") or {}
        name=str(props.get("StreetName") or "").strip()
        klass=props.get("BaseClass")
        if not name or klass not in ("AR","CO"):
            continue
        geom=f.get("geometry")
        if not geom or geom["type"] not in ("LineString","MultiLineString"):
            continue
        line=shape(geom)
        projected=transform(WGS_TO_UTM,line)
        segments=list(projected.geoms) if hasattr(projected,"geoms") else [projected]
        eligible+=1
        for s in segments:
            if s.is_empty or s.length<35:
                continue
            for x,y in (s.coords[0],s.coords[-1]):
                if district.distance(Point(x,y))>150:
                    continue
                key=(round(x/22),round(y/22))
                buckets[key].append((name,klass,x,y,props.get("OBJECTID")))
    sample=[]
    # Quantization can split near-endpoints: search immediate neighboring buckets.
    keys=set(buckets)
    for cell in sorted(keys):
        own=buckets[cell]
        neighborhood=[p for dx in (-1,0,1) for dy in (-1,0,1)
                      for p in buckets.get((cell[0]+dx,cell[1]+dy),[])]
        seen=set()
        for name,klass,x,y,oid in own:
            for oname,oklass,ox,oy,oid2 in neighborhood:
                if name==oname or math.hypot(x-ox,y-oy)>24:
                    continue
                names=tuple(sorted([name,oname]))
                group=(names,round((x+ox)/40),round((y+oy)/40))
                if group in seen:
                    continue
                seen.add(group)
                p=Point((x+ox)/2,(y+oy)/2)
                if not district.contains(p):
                    continue
                sample.append({"roadNames":list(names),"x":p.x,"y":p.y,
                               "streetObjectIds":sorted({str(oid),str(oid2)}),
                               "sourceClassPair":[klass,oklass]})
    dedup={}
    for p in sample:
        # Keep junction once, even if 2 divided-lane centerlines yield near duplicates.
        key=(tuple(p["roadNames"]),round(p["x"]/45),round(p["y"]/45))
        dedup.setdefault(key,p)
    return list(dedup.values()),eligible


def candidate_in_image(ground, model, match):
    lon,lat=ground
    en=geo.easting_northing([lat,lon],model["originLatLon"])
    matrix=__import__("numpy").asarray(model["coefficients"],float)
    uv=(en-matrix[0]) @ __import__("numpy").linalg.inv(matrix[1:3])
    pixel=uv*model["pixelScale"]+__import__("numpy").asarray(model["centerPixel"])
    if match:
        H=__import__("numpy").asarray(match["chosenTransform"],float)
        h=H @ __import__("numpy").array([pixel[0],pixel[1],1])
        pixel=h[:2]/h[2] if abs(h[2])>1e-7 else [float("nan")]*2
    return [round(float(p),2) for p in pixel]


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    source_geo=json.loads((ROOT/"data/carrollton-three-isd-boundaries-2025.geojson").read_text())
    district=shape(next(f["geometry"] for f in source_geo["features"]
                        if f["properties"]["districtCode"]=="057903"))
    metric=transform(WGS_TO_UTM,district)
    result={"streetSource":URL,"publication":"RESEARCH_ONLY_NO_GCP_VERIFIED",
            "historicStreetGISVintage":"DATE_IN_METADATA_NOT_A_2025_ZONE_CERTIFICATE",
            "independentRasterPixelVerification":False,
            "residenceAssignmentApproved":False,"candidates":[]}
    try:
        features,layer=get_roads()
        date=(layer.get("editingInfo") or {}).get("lastEditDate")
        if date:
            from datetime import datetime,timezone
            result["streetGISLastEditedUTC"]=datetime.fromtimestamp(date/1000,timezone.utc).isoformat()
        all_candidates,major_count=major_intersections(features,metric)
        result["downloadedMajorStreetSegments"]=len(features)
        result["geometriesEligible"]=major_count
        result["rawDifferentRoadNameIntersections"]=len(all_candidates)
        # Spatially diverse priority, rather than 30 adjacent intersections.
        chosen=[]
        for p in sorted(all_candidates,key=lambda z:(z["roadNames"],z["x"],z["y"])):
            if len(chosen)>=35: break
            if any(math.hypot(p["x"]-q["x"],p["y"]-q["y"])<900 for q in chosen):
                continue
            chosen.append(p)
        result["spatiallySpacedCandidateCount"]=len(chosen)
        calib=json.loads((ROOT/"artifacts/cfb-ag02-georef/elementary-calibration.json").read_text())
        model=calib["affineTransform"]
        matches=json.loads((ROOT/"artifacts/cfb-ag02-georef/summary.json").read_text())["crossGrade"]
        for index,p in enumerate(chosen):
            lon,lat=UTM_TO_WGS(p["x"],p["y"])
            entry={"id":f"city-road-{index+1:02d}",
                   "streetNames":p["roadNames"],"latlon":[round(lat,7),round(lon,7)],
                   "groundSourceUrl":URL,"sourceObjectIDs":p["streetObjectIds"],
                   "groundVerification":"PUBLIC_CITY_ROAD_GIS_COORDINATE_CANDIDATE",
                   "pixelVerified":False,"groundVerified":False,
                   "role":"candidate-only","eligibleForModelFit":False,
                   "pixelAutoPredictions":{}}
            for level,size in (("elementary",[505,609]),("middle",[800,914]),("high",[800,970])):
                match=matches.get(level) if level!="elementary" else None
                if level!="elementary" and (not match or match.get("status")!="UNVERIFIED_CANDIDATE"):
                    continue
                x,y=candidate_in_image([lon,lat],model,match)
                entry["pixelAutoPredictions"][level]={
                    "pixel":[x,y],"isInsideRaster":0<=x<size[0] and 0<=y<size[1],
                    "source":"rough E affine and optional ORB, NOT measured",
                    "pixelVerified":False}
            result["candidates"].append(entry)
        result["status"]="GROUND_COORDINATE_CANDIDATES_ONLY_NOT_GCP"
    except Exception as exc:
        result["status"]="NO_CANDIDATES_SOURCE_OR_GEOMETRY_FAILED"
        result["error"]=str(exc)[:250]
    (OUT/"municipal-road-intersection-UNVERIFIED-candidates.json").write_text(
        json.dumps(result,indent=2)+"\n")
    print("AG02_ROAD_SCOUT "+json.dumps({k:v for k,v in result.items() if k!="candidates"}))
    return result


if __name__=="__main__":
    main()
