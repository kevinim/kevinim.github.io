#!/usr/bin/env python3
"""Extract 2026-27 Denton ISD high/middle *PDF-derived* attendance polygons.

These source PDFs contain real geospatial /VP /Measure /GEO /GPTS /LPTS
and StatePlane NAD83 FIPS 4202 (US survey foot) in their metadata. The source
is official district published GeoPDF; the extracted polygons are DERIVED,
not original district GIS and not enrollment or production certified.
"""
from __future__ import annotations
import argparse
import json
import math
import re
from pathlib import Path

import fitz
import numpy as np
from pyproj import CRS, Transformer
from shapely.geometry import Polygon, MultiPolygon, mapping, Point
from shapely.ops import unary_union
from shapely.validation import explain_validity

from denton_pdf_vector_poc import SOURCES, read_public_pdf, color_key, split_path_into_closed_rings

# Names, TEA IDs and display fill color are independently checked against
# the official 2026-27 aggregate PDF legend (not NCES points).
SCHOOL_COLOR = {
 "high": {
  "#ffbebe": ("061901008", "Braswell High"),
  "#fcc7ea": ("061901003", "Denton High"),
  "#fcdeb3": ("061901007", "Guyer High"),
  "#c1fcb3": ("061901002", "Ryan High"),
 },
 "middle": {
  "#b3fcb6": ("061901045", "Calhoun Middle"),
  "#cad0fc": ("061901051", "Cheek Middle"),
  "#d7b09e": ("061901041", "Crownover Middle"),
  "#fcb6c9": ("061901048", "Harpool Middle"),
  "#f5f57a": ("061901046", "McMath Middle"),
  "#e8beff": ("061901049", "Myers Middle"),
  "#fcbdfc": ("061901047", "Navo Middle"),
  "#ffebaf": ("061901050", "Rodriguez Middle"),
  "#fccdb6": ("061901044", "Strickland Middle"),
 },
}



# Native fill-path index, official PDF fill RGB, TEA ID, map text label and
# PDF-page map-label x/y. The map's 26 school-colored native paths were
# independently enumerated against its 26 printed school names, including
# duplicate fill RGB (#fccdb6). The index+color+label guards fail on map drift.
ELEMENTARY_VECTOR_SOURCES = {
   6: ("#fcf9b6","061901118","Hawk Elementary","HAWK",(1159.9,1599.1)),
  69: ("#fcb6dd","061901123","Stephens Elementary","STEPHENS",(1299.6,1521.8)),
 204: ("#c2fce2","061901102","Houston Elementary","HOUSTON",(918.5,1413.8)),
 278: ("#bdfcf8","061901116","Pecan Creek Elementary","PECAN",(1162.0,1350.4)),
 351: ("#e9bfff","061901115","EP Rayzor Elementary","RAYZOR",(421.2,1610.1)),
 498: ("#efd2fc","061901106","McNair Elementary","MCNAIR",(913.0,1693.2)),
 560: ("#fcb3fc","061901112","Evers Park Elementary","EVERS",(729.8,712.5)),
 718: ("#dffcd4","061901104","Alexander Elementary","ALEXANDER",(988.8,1072.5)),
 763: ("#e9c0fc","061901119","Savannah Elementary","SAVANNAH",(2269.6,1019.5)),
 840: ("#d6c19c","061901130","Hill Elementary","HILL",(1872.7,1205.9)),
 908: ("#b6d4fc","061901111","Borman Elementary","BORMAN",(488.2,1247.5)),
1066: ("#fccdb6","061901108","Rivera Elementary","RIVERA",(1036.9,1248.2)),
1146: ("#fcc0d8","061901128","Union Park Elementary","UNION",(2100.1,1009.6)),
1223: ("#d7dffc","061901125","Cross Oaks Elementary","CROSS",(1570.9,1195.4)),
1395: ("#fccdb6","061901113","WS Ryan Elementary","RYAN",(834.2,1535.2)),
1477: ("#ffebad","061901107","Newton Rayzor Elementary","RAYZOR",(710.6,1120.5)),
1527: ("#eaffbf","061901127","Bell Elementary","BELL",(2032.1,1144.0)),
1590: ("#b8fcfc","061901109","Shultz Elementary","SHULTZ",(949.6,949.4)),
1649: ("#fce7d7","061901117","Providence Elementary","PROVIDENCE",(1739.9,1046.6)),
1739: ("#fcb3b9","061901105","Hodge Elementary","HODGE",(1179.1,657.3)),
2095: ("#b3fcd5","061901122","Blanton Elementary","BLANTON",(890.3,1920.2)),
2193: ("#d6b19c","061901132","Reeves Elementary","REEVES",(673.9,983.5)),
2316: ("#fcd2db","061901126","Adkins Elementary","ADKINS",(901.5,2146.3)),
2492: ("#fcdeb6","061901131","Martinez Elementary","MARTINEZ",(2169.6,1155.1)),
2546: ("#d6d69c","061901129","Sandbrock Ranch Elementary","SANDBROCK",(2164.5,797.9)),
2612: ("#c7c8fc","061901121","Nelson Elementary","NELSON",(1058.5,1535.2)),
}
assert len(ELEMENTARY_VECTOR_SOURCES)==26
assert len({row[1] for row in ELEMENTARY_VECTOR_SOURCES.values()})==26


def _array(obj: str, field: str) -> list[float]:
 match = re.search(r"/"+re.escape(field)+r"\s*\[([^\]]+)\]", obj)
 if not match:
  raise ValueError(f"GeoPDF missing {field}")
 return [float(x) for x in match.group(1).split()]


def georegistration(doc, page):
 typ, vp = doc.xref_get_key(page.xref, "VP")
 if typ != "array" or "/Viewport" not in vp:
  raise ValueError("Missing official /VP /Viewport georegistration")
 viewport_box = _array(vp, "BBox")
 if len(viewport_box) != 4:
  raise ValueError("Expected four viewport bounding-box numbers")
 match = re.search(r"/Measure\s+(\d+)\s+0\s+R", vp)
 if not match:
  raise ValueError("Viewport does not reference /Measure")
 measure = doc.xref_object(int(match.group(1)), compressed=False)
 if "/Subtype /GEO" not in measure or "/Type /Measure" not in measure:
  raise ValueError("No actual geospatial /GEO measure")
 pts = _array(measure, "GPTS")
 lpts = _array(measure, "LPTS")
 if len(pts) != 8 or len(lpts) != 8:
  raise ValueError("Expected four explicit GeoPDF coordinate pairs")
 gcs = re.search(r"/GCS\s+(\d+)\s+0\s+R", measure)
 if not gcs:
  raise ValueError("GeoPDF lacks geographic coordinate system")
 gcs_obj = doc.xref_object(int(gcs.group(1)), compressed=False)
 if "NAD_1983_StatePlane_Texas_North_Central_FIPS_4202_Feet" not in gcs_obj:
  raise ValueError("Unexpected official projection")
 if "Lambert_Conformal_Conic" not in gcs_obj:
  raise ValueError("Unexpected projection type")
 projected = CRS.from_epsg(2276)  # NAD83 / Texas North Central (US survey feet)
 to_projected = Transformer.from_crs(CRS.from_epsg(4326), projected, always_xy=True)
 from_projected = Transformer.from_crs(projected, CRS.from_epsg(4326), always_xy=True)
 x0, y_max, x1, y_min = viewport_box
 if not (x0 < x1 and y_min < y_max and (x1-x0)>1000):
  raise ValueError("GeoPDF viewport not a valid rectangular image frame")
 # In this ArcGIS GeoPDF the /BBox page ordinate is authored [TOP BOTTOM]
 # in descending PDF-user-space order. PyMuPDF's drawing coordinates are
 # top-down page coordinates. LPTS v=0 -> page top, v=1 -> page bottom.
 source_xy=[]
 target_xy=[]
 for i in range(4):
  u, v = lpts[2*i], lpts[2*i+1]
  lat, lon = pts[2*i], pts[2*i+1]
  px = x0 + u*(x1-x0)
  py = y_min + v*(y_max-y_min)
  source_xy.append([px, py, 1.0])
  target_xy.append(list(to_projected.transform(lon,lat)))
 design=np.asarray(source_xy,dtype=float)
 target=np.asarray(target_xy,dtype=float)
 coeffs,*_=np.linalg.lstsq(design,target,rcond=None)
 fitted=design@coeffs
 residual_ft=np.linalg.norm(fitted-target,axis=1)
 residual_m=residual_ft*.3048006096012192
 rms_m=float(np.sqrt(np.mean(residual_m**2)))
 max_m=float(max(residual_m))
 if not (np.isfinite(coeffs).all() and rms_m<=35 and max_m<=55):
  raise ValueError(f"GeoPDF corner reprojection residual too high: rms={rms_m:.2f} m max={max_m:.2f} m")
 def to_lonlat(pt):
  x,y=pt
  xstate,ystate=np.asarray([x,y,1.0])@coeffs
  lon,lat=from_projected.transform(float(xstate),float(ystate))
  if not (-98.5<lon<-96 and 32.0<lat<34.0):
   raise ValueError("Transformed PDF vector outside Denton plausible WGS84 bounds")
  return [round(lon,7),round(lat,7)]
 return to_lonlat,{
  "sourceCRS":"NAD83 / Texas North Central (US survey foot), EPSG:2276",
  "outputCRS":"EPSG:4326",
  "pdfViewportBBox":viewport_box,
  "pdfLPTS":lpts,
  "pdfGPTSLatLon":pts,
  "calibration":"4 true embedded GeoPDF control pairs, WGS84→StatePlane least-squares affine",
  "cornerRMSErrorMeters":round(rms_m,3),
  "cornerMaxErrorMeters":round(max_m,3),
  "affinePDFPageToStatePlane":[[float(round(q,9)) for q in row] for row in coeffs],
  "uncertainty":"Control points are embedded in district PDF. Path semantics, PDF rendering clipping, downstream source version and district reuse authority not independently certified.",
 }


def shapely_from_pdf_rings(rings, convert):
 # ArcGIS-generated native even-odd filled paths occasionally have tiny
 # self-touching vertices at municipal intersections. Preserve each large
 # component instead of silently discarding invalid originals.
 candidates=[]
 for ring in rings:
  if len(ring)<4:
   continue
  raw=Polygon(ring)
  if raw.is_empty or raw.area<1:
   continue
  repaired=raw if raw.is_valid else raw.buffer(0)
  if repaired.is_empty or not repaired.is_valid:
   raise ValueError("PDF native ring cannot be topologically repaired")
  # Never accept a repair which changes material zone area.
  drift=abs(repaired.area-raw.area)/raw.area
  if drift>0.005:
   raise ValueError(f"PDF polygon repair changed {drift:.2%} area: "+explain_validity(raw))
  components=(list(repaired.geoms) if repaired.geom_type=="MultiPolygon" else [repaired])
  if any(g.geom_type!="Polygon" or g.is_empty for g in components):
   raise ValueError("Unexpected geometric type after repair")
  for component in components:
   if component.area>1:
    candidates.append(component)
 if not candidates:
  raise ValueError("No valid closed filled-zone vectors after bounded repairs")
 candidates.sort(key=lambda x:x.area,reverse=True)
 # PDF path uses EvenOdd fill: strictly contained components are holes,
 # noncontained components are detached islands / multipolygons.
 mains=[]
 for part in candidates:
  containing=[j for j,(outer,holes) in enumerate(mains) if outer.contains(part.representative_point())]
  if containing:
   mains[containing[-1]][1].append(part)
  else:
   mains.append([part,[]])
 polys=[]
 for outer,holes in mains:
  local=Polygon(list(outer.exterior.coords),[list(h.exterior.coords) for h in holes])
  if not local.is_valid:
   raise ValueError("Native PDF even-odd polygon/hole combination invalid: "+explain_validity(local))
  shell=[convert(p) for p in outer.exterior.coords]
  ins=[[convert(p) for p in h.exterior.coords] for h in holes]
  poly=Polygon(shell,ins)
  if not poly.is_valid:
   # Coordinate rounding on submeter native edges may cause tiny self touch.
   fixed=poly.buffer(0)
   if fixed.is_empty or not fixed.is_valid or abs(fixed.area-poly.area)/max(1e-14,poly.area)>.005:
    raise ValueError("WGS84 polygon invalid after georeferencing: "+explain_validity(poly))
   poly=fixed
  polys.append(poly)
 geounion=unary_union(polys)
 if not geounion.is_valid:
  raise ValueError("Invalid WGS84 derived zone polygon: "+explain_validity(geounion))
 if geounion.geom_type not in ("Polygon","MultiPolygon"):
  raise ValueError("PDF vector shape not Polygon/MultiPolygon")
 if geounion.area<0.000003 or geounion.area>0.10:
  raise ValueError("Unrealistic school-zone WGS84 degree area")
 return geounion


def extract(level, download_dir, out_dir):
 url=SOURCES[level]
 raw=read_public_pdf(url,download_dir/(level+".pdf"))
 doc=fitz.open(stream=raw,filetype="pdf")
 if doc.page_count != 1:
  raise ValueError("Expected a single original aggregate PDF")
 page=doc[0]
 convert, calibration=georegistration(doc,page)
 groups={}
 frame=fitz.Rect(min(calibration["pdfViewportBBox"][0],calibration["pdfViewportBBox"][2]),
                 min(calibration["pdfViewportBBox"][1],calibration["pdfViewportBBox"][3]),
                 max(calibration["pdfViewportBBox"][0],calibration["pdfViewportBBox"][2]),
                 max(calibration["pdfViewportBBox"][1],calibration["pdfViewportBBox"][3]))
 drawings=page.get_drawings()
 allowed_colors=set(SCHOOL_COLOR.get(level,{}))
 if level=="elementary":
  allowed_colors|={x[0] for x in ELEMENTARY_VECTOR_SOURCES.values()}
 for i,d in enumerate(drawings):
  color=color_key(d.get("fill"))
  if color not in allowed_colors:
   continue
  bbox=fitz.Rect(d.get("rect"))
  inside=frame & bbox
  if inside.is_empty or inside.get_area() < 10000:
   continue
  if bbox.x0 >= frame.x1:
   continue
  groups.setdefault(color,[]).append((i,d,inside.get_area()))
 features=[]
 if level=="elementary":
  assignments=[(color,campus_id,name,idx,token,anchor)
    for idx,(color,campus_id,name,token,anchor) in ELEMENTARY_VECTOR_SOURCES.items()]
 else:
  assignments=[(fill,campus_id,name,None,None,None)
    for fill,(campus_id,name) in SCHOOL_COLOR[level].items()]
 mapwords=[(str(w[4]).upper(), (float(w[0])+float(w[2]))/2,
             (float(w[1])+float(w[3]))/2) for w in page.get_text("words")]
 for fill,campus_id,school_name,explicit_idx,token,anchor in assignments:
  if explicit_idx is not None:
   if explicit_idx>=len(drawings):
    raise ValueError("Elementary source drawing index absent: "+school_name)
   selected=drawings[explicit_idx]
   index=explicit_idx
   area=(fitz.Rect(selected["rect"])&frame).get_area()
   if color_key(selected.get("fill"))!=fill:
    raise ValueError("Elementary PDF native color changed for "+school_name)
   if not any(t==token and abs(x-anchor[0])<36 and abs(y-anchor[1])<30
              for t,x,y in mapwords):
    raise ValueError("Source PDF map text label missing or moved: "+school_name)
  else:
   paths=sorted(groups.get(fill,[]),key=lambda x:-x[2])
   if not paths:
    raise ValueError("Official map zone fill not found: "+school_name+" "+fill)
   index,selected,area=paths[0]
  if area < 15000:
   raise ValueError("Official map zone candidate too small "+school_name)
  original_rings=split_path_into_closed_rings(selected)
  zone=shapely_from_pdf_rings(original_rings,convert)
  if anchor is not None:
   point=Point(convert(anchor))
   if not zone.buffer(0.00008).covers(point):
    raise ValueError("Elementary map label anchor not inside assigned colored zone: "+school_name)
  prop={
   "district":"061901","schoolYear":"2026-27","campusId":campus_id,
   "school":school_name,"level":level,
   "sourcePdf":url,"sourceType":"DERIVED_FROM_OFFICIAL_GEOPDF",
   "sourceVectorFill":fill,"sourceVectorDrawingIndex":index,
   "sourcePdfMapLabelAnchor":list(anchor) if anchor else None,
   "sourcePDFLocalPaths":len(original_rings),
   "coordinateSource":"GeoPDF /VP /Measure /GEO /GPTS /LPTS",
   "qaStatus":"STAGING_SOURCE_VECTOR_NOT_INDEPENDENTLY_ENROLLMENT_CERTIFIED",
   "approvedForProduction":False,"officialOriginalGIS":False,
   "reusePermissionVerified":False,"finderAddressHoldoutPolygonsChecked":False,
  }
  features.append({"type":"Feature","properties":prop,"geometry":mapping(zone)})
  print("DENTON_GEOPDF_ZONE",json.dumps({
   "level":level,"id":campus_id,"name":school_name,"color":fill,"drawing":index,
   "rings":len(original_rings),"geomType":zone.geom_type,
   "areaDeg2":round(zone.area,7),"bounds":[round(x,6) for x in zone.bounds],
   "calibrationRmsMeters":calibration["cornerRMSErrorMeters"],
  },separators=(",",":")),flush=True)
 # Exact PDF painted appearance is controlled by original drawing order:
 # later opaque even-odd fills visually cover earlier fills. Subtract all
 # later school fills from each earlier school polygon in this same source
 # PDF. This restores the actual colored map surface (not guessed proximity).
 from shapely.geometry import shape
 paint_sequence=sorted(features,key=lambda f:f["properties"]["sourceVectorDrawingIndex"])
 later_union=None
 for feat in reversed(paint_sequence):
  native=shape(feat["geometry"])
  visible=native.difference(later_union) if later_union is not None else native
  if visible.is_empty or not visible.is_valid or visible.geom_type not in ("Polygon","MultiPolygon"):
   raise ValueError("Native PDF paint-order reconciliation erased/invalidated "+feat["properties"]["campusId"])
  lost=max(0,native.area-visible.area)
  removed_share=lost/native.area
  if removed_share>0.28:
   raise ValueError("Too much school area occluded by later PDF school fill: "+
    feat["properties"]["campusId"]+" "+str(round(removed_share,4)))
  feat["geometry"]=mapping(visible)
  feat["properties"]["pdfPainterOverlapClippedFraction"]=round(removed_share,6)
  feat["properties"]["nativePaintOrderReconciled"]=True
  later_union=unary_union([later_union,native]) if later_union is not None else native
  print("DENTON_GEOPDF_PAINT_ORDER",json.dumps({"campusId":feat["properties"]["campusId"],
    "lossFraction":round(removed_share,6),"remainingAreaDeg2":round(visible.area,7)},
    separators=(",",":")),flush=True)
 # Zones within one school level now have zero area overlap aside from
 # minuscule floating-point seams. Fail closed on any material error.
 shapes=[shape(x["geometry"]) for x in features]
 intersections=[]
 for i in range(len(shapes)):
  for j in range(i+1,len(shapes)):
   geom=shapes[i].intersection(shapes[j])
   if geom.area>0:
    intersections.append((features[i]["properties"]["campusId"],
       features[j]["properties"]["campusId"],geom.area))
 big=[v for v in intersections if v[2] > .000002]
 if big:
  raise ValueError("Derived zones show major same-grade geographic overlap: "+repr(big[:8]))
 catalog={
  "type":"FeatureCollection",
  "name":f"Denton ISD {level} 2026-27 GeoPDF-derived STAGING zones",
  "metadata":{
   "academicYear":"2026-27","officialGIS":False,
   "sourceType":"DERIVED_FROM_OFFICIAL_GEOPDF",
   "originalDistrictGISReceived":False,"productionStatus":"NO_GO",
   "sourceUrl":url,"calibration":calibration,
   "schoolCount":len(features),
   "independentlyVerifiedAddressInsidePolygonCount":0,
   "reuseAndRedistributionPermissionVerified":False,
   "warning":"PDF-derived staging shapes. Not official GIS original; do not use for final assignment or Production until district source/rights and independent current-year residential point-in-polygon checks pass.",
   "overlapPairsCount":len(intersections),
   "majorOverlapPairsCount":0,
  },
  "features":features
 }
 output=out_dir/(level+"-2026-27-geopdf-derived-STAGING.geojson")
 output.write_text(json.dumps(catalog,separators=(",",":"))+"\n",encoding="utf-8")
 return catalog


def main():
 args=argparse.ArgumentParser()
 args.add_argument("--out",default="artifacts/denton-geopdf-derived")
 opt=args.parse_args()
 out=Path(opt.out);out.mkdir(parents=True,exist_ok=True)
 tmp=out/"sources";tmp.mkdir(exist_ok=True)
 for level in ("high","middle","elementary"):
  data=extract(level,tmp,out)
  print("DENTON_GEOPDF_LEVEL_SUMMARY",json.dumps({
   "level":level,"features":len(data["features"]),
   "crs":"EPSG:4326","rmsMeters":data["metadata"]["calibration"]["cornerRMSErrorMeters"],
   "source":"OFFICIAL_GEOPDF_DERIVED","production":"NO_GO",
  }),flush=True)
 print("DENTON_GEOPDF_STAGING_TOTAL",json.dumps({"schoolPolygons":39,"schoolYears":"2026-27",
  "georeferenced":True,"releaseCertified":False,"production":"NO_GO"}),flush=True)


if __name__=="__main__":
 main()
