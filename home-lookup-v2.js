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
function homeZoneMatches(ll,district){
  const point=[ll[1],ll[0]],seen=new Set();
  return (state.zoneData[district]||[]).filter(f=>geometryContains(point,f.geometry)).filter(f=>{
    const key=f.properties.gradeLevel+'|'+f.properties.school;
    if(seen.has(key))return false;seen.add(key);return true;
  });
}
function schoolAssignmentFor(item){
 return resolveAssignment({frisco:homeFriscoMatches(item.ll),prosper:homeZoneMatches(item.ll,'PROSPER'),lewisville:homeZoneMatches(item.ll,'LISD'),plano:homeZoneMatches(item.ll,'PISD_LOOKUP'),allen:window.allenAssignment?.(item.address,item.ll),ready:state.zoneReady&&!window.allenAssignmentLoading?.(),failed:!!state.assignmentLoadFailed||!!window.allenAssignmentFailed?.()});
}
function assignmentRating(p,district){
 if(['LISD','PROSPER'].includes(district)&&p.campusId){const byId=state.ratings.filter(r=>r.district===district&&r.id===p.campusId);if(byId.length===1)return byId[0]}
 const key=zoneNameKey(canonical(p.school));
 const hits=state.schools.filter(s=>s.district===district&&s.type===p.gradeLevel&&zoneNameKey(canonical(s.name))===key);
 return hits.length===1?scoreRecord(hits[0].name,district):scoreRecord(p.school,district);
}
function assignmentHtml(result){
 if(result.status==='conflict')return '<b>확인 필요 · 서로 다른 학군 자료가 겹칩니다.</b><br>경계나 아파트별 예외를 학군 공식 검색기에서 확인하세요.';
 if(result.status==='loading')return '학교 배정 자료를 불러오는 중입니다.';
 if(result.status==='error')return '학교 배정 자료를 불러오지 못했습니다. 새로고침하거나 학군 공식 검색기에서 확인하세요.';
 if(result.status==='unavailable')return '자동 연결 자료가 없습니다. 학교가 없다는 뜻은 아닙니다. 아래 학군 공식 검색기에서 주소를 확인하세요.';
 if(result.district==='AISD')return '<b>확인 필요 · 앨런 공식 주소표 (학년도 미표기)</b><br>'+[[result.allen[2],'elementary','K–6'],[result.allen[3],'middle','7–8'],[result.allen[4],'freshman','9'],[result.allen[5],'high','10–12']].map(([n,type,g])=>escape(n+' · '+g)+' <b>'+escape(allenSchoolRating(n,type))+'</b>').join('<br>')+'<br><span class="source">학군 경계와 실제 배정, 건물·호수별 예외는 학군에 확인하세요.</span>';
 const frisco=result.district==='FISD',prosper=result.district==='PROSPER',current=frisco||prosper;
 return '<b>'+(frisco?'최신 경계상 후보 · 프리스코 2026–27':prosper?'최신 경계상 후보 · 프로스퍼 2026–27':(result.district==='PISD'?'공식 검색기 경계 참고 · 플레이노':'과거·학년도 미확인 경계 참고 · 루이스빌'))+'</b><br>'+result.features.map(f=>{const p=f.properties;return escape(p.school+' · '+(p.grades||({elementary:'초등',middle:'중등',high:'고등'})[p.gradeLevel]||'학년 미확인'))+' <b>'+escape(ratingText(assignmentRating(p,result.district)))+'</b>'}).join('<br>')+(frisco&&result.features.some(f=>/nelson/i.test(f.properties.school))?'<br>넬슨 신규 학생은 웨스터 배정 예외 확인':'')+(current?'<br><span class="source">2026–27 공식 경계 기반 후보입니다. 실제 집 주소·학년·전학/특수 프로그램 예외·등록 자격은 학군 공식 검색기에서 확인하세요.</span>':'<br><span class="source">일부 레이어에 2025–26 표기. 현재 학년도 배정과 아파트 예외는 반드시 학군에 확인하세요.</span>');
}
function homeSchoolMatches(s){
 if(!home)return false;
 const result=home.assignment;if(!result||result.status!=='current'||result.district!==s.district)return false;
 const key=zoneNameKey(canonical(s.name)).replace(/\bk\s*4\b/g,'').trim();
 const schoolId=scoreRecord(s.name,s.district)?.id;
 return (result.features||[]).some(f=>f.properties.gradeLevel===s.type&&((schoolId&&f.properties.campusId===schoolId)||zoneNameKey(canonical(f.properties.school)).replace(/\bk\s*4\b/g,'').trim()===key));
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
  home.assignment=schoolAssignmentFor(home);const schoolText=assignmentHtml(home.assignment);
  const official='<details'+(['unavailable','error','conflict'].includes(home.assignment.status)?' open':'')+'><summary>학군별 공식 배정 확인</summary>'+Object.entries(OFFICIAL).map(([id,url])=>'<a class="cardlink" href="'+escape(url)+'" target="_blank" rel="noopener">'+escape(({FISD:'프리스코',PISD:'플레이노',AISD:'앨런',PROSPER:'프로스퍼',LISD:'루이스빌',CFB:'캐럴턴–파머스브랜치'})[id]||id)+' ↗</a>').join('')+'</details>';
  const office=el('destination').value.trim();
  el('homeSchoolInfo').innerHTML='<hr class="rule"><h2>집 주소 학교 후보</h2><div class="source">'+escape(home.address)+'</div><p>'+schoolText+'</p><div class="source">경계·학년·예외를 학군에서 확인하세요. 학교 위치나 ZIP은 배정을 보장하지 않습니다.</div>'+official;
  el('homeResult').innerHTML=office?'<div class="home-actions"><button type="button" class="mini-btn" id="homeRoute">집에서 운전시간 계산</button> <a class="cardlink" href="'+escape(homeDirections(false))+'" target="_blank" rel="noopener">집 → 회사 Google ↗</a> <a class="cardlink" href="'+escape(homeDirections(true))+'" target="_blank" rel="noopener">회사 → 집 ↗</a><div id="homeRouteStatus" class="source" role="status">집 주소 기준 · 교통량 미반영</div></div>':'목적지를 입력하세요.';
  const route=el('homeRoute');if(route)route.onclick=calculateHomeCommute;
}
function refreshHomeOffice(){if(!home)return;homeVersion++;homeRouteRequest?.abort();if(homeRouteLayer)homeRouteLayer.clearLayers();renderHome()}
function refreshHomeSchools(){if(home){homeVersion++;homeRouteRequest?.abort();renderHome()}}
function useHomeCandidate(candidate){
  if(!map){el('homeStatus').textContent='지도가 아직 준비되지 않았습니다. 잠시 후 주소 검색을 다시 눌러 주세요.';return false}
  homeVersion++;homeRouteRequest?.abort();
  home={address:candidate.address,ll:[candidate.location.y,candidate.location.x]};
  el('homeCandidates').replaceChildren();
  if(homeMarker)map.removeLayer(homeMarker);
  homeMarker=L.marker(home.ll,{zIndexOffset:4000,icon:L.divIcon({className:'',html:'<svg class="house-pin" width="42" height="42" viewBox="0 0 42 42" aria-hidden="true"><path d="M4 19L21 4l17 15h-4v17H8V19z" fill="white" stroke="#a72e2e" stroke-width="2"/><path d="M3 19L21 3l18 16-3 3L21 9 6 22z" fill="#d63737" stroke="white" stroke-width="1.5"/><path d="M18 36V24h7v12" fill="#d63737"/></svg>',iconSize:[42,42],iconAnchor:[21,37]}),title:'HOME'}).addTo(map).bindPopup('<b>HOME</b><br>'+escape(home.address));
  const matches=homeZipMatches(home.ll);
  if(matches.length===1)selectZip(matches[0].z,false);
  map.setView(home.ll,13);renderHome();drawSchools();drawList();el('homeStatus').textContent='검색 결과 위치를 지도에 표시했습니다. 주소와 핀을 확인하세요.';return true;
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
    const best=candidates[0];el('homeSearch').disabled=false;if(!useHomeCandidate(best))return;
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
