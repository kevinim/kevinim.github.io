#!/usr/bin/env python3
"""Inspect native PDF GeoPDF viewport measures and vector-path palette.
No geographic coordinate assertion without explicit /GPTS /LPTS or vetted GCPs.
"""
import json
import re
from collections import Counter
from pathlib import Path
import fitz
from denton_pdf_vector_poc import SOURCES, read_public_pdf, color_key, split_path_into_closed_rings

def inspect(level, out):
 raw=read_public_pdf(SOURCES[level],out/f"{level}.pdf")
 doc=fitz.open(stream=raw,filetype="pdf")
 p=doc[0]
 objs=[]
 roots=[]
 for field in ("VP","Measure","MediaBox","CropBox","Resources","Annots"):
  try:
   ty,v=doc.xref_get_key(p.xref,field)
   roots.append({"key":field,"type":ty,"value":v[:1600]})
   if field=="VP":
    for match in re.findall(r"\b(\d+)\s+(\d+)\s+R",v):
     if int(match[1])!=0:continue
     x=int(match[0])
     obj=doc.xref_object(x,compressed=False)
     objs.append({"xref":x,"raw":obj[:6000]})
     for child in re.findall(r"\b(\d+)\s+0\s+R",obj):
      cx=int(child)
      if cx==x:continue
      objs.append({"xref":cx,"raw":doc.xref_object(cx,compressed=False)[:6000]})
  except Exception as e:
   roots.append({"key":field,"error":str(e)[:300]})
 # Document may contain a /Measure dictionary outside the page. Output
 # bounded surrounding PDF byte snippets (not full copyrighted map text).
 snippets=[]
 for key in [b"/Measure",b"/GPTS",b"/LPTS",b"/Viewport",b"/GCS",b"/Bounds"]:
  for m in list(re.finditer(re.escape(key),raw))[:8]:
   snippets.append({"tag":key.decode(),"context":raw[max(0,m.start()-110):min(len(raw),m.end()+260)].decode('latin-1','replace')})
 palette={}
 maprect=fitz.Rect(p.rect.x0+p.rect.width*.024,p.rect.y0+p.rect.height*.030,
                   p.rect.x0+p.rect.width*.715,p.rect.y0+p.rect.height*.973)
 for i,d in enumerate(p.get_drawings()):
  fill=color_key(d.get('fill'))
  if not fill:continue
  bb=fitz.Rect(d['rect'])
  if (bb & maprect).is_empty:continue
  if fill not in palette:palette[fill]=[]
  if len(palette[fill])>=8:continue
  rings=split_path_into_closed_rings(d)
  palette[fill].append({
    "index":i,"bbox":[round(q,1) for q in bb],
    "bboxArea":round(bb.get_area(),1),
    "ringCount":len(rings),
    "ringVertices":[len(x) for x in rings[:5]],
    "hasFill":True,"closePath":bool(d.get("closePath")),
    "fillOpacity":d.get("fill_opacity"),
  })
 # Limit color output to relevant filled school colors and water, filter.
 relevant={c:q for c,q in palette.items() if
           c in ["#c1fcb3","#fcdeb3","#ffbebe","#fcc7ea","#97dbf2"] or
           any(x["bboxArea"]>5000 for x in q)}
 print("DENTON_GEO_PDF_OBJECTS",json.dumps({"level":level,"pageXref":p.xref,
       "xrefLength":doc.xref_length(),"rootFields":roots,"nestedObjects":objs,
       "rawTagContext":snippets[:18]},separators=(",",":")),flush=True)
 print("DENTON_PDF_PALETTE_DETAIL",json.dumps({"level":level,"paths":relevant},separators=(",",":")),flush=True)
 (out/f"{level}-geo-and-palette.json").write_text(json.dumps({
   "level":level,"page":p.xref,"rootFields":roots,"nestedObjects":objs,
   "rawTagContext":snippets,"relevantPathColors":relevant,
   "noWgs84Authorization":True,"productionGo":False},indent=2)+"\n")

def main():
 out=Path("artifacts/denton-pdf-geo-probe");out.mkdir(parents=True,exist_ok=True)
 for level in SOURCES:inspect(level,out)
if __name__=="__main__":main()
