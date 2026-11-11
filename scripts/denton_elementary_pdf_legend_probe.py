#!/usr/bin/env python3
"""Official elementary GeoPDF legend swatch + school text geospatial forensic."""
import json
from collections import Counter,defaultdict
from pathlib import Path
import fitz
from denton_pdf_vector_poc import SOURCES,read_public_pdf,color_key,split_path_into_closed_rings

out=Path("artifacts/denton-elementary-legend-poc");out.mkdir(parents=True,exist_ok=True)
pdf=fitz.open(stream=read_public_pdf(SOURCES["elementary"],out/"elementary.pdf"),filetype="pdf")
p=pdf[0]
m=fitz.Rect(90,90,2465.8,2502)
swatches=[]
mapzones=[]
for i,d in enumerate(p.get_drawings()):
 c=color_key(d.get("fill"))
 if not c or c in ("#ffffff","#000000","#0079c2","#97dbf9"):
  continue
 b=fitz.Rect(d["rect"])
 if b.x0>=2465 and b.x1<3200 and b.get_area()<10000 and b.get_area()>2:
  swatches.append({"index":i,"color":c,"rect":[round(x,2) for x in b],"center":[round((b.x0+b.x1)/2,2),round((b.y0+b.y1)/2,2)]})
 elif b.x0<2465 and b.get_area()>10000:
  rings=split_path_into_closed_rings(d)
  if rings:
   mapzones.append({"index":i,"color":c,"rect":[round(x,2) for x in b],"rings":len(rings),"points":sum(len(x) for x in rings),"bboxArea":round(b.get_area(),1)})
words=[]
for word in p.get_text("words"):
 x0,y0,x1,y1,txt,*_=word
 if 100<y0<2150 and len(txt)>1:
  if x0>2440:words.append({"region":"legend","text":txt,"x":round(x0,1),"y":round((y0+y1)/2,1)})
  elif x0<2465:words.append({"region":"map","text":txt,"x":round(x0,1),"y":round((y0+y1)/2,1)})
legendwords=[x for x in words if x["region"]=="legend"]
mapwords=[x for x in words if x["region"]=="map"]
# Detailed output is public and bounded to the first 160 legend words / 220 map words.
print("DENTON_ELEMENTARY_PDF_LEGEND",json.dumps({"swatches":swatches[:70],"legendWords":legendwords[:175]},separators=(",",":")),flush=True)
print("DENTON_ELEMENTARY_PDF_MAP_ZONES",json.dumps({"count":len(mapzones),"zones":mapzones[:48],"mapWords":mapwords[:170]},separators=(",",":")),flush=True)
(out/"elementary-legend-swatches.json").write_text(json.dumps({"swatches":swatches,"legendWords":legendwords,"mapZones":mapzones,"mapWords":mapwords},indent=2)+"\n")
