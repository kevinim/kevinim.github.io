'use strict';
// Addresses and coordinates are held in memory only. Geocoding is triggered by submit.
let home=null,homeMarker=null,homeCandidates=[],homeRequest=null,homeRouteRequest=null,homeVersion=0;

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
function clearHome(){
  homeVersion++;homeRequest?.abort();homeRouteRequest?.abort();home=null;homeCandidates=[];
  if(map&&homeMarker)map.removeLayer(homeMarker);homeMarker=null;
  el('homeCandidates').replaceChildren();el('homeResult').replaceChildren();el('homeStatus').textContent='';
  el('homeSearch').disabled=false;
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
  const matches=homeZipMatches(home.ll),schools=homeFriscoMatches(home.ll);
  const zipText=matches.length?matches.map(d=>escape(d.z+' · '+d.name)).join(', '):'지도에 포함된 ZIP 경계를 확인하지 못했습니다.';
  const schoolText=!state.zoneReady?'학교 경계 데이터를 불러오는 중입니다.':schools.length?'<b>Frisco 2026–27 경계상 후보</b><br>'+schools.map(f=>escape(f.properties.school+' · '+f.properties.grades)).join('<br>'):'이 위치에 적용할 수 있는 검증된 2026–27 학교별 경계를 확인하지 못했습니다.';
  const official=Object.entries(OFFICIAL).map(([id,url])=>'<a class="cardlink" href="'+escape(url)+'" target="_blank" rel="noopener">'+escape(({FISD:'Frisco',PISD:'Plano',AISD:'Allen',PROSPER:'Prosper',LISD:'Lewisville',CFB:'Carrollton–FB'})[id]||id)+' ↗</a>').join('');
  const office=el('destination').value.trim();
  el('homeResult').innerHTML='<div class="small-note" style="margin-top:10px"><b>HOME</b><br>'+escape(home.address)+'<p><b>지역:</b> '+zipText+'</p><p>'+schoolText+'</p><p>경계와 학교별 예외·학년은 학군의 주소 검색으로 반드시 확인하세요. ZIP 경계는 USPS 배달 주소와 다를 수 있습니다.</p>'+official+'<p><b>목적지:</b> '+escape(office||'선택되지 않음')+'</p>'+(office?'<a class="cardlink" href="'+escape(homeDirections(false))+'" target="_blank" rel="noopener">집 → 회사 Google Maps ↗</a><a class="cardlink" href="'+escape(homeDirections(true))+'" target="_blank" rel="noopener">회사 → 집 ↗</a><button type="button" class="mini-btn" id="homeRoute">집에서 운전시간 계산</button>':'목적지를 입력하세요.')+'<div id="homeRouteStatus" class="source">교통량 미반영 도로망 계산 또는 Google Maps에서 출발시간을 선택하세요.</div></div>';
  const route=el('homeRoute');if(route)route.onclick=calculateHomeCommute;
}
function refreshHomeOffice(){if(!home)return;homeVersion++;homeRouteRequest?.abort();renderHome()}
function refreshHomeSchools(){if(home){homeVersion++;homeRouteRequest?.abort();renderHome()}}
function useHomeCandidate(candidate){
  if(!map){el('homeStatus').textContent='지도가 아직 준비되지 않았습니다. 잠시 후 다시 선택하세요.';return}
  homeVersion++;homeRouteRequest?.abort();
  home={address:candidate.address,ll:[candidate.location.y,candidate.location.x]};
  el('homeCandidates').replaceChildren();
  if(homeMarker)map.removeLayer(homeMarker);
  homeMarker=L.marker(home.ll,{zIndexOffset:4000,icon:L.divIcon({className:'',html:'<div class="mapmark zip" style="width:54px;border-radius:9px">HOME</div>',iconSize:[54,27],iconAnchor:[27,14]}),title:'HOME'}).addTo(map).bindPopup('<b>HOME</b><br>'+escape(home.address));
  const matches=homeZipMatches(home.ll);
  if(matches.length===1)selectZip(matches[0].z,false);
  map.setView(home.ll,13);el('homeStatus').textContent='검색 결과 위치를 지도에 표시했습니다. 주소와 핀을 확인하세요.';renderHome();
}
async function searchHome(event){
  event.preventDefault();const address=el('homeAddress').value.trim();clearHome();
  if(!address){el('homeStatus').textContent='도로명과 도시, 텍사스 주를 포함한 주소를 입력하세요.';el('homeAddress').focus();return}
  const version=homeVersion;homeRequest=new AbortController();el('homeSearch').disabled=true;el('homeStatus').textContent='주소를 검색 중입니다…';
  try{
    const candidates=await geocodeAddress(address,homeRequest.signal);if(version!==homeVersion)return;
    homeCandidates=candidates;
    if(!candidates.length){el('homeStatus').textContent='주소를 찾지 못했습니다. 도시와 ZIP을 포함해 다시 입력하세요.';return}
    el('homeStatus').textContent='아래에서 정확한 주소를 선택하세요. 위치 정확도는 공급자에 따라 다릅니다.';
    candidates.forEach((c,index)=>{const b=document.createElement('button');b.type='button';b.className='school';b.textContent=c.address+' · 일치도 '+Math.round(c.score);b.onclick=()=>useHomeCandidate(homeCandidates[index]);el('homeCandidates').appendChild(b)});
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
    const response=await fetch('https://router.project-osrm.org/route/v1/driving/'+coords+'?overview=false',{signal:homeRouteRequest.signal});
    if(!response.ok)throw Error('도로망 서비스를 사용할 수 없습니다.');const data=await response.json();
    const seconds=data.routes?.[0]?.duration;if(!Number.isFinite(seconds))throw Error('경로를 찾지 못했습니다.');
    if(version===homeVersion)status.textContent='집 → 회사 약 '+Math.round(seconds/60)+'분 · OSRM 도로망 추정, 교통량 미반영. 실제 출근 시간은 Google Maps에서 확인하세요.';
  }catch(error){if(error.name!=='AbortError'&&version===homeVersion)status.textContent='도로망 계산 실패: '+error.message+' Google Maps 링크로 확인하세요.'}
  finally{if(version===homeVersion&&el('homeRoute'))el('homeRoute').disabled=false}
}
document.addEventListener('DOMContentLoaded',()=>{
  el('homeForm').addEventListener('submit',searchHome);
  el('homeClear').addEventListener('click',()=>{el('homeAddress').value='';clearHome();el('homeAddress').focus()});
  el('homeAddress').addEventListener('input',()=>{if(home||homeCandidates.length||homeRequest)clearHome()});
});
