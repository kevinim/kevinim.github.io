'use strict';
/*
 * Manual school review bridge for a home/address search.
 * Does NOT infer official assignment or persist any residential address.
 * User selects campuses after viewing the district's official locator.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&typeof document!=='undefined'){
    root.HomeSchoolManualBridge=api;
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',api.init,{once:true});
    else api.init();
  }
})(typeof window!=='undefined'?window:null,function(root){
  const LEVELS=[
    ['elementary','초등학교'],
    ['middle','중학교'],
    ['high','고등학교']
  ];
  const PRIORITY=['LISD','CFB','057905','AISD','043907','PISD','FISD','PROSPER'];
  let activeHome=null,panel=null,districtSelect=null,link=null,selects={},status=null,cards=null,details=null,suggestButton=null;
  let appliedSchools=[];
  // In-memory GIS-to-form convenience only. This never queries the official
  // residential Finder result and never applies a school to the map.
  function previewSuggestions(current,schools){
    const reference=current?.mckinneyCrosscheck;
    if(reference?.kind!=='reference-only'||reference.district!=='043907'||
       reference.independentOfficialAddressVerified!==false||
       !Array.isArray(reference.candidates)||!Array.isArray(schools))return [];
    const levels=new Set(),indices=new Set(),result=[];
    for(const candidate of reference.candidates){
      const level=candidate?.level,school=candidate?.matchedSchool;
      if(!LEVELS.some(([key])=>key===level)||candidate.linked!==true||
         candidate.sourceYear&&candidate.sourceYear!=='2026-27'||!school||
         school.district!=='043907'||school.type!==level||
         typeof school.id!=='string'||!/^043907\\d{3}$/.test(school.id))continue;
      const index=schools.indexOf(school);
      if(index<0||(candidate.campusId&&candidate.campusId!==school.id))continue;
      // Conflicting matches cannot be used to prefill any school.
      if(levels.has(level)||indices.has(index))return [];
      levels.add(level);indices.add(index);
      result.push({level,index,name:school.name});
    }
    return LEVELS.flatMap(([level])=>result.filter(x=>x.level===level));
  }
  function selectedSchools(current){
    return current&&current===activeHome?appliedSchools.slice():[];
  }
  function notifyAddressFocus(){
    try{if(typeof renderAddressSchoolPriority==='function')renderAddressSchoolPriority()}catch{}
    try{if(typeof drawSchools==='function')drawSchools()}catch{}
    try{if(typeof drawList==='function')drawList()}catch{}
  }
  const byId=id=>document.getElementById(id);
  function catalog(schools,code,level){
    if(!Array.isArray(schools)||!/^[A-Z0-9]{3,8}$/.test(code||''))return [];
    if(!LEVELS.some(([k])=>k===level))return [];
    const arr=schools.filter(s=>s&&s.district===code&&s.type===level&&typeof s.name==='string'&&s.name);
    return arr.slice().sort((a,b)=>a.name.localeCompare(b.name,'en'));
  }
  function officialUrl(code,registry,policy){
    const raw=registry&&registry[code]?.official;
    if(typeof raw!=='string'||typeof policy!=='function')return null;
    try{return policy(raw)||null}catch{return null}
  }
  function activeHomeObject(){try{return typeof home!=='undefined'&&home?home:null}catch{return null}}
  function campusList(){try{return typeof state!=='undefined'&&Array.isArray(state.schools)?state.schools:[]}catch{return []}}
  function text(tag,className,value){
    const el=document.createElement(tag);
    if(className)el.className=className;
    el.textContent=value;
    return el;
  }
  function option(value,label){
    const el=document.createElement('option');
    el.value=value;el.textContent=label;return el;
  }
  function syncLink(){
    const code=districtSelect.value;
    const raw=typeof DISTRICT_REGISTRY!=='undefined'?DISTRICT_REGISTRY:null;
    const clean=officialUrl(code,raw,root?.TrustedLinkPolicy?.official);
    link.hidden=!clean;
    if(clean){link.href=clean;link.textContent='선택 학군 공식 주소 검색기 열기';}
    else link.removeAttribute('href');
  }
  function refreshDistrictOptions(){
    if(!districtSelect)return;
    districtSelect.replaceChildren(option('','학군 직접 선택 (주소 ZIP으로 자동 지정하지 않음)'));
    const codes=[...new Set(campusList().map(s=>s.district).filter(Boolean))];
    codes.sort((a,b)=> {
      const ai=PRIORITY.indexOf(a),bi=PRIORITY.indexOf(b);
      if(ai>=0||bi>=0)return (ai<0?999:ai)-(bi<0?999:bi);
      return a.localeCompare(b);
    });
    for(const code of codes){
      const info=typeof DISTRICT_REGISTRY!=='undefined'?DISTRICT_REGISTRY[code]:null;
      districtSelect.appendChild(option(code,info?.ko?info.ko+' ('+code+')':code));
    }
  }
  function fillSchools(){
    const schools=campusList(),code=districtSelect.value;
    for(const [level,label] of LEVELS){
      const el=selects[level];
      const previous=el.value;
      const eligible=catalog(schools,code,level);
      el.replaceChildren(option('','공식 Finder에서 확인한 '+label+' 선택'));
      for(const school of eligible){
        const idx=schools.indexOf(school);
        el.appendChild(option(String(idx),school.name));
      }
      if([...el.options].some(o=>o.value===previous))el.value=previous;
      else el.value='';
    }
    syncLink();
  }
  function reset(){
    appliedSchools=[];
    districtSelect.value='';
    for(const [level] of LEVELS)selects[level].value='';
    cards.replaceChildren();
    status.textContent='자동 배정학교 정보가 아니라 사용자가 공식 조회 후 직접 선택한 참고 목록입니다.';
    details.open=false;
    syncLink();
    fillSchools();
    notifyAddressFocus();
  }
  function drawCards(){
    cards.replaceChildren();
    const schools=campusList();
    const picked=[];
    for(const [level,label] of LEVELS){
      const id=selects[level].value;
      if(!/^\d+$/.test(id))continue;
      const school=schools[Number(id)];
      if(!school||school.district!==districtSelect.value||school.type!==level)continue;
      picked.push({school,label});
    }
    if(!picked.length){
      appliedSchools=[];
      notifyAddressFocus();
      status.textContent='공식 Finder에서 확인한 초·중·고 학교를 선택해 주세요.';
      return;
    }
    appliedSchools=picked.map(x=>x.school);
    notifyAddressFocus();
    status.textContent='학교 '+picked.length+'개를 참고 목록에 표시했습니다. 학군의 주소별 배정은 이 화면에서 독립 인증되지 않았습니다.';
    for(const {school,label} of picked){
      const card=document.createElement('article');
      card.className='home-manual-school-card';
      card.appendChild(text('strong','',label+' · '+school.name));
      let rating=null;
      try{if(typeof scoreRecord==='function')rating=scoreRecord(school.name,school.district)}catch{}
      card.appendChild(text('span','home-manual-rating',rating&&['A','B','C','D','F'].includes(rating.rating)
        ?'2026 TEA '+rating.rating+' · '+rating.score+'점':'TEA 등급 미확인'));
      const button=text('button','mini-btn','지도에서 학교 강조');
      button.type='button';
      button.addEventListener('click',function(){
        if(typeof schoolClicked==='function')schoolClicked(school,true);
      });
      card.appendChild(button);
      cards.appendChild(card);
    }
  }
  function update(){
    if(!panel)return;
    const current=activeHomeObject();
    panel.hidden=!current;
    if(current && !document.querySelector('link[data-home-school-bridge-css]')){
      const css=document.createElement('link');css.rel='stylesheet';
      css.href='./features/home-school-manual-bridge.css?v=1';
      css.dataset.homeSchoolBridgeCss='1';document.head.appendChild(css);
    }
    if(current!==activeHome){
      activeHome=current;
      if(current)refreshDistrictOptions();
      reset();
    }
    if(suggestButton)suggestButton.hidden=!current||
      previewSuggestions(current,campusList()).length===0;
  }
  function init(){
    const list=byId('schoolList'),homeInfo=byId('homeSchoolInfo');
    if(!list||!homeInfo||byId('homeManualSchoolBridge'))return;
    const shell=document.createElement('section');
    shell.id='homeManualSchoolBridge';
    shell.className='home-manual-school-bridge';
    shell.hidden=true;
    const top=text('p','home-manual-school-note',
      '주소별 배정학교는 아직 자동 인증되지 않았습니다. 공식 학군 Finder 결과를 직접 선택하면 그 학교만 아래 목록과 지도에 표시됩니다. ZIP 안의 다른 학교는 표시하지 않습니다.');
    shell.appendChild(top);
    suggestButton=text('button','mini-btn',
      'GIS 참고 후보를 초·중·고 선택란에 채우기 (배정 미인증)');
    suggestButton.id='homeManualMckinneyPrefill';
    suggestButton.type='button';suggestButton.hidden=true;
    suggestButton.addEventListener('click',function(){
      const matches=previewSuggestions(activeHome,campusList());
      if(!matches.length)return;
      districtSelect.value='043907';
      if(districtSelect.value!=='043907')return;
      fillSchools();
      for(const match of matches){
        const control=selects[match.level],value=String(match.index);
        if(!control||![...control.options].some(o=>o.value===value)){
          status.textContent='학교 목록이 갱신됐습니다. 공식 Finder에서 직접 확인해 주세요.';
          return;
        }
        control.value=value;
      }
      appliedSchools=[];cards.replaceChildren();details.open=true;
      status.textContent='GIS 참고 후보 '+matches.length+
        '개를 선택란에만 채웠습니다. 공식 2026–27 Finder에서 해당 주소의 초·중·고 결과와 각각 대조한 후 아래 표시 버튼을 누르세요. 이 기능은 배정 인증이 아닙니다.';
      notifyAddressFocus();
    });
    shell.appendChild(suggestButton);
    details=document.createElement('details');
    details.className='home-manual-school-details';
    details.appendChild(text('summary','','공식 배정 결과를 확인한 뒤 초·중·고 학교를 아래에 표시'));
    const body=document.createElement('div');body.className='home-manual-school-content';
    body.appendChild(text('p','source','공식 Finder에서 주소를 조회하고 나온 학교를 직접 선택하세요. 이 화면은 배정을 자동 인증하거나 저장하지 않습니다.'));
    const districtLabel=text('label','','학군 선택');
    districtLabel.htmlFor='homeManualDistrict';body.appendChild(districtLabel);
    districtSelect=document.createElement('select');districtSelect.id='homeManualDistrict';
    districtSelect.setAttribute('aria-label','공식 결과를 확인한 학군 선택');
    districtSelect.appendChild(option('','학군 직접 선택 (주소 ZIP으로 자동 지정하지 않음)'));
    refreshDistrictOptions();
    districtSelect.addEventListener('change',function(){
      fillSchools();cards.replaceChildren();appliedSchools=[];notifyAddressFocus();
      status.textContent='선택한 학군의 공식 결과를 확인한 후 학교를 선택하세요.';
    });
    body.appendChild(districtSelect);
    link=text('a','home-manual-official-link','선택 학군 공식 주소 검색기 열기');
    link.target='_blank';link.rel='noopener noreferrer';link.hidden=true;body.appendChild(link);
    for(const [level,label] of LEVELS){
      const field=document.createElement('div');field.className='home-manual-field';
      const l=text('label','',label);l.htmlFor='homeManual'+level;
      const select=document.createElement('select');select.id='homeManual'+level;
      select.setAttribute('aria-label','공식 조회로 확인한 '+label+' 선택');
      select.appendChild(option('','먼저 학군 선택'));
      field.append(l,select);body.appendChild(field);selects[level]=select;
    }
    const actions=document.createElement('div');actions.className='home-manual-actions';
    const apply=text('button','mini-btn','직접 선택한 학교를 아래에 표시');
    apply.type='button';apply.addEventListener('click',drawCards);
    actions.append(apply);body.appendChild(actions);
    status=text('p','source','');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    body.appendChild(status);
    cards=document.createElement('div');cards.className='home-manual-school-cards';
    body.appendChild(cards);
    details.appendChild(body);shell.appendChild(details);
    panel=shell;list.insertAdjacentElement('afterend',shell);
    const observer=new MutationObserver(update);
    observer.observe(homeInfo,{childList:true});
    update();
  }
  return Object.freeze({init,catalog,officialUrl,selectedSchools,previewSuggestions});
});
