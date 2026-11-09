'use strict';
/* P0 region quick assessment: read existing public local datasets and existing
 * dashboard state. All results are region/ZIP context, NOT home certification. */
(function(){
  const core=window.AreaAssessmentCore;
  if(!core)return;
  const $=id=>document.getElementById(id);
  const labels=[
    {id:'schools',title:'학교 현황',target:'schools',detail:'ZIP 내 학교 위치 기준 · 주소별 배정 아님'},
    {id:'hazards',title:'자연재해 기록',target:'hazards',detail:'NOAA 카운티 보고 · FEMA 지도에서 상세 확인'},
    {id:'crime',title:'도시 범죄 신고율',target:'crime',detail:'FBI 도시 전체 자료 · 이 ZIP의 실제 범죄율 아님'},
    {id:'commute',title:'통근 기준시간',target:'commute',detail:'ZIP 대표점 도로망 · 피크 교통량 미반영'}
  ];
  const rows={};
  let countyIndex=null,noaaRows=null,loadError=false,paintScheduled=false;
  function node(tag,cls,text){
    const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
  }
  function makePanel(){
    const parent=document.querySelector('.home-controls');if(!parent||$('areaQuickAssessment'))return;
    const section=node('section','area-qa');
    section.id='areaQuickAssessment';section.setAttribute('aria-labelledby','areaQaTitle');
    const top=node('div','area-qa-top');
    top.append(node('h3','', '지역 빠른 점검'),node('span','area-qa-zip','ZIP 확인 중'));
    top.firstChild.id='areaQaTitle';section.append(top);
    section.append(node('p','area-qa-intro','선택 ZIP 기준의 주요 참고사항입니다. 주소 배정·필지 위험을 판정하지 않습니다.'));
    const list=node('div','area-qa-list');
    for(const item of labels){
      const btn=node('button','area-qa-row');btn.type='button';btn.dataset.target=item.target;
      btn.setAttribute('aria-label',item.title+' 관련 지도 또는 상세정보 확인');
      const mark=node('span','area-qa-mark','›');mark.setAttribute('aria-hidden','true');
      const body=node('span','area-qa-body');
      const title=node('span','area-qa-label',item.title);
      const summary=node('span','area-qa-value','자료 확인 중');
      const info=node('span','area-qa-note',item.detail);
      body.append(title,summary,info);btn.append(body,mark);list.append(btn);
      rows[item.id]=summary;
    }
    section.append(list);
    section.append(node('p','area-qa-foot','결과에 해당하는 행을 누르면 아래 지도 또는 기존 상세 패널에서 근거를 확인합니다.'));
    parent.append(section);
    section.addEventListener('click',event=>{
      const btn=event.target.closest('button[data-target]');if(!btn)return;
      const target=btn.dataset.target;
      if(target==='schools'){
        const toggle=$('schoolOverlay');
        if(toggle&&!toggle.checked){toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}))}
        document.querySelector('.mapbox')?.scrollIntoView({behavior:'smooth',block:'start'});
      }else if(target==='hazards'){
        const b=document.querySelector('#hazardMapQuickToggle button[data-hazard="ifld"]');
        if(b&&b.getAttribute('aria-pressed')!=='true')b.click();
        document.querySelector('.mapbox')?.scrollIntoView({behavior:'smooth',block:'start'});
      }else if(target==='crime'){
        const b=$('crimeMapToggle');if(b&&b.getAttribute('aria-pressed')!=='true')b.click();
        document.querySelector('.mapbox')?.scrollIntoView({behavior:'smooth',block:'start'});
      }else if(target==='commute'){
        document.querySelector('.office-controls')?.scrollIntoView({behavior:'smooth',block:'start'});
        $('calcCommute')?.focus({preventScroll:true});
      }
    });
  }
  function schoolFact(zip){
    try{
      if(typeof state==='undefined'||typeof geometryContains!=='function'||typeof scoreRecord!=='function')return null;
      const shape=state.polys?.[zip];if(!shape||!state.ratingIndex)return null;
      const geo=shape.toGeoJSON(),geoms=geo?.features||(geo?[geo]:[]);
      if(!geoms.length)return null;
      return core.summarizeSchools(state.schools,ll=>geoms.some(f=>f?.geometry&&geometryContains([ll[1],ll[0]],f.geometry)),s=>scoreRecord(s.name,s.district)?.rating);
    }catch(e){console.warn('Area school summary unavailable:',e);return null}
  }
  function countyFact(zip){
    const code=countyIndex?.zipCounty?.[zip],name=countyIndex?.counties?.[code]?.name;
    if(!name||!noaaRows)return null;
    return core.summarizeNoaa(noaaRows,name);
  }
  function render(){
    paintScheduled=false;
    const panel=$('areaQuickAssessment');if(!panel)return;
    const zip=String($('k-zip')?.textContent||$('zipSelect')?.value||'').trim();
    panel.querySelector('.area-qa-zip').textContent=zip?zip+' · 지역 단위':'지역 미선택';
    const schools=schoolFact(zip);
    rows.schools.textContent=schools?.message||'학교 위치·TEA 자료 확인 중';
    const hazard=countyFact(zip);
    rows.hazards.textContent=hazard?.message||(loadError?'카운티 기상 자료 로드 실패 · 지도에서 확인':'카운티 자료 확인 중');
    const crime=typeof crimeZipData!=='undefined'&&crimeZipData?core.summarizeCrime(crimeZipData,zip):null;
    rows.crime.textContent=crime?.message||'도시 범죄 자료 확인 중';
    const area=typeof DATA!=='undefined'?DATA.find(d=>d.z===zip):null;
    const commute=core.summarizeCommute(area,$('officeSelect')?.value,$('destination')?.value);
    rows.commute.textContent=commute.message;
  }
  function schedule(){
    if(paintScheduled)return;
    paintScheduled=true;window.setTimeout(render,65);
  }
  async function loadRegionalData(){
    try{
      const [c,n]=await Promise.all([
        fetch('./county-scopes.json',{cache:'force-cache'}),
        fetch('./data/area-noaa-counts-2024-2025.json',{cache:'force-cache'})
      ]);
      if(!c.ok||!n.ok)throw Error('HTTP');
      const [ci,events]=await Promise.all([c.json(),n.json()]);
      if(!ci?.zipCounty||!ci?.counties||!Array.isArray(events?.summary))throw Error('invalid format');
      countyIndex=ci;noaaRows=events.summary;
    }catch(e){loadError=true;console.warn('Area NOAA summary unavailable:',e)}
    schedule();
  }
  function init(){
    makePanel();if(!$('areaQuickAssessment'))return;
    for(const id of ['k-zip','schoolList','zipInsights']){
      const e=$(id);if(e)new MutationObserver(schedule).observe(e,{childList:true,characterData:true,subtree:true});
    }
    for(const id of ['officeSelect','destination','zipSelect'])$(id)?.addEventListener('change',schedule);
    $('destination')?.addEventListener('input',schedule);
    render();loadRegionalData();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
