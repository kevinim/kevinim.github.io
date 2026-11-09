#!/usr/bin/env python3
"""FREE independent Census street-level geocoder versus 2026 GeoPDF-derived GIS.
Three public housing addresses only; Census interpolation is NOT parcel truth.
Do not approve enrollment, official GIS, or Production based on this probe.
"""
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from shapely.geometry import shape,Point

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"artifacts/denton-geopdf-derived"
source=json.loads((ROOT/"data/denton-public-residential-finder-holdouts-2026.json").read_text())
official=json.loads((ROOT/"data/denton-independent-finder-evidence-20261109.json").read_text())
assert len(source["samples"])==3 and len(official["rows"])==9
layers={}
for level in ("elementary","middle","high"):
 data=json.loads((OUT/(level+"-2026-27-geopdf-derived-STAGING.geojson")).read_text())
 layers[level]=[(x["properties"]["campusId"],shape(x["geometry"])) for x in data["features"]]
assert sum(len(x) for x in layers.values())==39

def norm(s):
 return re.sub(r"[^A-Z0-9]+"," ",s.upper()).strip()

def geocode_public_address(address):
 params={"address":address,"benchmark":"Public_AR_Current","format":"json"}
 url="https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?"+urllib.parse.urlencode(params)
 req=urllib.request.Request(url,headers={"User-Agent":"Denton-public-school-PDF-derived-GIS-independent-QA/1.0"})
 with urllib.request.urlopen(req,timeout=20) as response:
  if response.status!=200:raise ValueError("Census geocoder unavailable HTTP "+str(response.status))
  data=json.load(response)
 matches=data.get("result",{}).get("addressMatches",[])
 road=norm(address.split(",")[0])
 stem=road.rsplit(" ",1)[0]  # allow Rd vs Road, Dr vs Drive
 exact=[m for m in matches if norm(m.get("matchedAddress","")).startswith(stem+" ")
        and "DENTON" in norm(m.get("matchedAddress",""))
        and ", TX," in m.get("matchedAddress","").upper()]
 if len(exact)!=1:return {"status":"NOT_EXACTLY_ONE_CENSUS_STREET_MATCH","candidateCount":len(exact)}
 cand=exact[0]
 x,y=cand.get("coordinates",{}).get("x"),cand.get("coordinates",{}).get("y")
 if not isinstance(x,(int,float)) or not isinstance(y,(int,float)):
  return {"status":"NO_GEOMETRIC_COORDINATE"}
 if not (-98.5<x<-96 and 32<y<34):
  return {"status":"CENSUS_POINT_OUTSIDE_DENTON_WINDOW"}
 return {"status":"CENSUS_STREET_GEOCODE_MATCH","x":x,"y":y,
  "matchedAddress":cand.get("matchedAddress"),"matchType":cand.get("matchType"),
  "geocoder":"U.S. Census Public_AR_Current street-level, not official parcel centroid"}

results=[]
for sample in source["samples"]:
 address=sample["address"]
 try:where=geocode_public_address(address)
 except Exception as exc:where={"status":"CENSUS_GEOCODER_UNAVAILABLE","error":str(exc)[:200]}
 group={"addressId":sample["id"],"publishedAddress":address,
  "censusGeocoder":where,"grades":[]}
 for row in official["rows"]:
  if row["addressId"]!=sample["id"]:continue
  grade=row["grade"];level=row["level"]
  match={"grade":grade,"level":level,"officialFinderSchoolId":row["campusId"],
   "validationStatus":"NO_GO_STREET_GEOCODE_UNVERIFIED"}
  if where.get("status")=="CENSUS_STREET_GEOCODE_MATCH":
   pt=Point(where["x"],where["y"])
   observed=[id for id,polygon in layers[level] if polygon.covers(pt)]
   match["derivedPolygonSchoolsContainingCensusStreetPoint"]=observed
   match["validationStatus"]=("DERIVED_PDF_POLYGON_MATCHES_FINDER_SAMPLE"
     if observed==[row["campusId"]] else "NO_GO_PDF_DERIVED_ZONE_MISMATCH_OR_BOUNDARY")
  group["grades"].append(match)
 results.append(group)
 print("DENTON_GEOPDF_CENSUS_HOLDOUT",json.dumps(group,separators=(",",":")),flush=True)
matchCount=sum(g["validationStatus"]=="DERIVED_PDF_POLYGON_MATCHES_FINDER_SAMPLE" for x in results for g in x["grades"])
total=sum(len(x["grades"]) for x in results)
audit={"sourceYear":"2026-27","samples":3,"grades":total,
 "matches":matchCount,"missingOrContradictory":total-matchCount,
 "censusLimitations":"Public Census street centerline geocoding is independent but may be interpolated; it is not a verified parcel/home point.",
 "release":"NO_GO","independentParcelAccuracyProven":False,
 "reuseRightsConfirmed":False,"results":results}
(OUT/"census-street-holdout-report.json").write_text(json.dumps(audit,indent=2)+"\n")
print("DENTON_GEOPDF_CENSUS_HOLDOUT_SUMMARY",json.dumps({
 "matches":matchCount,"total":total,"certifiedParcelBoundaryResults":0,
 "production":"NO_GO"},separators=(",",":")),flush=True)
