#!/usr/bin/env python3
"""Independent staging checks across 39 public Denton 2026-27 GeoPDF shapes.
Does not authorize redistribution or final address→enrollment assignments.
"""
import hashlib
import json
import re
from pathlib import Path
from shapely.geometry import shape
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"artifacts/denton-geopdf-derived"
JS=(ROOT/"denton-official-zone-references.js").read_text(encoding="utf-8")
match=re.search(r"const ROWS=Object\.freeze\((\[.*?\])\);",JS,re.S)
if not match:raise SystemExit("Official 39-school PDF source roster could not be parsed")
roster=json.loads(match.group(1))
expected={(r["id"],r["level"]) for r in roster}
assert len(expected)==39
results=[]
all_ids=[]
for level,count in [("high",4),("middle",9),("elementary",26)]:
 p=OUT/(level+"-2026-27-geopdf-derived-STAGING.geojson")
 data=json.loads(p.read_text())
 assert data["type"]=="FeatureCollection"
 assert len(data["features"])==count,(level,len(data["features"]))
 meta=data["metadata"]
 assert meta["productionStatus"]=="NO_GO" and meta["officialGIS"] is False
 assert meta["reuseAndRedistributionPermissionVerified"] is False
 assert meta["originalDistrictGISReceived"] is False
 rms=meta["calibration"]["cornerRMSErrorMeters"]
 assert rms<0.5,(level,rms)
 shapes=[]
 ids=[]
 for feat in data["features"]:
  prop=feat["properties"]
  key=(prop["campusId"],prop["level"])
  assert key in expected,key
  assert prop["sourceType"]=="DERIVED_FROM_OFFICIAL_GEOPDF"
  assert prop["schoolYear"]=="2026-27"
  assert prop["approvedForProduction"] is False
  assert prop["officialOriginalGIS"] is False
  assert prop["reusePermissionVerified"] is False
  assert prop["finderAddressHoldoutPolygonsChecked"] is False
  assert prop["nativePaintOrderReconciled"] is True
  assert prop["pdfPainterOverlapClippedFraction"]<.28
  geom=shape(feat["geometry"])
  assert geom.is_valid and not geom.is_empty,key
  assert geom.geom_type in ("Polygon","MultiPolygon"),key
  assert .000003<geom.area<.1,(key,geom.area)
  assert -98.5<geom.bounds[0]<-96 and -98.5<geom.bounds[2]<-96,key
  assert 32<geom.bounds[1]<34 and 32<geom.bounds[3]<34,key
  ids.append(prop["campusId"]);all_ids.append(key);shapes.append(geom)
 assert len(ids)==len(set(ids)),level
 # Check zero area overlap after PDF painter order was applied.
 for i in range(len(shapes)):
  for j in range(i+1,len(shapes)):
   shared=shapes[i].intersection(shapes[j]).area
   assert shared<1e-8,(level,ids[i],ids[j],shared)
 results.append({"level":level,"features":count,"controlPointRmsMeters":rms,
   "sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"validGeometryCount":count,
   "sameLevelOverlapPairs":0,
   "status":"STAGING_TOPOLOGY_AND_METADATA_VALIDATED_NOT_ENROLLMENT_APPROVED"})
 assert len(data["features"])==count
assert set(all_ids)==expected,{"missing":list(expected-set(all_ids)),"extra":list(set(all_ids)-expected)}
audit={"verifiedAt":"2026-11-09","source":"3 Denton ISD official 2026-27 GeoPDF aggregate maps",
 "derivedPolygons":39,"matchedOfficialPDFCampusIDs":39,"geometryValid":True,
 "independentlyVerifiedResidentialAssignments":0,
 "districtOriginalVectorGIS":False,"licensePermissionVerified":False,
 "productionStatus":"NO_GO","levels":results}
(OUT/"staging-integrity-report.json").write_text(json.dumps(audit,indent=2)+"\n")
print("DENTON_DERIVED_GIS_STAGING_QA",json.dumps(audit,separators=(",",":")),flush=True)
