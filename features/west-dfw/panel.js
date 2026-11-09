'use strict';
// Official-source navigation and geography shortcuts only.
// No school assignment, map polygon inference, third-party API call, or identity system.
(function(factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof window!=='undefined')window.WestDFWPanel=api;
})(function(){
 const REQUIRED_CODES=['220919','220907','061911','220906'];
 const LINK_HOSTS={
  '220919':'www.southlakecarroll.edu',
  '220907':'www.kellerisd.net',
  '061911':'www.nisdtx.org',
  '220906':'www.gcisd.net'
 };
 const SPECIAL_HOST='www.westlakeacademy.org';
 const ALLOWED_ZIPS=new Set(['76092','76262','76248','76034','76051','76052','76247']);
 let active=null;
 function safeLink(uri,host){
  try{const u=new URL(uri);return u.protocol==='https:'&&
    u.hostname===host&&!u.username&&!u.password&&!u.port&&
    !u.search&&!u.hash;}
  catch{return false;}
 }
 function validateConfig(config){
  if(config?.schemaVersion!==1||config.schoolYear!=='2026-27'||
     !Array.isArray(config.districts)||config.districts.length!==4||
     !Array.isArray(config.areas)||config.areas.length!==7)
    throw Error('west_config_schema_invalid');
  const codes=config.districts.map(d=>d?.code);
  if(new Set(codes).size!==4||REQUIRED_CODES.some(code=>!codes.includes(code)))
    throw Error('west_district_codes_invalid');
  for(const d of config.districts){
   if(typeof d.name!=='string'||typeof d.ko!=='string'||!d.name||!d.ko||
      !safeLink(d.officialUrl,LINK_HOSTS[d.code])||
      d.localSchoolPolygonCount!==0||
      !['external-official-finder-only','external-official-maps-only'].includes(d.boundaryStatus)||
      typeof d.sourceYear!=='string'||typeof d.notes!=='string'||
      (d.code==='220907'&&(!d.dataNote||!d.dataNote.includes('2018–19'))))
    throw Error('west_official_reference_invalid');
  }
  if(new Set(config.areas.map(a=>a?.zip)).size!==7||
      config.areas.some(a=>!ALLOWED_ZIPS.has(a?.zip)||
      typeof a.label!=='string'||typeof a.note!=='string'))
    throw Error('west_zip_options_invalid');
  if(config.specialSchool?.type!=='public-charter-not-neighborhood-assignment'||
     !safeLink(config.specialSchool.officialUrl,SPECIAL_HOST))
    throw Error('west_charter_reference_invalid');
  return config;
 }
 function element(doc,tag,cls,txt){
  const el=doc.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;
  return el;
 }
 function link(doc,label,url){
  const a=element(doc,'a','west-dfw-official',label);
  a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  return a;
 }
 function schoolCount(code,schools){
  return schools.filter(s=>s&&s.district===code&&
   ['elementary','middle','high'].includes(s.type)).length;
 }
 function refreshCounts(){
  if(!active)return;
  const rows=active.getSchools();
  if(!Array.isArray(rows))return;
  for(const [code,el] of active.counts){
   const n=schoolCount(code,rows);
   el.textContent='현재 지도 학교 목록 '+n+'개 · 경계 자동연결 미구성';
   el.dataset.count=String(n);
  }
  active.status.textContent='학교 위치는 기존 TEA·NCES 자료에 기반하며, 학교명·등급·배정은 최신 공식 검색기로 확인하세요.';
 }
 async function mount({document:doc,getZips,getSchools,onSelectZip,fetchFn}={}){
  if(!doc||typeof getZips!=='function'||typeof getSchools!=='function'||
     typeof onSelectZip!=='function'||typeof fetchFn!=='function')
    throw Error('west_panel_dependencies_missing');
  const target=doc.getElementById('westDfwPanel');
  if(!target)throw Error('west_panel_container_missing');
  const status=doc.getElementById('westDfwStatus');
  if(!status)throw Error('west_panel_status_missing');
  target.dataset.state='loading';
  let config;
  try{
   const res=await fetchFn('./data/west-dfw-districts-2026.json',{cache:'no-store'});
   if(!res.ok)throw Error('west_data_http_unavailable');
   config=validateConfig(await res.json());
  }catch{
   target.dataset.state='unavailable';
   status.textContent='서부 학군 공식 출처 정보를 확인할 수 없습니다. 자동 배정 결과를 제공하지 않습니다.';
   return {ready:false};
  }
  const wrapper=doc.getElementById('westDfwContent');
  if(!wrapper)throw Error('west_panel_content_missing');
  wrapper.replaceChildren();
  const description=element(doc,'p','west-dfw-note',
    '도시·ZIP은 학군 배정 경계가 아닙니다. 학교 위치와 평가 자료만 추가 탐색할 수 있으며, 이 4개 학군의 학교별 경계선은 아직 지도에 연결하지 않았습니다.');
  wrapper.appendChild(description);
  const head=element(doc,'h4','west-dfw-subhead','서부 지역 바로 보기 · ZIP 통계 구역');
  wrapper.appendChild(head);
  const zipButtons=element(doc,'div','west-dfw-zips');
  const available=new Set(getZips().map(x=>x.z));
  for(const area of config.areas){
   const button=element(doc,'button','west-dfw-zip',area.label+' · '+area.zip);
   button.type='button';button.dataset.zip=area.zip;
   button.title=area.note;button.setAttribute('aria-label',area.label+' ZIP '+area.zip+' 지도에서 보기');
   button.disabled=!available.has(area.zip);
   button.addEventListener('click',()=>{
    if(!available.has(area.zip))return;
    onSelectZip(area.zip);
    status.textContent=area.label+' ZIP '+area.zip+' 선택됨. 해당 ZIP 안의 학교가 배정 학교라는 뜻은 아닙니다.';
   });
   zipButtons.appendChild(button);
  }
  wrapper.appendChild(zipButtons);
  wrapper.appendChild(element(doc,'h4','west-dfw-subhead','서부 학군 공식 학교 배정 확인'));
  const grid=element(doc,'div','west-dfw-grid');
  const counters=new Map();
  for(const d of config.districts){
   const card=element(doc,'div','west-dfw-district');
   card.dataset.district=d.code;
   const name=element(doc,'b',null,d.name+' · '+d.ko);
   card.appendChild(name);
   const count=element(doc,'span','west-dfw-count','학교 목록 로딩 중');
   counters.set(d.code,count);
   card.appendChild(count);
   card.appendChild(element(doc,'small',null,
     d.sourceYear==='not verified'?'학년도 독립 검증 필요 · 자동 경계 없음':
       '공식 출처 '+d.sourceYear+' · 자동 경계 없음'));
   if(d.dataNote)card.appendChild(element(doc,'small','west-dfw-vintage-warning',d.dataNote));
   card.appendChild(link(doc,'공식 학교 찾기 / 배정 지도',d.officialUrl));
   // Address lookup must be user-initiated on the district's own website.
   // The GCISD link is a static map: do not label it an address search.
   const finder=typeof window!=='undefined'?window.WestSchoolOfficialFinder?.lookup(d.code):null;
   if(finder&&finder.url!==d.officialUrl){
    card.appendChild(window.WestSchoolOfficialFinder.createAnchor(doc,d.code));
   }
   grid.appendChild(card);
  }
  wrapper.appendChild(grid);
  const special=element(doc,'p','west-dfw-note',
    'Westlake Academy는 별도 공립 차터스쿨입니다. Westlake 거주 우선 규칙과 입학 절차를 확인해야 하며 76262 ZIP만으로 우선 자격이 생기지는 않습니다. ');
  special.appendChild(link(doc,'Westlake Academy 입학 안내',config.specialSchool.officialUrl));
  wrapper.appendChild(special);
  const foot=element(doc,'p','west-dfw-note',
   'Northwest ISD는 공식 검색기에서 2026–27학년도를 선택하세요. 2027–28 변경안은 현행 배정으로 사용하지 않습니다.');
  wrapper.appendChild(foot);
  target.dataset.state='ready';
  active={counts:counters,status,getSchools};
  // Both school loading and panel fetch are asynchronous. Update on either order.
  refreshCounts();
  return {ready:true,codeCount:config.districts.length,zipCount:config.areas.length};
 }
 return {validateConfig,safeLink,schoolCount,mount,refreshCounts,REQUIRED_CODES};
});