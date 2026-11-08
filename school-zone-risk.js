'use strict';
// Approximate meters from a geocoded point to official GIS polygon rings.
// 150 m is a conservative review heuristic, not a school-district rule.
const SCHOOL_ZONE_REVIEW_METERS=150;
function distancePointToSegmentMeters(p,a,b){
 if(![p,a,b].every(x=>Array.isArray(x)&&x.length>=2&&Number.isFinite(x[0])&&Number.isFinite(x[1])))return Infinity;
 const rad=Math.PI/180,R=6371008.8,c=Math.cos(p[1]*rad);
 const ax=(a[0]-p[0])*rad*R*c,ay=(a[1]-p[1])*rad*R;
 const bx=(b[0]-p[0])*rad*R*c,by=(b[1]-p[1])*rad*R;
 const dx=bx-ax,dy=by-ay,denom=dx*dx+dy*dy;
 const t=denom>0?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/denom)):0;
 return Math.hypot(ax+t*dx,ay+t*dy);
}
function polysOf(g){return g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[]}
function ringHas(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if(((yi>p[1])!==(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi))inside=!inside}return inside}
function insideAny(p,features){return features.some(f=>polysOf(f?.geometry).some(poly=>poly.length&&ringHas(p,poly[0])&&!poly.slice(1).some(r=>ringHas(p,r))))}
// Finders such as Lewisville/McKinney publish one school zone as many
// planning-area pieces. `zones` lists every piece of the same school zone per
// matched feature; an edge whose far side (probed ~8 m across) is still inside
// that same zone is internal and is not a school boundary.
function zoneBoundaryProximity(point,features,threshold=SCHOOL_ZONE_REVIEW_METERS,zones=null){
 if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||!Array.isArray(features)||!features.length)return null;
 const rad=Math.PI/180,R=6371008.8,c=Math.cos(point[1]*rad);
 let distance=Infinity;
 features.forEach((f,idx)=>{
  const siblings=Array.isArray(zones?.[idx])&&zones[idx].length?zones[idx]:[f];
  for(const piece of siblings)for(const rings of polysOf(piece?.geometry))for(const ring of rings||[]){
   if(!Array.isArray(ring)||ring.length<2)continue;
   for(let i=0;i<ring.length;i++){
    const a=ring[i===0?ring.length-1:i-1],b=ring[i];
    const d=distancePointToSegmentMeters(point,a,b);
    if(!(d<distance))continue;
    if(siblings.length>1&&d>0.5){
     // foot of perpendicular in local meters, then probe 8 m beyond it
     const ax=(a[0]-point[0])*rad*R*c,ay=(a[1]-point[1])*rad*R,bx=(b[0]-point[0])*rad*R*c,by=(b[1]-point[1])*rad*R;
     const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy,t=den>0?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/den)):0;
     const fx=ax+t*dx,fy=ay+t*dy,k=(d+8)/d;
     const probe=[point[0]+fx*k/(rad*R*c),point[1]+fy*k/(rad*R)];
     if(insideAny(probe,siblings))continue;
    }
    distance=d;
   }
  }
 });
 return Number.isFinite(distance)?{distanceMeters:Math.round(distance),review:distance<=threshold,thresholdMeters:threshold}:null;
}
if(typeof module!=='undefined')module.exports={distancePointToSegmentMeters,zoneBoundaryProximity,SCHOOL_ZONE_REVIEW_METERS};
