'use strict';
/* Opt-in school grade-boundary UAT; no edits to enrollment, rent, ZIP or school layers. */
(function(){
 if(!/\/school-grade-uat\.html$/i.test(location.pathname))return;
 const core=window.SchoolGradeZonesUatCore;
 if(!core)return;
 const $=id=>document.getElementById(id);
 const ui={ready:false,layer:null,city:'mckinney',threshold:'B',level:'elementary',reference:false,enabled:true,zoneReady:false,ratingsReady:false};
 const dissolveCache=new Map(); // Reuse unchanged official source polygons between filter changes.
 const districtURLs=Object.freeze({
  '043907':'https://www.mckinneyisd.net/page/attendance-zones-maps/',
  AISD:'https://www.allenisd.org/page/findaschool',
  LISD:'https://www.lisd.net/resources/families/school-locator',
  CFB:'https://www.cfbisd.edu/students/school-maps-locator-system'
 });
 function dashboard(){
  try{
   if(typeof map!=='undefined'&&map?.getZoom&&typeof state!=='undefined'&&state?.zoneData)
    return {map,state};
  }catch(_){}
  return null;
 }
 function safeText(tag,txt,className){
  const e=document.createElement(tag);
  if(className)e.className=className;
  e.textContent=String(txt??'');
  return e;
 }
 function infoLink(url,label){
  const a=document.createElement('a');
  a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';
  return a;
 }
 function popup(info){
  const box=safeText('div','','school-grade-popup');
  box.append(safeText('strong',info.school));
  box.append(safeText('div','TEA 2026 예비 등급: '+info.rating+' / '+info.score));
  box.append(safeText('div',info.kind==='finder-2026-elementary'
     ?'McKinney 2026–27 공식 Finder 연결 초등 경계 (주소·배정 예외는 별도 확인)'
     :info.kind==='historical'?'Allen 2019–23 과거 경계 · 현재 배정 아님'
     :'공식 Finder 연계 참고 경계 · 해당 학제 학년도 독립 확인 전'));
  box.append(infoLink('https://txschools.gov/?view=school&id='+encodeURIComponent(info.campusId)+'&lng=en','TEA 학교 등급 원문'));
  const url=districtURLs[info.district];
  if(url){box.append(safeText('span',' · '));box.append(infoLink(url,'학군 공식 주소 조회'))}
  return box;
 }
 function metrics(visible,stats,outline){
  const count=new Set(visible.map(v=>v.campusId)).size;
  $('schoolGradeAreaCount').textContent=count+'개 학교 / '+(outline?.groups.length??0)+'개 외곽 구역 묶음';
  $('schoolGradeJoinCount').textContent=
   (outline?.inputPieces??visible.length)+'개 원본 조각 → '+(outline?.independentPieces??0)+'개 독립 구역 · '+
   stats.matched+'개 등급 연결 · '+stats.nonRated+'개 미연결 · '+stats.unverified+'개 출처 차단';
 }
 function cityDetails(){
  if(ui.city==='mckinney')
   return 'McKinney: 초등 2026–27 공식 Finder 연동선만 우선 표시합니다. 중·고등은 연도 독립 검증 전 참고 구역입니다. 정확한 거주지 배정은 공식 조회가 필요합니다.';
  if(ui.city==='allen')
   return 'Allen: 보유한 2019–23 학교별 GIS는 과거 자료입니다. 우수 학교가 있다고 현행 배정구역을 확정할 수 없습니다.';
  return 'Carrollton: CFB는 승인된 학교별 경계가 없으며, LISD는 연도 미확인·일부 2025–26 GIS 참고선만 있습니다. 도시에 포함된 다른 학군도 자동으로 덮지 않습니다.';
 }
 function render(){
  if(!ui.ready)return;
  const db=dashboard();
  if(!db)return;
  const {map:m,state:s}=db;
  ui.layer.clearLayers();
  const cfg=core.DISTRICTS[ui.city],summary={matched:0,nonRated:0,unverified:0},selected=[];
  const haveRatings=Array.isArray(s.ratings)&&s.ratings.length>100&&s.ratingIndex instanceof Map;
  ui.ratingsReady=haveRatings;ui.zoneReady=!!s.zoneReady;
  const status=$('schoolGradeZoneStatus');
  if(!haveRatings||!s.zoneReady){
   status.textContent='학교 등급·경계 데이터를 확인하고 있습니다. 로딩 실패 시 영역을 표시하지 않습니다.';
   metrics(selected,summary);
   return;
  }
  for(const district of cfg.ids){
   const sourceKey=typeof districtZoneKey==='function'?districtZoneKey(district):district;
   const features=s.zoneData[sourceKey]||[];
   const error=s.zoneLoadErrors[sourceKey];
   if(error)continue;
   const result=core.build(features,s.ratings,typeof scoreRecord==='function'?scoreRecord:null,{
      district,level:ui.level,threshold:ui.threshold,showReference:ui.reference,
      liveFinder:s.liveFinder[district]===true
   });
   summary.matched+=result.matched;summary.nonRated+=result.nonRated;summary.unverified+=result.unverified;
   if(ui.enabled)selected.push(...result.visible);
  }
  // GIS dissolve happens separately for each validated campus. Source geometry
  // remains untouched and the disjoint outer islands/holes are preserved.
  const outlines=core.dissolveByCampus(selected,window.polygonClipping,dissolveCache);
  if(ui.enabled){
   for(const item of outlines.groups){
    const current=item.kind==='finder-2026-elementary';
    const palette={A:'#10886f',B:'#306cc4',C:'#bf842b'};
    const color=palette[item.rating];
    const layerSource=item.feature||{type:'FeatureCollection',features:item.fallback};
    const shape=L.geoJSON(layerSource,{pane:'schoolGradeZonesPane',interactive:true,
      style:{color,fillColor:color,stroke:!item.error,
       weight:2,dashArray:current?null:'7 5',fillOpacity:current?.25:.08,
       opacity:current?.96:.85}});
    shape.bindPopup(popup(item),{maxWidth:300});
    shape.bindTooltip(item.school+' · '+item.rating+' · '+
      (item.error?'채색만 표시 (외곽선 생성 실패)':current?'Finder 연결':'참고'),{sticky:true});
    ui.layer.addLayer(shape);
   }
  }
  metrics(selected,summary,outlines);
  const town=core.DISTRICTS[ui.city].name;
  const displayCount=new Set(selected.map(x=>x.campusId)).size;
  const reason=!ui.enabled?'지도 표시를 껐습니다.'
   :!selected.length?'선택한 조건과 검증 상태에서 표시할 학교 경계가 없습니다.'
   :displayCount+'개 학교 경계가 표시됐습니다.';
  status.textContent=town+' · '+reason+(outlines.errors.length?' '+outlines.errors.length+'개 학교는 경계 병합이 실패해 내부·외부 선 없이 채색만 표시합니다.':'')+' 같은 학교 안의 조각 경계는 제거하고 외곽선만 표시합니다. 이 지도는 학교별 등급·경계 참고자료이며, 주소별 초·중·고 배정이나 세 학제 동시 B 이상 지역을 뜻하지 않습니다.';
  $('schoolGradeZoneDisclaimer').textContent=cityDetails();
  window.__schoolGradeZonesUatDebug={
   city:ui.city,threshold:ui.threshold,level:ui.level,reference:ui.reference,
   drawn:selected.length,schools:displayCount,zoneReady:ui.zoneReady,ratingsReady:ui.ratingsReady,
   outlineGroups:outlines.groups.length,independentPieces:outlines.independentPieces,
   dissolvedGroups:outlines.mergedGroups,unionFailures:outlines.errors.length
  };
 }
 function addControls(map){
  const host=document.querySelector('.mapcol'),mapBox=host?.querySelector('.mapbox');
  if(!host||!mapBox||$('schoolGradeZonesPanel'))return false;
  const panel=document.createElement('section');
  panel.id='schoolGradeZonesPanel';
  panel.className='school-grade-zones';
  panel.setAttribute('aria-label','학교 등급별 배정 경계 UAT');
  panel.innerHTML=
   '<div class="sg-heading"><div><span class="sg-eyebrow">SCHOOL ZONES · UAT</span><h2>학교 등급별 구역 지도</h2></div><span class="sg-badge">TEA 2026 예비 평가</span></div>'+
   '<p class="sg-desc">선택 학제의 A/B/C 등급 학교에 연결된 경계만 색칠합니다. 같은 학교에 속하는 자잘한 내부 경계선은 합치고 바깥 윤곽만 표시합니다. ZIP·학교 위치가 아닌 학군 출처의 폴리곤을 사용합니다.</p>'+
   '<div class="sg-filters">'+
   '<label>지역 <select id="schoolGradeCity"><option value="mckinney">McKinney</option><option value="allen">Allen</option><option value="carrollton">Carrollton (CFB + LISD)</option></select></label>'+
   '<label>학교 학제 <select id="schoolGradeLevel"><option value="elementary">초등학교</option><option value="middle">중학교</option><option value="high">고등학교</option></select></label>'+
   '<label>최소 학교 등급 <select id="schoolGradeThreshold"><option value="A">A 등급만</option><option value="B" selected>B 등급 이상 (A+B)</option><option value="C">C 등급 이상 (A+B+C)</option></select></label>'+
   '<div class="sg-toggles"><label><input id="schoolGradeIncludeReference" type="checkbox">과거·학년도 미확인 참고 경계도 표시 (점선)</label>'+
   '<label><input id="schoolGradeEnabled" type="checkbox" checked>지도에 학교 등급 구역 표시</label></div></div>'+
   '<div class="sg-legend"><span><i class="sg-color a"></i>A</span><span><i class="sg-color b"></i>B</span><span><i class="sg-color c"></i>C</span><span><i class="sg-dashed"></i>점선 = 참고용</span></div>'+
   '<div class="sg-summary"><strong id="schoolGradeAreaCount">조회 중</strong><small id="schoolGradeJoinCount"></small></div>'+
   '<p id="schoolGradeZoneStatus" class="sg-status" role="status" aria-live="polite">학교 자료를 불러오는 중입니다.</p>'+
   '<p id="schoolGradeZoneDisclaimer" class="sg-disclaimer"></p>'+
   '<details class="sg-details"><summary>정확도 및 학교 배정 주의사항</summary><p>2026 TEA 예비 등급과 학군 배정 경계는 서로 다른 자료입니다. 이 화면은 선택 학제 1개 학교의 영역만 보여주며 초·중·고 모두 B 이상을 확정하지 않습니다. 과거·연도 미확인 경계는 점선 참고용이고, 실제 주소·학년·아파트/신입생 예외는 각 교육청 공식 Finder로 확인하십시오. CFB는 현재 승인된 캠퍼스별 경계가 없습니다.</p></details>';
  mapBox.before(panel);
  const pane=map.getPane('schoolGradeZonesPane')||map.createPane('schoolGradeZonesPane');
  pane.style.zIndex='430';pane.style.pointerEvents='auto';
  ui.layer=L.layerGroup().addTo(map);
  for(const [id,key] of [['schoolGradeCity','city'],['schoolGradeLevel','level'],['schoolGradeThreshold','threshold']]){
   $(id).addEventListener('change',()=>{
    ui[key]=$(id).value;
    if(key==='city'){const c=core.DISTRICTS[ui.city];map.stop();map.setView(c.center,c.zoom,{animate:false})}
    render();
   });
  }
  $('schoolGradeIncludeReference').addEventListener('change',()=>{ui.reference=$('schoolGradeIncludeReference').checked;render()});
  $('schoolGradeEnabled').addEventListener('change',()=>{ui.enabled=$('schoolGradeEnabled').checked;render()});
  ui.ready=true;
  return true;
 }
 let attempts=0;
 function start(){
  const db=dashboard();
  if(!db?.map||!window.L||!$('zipSelect')?.options.length){
   if(++attempts<150)setTimeout(start,250);
   else console.warn('School grade overlay UAT: base map unavailable');
   return;
  }
  if(!addControls(db.map))return;
  // Existing core loads both ratings and finder polygons asynchronously. Stop
  // retrying after success, or show unknown rather than inventing school zones.
  let checks=0;function ready(){
   render();
   const s=dashboard()?.state;
   if(s?.zoneReady&&s?.ratingIndex instanceof Map){window.__schoolGradeZonesUatReady=true;return;}
   if(++checks<120)setTimeout(ready,500);
   else {window.__schoolGradeZonesUatReady=true;render()}
  }
  ready();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
