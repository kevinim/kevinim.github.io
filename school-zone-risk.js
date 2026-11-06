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
function zoneBoundaryProximity(point,features,threshold=SCHOOL_ZONE_REVIEW_METERS){
 if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||!Array.isArray(features)||!features.length)return null;
 let distance=Infinity;
 for(const f of features){
  const g=f?.geometry,poly=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
  for(const rings of poly||[])for(const ring of rings||[]){
   if(!Array.isArray(ring)||ring.length<2)continue;
   for(let i=1;i<ring.length;i++)distance=Math.min(distance,distancePointToSegmentMeters(point,ring[i-1],ring[i]));
   if(ring.length>2)distance=Math.min(distance,distancePointToSegmentMeters(point,ring[ring.length-1],ring[0]));
  }
 }
 return Number.isFinite(distance)?{distanceMeters:Math.round(distance),review:distance<=threshold,thresholdMeters:threshold}:null;
}
if(typeof module!=='undefined')module.exports={distancePointToSegmentMeters,zoneBoundaryProximity,SCHOOL_ZONE_REVIEW_METERS};
