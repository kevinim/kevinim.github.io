#!/usr/bin/env python3
"""Bounded debugging of actual official GeoPDF school-zone fill path topology."""
import json
from pathlib import Path
import fitz
from shapely.geometry import Polygon
from shapely.validation import explain_validity, make_valid
from denton_geopdf_to_geojson import SCHOOL_COLOR
from denton_pdf_vector_poc import SOURCES, read_public_pdf, color_key, split_path_into_closed_rings

out=Path("artifacts/denton-geopdf-topology-diagnostic");out.mkdir(parents=True,exist_ok=True)
for level in ("high","middle"):
 raw=read_public_pdf(SOURCES[level],out/(level+".pdf"))
 pdf=fitz.open(stream=raw,filetype="pdf");page=pdf[0]
 stats=[]
 for fill,(campus_id,name) in SCHOOL_COLOR[level].items():
  paths=[(i,d) for i,d in enumerate(page.get_drawings()) if color_key(d.get('fill'))==fill]
  paths.sort(key=lambda x:fitz.Rect(x[1]["rect"]).get_area(),reverse=True)
  if not paths:raise RuntimeError("Missing fill "+fill)
  idx,selected=paths[0]
  rings=split_path_into_closed_rings(selected)
  row={"level":level,"name":name,"id":campus_id,"color":fill,"index":idx,
       "evenOdd":selected.get("even_odd"),"closePath":selected.get("closePath"),
       "fillOpacity":selected.get("fill_opacity"),
       "pdfLocalAreaBBox":fitz.Rect(selected["rect"]).get_area(),"rings":[]}
  for i,ring in enumerate(rings):
   g=Polygon(ring)
   fixed=make_valid(g)
   buffered=g.buffer(0)
   row["rings"].append({"i":i,"count":len(ring),"pdfLocalArea":round(g.area,1),
     "valid":g.is_valid,"validityReason":explain_validity(g)[:180],
     "makeValidType":fixed.geom_type,"makeValidArea":round(fixed.area,1),
     "bufferZeroType":buffered.geom_type,"bufferZeroArea":round(buffered.area,1),
     "bounds":list(map(lambda x:round(x,1),g.bounds))})
  stats.append(row)
  print("DENTON_GEOPDF_TOPOLOGY",json.dumps(row,separators=(",",":")),flush=True)
 (out/(level+"-topology-report.json")).write_text(json.dumps(stats,indent=2)+"\n")
