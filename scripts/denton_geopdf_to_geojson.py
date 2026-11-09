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
 # The single fill path may have multiple disjoint shapes and cut-outs.
 # Preserve polygon holes by containment nesting (PDF-local plane).
 candidates=[]
 for ring in rings:
  if len(ring)<4:
   continue
  geom=Polygon(ring)
  if not geom.is_valid or geom.area<1:
   continue
  candidates.append((geom,ring))
 if not candidates:
  raise ValueError("No valid closed filled-zone vectors")
 candidates.sort(key=lambda x:x[0].area,reverse=True)
 mains=[]
 for geom,ring in candidates:
  containing=[j for j,(existing,holes) in enumerate(mains) if existing.contains(geom.representative_point())]
  if containing:
   ix=containing[-1];mains[ix][1].append(ring)
  else:
   mains.append([geom,[]])
 parts=[]
 for shell,holes in mains:
  shell_l=list(shell.exterior.coords)
  holes_l=[h for h in holes if len(h)>=4]
  local=Polygon(shell_l,holes_l)
  if not local.is_valid:
   raise ValueError("PDF original zone ring invalid: "+explain_validity(local))
  outer=[convert(p) for p in shell_l]
  inner=[[convert(p) for p in r] for r in holes_l]
  parts.append(Polygon(outer,inner))
 geounion=unary_union(parts)
 if not geounion.is_valid:
  raise ValueError("Invalid WGS84 derived zone polygon: "+explain_validity(geounion))
 if geounion.geom_type not in ("Polygon","MultiPolygon"):
  raise ValueError("PDF vector shape not Polygon/MultiPolygon")
 if geounion.area < 0.000003 or geounion.area > .10:
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
 for i,d in enumerate(page.get_drawings()):
  color=color_key(d.get("fill"))
  if color not in SCHOOL_COLOR[level]:
   continue
  bbox=fitz.Rect(d.get("rect"))
  inside=frame & bbox
  if inside.is_empty or inside.get_area() < 10000:
   continue
  # Exclude matching legend samples at the right of the original map.
  if bbox.x0 >= frame.x1:
   continue
  groups.setdefault(color,[]).append((i,d,inside.get_area()))
 features=[]
 for fill,(campus_id,school_name) in SCHOOL_COLOR[level].items():
  paths=sorted(groups.get(fill,[]),key=lambda x:-x[2])
  if not paths:
   raise ValueError("Official map zone fill not found: "+school_name+" "+fill)
  index,selected,area=paths[0]
  if area < 30000:
   raise ValueError("Official map zone candidate too small "+school_name)
  original_rings=split_path_into_closed_rings(selected)
  zone=shapely_from_pdf_rings(original_rings,convert)
  prop={
   "district":"061901","schoolYear":"2026-27","campusId":campus_id,
   "school":school_name,"level":level,
   "sourcePdf":url,"sourceType":"DERIVED_FROM_OFFICIAL_GEOPDF",
   "sourceVectorFill":fill,"sourceVectorDrawingIndex":index,
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
 # Zones within one school level should not have significant overlaps. Road
 # edges may touch: accept small computational seam, fail large zone overlaps.
 from shapely.geometry import shape
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
 for level in ("high","middle"):
  data=extract(level,tmp,out)
  print("DENTON_GEOPDF_LEVEL_SUMMARY",json.dumps({
   "level":level,"features":len(data["features"]),
   "crs":"EPSG:4326","rmsMeters":data["metadata"]["calibration"]["cornerRMSErrorMeters"],
   "source":"OFFICIAL_GEOPDF_DERIVED","production":"NO_GO",
  }),flush=True)
 print("DENTON_GEOPDF_STAGING_TOTAL",json.dumps({"schoolPolygons":13,"schoolYears":"2026-27",
  "georeferenced":True,"releaseCertified":False,"production":"NO_GO"}),flush=True)


if __name__=="__main__":
 main()
