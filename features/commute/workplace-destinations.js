/* TX commute destinations: user-entered workplaces stay in this browser's storage.
   Address autocomplete calls Esri only while typing; routing remains in dashboard-main. */
(function(root) {
 'use strict';
 const KEY='tx-dashboard-workplaces-v1',MAX=10;
 const $=id=>document.getElementById(id);
 function validAddress(value) {
  const s=String(value||'').trim();
  return s.length>=12&&s.length<=200&&/\d/.test(s)&&/\b(?:TX|Texas)\b/i.test(s);
 }
 function normalizeRecords(value) {
  if(!Array.isArray(value))return [];
  const ids=new Set(),result=[];
  for(const r of value){
   if(result.length===MAX)break;
   if(!r||typeof r!=='object')continue;
   const id=String(r.id||'').slice(0,70),name=String(r.name||'').trim().slice(0,80),address=String(r.address||'').trim();
   if(!id||ids.has(id)||!name||!validAddress(address))continue;
   ids.add(id);result.push({id,name,address});
  }
  return result;
 }
 function loadRecords(storage) {
  try{return normalizeRecords(JSON.parse(storage?.getItem(KEY)||'[]'))}catch(_){return []}
 }
 function saveRecords(storage,records) {
  try{
   if(!storage) return false;
   storage.setItem(KEY,JSON.stringify(normalizeRecords(records)));
   return true;
  }catch(_){return false}
 }
 function init(){
  const dest=$('destination'),officeSelect=$('officeSelect');
  if(!dest||!officeSelect||typeof root.attachTexasAddressSuggestions!=='function')return;
  let storage=null;
  try{storage=root.localStorage}catch(_){}
  let records=loadRecords(storage),editing=null;
  const choiceId=id=>'saved:'+id;
  const findByAddress=address=>records.find(r=>r.address.toLowerCase()===String(address||'').trim().toLowerCase())||null;
  const addressForChoice=choice=>records.find(r=>choiceId(r.id)===choice)?.address||'';
  root.WorkplaceDestinations={findByAddress,addressForChoice,list:()=>records.map(x=>({...x}))};

  // Share the existing home-address autocomplete widget without sharing home state.
  const wrapper=document.createElement('div');
  wrapper.className='home-address-autocomplete commute-address-autocomplete';
  dest.parentNode.insertBefore(wrapper,dest);
  wrapper.appendChild(dest);
  dest.autocomplete='off';
  dest.setAttribute('role','combobox');
  dest.setAttribute('aria-autocomplete','list');
  dest.setAttribute('aria-haspopup','listbox');
  dest.setAttribute('aria-expanded','false');
  dest.setAttribute('aria-controls','destinationSuggestions');
  dest.setAttribute('aria-describedby','destinationPrivacy destinationSuggestHint');
  const clear=document.createElement('button');
  clear.type='button';clear.id='destinationClear';clear.className='workplace-clear';
  clear.textContent='×';clear.setAttribute('aria-label','출퇴근 목적지 지우기');
  clear.title='목적지 지우기';
  wrapper.appendChild(clear);
  const suggestions=document.createElement('div');
  suggestions.id='destinationSuggestions';suggestions.className='home-suggestion-list';
  suggestions.setAttribute('role','listbox');
  suggestions.setAttribute('aria-label','출퇴근 목적지 주소 추천');
  suggestions.hidden=true;wrapper.appendChild(suggestions);
  const hint=document.createElement('p');
  hint.id='destinationSuggestHint';hint.className='source';
  hint.textContent='번지와 도로명 일부를 입력하면 텍사스 주소를 추천합니다. ↑↓ 선택 · Enter 확정 · Esc 닫기.';
  wrapper.insertAdjacentElement('afterend',hint);
  function updateClear(){clear.hidden=!dest.value.trim()}
  root.attachTexasAddressSuggestions(dest,suggestions,item=>{
   dest.value=item.text;dest.dispatchEvent(new Event('input',{bubbles:true}));
  });
  clear.addEventListener('click',()=>{
   dest.value='';officeSelect.value='custom';
   dest.dispatchEvent(new Event('input',{bubbles:true}));
   dest.focus();
  });
  dest.addEventListener('input',updateClear);
  updateClear();

  const manager=document.createElement('details');
  manager.id='workplacesPanel';manager.className='workplaces-panel';
  manager.innerHTML='<summary>내 직장 등록 · 관리 <span class="workplace-summary-hint">선택 사항</span></summary>'+
   '<div class="workplaces-body"><p class="source">직장 이름·주소는 등록 버튼을 눌렀을 때만 이 브라우저의 로컬 저장소에 보관합니다. 공개 GitHub·서버에 동기화하지 않습니다. 같은 기기의 다른 사용자 또는 이 사이트의 스크립트는 브라우저 저장 내용을 읽을 수 있으며, 브라우저 데이터 삭제 시 사라집니다.</p>'+
   '<form id="workplaceForm" novalidate>'+
   '<div class="field"><label for="workplaceName">직장 이름</label><input id="workplaceName" maxlength="80" autocomplete="off" placeholder="예: 회사 사무실"></div>'+
   '<div class="field"><label for="workplaceAddress">직장 주소</label><div class="home-address-autocomplete commute-address-autocomplete"><input id="workplaceAddress" maxlength="200" autocomplete="off" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" aria-controls="workplaceSuggestions" placeholder="번지와 도로명 일부 입력"><div id="workplaceSuggestions" class="home-suggestion-list" role="listbox" aria-label="등록할 직장 주소 추천" hidden></div></div></div>'+
   '<div class="workplace-form-actions"><button id="workplaceSave" type="submit" class="mini-btn">직장 등록</button><button id="workplaceUseCurrent" type="button" class="mini-btn">현재 목적지 가져오기</button><button id="workplaceCancel" type="button" class="mini-btn" hidden>수정 취소</button></div>'+
   '</form><div id="workplaceStatus" class="source" role="status" aria-live="polite"></div><div id="workplaceList" class="workplace-list"></div>'+
   '<p class="source">자동완성 입력 중 일부 주소는 Esri로 전송되며, 도로 경로 계산 시 목적지 위치는 Nominatim/OSRM으로 전송될 수 있습니다. 입력 주소가 기밀 정보라면 사용하지 마세요.</p></div>';
  const officeField=dest.closest('.field');
  officeField.insertAdjacentElement('afterend',manager);
  const nameInput=$('workplaceName'),addressInput=$('workplaceAddress'),form=$('workplaceForm'),status=$('workplaceStatus'),list=$('workplaceList');
  root.attachTexasAddressSuggestions(addressInput,$('workplaceSuggestions'),item=>{
   addressInput.value=item.text;
   addressInput.dispatchEvent(new Event('input',{bubbles:true}));
  });
  function notice(message){status.textContent=message}
  function renderOptions(selected=null){
   officeSelect.querySelector('#savedWorkplaceChoices')?.remove();
   if(records.length){
    const group=document.createElement('optgroup');
    group.id='savedWorkplaceChoices';group.label='내가 등록한 직장 (이 기기)';
    for(const rec of records){
     const option=document.createElement('option');
     option.value=choiceId(rec.id);option.textContent=rec.name;group.appendChild(option);
    }
    officeSelect.appendChild(group);
   }
   if(selected&&[...officeSelect.options].some(x=>x.value===selected))officeSelect.value=selected;
   else {
    const match=findByAddress(dest.value);
    if(match)officeSelect.value=choiceId(match.id);
   }
  }
  function resetForm(){
   editing=null;form.reset();$('workplaceSave').textContent='직장 등록';
   $('workplaceCancel').hidden=true;
  }
  function activate(rec){
   dest.value=rec.address;
   dest.dispatchEvent(new Event('input',{bubbles:true}));
   officeSelect.value=choiceId(rec.id);
   updateClear();
   notice('목적지를 선택했습니다. 자동차 출퇴근 시간 확인을 눌러 계산하세요.');
  }
  function button(label,action){
   const b=document.createElement('button');
   b.type='button';b.className='mini-btn';b.textContent=label;
   b.addEventListener('click',action);
   return b;
  }
  function renderList(){
   list.replaceChildren();
   if(!records.length){
    const none=document.createElement('p');none.className='source';
    none.textContent='등록된 직장이 없습니다.';list.appendChild(none);return;
   }
   for(const rec of records){
    const row=document.createElement('div');row.className='workplace-entry';
    const summary=document.createElement('div');
    const name=document.createElement('strong');name.textContent=rec.name;
    const addr=document.createElement('small');addr.textContent=rec.address;
    summary.append(name,addr);row.appendChild(summary);
    const actions=document.createElement('div');actions.className='workplace-entry-actions';
    actions.append(
     button('선택',()=>activate(rec)),
     button('수정',()=>{
      editing=rec.id;manager.open=true;
      nameInput.value=rec.name;addressInput.value=rec.address;
      $('workplaceSave').textContent='변경 저장';$('workplaceCancel').hidden=false;
      nameInput.focus();notice('직장 정보를 수정하고 변경 저장을 누르세요.');
     }),
     button('삭제',()=>{
      const next=records.filter(x=>x.id!==rec.id);
      if(!saveRecords(storage,next)){notice('로컬 저장소에 접근하지 못해 삭제할 수 없습니다.');return}
      const wasCurrent=officeSelect.value===choiceId(rec.id);
      records=next;resetForm();renderOptions();renderList();
      if(wasCurrent){dest.value='';dest.dispatchEvent(new Event('input',{bubbles:true}));officeSelect.value='custom';updateClear()}
      notice('직장 등록 정보를 이 브라우저에서 삭제했습니다.');
     })
    );
    row.appendChild(actions);list.appendChild(row);
   }
  }
  $('workplaceUseCurrent').addEventListener('click',()=>{
   addressInput.value=dest.value.trim();
   addressInput.focus();
   notice('목적지 주소를 가져왔습니다. 직장 이름을 입력하고 등록하세요.');
  });
  $('workplaceCancel').addEventListener('click',()=>{resetForm();notice('수정을 취소했습니다.')});
  form.addEventListener('submit',event=>{
   event.preventDefault();
   const name=nameInput.value.trim(),address=addressInput.value.trim();
   if(!name||name.length>80){notice('직장 이름을 1~80자로 입력하세요.');nameInput.focus();return}
   if(!validAddress(address)){notice('번지와 TX/Texas가 포함된 실제 주소를 선택하거나 입력하세요.');addressInput.focus();return}
   if(!editing&&records.length>=MAX){notice('최대 '+MAX+'곳까지 등록할 수 있습니다.');return}
   const id=editing||('w'+Date.now().toString(36)+Math.random().toString(36).slice(2,8));
   const next=editing?records.map(r=>r.id===editing?{id,name,address}:r):[...records,{id,name,address}];
   if(!saveRecords(storage,next)){notice('브라우저 저장이 차단되었습니다. 직장이 등록되지 않았습니다.');return}
   records=normalizeRecords(next);resetForm();renderOptions(choiceId(id));renderList();
   const saved=records.find(r=>r.id===id);
   if(saved)activate(saved);
   notice('이 브라우저에 직장을 '+(editing?'변경':'등록')+'했습니다.');
  });
  renderOptions();renderList();
 }
 root.WorkplaceProfileModel={validAddress,normalizeRecords,loadRecords,saveRecords,KEY,MAX};
 if(typeof module==='object'&&module.exports)module.exports=root.WorkplaceProfileModel;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
 }
})(typeof window!=='undefined'?window:globalThis);
