'use strict';
/* DFW full district coverage is an opt-in panel. The existing verified renderer
 * is downloaded only after the user expands its <details>. This script has no
 * household address access, additional fetches or user-derived script paths.
 */
(function(){
 const SOURCE='./features/dfw-school-coverage-renderer.js?v=1';
 let loading=null;
 function loadRenderer(){
  if(loading)return loading;
  const panel=document.getElementById('dfwSchoolCoveragePanel');
  const mount=document.getElementById('dfwSchoolCoverageContent');
  if(!panel||!mount)return Promise.resolve(false);
  const script=document.createElement('script');
  script.src=SOURCE;script.async=true;
  loading=new Promise((resolve,reject)=>{
   script.onload=()=>resolve(true);
   script.onerror=()=>{
    script.remove();loading=null;
    mount.textContent='전체 학군 안내를 불러오지 못했습니다. 패널을 닫았다 다시 열어 시도하세요.';
    reject(Error('DFW coverage renderer unavailable'));
   };
  });
  document.head.appendChild(script);
  return loading;
 }
 function init(){
  const panel=document.getElementById('dfwSchoolCoveragePanel');
  if(!panel)return;
  const onToggle=()=>{if(panel.open)void loadRenderer().catch(()=>{});};
  panel.addEventListener('toggle',onToggle);
  if(panel.open)onToggle();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
