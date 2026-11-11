'use strict';
// Assistive-only bridge: a user manually transcribes district Finder school
// names into our existing TEA campus directory. Never claim automatic
// residence zoning, read iframe contents, or persist a household address.
(function(){
 const LEVELS=[['elementary','cfbManualElementary','초등'],['middle','cfbManualMiddle','중등'],['high','cfbManualHigh','고등']];
 let markerLayer=null;
 const byId=id=>document.getElementById(id);
 function catalog(){
  try {return typeof state!=='undefined'&&Array.isArray(state.schools)
   ?state.schools.filter(s=>s?.district==='CFB'&&LEVELS.some(([level])=>level===s.type)):[]}
  catch{return []}
 }
 function uniqueSchool(level,name){
  const rows=catalog().filter(s=>s.type===level&&s.name===name);
  return rows.length===1?rows[0]:null;
 }
 function populate(){
  const schools=catalog();
  for(const [level,id,label] of LEVELS){
   const select=byId(id);if(!select)return;
   const old=select.value;
   const list=schools.filter(s=>s.type===level).sort((a,b)=>a.name.localeCompare(b.name));
   const available=new Set();
   const options=[new Option('공식 결과에서 확인한 '+label+'학교','')];
   for(const s of list){
    if(available.has(s.name))continue;available.add(s.name);
    options.push(new Option(s.name,s.name));
   }
   select.replaceChildren(...options);
   if(available.has(old))select.value=old;
  }
  return schools.length;
 }
 function clearMarkers(){
  if(markerLayer){
   try{markerLayer.clearLayers();if(typeof map!=='undefined'&&map)map.removeLayer(markerLayer)}
   catch{}
   markerLayer=null;
  }
 }
 function status(message){const el=byId('cfbManualStatus');if(el)el.textContent=message}
 function showZone(s){if(typeof window!=='undefined')window.CFBZoneOverlay?.showForSchool?.(s)}
 function clearZone(){if(typeof window!=='undefined')window.CFBZoneOverlay?.reset?.()}
 function reset(){
  clearZone();
  clearMarkers();
  for(const [,id] of LEVELS){const el=byId(id);if(el)el.value=''}
  const cards=byId('cfbManualSchoolCards');cards?.replaceChildren();
  status('학교 선택이 초기화되었습니다. 주소를 바꾸면 이전 결과를 재사용하지 않습니다.');
 }
 function campusDetail(s){
  const record=typeof scoreRecord==='function'?scoreRecord(s.name,s.district):null;
  const grade=record?typeof ratingText==='function'?ratingText(record):'평가 연결됨':'TEA 평가 연결 안 됨';
  return grade+' · 위치 '+(Array.isArray(s.ll)&&s.ll.length===2?'참고 좌표 있음':'미확인');
 }
 function apply(){
  const selections=[];
  for(const [level,id,label] of LEVELS){
   const value=byId(id)?.value||'';if(!value)continue;
   const s=uniqueSchool(level,value);
   if(!s){status(label+'학교 이름이 현재 CFB 학교 목록과 유일하게 일치하지 않습니다. 다시 선택해 주세요.');return}
   selections.push({school:s,label});
  }
  if(!selections.length){status('공식 Finder에서 확인된 학교를 하나 이상 선택해 주세요.');return}
  clearMarkers();
  const cards=byId('cfbManualSchoolCards');cards?.replaceChildren();
  const locations=[];
  for(const {school:s,label} of selections){
   const card=document.createElement('div');card.className='cfb-manual-card';
   const title=document.createElement('strong');title.textContent=label+'학교 · '+s.name;
   const detail=document.createElement('p');detail.className='source';
   detail.textContent=campusDetail(s)+' · 사용자가 공식 Finder에서 직접 선택한 참고 정보';
   const button=document.createElement('button');button.type='button';button.className='mini-btn';
   button.textContent='학교 위치 보기';
   button.addEventListener('click',()=>{
    if(typeof schoolClicked==='function'){schoolClicked(s);showZone(s)}
    else status('학교 지도를 아직 불러오지 못했습니다.');
   });
   card.append(title,detail,button);cards?.appendChild(card);
   if(Array.isArray(s.ll)&&s.ll.length===2&&s.ll.every(Number.isFinite))locations.push({school:s,ll:s.ll});
  }
  if(typeof L!=='undefined'&&typeof map!=='undefined'&&map&&locations.length){
   markerLayer=L.layerGroup().addTo(map);
   for(const {school:s,ll} of locations){
    const letter=s.type==='elementary'?'초':s.type==='middle'?'중':'고';
    const icon=L.divIcon({className:'',html:'<div class="mapmark cfb-manual-campus">'+letter+'</div>',iconSize:[27,27],iconAnchor:[13,13]});
    const tooltip=document.createElement('span');
    tooltip.textContent=s.name+' · 사용자 확인 참고';
    L.marker(ll,{title:s.name,icon}).addTo(markerLayer)
      .bindTooltip(tooltip).on('click',()=>{if(typeof schoolClicked==='function'){schoolClicked(s);showZone(s)}});
   }
   if(locations.length>1)map.fitBounds(L.latLngBounds(locations.map(x=>x.ll)),{padding:[35,35],maxZoom:13});
   else map.setView(locations[0].ll,13);
  }
  if(selections.length===1)showZone(selections[0].school);else clearZone();
  status('학교 '+selections.length+'곳을 기존 TEA 목록에 연결했습니다. 이것은 사용자가 직접 선택한 정보이며 주소별 배정 자동 검증이나 현행 배정 폴리곤을 의미하지 않습니다.');
 }
 function init(){
  const panel=byId('cfbOfficialFinderPanel');
  const applyButton=byId('cfbManualApply'),resetButton=byId('cfbManualReset');
  if(!panel||!applyButton||!resetButton)return;
  byId('cfbOpenInlineFinder')?.addEventListener('click',()=>{
   const count=populate();if(!count)status('CFB 학교 목록을 불러오는 중입니다. 잠시 후 학교 선택란을 다시 열어 주세요.');
  });
  for(const [,id] of LEVELS)byId(id)?.addEventListener('focus',populate);
  applyButton.addEventListener('click',apply);
  resetButton.addEventListener('click',reset);
  byId('cfbCloseInlineFinder')?.addEventListener('click',reset);
  // Invalidate user-selected schools as soon as the researched home changes.
  byId('homeAddress')?.addEventListener('input',reset);
  byId('homeClear')?.addEventListener('click',reset);
  byId('homeForm')?.addEventListener('submit',reset);
  populate();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
