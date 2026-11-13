'use strict';
// Optional CFB 2025–26 approved raster reference (NOT school-assignment GIS).
// Preserve the source-validated atlas renderer byte-for-byte in a separate file.
// Its code and public evidence files load only after the visitor opens this panel.
(function(){
 const RENDERER='./features/cfb-approved-zone-atlas-renderer.js?v=1';
 let request=null;
 function el(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 }
 function insertPanel(parent,panel){
  const before=document.getElementById('cfbOfficialManualBridge');
  if(before&&before.parentNode===parent)parent.insertBefore(panel,before);
  else parent.appendChild(panel);
 }
 function init(){
  const parent=document.getElementById('cfbOfficialFinderPanel');
  if(!parent||document.getElementById('cfbAtlas'))return;
  const stub=el('details','cfb-atlas');
  stub.id='cfbAtlas';
  stub.dataset.lazyAtlas='true';
  stub.appendChild(el('summary',null,'공식 승인 배정구역 지도 · 초·중·고 비교 (2025–26)'));
  const contents=el('div','cfb-atlas-inner');
  contents.appendChild(el('p','source','2025년 3월 승인 지도 원본과 재배정 지역을 비교합니다. 아직 좌표가 맞춰진 GIS 폴리곤이 아니며, 집 주소별 학교 배정 확정 자료가 아닙니다.'));
  const status=el('p','source','열면 공식 자료 목록을 불러옵니다.');
  status.id='cfbAtlasStatus';status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  contents.appendChild(status);
  stub.appendChild(contents);
  insertPanel(parent,stub);
  function restore(message){
   const current=document.getElementById('cfbAtlas');
   if(current&&current!==stub)return;
   if(!stub.isConnected)insertPanel(parent,stub);
   status.textContent=message;
  }
  function load(){
   if(request)return request;
   status.textContent='공식 승인 지도 코드 불러오는 중…';
   const open=stub.open;
   // The unmodified renderer creates its own #cfbAtlas on evaluation; remove
   // just this placeholder before importing it, not any other CFB panel.
   stub.remove();
   const script=document.createElement('script');
   script.src=RENDERER;script.async=true;
   request=new Promise((resolve,reject)=>{
    script.onload=()=>{
     const atlas=document.getElementById('cfbAtlas');
     if(!atlas||atlas===stub){
      restore('공식 지도 구성에 실패했습니다. 패널을 다시 열어 시도하세요.');
      request=null;script.remove();
      reject(Error('CFB atlas renderer failed to initialize'));return;
     }
     if(open)atlas.open=true; // Same user action opens the original atlas.
     resolve(true);
    };
    script.onerror=()=>{
     restore('공식 지도 코드를 불러오지 못했습니다. 패널을 닫았다 다시 열어 시도하세요.');
     script.remove();request=null;
     reject(Error('CFB atlas renderer unavailable'));
    };
   });
   document.head.appendChild(script);
   return request;
  }
  stub.addEventListener('toggle',()=>{if(stub.open)void load().catch(()=>{});});
  if(stub.open)void load().catch(()=>{});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
