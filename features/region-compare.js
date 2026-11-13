'use strict';
/* The ZIP comparison is optional. Preserve the verified comparison renderer
 * unchanged and download it only after a visitor expands this details panel.
 * This loader never reads home addresses, performs GIS assignment or contacts
 * external services. All script paths are fixed same-origin sources.
 */
(function(){
 const RENDERER='./features/region-compare-renderer.js?v=1';
 let loading=null;
 function element(tag,cls,content){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(content!==undefined)node.textContent=content;
  return node;
 }
 function init(){
  const quick=document.getElementById('areaQuickAssessment');
  const main=document.querySelector('.main');
  if(!main||document.getElementById('regionCompare'))return;
  const section=element('details','region-compare');
  section.id='regionCompare';
  section.setAttribute('aria-labelledby','regionCompareTitle');
  const summary=element('summary','region-compare-summary');
  summary.id='regionCompareTitle';
  const title=element('span','region-compare-summary-title','지역 나란히 비교');
  const hint=element('span','region-compare-summary-hint','Allen · Frisco · West Plano · 필요할 때 펼치기');
  hint.id='regionCompareSummaryMeta';
  summary.append(title,hint,element('span','region-compare-summary-chevron','열기'));
  const content=element('div','region-compare-content');
  const status=element('p','region-compare-status','선택한 2~3개 ZIP을 비교합니다. 펼치면 공식 통계 자료를 불러옵니다.');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  content.appendChild(status);
  section.append(summary,content);
  if(quick)quick.after(section);else main.before(section);

  function restore(message){
   section.id='regionCompare';summary.id='regionCompareTitle';
   section.setAttribute('aria-labelledby','regionCompareTitle');
   status.textContent=message;
  }
  function load(){
   if(loading)return loading;
   const focused=document.activeElement===summary;
   const requestedOpen=section.open;
   // The old source renderer mounts only if #regionCompare is absent.
   // Keep the pending panel visible under a temporary ID, and only remove
   // it after the verified original renderer creates the replacement.
   section.id='regionCompareLoading';
   summary.id='regionCompareTitleLoading';
   section.setAttribute('aria-labelledby','regionCompareTitleLoading');
   status.textContent='ZIP 비교 화면 불러오는 중…';
   const script=document.createElement('script');
   script.src=RENDERER;script.async=true;
   loading=new Promise((resolve,reject)=>{
    script.onload=()=>{
     const replacement=document.getElementById('regionCompare');
     if(!replacement||replacement===section){
      script.remove();loading=null;
      restore('ZIP 비교 화면을 열지 못했습니다. 패널을 닫았다 다시 열어 시도하세요.');
      reject(Error('ZIP comparison renderer failed to mount'));return;
     }
     section.remove();
     if(requestedOpen)replacement.open=true;
     if(focused)replacement.querySelector('summary')?.focus({preventScroll:true});
     resolve(true);
    };
    script.onerror=()=>{
     script.remove();loading=null;
     restore('ZIP 비교 화면을 불러오지 못했습니다. 패널을 닫았다 다시 열어 시도하세요.');
     reject(Error('ZIP comparison renderer unavailable'));
    };
   });
   document.head.appendChild(script);
   return loading;
  }
  section.addEventListener('toggle',()=>{
   if(section.open)void load().catch(()=>{});
  });
  if(section.open)void load().catch(()=>{});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
