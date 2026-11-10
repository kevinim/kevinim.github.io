'use strict';
// Opt-in official SchoolSearch iframe only. The provider owns address queries,
// assigned-school results and any third-party storage. Never scrape, proxy,
// prefill the iframe, or promote its content to dashboard GIS/assignment state.
(function(){
 const FINDER='https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/';
 function init(){
  const byId=id=>document.getElementById(id);
  const panel=byId('cfbOfficialFinderPanel');
  const open=byId('cfbOpenInlineFinder');
  const load=byId('cfbLoadInlineFinder');
  const close=byId('cfbCloseInlineFinder');
  const host=byId('cfbInlineFinderFrameHost');
  const status=byId('cfbInlineFinderStatus');
  if(!panel||!open||!load||!close||!host||!status)return;
  open.addEventListener('click',()=>{
   panel.hidden=false;
   panel.scrollIntoView({block:'start',behavior:'smooth'});
   load.focus();
  });
  load.addEventListener('click',()=>{
   if(host.querySelector('iframe'))return;
   const frame=document.createElement('iframe');
   frame.title='CFBISD 공식 GuideK12 SchoolSearch 주소별 학교 검색';
   frame.className='cfb-official-iframe';
   frame.setAttribute('referrerpolicy','no-referrer');
   frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
   frame.setAttribute('loading','eager');
   frame.src=FINDER; // No address/query string. Explicit user click only.
   host.appendChild(frame);
   load.disabled=true;
   status.textContent='CFB 공식 검색기를 표시하고 있습니다. 주소는 검색기 안에 직접 입력하세요. 화면이 비어 있거나 차단되면 공식 사이트 링크를 이용하세요.';
  });
  close.addEventListener('click',()=>{
   host.replaceChildren(); // Stop third-party frame when the panel is closed.
   panel.hidden=true;load.disabled=false;
   status.textContent='검색기는 버튼을 누르기 전에는 로드되지 않습니다.';
   open.focus();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
