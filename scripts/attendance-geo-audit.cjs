'use strict';
// Deterministic polygon checks for PUBLIC address and official feeder validation.
// Coordinates throughout are GeoJSON [longitude, latitude]. Not an enrollment API.
function inRing(point,ring){
 if(!Array.isArray(point)||!Array.isArray(ring)||ring.length<3)return false;
 let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;
}
function inGeometry(point,geometry){
 if(!geometry)return false;
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
 return polygons.some(poly=>poly.length&&inRing(point,poly[0])&&!poly.slice(1).some(r=>inRing(point,r)));
}
function inFriscoBorder(point,border){
 return Array.isArray(border)&&border.some(poly=>poly.length&&inRing(point,poly[0])&&!poly.slice(1).some(r=>inRing(point,r)));
}
function schoolKey(s){
 return String(s||'').toLowerCase().replace(/\((?:east|west) of coit\)/g,'')
  .replace(/\b(?:elementary|middle|senior|high|school|campus)\b/g,'').replace(/[^a-z0-9]+/g,'').trim();
}
function interiorPoints(geometry,max=50){
 const polys=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 const candidates=[];for(const poly of polys){
  const r=poly[0];if(!Array.isArray(r)||r.length<3)continue;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const p of r){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}
  const mid=[(minX+maxX)/2,(minY+maxY)/2];candidates.push(mid);
  const step=Math.max(1,Math.floor(r.length/30));
  for(let i=0;i<r.length;i+=step){
   const p=r[i],q=r[(i+1)%r.length],edge=[(p[0]+q[0])/2,(p[1]+q[1])/2];
   for(const t of [.01,.05,.2,.5,.8])candidates.push([edge[0]+t*(mid[0]-edge[0]),edge[1]+t*(mid[1]-edge[1])]);
  }
 }
 const seen=new Set(),out=[];
 const add=p=>{
  if(!inGeometry(p,geometry))return;
  const key=p.map(x=>x.toFixed(10)).join(',');if(seen.has(key))return;
  seen.add(key);out.push(p);
 };
 for(const p of candidates){add(p);if(out.length>=max)return out}
 // Sparse polygons such as a simple four-cornered square may not yield 50
 // edge-interior candidates. Add a deterministic interior grid to reach 50
 // without duplicating points, then fail closed if the polygon is too thin.
 if(out.length<max){
  for(const poly of polys){
   const ring=poly[0];if(!ring?.length)continue;
   const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
   const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
   for(let iy=0;iy<24&&out.length<max;iy++)
    for(let ix=0;ix<24&&out.length<max;ix++)
     add([x0+(ix+.5)*(x1-x0)/24,y0+(iy+.5)*(y1-y0)/24]);
   if(out.length>=max)break;
  }
 }
 return out;
}
module.exports={inRing,inGeometry,inFriscoBorder,schoolKey,interiorPoints};
