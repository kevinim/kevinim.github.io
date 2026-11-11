'use strict';
// Official 2025-26 jurisdiction ONLY. Not campus E/M/H attendance zones.
// Narrow source: Texas Legislative Council's public, CC-BY SchoolDistricts_SY2526.
// The map control only appears inside the existing opt-in CFB source atlas.
(function(root){
 const SRC='./data/carrollton-three-isd-boundaries-2025.geojson';
 const CODES=Object.freeze({'057903':'CFB','061902':'LISD','057905':'057905'});
 const OFFICIAL='https://services2.arcgis.com/5MVN2jsqIrNZD4tP/arcgis/rest/services/School_Districts__2026/FeatureServer/0';
 const MIN_SAFE_BOUNDARY_METERS=250;
 let data=null,promise=null,layer=null,clickListener=null;
 function inRing(lon,lat,ring){
  if(!Array.isArray(ring)||ring.length<4)return false;
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const [xi,yi]=ring[i],[xj,yj]=ring[j];
   if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
 }
 function inPoly(lon,lat,rings){
  return !!(rings?.length&&inRing(lon,lat,rings[0])&&!rings.slice(1).some(r=>inRing(lon,lat,r)));
 }
 function contains(geom,lon,lat){
  if(!geom||!Array.isArray(geom.coordinates))return false;
  if(geom.type==='Polygon')return inPoly(lon,lat,geom.coordinates);
  if(geom.type==='MultiPolygon')return geom.coordinates.some(g=>inPoly(lon,lat,g));
  return false;
 }
 function boundaryDistance(geom,lon,lat){
  const sets=geom?.type==='Polygon'?[geom.coordinates]:geom?.type==='MultiPolygon'?geom.coordinates:[];
  const mx=111320*Math.cos(lat*Math.PI/180),my=111320;
  let minimum=Infinity;
  for(const rings of sets)for(const ring of rings||[]){
   for(let i=1;i<ring.length;i++){
    const x1=(ring[i-1][0]-lon)*mx,y1=(ring[i-1][1]-lat)*my;
    const x2=(ring[i][0]-lon)*mx,y2=(ring[i][1]-lat)*my;
    const dx=x2-x1,dy=y2-y1;
    const t=Math.max(0,Math.min(1,((0-x1)*dx+(0-y1)*dy)/(dx*dx+dy*dy||1)));
    minimum=Math.min(minimum,Math.hypot(x1+t*dx,y1+t*dy));
   }
  }
  return minimum;
 }
 function validate(g){
  if(!g||g.type!=='FeatureCollection'||g.metadata?.sourceYear!=='2025-26'||
   g.metadata?.notSchoolAttendanceZones!==true||!Array.isArray(g.features)||g.features.length!==3)return null;
  const codes=g.features.map(f=>f.properties?.districtCode).sort().join(',');
  if(codes!=='057903,057905,061902')return null;
  for(const f of g.features){
   if(f.properties?.isSchoolAttendanceZone!==false||f.properties?.sourceSchoolYear!=='2025-26'||
    !['Polygon','MultiPolygon'].includes(f.geometry?.type))return null;
   const boxes=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
   for(const rings of boxes){
    if(!Array.isArray(rings)||!rings.length)return null;
    for(const ring of rings){
     if(!Array.isArray(ring)||ring.length<4||ring.length>25000)return null;
     for(const p of ring)if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||
      p[0]<-97.7||p[0]>-96.3||p[1]<32.4||p[1]>33.6)return null;
    }
   }
  }
  return g;
 }
 function pointLookup(geojson,ll){
  if(!geojson||!Array.isArray(ll)||ll.length!==2||!ll.every(Number.isFinite))return {status:'unavailable'};
  const [lat,lon]=ll;
  if(lat<32.4||lat>33.6||lon< -97.7||lon> -96.3)return {status:'outside-scope'};
  const features=geojson.features.filter(f=>contains(f.geometry,lon,lat));
  if(features.length!==1)return {status:features.length?'conflict':'outside-three-isd'};
  const feature=features[0],distanceMeters=boundaryDistance(feature.geometry,lon,lat);
  return {
   status:distanceMeters<MIN_SAFE_BOUNDARY_METERS?'boundary-review':'district-reference',
   district:CODES[feature.properties.districtCode],districtCode:feature.properties.districtCode,
   name:feature.properties.name,sourceYear:'2025-26',
   approximateBoundaryDistanceMeters:Math.round(distanceMeters),
   source:OFFICIAL,
   isResidentialAssignment:false,
   isSchoolAttendanceZone:false
  };
 }
 function lookup(ll){return pointLookup(data,ll)}
 async function load(){
  if(data)return data;
  if(!promise)promise=fetch(SRC,{cache:'no-store'}).then(r=>{
   if(!r.ok)throw Error('district GIS unavailable');
   return r.json();
  }).then(j=>{
   const verified=validate(j);
   if(!verified)throw Error('district GIS provenance invalid');
   data=verified;return verified;
  }).catch(e=>{promise=null;throw e});
  return promise;
 }
 function clearLayer(){
  if(layer){if(typeof map!=='undefined'&&map)map.removeLayer(layer);layer=null}
  if(clickListener&&typeof map!=='undefined'&&map){map.off('click',clickListener);clickListener=null}
 }
 function note(text){
  const e=typeof document!=='undefined'?document.getElementById('cfbDistrictOutlineStatus'):null;
  if(e)e.textContent=text;
 }
 function displayLookup(ll){
  const result=lookup(ll);
  if(result.status==='district-reference')note(result.name+' · 2025–26 학군 외곽 참고 · 이 위치의 초·중·고 배정학교는 공식 Finder로 확인');
  else if(result.status==='boundary-review')note(result.name+' 경계 인접 약 '+result.approximateBoundaryDistanceMeters+'m · 정확한 학군·학교 배정은 공식 Finder/학군에 확인');
  else note('이 지점은 세 학군 GIS의 확인 범위 밖이거나 위치가 불확실합니다. 학교 배정 추정 금지');
  return result;
 }
 async function toggle(button){
  if(layer){
   clearLayer();button?.setAttribute('aria-pressed','false');
   note('학군 외곽선 표시를 해제했습니다. 개별 학교 배정구역과는 별개입니다.');return;
  }
  try{
   const geo=await load();
   if(typeof L==='undefined'||typeof map==='undefined'||!map){
    note('지도가 아직 로드되지 않았습니다. 지도 표시 후 다시 눌러 주세요.');return;
   }
   const colors={'057903':'#38bdf8','061902':'#a78bfa','057905':'#fb923c'};
   layer=L.geoJSON(geo,{
    style:f=>({color:colors[f.properties?.districtCode]||'#8c9aab',weight:2.5,
     dashArray:'6 5',fillOpacity:0.035}),
    onEachFeature:(f,l)=>{
     const label=document.createElement('span');
     label.textContent=f.properties.name+' · 2025–26 학군 전체 경계 참고 (개별 학교 배정구역 아님)';
     l.bindTooltip(label);
    }
   }).addTo(map);
   const cfb=geo.features.find(f=>f.properties?.districtCode==='057903');
   if(cfb){const bounds=L.geoJSON(cfb).getBounds();if(bounds.isValid())map.fitBounds(bounds,{padding:[22,22],maxZoom:11,animate:false})}
   clickListener=e=>displayLookup([e.latlng.lat,e.latlng.lng]);
   map.on('click',clickListener);
   button?.setAttribute('aria-pressed','true');
   note('CFB(파랑) · Lewisville(보라) · Dallas(주황) 학군 전체 경계. 지도 클릭 시 해당 ISD 참고 판별. 2025–26 자료이며 개별 초·중·고 배정구역은 아닙니다.');
  }catch(e){clearLayer();note('학군 외곽 경계 자료를 불러오지 못했습니다. 공식 학군 Finder를 이용해 주세요.')}
 }
 function init(){
  const inner=document.querySelector('#cfbAtlas .cfb-atlas-inner');
  if(!inner||document.getElementById('cfbDistrictOutlineToggle'))return;
  const group=document.createElement('div');group.className='cfb-district-reference';
  const button=document.createElement('button');button.type='button';button.id='cfbDistrictOutlineToggle';
  button.className='mini-btn';button.textContent='CFB / Lewisville / Dallas 학군 외곽선 표시';
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>toggle(button));
  const info=document.createElement('p');info.id='cfbDistrictOutlineStatus';info.className='source';info.setAttribute('role','status');
  info.textContent='공식 2025–26 텍사스 학군 전체 경계 · 클릭해야 지도에 표시됩니다. 초·중·고 개별 배정선과 다릅니다.';
  const link=document.createElement('a');link.className='cardlink';link.href=OFFICIAL;
  link.rel='noopener noreferrer';link.target='_blank';link.textContent='Texas Legislative Council 경계 출처';
  group.append(button,info,link);
  inner.insertBefore(group,document.getElementById('cfbAtlasAreas'));
  document.getElementById('cfbCloseInlineFinder')?.addEventListener('click',()=>{
   clearLayer();button.setAttribute('aria-pressed','false');
  });
 }
 const api={validate,pointLookup,contains,boundaryDistance,lookup,load,MIN_SAFE_BOUNDARY_METERS};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof window!=='undefined')window.CfbJurisdiction=api;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
 }
})(typeof window!=='undefined'?window:null);
