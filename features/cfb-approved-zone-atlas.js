'use strict';
// Phase 1 CFB approved-raster atlas and finder cross-check provenance.
// Intentionally NOT an imageOverlay, attendance polygon, or automatic assignment.
(function(root){
 const MANIFEST='./data/cfb-approved-zone-raster-reference-2026.json';
 const AREA_CHANGES='./data/cfb-rezoning-boundary-review-targets-2026.json';
 const VERIFIED_SAMPLES='./tests/cfb-official-resident-finder-verified-2026-11-07.json';
 const ALLOWED_IMG_HOST='resources.finalsite.net';
 const sourceUrl=value=>{
  try {
   const x=new URL(String(value));
   return x.protocol==='https:'&&x.hostname===ALLOWED_IMG_HOST&&x.port===''&&x.username===''&&x.password===''&&x.pathname.startsWith('/images/')?x.href:null;
  }catch{return null}
 };
 function element(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 }
 function node(tag,props={},children=[]){
  const out=element(tag,props.cls,props.text);
  if(props.id)out.id=props.id;
  if(props.type)out.type=props.type;
  if(props.href){out.href=props.href;out.target='_blank';out.rel='noopener noreferrer'}
  for(const child of children)out.appendChild(child);
  return out;
 }
 async function fetchJson(path){
  const response=await fetch(path,{cache:'no-store'});
  if(!response.ok)throw Error('자료 요청 오류');
  return response.json();
 }
 function validateManifest(m){
  if(m?.schemaVersion!==1||m?.district!=='CFB'||m.approvedSchoolYear!=='2025-26'||
   m.rasterReferenceOnly!==true||m.georeferenced!==false||m.validForAutomaticResidenceAssignment!==false||
   m.reconstructedCampusPolygonCount!==0||!Array.isArray(m.maps)||m.maps.length!==3)return null;
  const levels=['elementary','middle','high'];
  if(!levels.every(level=>m.maps.filter(x=>x.level===level&&sourceUrl(x.url)).length===1))return null;
  return m;
 }
 function setup(){
  const parent=document.getElementById('cfbOfficialFinderPanel');
  if(!parent||document.getElementById('cfbAtlas'))return;
  const details=node('details',{id:'cfbAtlas',cls:'cfb-atlas'});
  const summary=element('summary',null,'공식 승인 배정구역 지도 · 초·중·고 비교 (2025–26)');
  const content=element('div','cfb-atlas-inner');
  content.appendChild(element('p','source','2025년 3월 승인 지도 원본과 재배정 지역을 비교합니다. 아직 좌표가 맞춰진 GIS 폴리곤이 아니며, 집 주소별 학교 배정 확정 자료가 아닙니다.'));
  const status=node('p',{id:'cfbAtlasStatus',cls:'source',text:'열면 공식 자료 목록을 불러옵니다.'});
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const buttons=node('div',{id:'cfbAtlasBands',cls:'cfb-atlas-bands'});
  buttons.setAttribute('role','group');buttons.setAttribute('aria-label','학교급별 공식 배정구역 지도');
  const imageWrap=node('div',{id:'cfbAtlasImageWrap',cls:'cfb-atlas-image-wrap'});
  const mapNote=node('p',{cls:'cfb-atlas-caution',text:'참고 지도 이미지 · 지리 좌표 정합·경계 디지타이징·주소별 검증 미완료'});
  const areas=node('div',{id:'cfbAtlasAreas',cls:'cfb-atlas-areas'});
  const fixture=node('div',{id:'cfbAtlasFixtures',cls:'cfb-atlas-fixtures'});
  const sourceLink=node('a',{cls:'cardlink',text:'CFB 공식 승인·재배정 설명 열기',href:'https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning'});
  const finderLink=node('a',{cls:'cardlink',text:'현재 공식 주소 Finder 열기',href:'https://www.cfbisd.edu/students/school-maps-locator-system'});
  const sources=node('div',{cls:'cfb-atlas-sources'},[sourceLink,finderLink]);
  content.append(status,buttons,mapNote,imageWrap,areas,fixture,sources);
  details.append(summary,content);
  const next=document.getElementById('cfbOfficialManualBridge');
  if(next&&next.parentNode===parent)parent.insertBefore(details,next);
  else parent.appendChild(details);
  let loaded=false;
  details.addEventListener('toggle',async()=>{
   if(!details.open||loaded)return;
   loaded=true;status.textContent='승인 지도 원본 확인 중…';
   try{
    const m=validateManifest(await fetchJson(MANIFEST));
    if(!m)throw Error('출처 명세가 검증되지 않았습니다.');
    const mapByLevel=new Map(m.maps.map(x=>[x.level,x]));
    function display(level){
     const x=mapByLevel.get(level);const src=sourceUrl(x?.url);
     if(!src){status.textContent='원본 지도 URL 검증 실패';return}
     buttons.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===level)));
     imageWrap.replaceChildren();
     const img=node('img',{cls:'cfb-atlas-raster'});
     img.alt='CFBISD 2025–26 승인 '+x.label+' 배정구역 이미지 (좌표 보정 전 참고 자료)';
     img.loading='lazy';
     img.decoding='async';
     img.referrerPolicy='no-referrer';
     img.onerror=()=>{status.textContent='공식 지도 이미지를 불러오지 못했습니다. 아래 원본 링크를 이용하세요.'};
     img.onload=()=>{status.textContent=x.label+' 공식 승인 지도 원본 · 경계 좌표 정합 전'};
     img.src=src;
     const link=node('a',{cls:'cardlink',text:'원본 이미지 크게 보기',href:src});
     imageWrap.append(img,link);
    }
    for(const m1 of m.maps){
     const button=node('button',{type:'button',cls:'mini-btn',text:m1.label});
     button.dataset.level=m1.level;button.setAttribute('aria-pressed','false');
     button.addEventListener('click',()=>display(m1.level));
     buttons.appendChild(button);
    }
    // This explicitly requires another click to fetch a third-party source image.
    status.textContent='학교급을 선택하면 해당 공식 지도 이미지를 표시합니다.';
    const areaData=await fetchJson(AREA_CHANGES);
    if(areaData?.districtCode==='CFB'&&Array.isArray(areaData.targets)){
     const label=node('label',{text:'2025–26 재배정 지역 참고'});
     label.htmlFor='cfbAtlasAreaSelect';
     const select=node('select',{id:'cfbAtlasAreaSelect'});
     select.appendChild(new Option('재배정 지역 선택 · 배정 확정 아님',''));
     const groups=new Map();
     for(const row of areaData.targets){
      if(!row?.areaLabel||!row.approvedCampus2025)continue;
      const key=row.areaLabel;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(row);
     }
     for(const key of [...groups.keys()].sort())select.appendChild(new Option(key,key));
     const summary=node('div',{id:'cfbAtlasAreaResult',cls:'cfb-atlas-area-result',text:'공식 재배정 설명에서 지역을 선택하면 초·중·고 변경 내역이 표시됩니다. 전체 주소의 배정표는 아닙니다.'});
     select.addEventListener('change',()=>{
      summary.replaceChildren();
      for(const row of groups.get(select.value)||[]){
       const kind={elementary:'초등',middle:'중등',high:'고등'}[row.level]||row.level;
       summary.appendChild(node('p',{text:kind+' · '+row.approvedCampus2025+' · 2025–26 승인 내역 (현행 주소 배정 미검증)'}));
      }
      if(!select.value)summary.textContent='지역을 선택하면 공식 재배정 설명이 표시됩니다.';
     });
     areas.append(label,select,summary);
    }
    const evidence=await fetchJson(VERIFIED_SAMPLES);
    if(evidence?.district==='CFB'&&Array.isArray(evidence.samples)){
     const holdout=node('details',{cls:'cfb-atlas-evidence'});
     holdout.appendChild(element('summary',null,'기존 Finder 공개 주소 검증 기록 ('+evidence.samples.length+'건) · 지도 재구성 검증 아님'));
     const list=element('div','cfb-atlas-evidence-list');
     for(const sample of evidence.samples){
      const item=element('p','source');
      item.textContent=sample.address+' — 초등 '+sample.assigned?.elementary+' / 중등 '+sample.assigned?.middle+' / 고등 '+sample.assigned?.high;
      list.appendChild(item);
     }
     list.appendChild(element('p','source','원본 조회는 2026-11-07이며 주소 자동완성 후보를 선택한 기록입니다. 개별 호실·경계 좌표·재구성한 폴리곤과의 교차검증은 아직 이루어지지 않았습니다.'));
     holdout.appendChild(list);fixture.appendChild(holdout);
    }
   }catch(error){
    status.textContent='공식 지도 참고 자료를 불러오지 못했습니다. 공식 학군 사이트에서 확인해 주세요.';
   }
  });
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={validateManifest,sourceUrl};
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
 }
})(typeof window!=='undefined'?window:null);
