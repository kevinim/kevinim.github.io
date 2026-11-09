'use strict';
// Addresses and coordinates are held in memory only. Geocoding is triggered by submit.
let home=null,homeMarker=null,homeCandidates=[],homeRequest=null,homeRouteRequest=null,homeParcelRequest=null,homeOfficialRequest=null,homeVersion=0,homeRouteLayer=null,homeAutocomplete=null;

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
 if(!item?.geocodeQuality?.usableForSchoolCandidate)return {status:'needs-address-verification'};
 const split=allenSplitApartmentException(item.typedAddress)||allenSplitApartmentException(item.address);
 if(split)return {status:'apartment-split-review',district:'AISD',exception:split};
 // Every polygon district in the registry is checked; no per-district list here.
 const polygons=Object.entries(DISTRICT_REGISTRY).map(([code,d])=>({district:code,status:districtPolygonStatus(code,state.liveFinder),features:d.address==='frisco'?homeFriscoMatches(item.ll):d.address==='polygon'?homeZoneMatches(item.ll,d.zoneKey):[]})).filter(p=>p.status);
 const found=resolveAssignment({polygons,allen:window.allenAssignment?.(item.address,item.ll),ready:state.zoneReady&&!window.allenAssignmentLoading?.(),failed:!!state.assignmentLoadFailed||!!window.allenAssignmentFailed?.()});
 if(!['current','finder-current'].includes(found.status))return found;
 if(found.district==='PISD'&&found.status==='finder-current'){
  const feeder=evaluatePlanoFeederAssignment(found.features,state.planoFeederReference);
  if(feeder.status!=='consistent')return {...found,status:'feeder-review',feeder};
 }
 const src=state.zoneData[districtZoneKey(found.district)]||[];
 const zoneKey=p=>p.school+'|'+p.gradeLevel+'|'+(p.grades||'');
 const near=zoneBoundaryProximity([item.ll[1],item.ll[0]],found.features,undefined,found.features.map(f=>src.filter(g=>zoneKey(g.properties)===zoneKey(f.properties))));
 return near?.review?{...found,status:found.status==='current'?'boundary-review':'finder-boundary-review',edge:near}:{...found,edge:near};
}
function assignmentRating(p,district){
 if(districtUsesCampusId(district)&&p.campusId){const byId=state.ratings.filter(r=>r.district===district&&r.id===p.campusId);if(byId.length===1)return byId[0]}
 const key=zoneNameKey(canonical(p.school));
 const hits=state.schools.filter(s=>s.district===district&&s.type===p.gradeLevel&&zoneNameKey(canonical(s.name))===key);
 return hits.length===1?scoreRecord(hits[0].name,district):scoreRecord(p.school,district);
}
function assignmentHtml(result){
 if(result.status==='apartment-split-review')return '<b>학군 경계가 건물·호수에 따라 갈리는 주소 · 학교 자동 배정 중단</b><br>'+escape(result.exception.note)+'<br><span class="source">집 주소의 지도 핀이나 Frisco/Allen 경계 도형만으로 학군을 결정할 수 없습니다. <a href="https://www.allenisd.org/page/findaschool" target="_blank" rel="noopener">Allen 공식 아파트 예외 목록 및 학교 확인</a>에서 건물과 호수를 검증하세요.</span>';
 if(result.status==='feeder-review'){
  const detail=result.feeder?.status==='source-unavailable'
   ?'공식 진학표 대조 자료를 읽지 못했습니다.'
   :result.feeder?.status==='ambiguous'
    ?'초등·중등·고등·Senior High 경계 후보가 한 학교로 특정되지 않습니다.'
    :'GIS의 초등·중등·고등·Senior High 조합이 Plano 공식 진학표의 어느 경로와도 일치하지 않습니다.';
  const observed=Object.entries(result.feeder?.observed||{}).map(([level,name])=>escape(level+': '+name)).join(' · ');
  return '<b>Plano 진학 경로 교차검증 필요 · 학교 자동 강조 중단</b><br>'+escape(detail)+
   (observed?'<br><span class="source">GIS 후보: '+observed+'</span>':'')+
   '<br><span class="source">공식 Finder의 주소별 결과를 확인하세요. 진학표 자체에 학년도 명시가 없어 2026–27 GIS 최신성을 확증하는 검증은 아닙니다. <a href="https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder" target="_blank" rel="noopener">Plano SchoolFinder</a> · <a href="https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/attendance-boundary-descriptions" target="_blank" rel="noopener">공식 진학표</a></span>';
 }
 if(result.status==='needs-address-verification')return '<b>주소 정밀도 확인 필요 · 자동 학교 배정을 표시하지 않습니다.</b><br>지도 핀이 실제 집·아파트 호수 위치인지 확인되지 않았습니다. 학군 공식 주소 검색기에서 다시 확인하세요.';
 if(result.status==='conflict')return '<b>확인 필요 · 서로 다른 학군 자료가 겹칩니다.</b><br>경계나 아파트별 예외를 학군 공식 검색기에서 확인하세요.';
 if(result.status==='loading')return '학교 배정 자료를 불러오는 중입니다.';
 if(result.status==='error')return '학교 배정 자료를 불러오지 못했습니다. 새로고침하거나 학군 공식 검색기에서 확인하세요.';
 if(result.status==='unavailable')return '자동 연결 자료가 없습니다. 학교가 없다는 뜻은 아닙니다. 아래 학군 공식 검색기에서 주소를 확인하세요.';
 if(result.district==='AISD')return '<b>확인 필요 · 앨런 공식 주소표 (학년도 미표기)</b><br>'+[[result.allen[2],'elementary','K–6'],[result.allen[3],'middle','7–8'],[result.allen[4],'freshman','9'],[result.allen[5],'high','10–12']].map(([n,type,g])=>escape(n+' · '+g)+' <b>'+escape(allenSchoolRating(n,type))+'</b>').join('<br>')+'<br><span class="source">학군 경계와 실제 배정, 건물·호수별 예외는 학군에 확인하세요.</span>';
 const frisco=result.district==='FISD',current=districtZoneDisplay(result.district,state.liveFinder)==='official',near=['boundary-review','finder-boundary-review'].includes(result.status);
 const planoYearWarning=result.district==='PISD'
  ?'<br><span class="source" data-plano-year-mismatch="true"><b>Plano 학년도 불일치 · 2026–27 배정 미인증:</b> 학군의 별도 공개 주소검색기(2026-11-09 조회)는 2024–25 학교 배정표를 표시했으며, 연결된 GIS 레이어 이름은 2025–26입니다. 현재 선택한 집 주소에 대한 2026–27 공식 배정으로 확정할 수 없습니다. 학군 현행 SchoolFinder/등록담당자에게 다시 확인하세요.</span>':'';
 const lisdFreshmanNote=result.district==='LISD'&&!result.features?.some(f=>f.properties?.gradeLevel==='freshman')
  ?'<br><span class="source" data-lisd-grade-nine-caveat="true"><b>9학년 캠퍼스 별도 확인 필요:</b> Lewisville ISD 공식 2026–27 School Locator는 초등·중등·9학년·고등을 각각 안내합니다. 현재 지도 GIS의 초등·중등·고등 3개 도형만으로 9학년 캠퍼스를 배정하거나 그 경계를 생성하지 않습니다. 공식 School Locator에서 정확한 집 주소의 9th Grade 결과를 확인하세요.</span>':'';

 return '<b>'+(near?'경계 인접 · 학교 배정 확인 필요':districtInfo(result.district)?.label?.[result.status]||'공식 경계 참고 · '+(districtName(result.district,'ko')||result.district))+'</b><br>'+(near?'<span class="source">집 지도 핀이 현재 GIS 경계에서 약 '+result.edge.distanceMeters+'m 떨어져 있습니다. '+result.edge.thresholdMeters+'m 검토 구간이므로 주소·학년·건물별 배정을 공식 검색기로 확인하세요.</span><br>':'')+result.features.map(f=>{const p=f.properties;return escape(p.school+' · '+(p.grades||({elementary:'초등',middle:'중등',high:'고등'})[p.gradeLevel]||'학년 미확인'))+' <b>'+escape(ratingText(assignmentRating(p,result.district)))+'</b>'}).join('<br>')+(frisco&&result.features.some(f=>/nelson/i.test(f.properties.school))?'<br>넬슨 신규 학생은 웨스터 배정 예외 확인':'')+lisdFreshmanNote+planoYearWarning+(current?'<br><span class="source">2026–27 공식 경계 기반 후보입니다. 실제 집 주소·학년·전학/특수 프로그램 예외·등록 자격은 학군 공식 검색기에서 확인하세요.</span>':'<br><span class="source">일부 레이어에 2025–26 표기. 현재 학년도 배정과 아파트 예외는 반드시 학군에 확인하세요.</span>');
}
function homeSchoolMatches(s){
 if(!home)return false;
 const result=home.assignment;
 // Allen: official address table (names, no polygons) -> highlight its campuses.
 if(result?.district==='AISD'&&result.status==='unverified-year')return allenRowMatchesSchool(s,result.allen,state.schools,canonical);
 if(!result||!['current','finder-current','boundary-review','finder-boundary-review'].includes(result.status)||result.district!==s.district)return false;
 const key=zoneNameKey(canonical(s.name)).replace(/\bk\s*4\b/g,'').trim();
 const schoolId=scoreRecord(s.name,s.district)?.id;
 return (result.features||[]).some(f=>schoolLevelMatchesAssignment(s,f.properties.gradeLevel)&&((schoolId&&f.properties.campusId===schoolId)||zoneNameKey(canonical(f.properties.school)).replace(/\bk\s*4\b/g,'').trim()===key));
}
function syncHomeClearVisibility(){
  const input=el('homeAddress'),button=el('homeClear');
  if(input&&button)button.hidden=!input.value.trim();
}
function clearHome(){
  homeVersion++;homeRequest?.abort();homeRouteRequest?.abort();homeParcelRequest?.abort();homeParcelRequest=null;homeOfficialRequest?.abort();homeOfficialRequest=null;home=null;homeCandidates=[];
  if(map&&homeMarker)map.removeLayer(homeMarker);homeMarker=null;
  if(typeof homeZoneGroup!=='undefined'&&homeZoneGroup)homeZoneGroup.clearLayers();
  el('homeCandidates').replaceChildren();el('homeResult').replaceChildren();el('homeSchoolInfo').replaceChildren();el('homeStatus').textContent='';if(homeRouteLayer)homeRouteLayer.clearLayers();
  el('homeSearch').disabled=false;if(map){drawSchools();drawList()}
}
async function geocodeAddress(address,signal,suggestion=null){
  const body=new URLSearchParams({SingleLine:address,f:'json',outFields:'Match_addr,Addr_type,Region,Postal',maxLocations:'5',forStorage:'false'});
  if(suggestion?.text===address&&suggestion.magicKey){
   body.set('magicKey',suggestion.magicKey);body.set('countryCode','USA');
   body.set('searchExtent',TEXAS_SUGGEST_EXTENT);body.set('location','-96.8,33.1');body.set('returnCollections','false');
  }
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
  const official='<details'+(['unavailable','error','conflict','needs-address-verification','boundary-review','finder-boundary-review','feeder-review','apartment-split-review'].includes(home.assignment.status)?' open':'')+'><summary>학군별 공식 배정 확인</summary>'+Object.entries(OFFICIAL).map(([id,url])=>{const safe=window.TrustedLinkPolicy?.official(url);return safe?'<a class="cardlink" href="'+escape(safe)+'" target="_blank" rel="noopener noreferrer">'+escape(districtName(id,'ko')||id)+' ↗</a>':''}).join('')+'</details>';
  const office=el('destination').value.trim();
  const parcel=home.parcel||{status:'idle'};
  const message=parcel.status==='idle'?'별도 필지 주소 대조를 실행할 수 있습니다.':parcel.status==='checking'?'Collin CAD 필지 확인 중…':parcel.reason||'필지 확인 불가';
  const parcelPanel='<div class="small-note" style="margin-top:10px"><b>Collin CAD 필지 주소 대조 (학교 배정과 별개)</b><div class="source" role="status">'+escape(message)+(parcel.parcelAddress?' · 조회된 필지: '+escape(parcel.parcelAddress):'')+'</div><button class="mini-btn" type="button" id="parcelCheck"'+(parcel.status==='checking'?' disabled':'')+'>필지 주소 대조</button><div class="source">버튼을 누르면 집 핀의 좌표를 Collin CAD에 전송합니다. 필지 일치가 초·중·고 배정을 의미하지 않습니다.</div></div>';
  el('homeSchoolInfo').innerHTML='<hr class="rule"><h2>집 주소 학교 후보</h2><div id="homeMapAssignmentStatus" class="small-note home-map-assignment-status" role="status" aria-live="polite"></div><div class="source">'+escape(home.address)+'</div><p>'+schoolText+'</p><div class="source">경계·학년·예외를 학군에서 확인하세요. 학교 위치나 ZIP은 배정을 보장하지 않습니다.</div>'+official+parcelPanel+officialReviewPanelHtml(home);
  wireOfficialReviewPanel(home);
  const parcelButton=el('parcelCheck');if(parcelButton)parcelButton.onclick=checkHomeParcel;
  el('homeResult').innerHTML=office?'<div class="home-actions"><button type="button" class="mini-btn" id="homeRoute">집에서 운전시간 계산</button> <a class="cardlink" href="'+escape(homeDirections(false))+'" target="_blank" rel="noopener">집 → 회사 Google ↗</a> <a class="cardlink" href="'+escape(homeDirections(true))+'" target="_blank" rel="noopener">회사 → 집 ↗</a><div id="homeRouteStatus" class="source" role="status">집 주소 기준 · 교통량 미반영</div></div>':'목적지를 입력하세요.';
  const route=el('homeRoute');if(route)route.onclick=calculateHomeCommute;
  if(typeof drawHomeAssignmentMap==='function')drawHomeAssignmentMap();
}
async function checkHomeParcel(){
 if(!home)return;
 homeParcelRequest?.abort();
 const target=home,controller=new AbortController();
 homeParcelRequest=controller;target.parcel={status:'checking'};renderHome();
 try{
  const r=await fetch(buildCollinParcelUrl(target.ll),{signal:controller.signal,cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const json=await r.json();
  if(home!==target||controller.signal.aborted)return;
  target.parcel=assessCollinParcelResult(target.address,json);
 }catch(e){
  if(e.name==='AbortError'||home!==target)return;
  target.parcel={status:'error',reason:'Collin CAD 조회가 실패했습니다. 학군 공식 주소 검색기로 확인하세요.'};
 }finally{
  if(home===target&&!controller.signal.aborted){homeParcelRequest=null;renderHome();}
 }
}

function officialReviewPanelHtml(item){
 const a=item.assignment||{},prior=item.officialDraft||{},v=k=>escape(String(prior[k]||''));
 const district=prior.district||a.district||'';
 const districts=OFFICIAL_REVIEW_DISTRICTS.map(x=>'<option value="'+x+'"'+(x===district?' selected':'')+'>'+escape(districtName(x)||x)+'</option>').join('');
 const level=prior.gradeLevel||'';
 const grades=OFFICIAL_REVIEW_LEVELS.map(x=>'<option value="'+x+'"'+(x===level?' selected':'')+'>'+escape(({elementary:'초등',middle:'중등',freshman:'9학년',high:'고등',senior:'Senior High'})[x])+'</option>').join('');
 const year=prior.schoolYear||'';
 const labels={'missing-input':'학군·학년·학교 이름을 입력하세요.','year-not-confirmed':'2026–27 학년도임을 확인하지 못해 비교 결과를 최신 배정 검증으로 취급하지 않습니다.','no-candidate':'대시보드에서 비교할 배정 후보가 없습니다. 공식 결과를 우선 확인하세요.','district-disagrees':'입력한 학군과 지도상 후보 학군이 다릅니다. 정밀 주소와 ISD 경계를 확인하세요.','no-unique-candidate':'해당 학년의 학교 후보가 없거나 여러 개라 1:1 대조가 불가능합니다.','name-unrecognized':'학교 이름을 정규화하지 못했습니다. 정확한 학교명을 다시 확인하세요.','manually-reported-match':'입력하신 공식 검색 결과의 학교명과 대시보드 후보가 일치합니다. 사용자 입력 기반 대조일 뿐 독립적인 공식 조회 확인은 아닙니다.','manually-reported-mismatch':'입력하신 공식 검색 결과와 대시보드 후보가 다릅니다. 대시보드 배정 후보를 신뢰하지 말고 공식 학군에 확인하세요.'};
 const result=item.officialReview;
 let msg=result?(result.kind==='prosper'?result.message:labels[result.status]||'대조 결과 확인 필요'):'대조를 아직 실행하지 않았습니다. 공식 결과를 확인하고 직접 입력하세요.';
 const label=result?.kind==='prosper'?'Prosper 공개 API 조회 결과':'사용자가 입력한 공식 결과 대조';
 const officialUrl=district==='PISD'?PLANO_2026_27_EXPERIENCE:OFFICIAL[district]||null;
 const currentYearLink=['PISD','PROSPER','LISD'].includes(district);
 const safeOfficialUrl=window.TrustedLinkPolicy?.official(officialUrl); const officialLink=safeOfficialUrl?'<a class="cardlink" href="'+escape(safeOfficialUrl)+'" target="_blank" rel="noopener noreferrer">'+(currentYearLink?'2026–27 학군 검색기 열기':'학군 공식 주소 검색기 열기')+'</a>':'';
 const note=district==='LISD'?'Lewisville 아파트는 주소 대신 별도의 Find an Apartment 검색을 이용하세요.':district==='AISD'?'Allen 아파트 건물·호수 예외가 있으므로 학교 등록 담당자 확인이 필요합니다.':district==='PISD'?'Plano Jackson Elementary는 Coit Rd 동·서쪽에 따라 상급 학교가 달라집니다.':'검색기에 주소·학년을 입력한 뒤 나온 학교명을 복사하세요.';
 const showProsper=district==='PROSPER'&&['current','boundary-review'].includes(a.status);
 return '<div class="small-note" id="officialReviewPanel" style="margin-top:10px"><b>공식 학군 주소 조회 결과 교차검증</b>'+
 '<div class="source">'+escape(note)+' 자료는 현재 화면에서만 유지되며 서버에 저장하지 않습니다.</div>'+officialLink+
 '<div class="field"><label for="officialReviewDistrict">학군</label><select id="officialReviewDistrict"><option value="">학군 선택</option>'+districts+'</select></div>'+
 '<div class="field"><label for="officialReviewLevel">학년 구분</label><select id="officialReviewLevel"><option value="">학년 선택</option>'+grades+'</select></div>'+
 '<div class="field"><label for="officialReviewName">공식 검색기에 표시된 학교명</label><input id="officialReviewName" maxlength="130" autocomplete="off" placeholder="학교 이름을 그대로 입력" value="'+v('schoolName')+'"></div>'+
 '<div class="field"><label for="officialReviewYear">공식 결과의 적용 학년도</label><select id="officialReviewYear"><option value="">학년도 미확인</option><option value="2026–27"'+(year==='2026–27'?' selected':'')+'>2026–27 확인</option><option value="older"'+(year==='older'?' selected':'')+'>이전 학년도·연도 불명</option></select></div>'+
 '<button type="button" class="mini-btn" id="officialManualCompare">입력한 결과와 비교</button>'+
 (showProsper?' <button type="button" class="mini-btn" id="officialProsperCheck"'+(item.officialChecking?' disabled':'')+'>Prosper 공식 좌표 조회</button>':'')+
 '<div class="source">Prosper 버튼을 누르면 집 핀 좌표가 학군이 연결한 Infofinder에 전송됩니다. 결과는 좌표의 학교 코드 비교이며 실제 주소·호수·등록 자격 확인은 아닙니다.</div>'+
 '<div class="source" id="officialReviewResult" role="status"><b>'+escape(label)+'</b> · '+escape(msg)+'</div></div>';
}
function wireOfficialReviewPanel(item){
 const get=id=>document.getElementById(id);
 const fields={district:'officialReviewDistrict',gradeLevel:'officialReviewLevel',schoolName:'officialReviewName',schoolYear:'officialReviewYear'};
 const update=()=>{
  if(home!==item)return;
  item.officialDraft=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,get(v)?.value||'']));
  item.officialReview=null;
  const status=get('officialReviewResult');if(status)status.textContent='입력 내용 변경됨 · 다시 비교 버튼을 눌러 확인하세요.';
 };
 for(const id of Object.values(fields))get(id)?.addEventListener('change',update);
 get('officialReviewName')?.addEventListener('input',update);
 get('officialManualCompare')?.addEventListener('click',()=>{
  update();if(home!==item)return;
  item.officialReview={kind:'manual',...compareManualSchoolResult(item.assignment,item.officialDraft)};
  renderHome();
 });
 get('officialProsperCheck')?.addEventListener('click',async()=>{
  if(home!==item)return;
  homeOfficialRequest?.abort();
  const ctrl=new AbortController();homeOfficialRequest=ctrl;item.officialChecking=true;renderHome();
  try{
   const response=await fetch(buildProsperOfficialPointUrl(item.ll),{cache:'no-store',signal:ctrl.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   const json=await response.json();if(home!==item||ctrl.signal.aborted)return;
   const verdict=compareProsperOfficialPoint(item.assignment,json);
   item.officialReview={kind:'prosper',...verdict,message:verdict.status==='official-point-codes-match'?'공식 Infofinder 좌표 조회 학교 코드가 GIS 후보 3개와 일치합니다. 실제 집 주소 배정은 별도 확인 필요.':verdict.status==='official-code-disagreement'?'공식 조회와 GIS 후보의 학교 코드가 불일치합니다. 주소·경계 재확인 필요.':'공식 조회 응답으로 대조를 완료하지 못했습니다.'};
  }catch(err){
   if(err.name==='AbortError'||home!==item)return;
   item.officialReview={kind:'prosper',status:'official-lookup-unavailable',message:'공식 조회를 브라우저에서 읽지 못했습니다(접근 제한 또는 네트워크 오류). 공식 검색기 링크로 확인하세요.'};
  }finally{
   if(home===item&&!ctrl.signal.aborted){item.officialChecking=false;homeOfficialRequest=null;renderHome();}
  }
 });
}

function refreshHomeOffice(){if(!home)return;homeVersion++;homeRouteRequest?.abort();if(homeRouteLayer)homeRouteLayer.clearLayers();renderHome()}
function refreshHomeSchools(){if(home){homeVersion++;homeRouteRequest?.abort();renderHome();drawSchools()}}
function useHomeCandidate(candidate){
  if(!map){el('homeStatus').textContent='지도가 아직 준비되지 않았습니다. 잠시 후 주소 검색을 다시 눌러 주세요.';return false}
  homeVersion++;homeRouteRequest?.abort();homeParcelRequest?.abort();homeParcelRequest=null;homeOfficialRequest?.abort();homeOfficialRequest=null;
  home={address:candidate.address,typedAddress:candidate.savedTypedAddress||el('homeAddress').value.trim(),ll:[candidate.location.y,candidate.location.x],geocodeQuality:candidate.savedGeocodeQuality||assessResidentialGeocode(el('homeAddress').value.trim(),candidate),parcel:candidate.savedParcel||{status:'idle'},officialReview:candidate.savedOfficialReview||null,officialDraft:candidate.savedOfficialDraft||null};
  el('homeCandidates').replaceChildren();
  if(homeMarker)map.removeLayer(homeMarker);
  homeMarker=L.marker(home.ll,{zIndexOffset:4000,icon:L.divIcon({className:'',html:'<svg class="house-pin" width="42" height="42" viewBox="0 0 42 42" aria-hidden="true"><path d="M4 19L21 4l17 15h-4v17H8V19z" fill="white" stroke="#a72e2e" stroke-width="2"/><path d="M3 19L21 3l18 16-3 3L21 9 6 22z" fill="#d63737" stroke="white" stroke-width="1.5"/><path d="M18 36V24h7v12" fill="#d63737"/></svg>',iconSize:[42,42],iconAnchor:[21,37]}),title:'HOME'}).addTo(map).bindPopup('<b>HOME</b><br>'+escape(home.address));
  const matches=homeZipMatches(home.ll);
  if(matches.length===1)selectZip(matches[0].z,false);
  map.setView(home.ll,13);renderHome();drawSchools();drawList();
   if(typeof focusHomeAssignedSchools==='function')focusHomeAssignedSchools();el('homeStatus').textContent='검색 결과 위치를 지도에 표시했습니다. 주소와 핀을 확인하세요.';syncHomeClearVisibility();return true;
}
// Similar addresses are shown rather than silently selecting an arbitrary school-zone pin.
function showHomeCandidateChoices(candidates){
 const panel=el('homeCandidates');
 panel.replaceChildren();
 const intro=document.createElement('p');
 intro.className='source';
 intro.textContent='검색된 주소가 여러 개입니다. 실제 집 주소를 선택하세요. 선택 후에도 학군 공식 검색기 확인이 필요합니다.';
 panel.appendChild(intro);
 const options=document.createElement('div');
 options.className='lisd-apartment-results';
 for(const candidate of candidates){
  const button=document.createElement('button');
  button.type='button';
  button.className='lisd-apartment-choice';
  const quality=assessResidentialGeocode(el('homeAddress').value.trim(),candidate);
  const label=document.createElement('strong');
  label.textContent=candidate.address;
  const detail=document.createElement('small');
  detail.textContent='일치도 '+(Number.isFinite(candidate.score)?Math.round(candidate.score):'미확인')+
   ' · '+(quality.usableForSchoolCandidate?'건물 주소 위치 후보':'학교 배정 자동 표시 제한');
  button.append(label,detail);
  button.addEventListener('click',()=>{
   if(useHomeCandidate(candidate)){
    homeCandidates=[];
    panel.replaceChildren();
    el('homeStatus').textContent='주소 직접 선택: '+candidate.address+' · 실제 학교 배정은 공식 학군 검색기로 검증하세요.';
   }
  });
  options.appendChild(button);
 }
 panel.appendChild(options);
}
async function searchHome(event,suggestion=null){
  event.preventDefault();const address=el('homeAddress').value.trim();
  homeAutocomplete?.dismiss();clearHome();
  if(!address){el('homeStatus').textContent='도로명과 도시, 텍사스 주를 포함한 주소를 입력하세요.';el('homeAddress').focus();return}
  const version=homeVersion;homeRequest=new AbortController();el('homeSearch').disabled=true;el('homeStatus').textContent='주소를 검색 중입니다…';
  try{
    const result=await geocodeAddress(address,homeRequest.signal,suggestion);if(version!==homeVersion)return;
    const {candidates,requiresSelection}=rankTexasHomeCandidates(address,result);
    homeCandidates=candidates;
    if(!candidates.length){el('homeStatus').textContent='텍사스 주소를 찾지 못했습니다. 도시와 TX, ZIP을 포함해 다시 입력하세요.';return}
    if(requiresSelection){
     showHomeCandidateChoices(candidates);
     el('homeStatus').textContent='서로 비슷한 주소 '+candidates.length+'개를 확인했습니다. 아래에서 정확한 집 주소를 선택하세요.';
     return;
    }
    const best=candidates[0];el('homeSearch').disabled=false;if(!useHomeCandidate(best))return;
    const requestedZip=[...address.matchAll(/\b\d{5}(?:-\d{4})?\b/g)].at(-1),returnedZip=[...best.address.matchAll(/\b\d{5}(?:-\d{4})?\b/g)].at(-1);const zipWarning=requestedZip&&returnedZip&&requestedZip[0].slice(0,5)!==returnedZip[0].slice(0,5)?' 입력한 ZIP과 검색된 ZIP이 다릅니다.':'';const quality=home.geocodeQuality;
    el('homeStatus').textContent='자동 선택: '+best.address+' · 일치도 '+(Number.isFinite(best.score)?Math.round(best.score):'미확인')+'.'+zipWarning+(quality?.usableForSchoolCandidate?' 건물 단위 위치 후보입니다. 등록 자격은 학군에 확인하세요.':' 좌표 신뢰도 부족: '+(quality?.reason||'공식 주소 검색을 이용하세요.'));
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
    if(version===homeVersion){routeRequestSeq++;if(routeGroup)routeGroup.clearLayers();if(targetMarker){map.removeLayer(targetMarker);targetMarker=null}state.dest=null;const line=data.routes?.[0]?.geometry;if(!line?.coordinates?.length)throw Error('경로 도형을 찾지 못했습니다.');if(!homeRouteLayer)homeRouteLayer=L.layerGroup().addTo(map);homeRouteLayer.clearLayers();const path=L.geoJSON(line,{style:{color:'#1757df',weight:5,opacity:.9}}).addTo(homeRouteLayer);const middle=line.coordinates[Math.floor(line.coordinates.length/2)];L.marker([middle[1],middle[0]],{interactive:false,icon:L.divIcon({className:'',html:'<span class="route-label">집 → 회사 '+Math.round(seconds/60)+'분</span>',iconSize:[130,30]})}).addTo(homeRouteLayer);L.marker([dest.y,dest.x],{icon:window.workDestinationIcon(L)}).addTo(homeRouteLayer).bindPopup('목적지: '+escape(office));map.fitBounds(path.getBounds(),{padding:[35,35],maxZoom:13});window.noteCommuteRouteDistance?.(data.routes?.[0]?.distance,'home');status.textContent='집 → 회사 약 '+Math.round(seconds/60)+'분 · OSRM 도로망 추정, 교통량 미반영. 실제 출근 시간은 Google Maps에서 확인하세요.';}
  }catch(error){if(error.name!=='AbortError'&&version===homeVersion)status.textContent='도로망 계산 실패: '+error.message+' Google Maps 링크로 확인하세요.'}
  finally{if(version===homeVersion&&el('homeRoute'))el('homeRoute').disabled=false}
}
document.addEventListener('DOMContentLoaded',()=>{
  homeAutocomplete=attachTexasAddressSuggestions(el('homeAddress'),el('homeSuggestions'),item=>searchHome({preventDefault(){}},item));
  el('homeForm').addEventListener('submit',searchHome);
  el('homeClear').addEventListener('click',()=>{homeAutocomplete?.dismiss();el('homeAddress').value='';clearHome();syncHomeClearVisibility();el('homeAddress').focus()});
  el('homeAddress').addEventListener('input',()=>{if(home||homeCandidates.length||homeRequest)clearHome();syncHomeClearVisibility()});
  syncHomeClearVisibility();
});
