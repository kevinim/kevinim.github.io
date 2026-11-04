'use strict';
// Addresses and coordinates are held in memory only. Geocoding is triggered by submit.
let home=null,homeMarker=null,homeCandidates=[],homeRequest=null,homeRouteRequest=null,homeVersion=0,homeRouteLayer=null;

function ringContains(point,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    if(((yi>point[1])!==(yj>point[1]))&&(point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function geometryContains(point,geometry){
  if(!geometry)return false;
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  return polygons.some(poly=>poly.length&&ringContains(point,poly[0])&&!poly.slice(1).some(r=>ringContains(point,r)));
}
function homeZipMatches(ll){
  const point=[ll[1],ll[0]];
  return DATA.filter(d=>{
    const featureCollection=state.polys[d.z]?.toGeoJSON();
    return featureCollection?.features?.some(f=>geometryContains(point,f.geometry));
  });
}
function homeFriscoMatches(ll){
  const point=[ll[1],ll[0]],seen=new Set();
  return (state.zoneData.FISD||[]).filter(f=>geometryContains(point,f.geometry)).filter(f=>{
    const key=f.properties.school+'|'+f.properties.grades;
    if(seen.has(key))return false;seen.add(key);return true;
  });
}
function homeSchoolMatches(s){
 if(!home||s.district!=='FISD')return false;
 const key=zoneNameKey(canonical(s.name)).replace(/\bk\s*4\b/g,'').trim();
 return (home.matches||[]).some(f=>f.properties.gradeLevel===s.type&&zoneNameKey(canonical(f.properties.school)).replace(/\bk\s*4\b/g,'').trim()===key);
}
function clearHome(){
  homeVersion++;homeRequest?.abort();homeRouteRequest?.abort();home=null;homeCandidates=[];
  if(map&&homeMarker)map.removeLayer(homeMarker);homeMarker=null;
  el('homeCandidates').replaceChildren();el('homeResult').replaceChildren();el('homeSchoolInfo').replaceChildren();el('homeStatus').textContent='';if(homeRouteLayer)homeRouteLayer.clearLayers();
  el('homeSearch').disabled=false;if(map){drawSchools();drawList()}
}
async function geocodeAddress(address,signal){
  const body=new URLSearchParams({SingleLine:address,f:'json',outFields:'Match_addr,Addr_type,Region,Postal',maxLocations:'5',forStorage:'false'});
  const response=await fetch('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates',{method:'POST',body,signal});
  if(!response.ok)throw Error('주소 검색 서비스 HTTP '+response.status);
  const json=await response.json();if(json.error)throw Error('주소 검색 서비스 오류');
  return (json.candidates||[]).filter(c=>Number.isFinite(c.location?.x)&&Number.isFinite(c.location?.y)&&c.location.x>=-107&&c.location.x<=-93&&c.location.y>=25&&c.location.y<=37);
}
function homeDirections(reverse){
  const destination=el('destination').value.trim(),point=home.ll.join(',');
  return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(reverse?destination:point)+'&destination='+encodeURIComponent(reverse?point:destination)+'&travelmode=driving';
}
function renderHome(){
  if(!home)return;
  const matches=homeZipMatches(home.ll),schools=homeFriscoMatches(home.ll);home.matches=schools;
  const zipText=matches.length?matches.map(d=>escape(d.z+' · '+d.name)).join(', '):'지도에 포함된 ZIP 경계를 확인하지 못했습니다.';
  const schoolText=!state.zoneReady?'학교 경계 데이터를 불러오는 중입니다.':schools.length?'<b>프리스코 2026–27 경계상 후보</b><br>'+schools.map(f=>escape(f.properties.school+' · '+f.properties.grades)).join('<br>')+(schools.some(f=>/nelson/i.test(f.properties.school))?'<br><b>넬슨 배정구역 신규 학생은 웨스터 배정 예외를 확인하세요.</b>':''):'이 위치에 적용할 수 있는 검증된 2026–27 학교별 경계를 확인하지 못했습니다.';
  const official='<details><summary>학군별 공식 배정 확인</summary>'+Object.entries(OFFICIAL).map(([id,url])=>'<a class="cardlink" href="'+escape(url)+'" target="_blank" rel="noopener">'+escape(({FISD:'프리스코',PISD:'플레이노',AISD:'앨런',PROSPER:'프로스퍼',LISD:'루이스빌',CFB:'캐럴턴–파머스브랜치'})[id]||id)+' ↗</a>').join('')+'</details>';
  const office=el('destination').value.trim();
  el('homeSchoolInfo').innerHTML='<hr class="rule"><h2>집 주소 학교 후보</h2><div class="source">'+escape(home.address)+'</div><p>'+schoolText+'</p><div class="source">경계·학년·예외를 학군에서 확인하세요. 학교 위치나 ZIP은 배정을 보장하지 않습니다.</div>'+official;
  el('homeResult').innerHTML=office?'<div class="home-actions"><button type="button" class="mini-btn" id="homeRoute">집에서 운전시간 계산</button> <a class="cardlink" href="'+escape(homeDirections(false))+'" target="_blank" rel="noopener">집 → 회사 Google ↗</a> <a class="cardlink" href="'+escape(homeDirections(true))+'" target="_blank" rel="noopener">회사 → 집 ↗</a><div id="homeRouteStatus" class="source" role="status">집 주소 기준 · 교통량 미반영</div></div>':'목적지를 입력하세요.';
  const route=el('homeRoute');if(route)route.onclick=calculateHomeCommute;
}
function refreshHomeOffice(){if(!home)return;homeVersion++;homeRouteRequest?.abort();if(homeRouteLayer)homeRouteLayer.clearLayers();renderHome()}
function refreshHomeSchools(){if(home){homeVersion++;homeRouteRequest?.abort();renderHome()}}
function useHomeCandidate(candidate){
  if(!map){el('homeStatus').textContent='지도가 아직 준비되지 않았습니다. 잠시 후 다시 선택하세요.';return}
  homeVersion++;homeRouteRequest?.abort();
  home={address:candidate.address,ll:[candidate.location.y,candidate.location.x]};
  el('homeCandidates').replaceChildren();
  if(homeMarker)map.removeLayer(homeMarker);
  homeMarker=L.marker(home.ll,{zIndexOffset:4000,icon:L.divIcon({className:'',html:'<svg class="house-pin" width="42" height="42" viewBox="0 0 42 42" aria-hidden="true"><path d="M4 19L21 4l17 15h-4v17H8V19z" fill="white" stroke="#a72e2e" stroke-width="2"/><path d="M3 19L21 3l18 16-3 3L21 9 6 22z" fill="#d63737" stroke="white" stroke-width="1.5"/><path d="M18 36V24h7v12" fill="#d63737"/></svg>',iconSize:[42,42],iconAnchor:[21,37]}),title:'HOME'}).addTo(map).bindPopup('<b>HOME</b><br>'+escape(home.address));
  const matches=homeZipMatches(home.ll);
  if(matches.length===1)selectZip(matches[0].z,false);
  map.setView(home.ll,13);renderHome();drawSchools();drawList();el('homeStatus').textContent='검색 결과 위치를 지도에 표시했습니다. 주소와 핀을 확인하세요.';
}
async function searchHome(event){
  event.preventDefault();const address=el('homeAddress').value.trim();clearHome();
  if(!address){el('homeStatus').textContent='도로명과 도시, 텍사스 주를 포함한 주소를 입력하세요.';el('homeAddress').focus();return}
  const version=homeVersion;homeRequest=new AbortController();el('homeSearch').disabled=true;el('homeStatus').textContent='주소를 검색 중입니다…';
  try{
    const candidates=await geocodeAddress(address,homeRequest.signal);if(version!==homeVersion)return;
    homeCandidates=candidates;
    if(!candidates.length){el('homeStatus').textContent='주소를 찾지 못했습니다. 도시와 ZIP을 포함해 다시 입력하세요.';return}
    candidates.sort((a,b)=>(Number.isFinite(b.score)?b.score:-1)-(Number.isFinite(a.score)?a.score:-1));
    const best=candidates[0];el('homeSearch').disabled=false;useHomeCandidate(best);
    const requestedZip=[...address.matchAll(/\b\d{5}(?:-\d{4})?\b/g)].at(-1),returnedZip=[...best.address.matchAll(/\b\d{5}(?:-\d{4})?\b/g)].at(-1);const zipWarning=requestedZip&&returnedZip&&requestedZip[0].slice(0,5)!==returnedZip[0].slice(0,5)?' 입력한 ZIP과 검색된 ZIP이 다릅니다.':'';el('homeStatus').textContent='자동 선택: '+best.address+' · 일치도 '+(Number.isFinite(best.score)?Math.round(best.score):'미확인')+'.'+zipWarning+' 주소와 지도 위치를 확인하세요.';
  }catch(error){if(error.name!=='AbortError'&&version===homeVersion)el('homeStatus').textContent='주소 검색에 실패했습니다. 연결 상태를 확인한 뒤 다시 시도하세요.'}
  finally{if(version===homeVersion)el('homeSearch').disabled=false}
}
async function calculateHomeCommute(){
  if(!home)return;const office=el('destination').value.trim();if(!office)return;
  homeRouteRequest?.abort();homeRouteRequest=new AbortController();const version=++homeVersion,button=el('homeRoute'),status=el('homeRouteStatus');
  button.disabled=true;status.textContent='회사 주소와 도로 경로를 확인 중입니다…';
  try{
    const hits=await geocodeAddress(office,homeRouteRequest.signal);if(!hits.length)throw Error('회사 주소를 찾지 못했습니다.');
    const dest=hits[0].location;const coords=home.ll[1]+','+home.ll[0]+';'+dest.x+','+dest.y;
    const response=await fetch('https://router.project-osrm.org/route/v1/driving/'+coords+'?overview=full&geometries=geojson',{signal:homeRouteRequest.signal});
    if(!response.ok)throw Error('도로망 서비스를 사용할 수 없습니다.');const data=await response.json();
    const seconds=data.routes?.[0]?.duration;if(!Number.isFinite(seconds))throw Error('경로를 찾지 못했습니다.');
    if(version===homeVersion){routeRequestSeq++;if(routeGroup)routeGroup.clearLayers();if(targetMarker){map.removeLayer(targetMarker);targetMarker=null}state.dest=null;const line=data.routes?.[0]?.geometry;if(!line?.coordinates?.length)throw Error('경로 도형을 찾지 못했습니다.');if(!homeRouteLayer)homeRouteLayer=L.layerGroup().addTo(map);homeRouteLayer.clearLayers();const path=L.geoJSON(line,{style:{color:'#1757df',weight:5,opacity:.9}}).addTo(homeRouteLayer);const middle=line.coordinates[Math.floor(line.coordinates.length/2)];L.marker([middle[1],middle[0]],{interactive:false,icon:L.divIcon({className:'',html:'<span class="route-label">집 → 회사 '+Math.round(seconds/60)+'분</span>',iconSize:[130,30]})}).addTo(homeRouteLayer);L.marker([dest.y,dest.x],{icon:L.divIcon({className:'',html:'<span class="route-label">목적지</span>',iconSize:[65,30],iconAnchor:[32,15]})}).addTo(homeRouteLayer).bindPopup('목적지: '+escape(office));map.fitBounds(path.getBounds(),{padding:[35,35],maxZoom:13});status.textContent='집 → 회사 약 '+Math.round(seconds/60)+'분 · OSRM 도로망 추정, 교통량 미반영. 실제 출근 시간은 Google Maps에서 확인하세요.';}
  }catch(error){if(error.name!=='AbortError'&&version===homeVersion)status.textContent='도로망 계산 실패: '+error.message+' Google Maps 링크로 확인하세요.'}
  finally{if(version===homeVersion&&el('homeRoute'))el('homeRoute').disabled=false}
}
document.addEventListener('DOMContentLoaded',()=>{
  el('homeForm').addEventListener('submit',searchHome);
  el('homeClear').addEventListener('click',()=>{el('homeAddress').value='';clearHome();el('homeAddress').focus()});
  el('homeAddress').addEventListener('input',()=>{if(home||homeCandidates.length||homeRequest)clearHome()});
});
