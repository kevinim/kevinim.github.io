'use strict';
/* Presentation-only structural migration. Original school, map, comparison and
 * rental modules keep their IDs and listeners; only independent panels move. */
(function(){
  // UX-07: Move the original school list, never duplicate school rows or
  // infer school assignment. Native <dialog> supplies focus trapping/Escape.
  function installMobileSchoolSheet(main){
    const list=document.getElementById('schoolList');
    const mapHead=main.querySelector('.mapcol .maphead');
    const compact=window.matchMedia?.('(max-width: 720px)');
    if(!list||!mapHead||!compact||document.getElementById('mobileSchoolSheetDialog'))return;
    const originalParent=list.parentNode, originalNext=list.nextSibling;
    const toggle=document.createElement('button');
    toggle.type='button';toggle.id='mobileSchoolSheetToggle';
    toggle.className='mapquickbtn mobile-school-sheet-trigger';
    toggle.textContent='학교 목록 보기';toggle.setAttribute('aria-controls','mobileSchoolSheetDialog');
    toggle.setAttribute('aria-haspopup','dialog');toggle.setAttribute('aria-expanded','false');
    const dialog=document.createElement('dialog');
    dialog.id='mobileSchoolSheetDialog';dialog.className='mobile-school-sheet';
    dialog.setAttribute('aria-labelledby','mobileSchoolSheetTitle');
    const header=document.createElement('div');header.className='mobile-school-sheet-header';
    const heading=document.createElement('h2');
    heading.id='mobileSchoolSheetTitle';heading.textContent='학교 목록 · 위치 참고';
    const closeButton=document.createElement('button');
    closeButton.type='button';closeButton.className='mini-btn';
    closeButton.textContent='닫기';closeButton.setAttribute('aria-label','학교 목록 패널 닫기');
    header.append(heading,closeButton);
    const body=document.createElement('div');body.className='mobile-school-sheet-body';
    dialog.append(header,body);document.body.append(dialog);mapHead.append(toggle);
    const restore=()=>{
      if(list.parentNode!==originalParent)
        originalParent.insertBefore(list,originalNext?.parentNode===originalParent?originalNext:null);
      toggle.setAttribute('aria-expanded','false');
      if(compact.matches)toggle.focus({preventScroll:true});
    };
    toggle.addEventListener('click',()=>{
      if(!compact.matches||dialog.open)return;
      body.appendChild(list);
      toggle.setAttribute('aria-expanded','true');
      dialog.showModal();
      (list.querySelector('button.school-map-selected')||
       list.querySelector('button.school')||closeButton).focus({preventScroll:true});
    });
    closeButton.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',restore);
    compact.addEventListener?.('change',()=>{
      if(!compact.matches&&dialog.open)dialog.close();
    });
  }
 function mount(){
  const shell=document.querySelector('.shell');
  const main=shell?.querySelector('.main');
  const stats=document.getElementById('txStatsSection');
  const rentals=document.getElementById('txRentSection');
  const compare=document.getElementById('txCompareSection');
  if(!shell||!main||!stats||!rentals||!compare)return;
  const place=()=>{
   const elements=[
    shell.querySelector(':scope > .kpis'),
    main.querySelector('#zipInsights'),
    main.querySelector(':scope > .detail'),
    document.getElementById('compareTable')?.closest('section.panel'),
    document.getElementById('areaQuickAssessment')
   ];
   for(const node of elements)if(node&&!stats.contains(node))stats.appendChild(node);
   for(const node of [document.getElementById('rentMapUatPanel')]){
    if(node&&node.parentNode!==rentals)rentals.appendChild(node);
   }
   // A lazy compare renderer replaces the placeholder node after expansion.
   for(const node of [document.getElementById('regionCompare'),
                      document.getElementById('regionCompareLoading')]){
    if(node&&node.parentNode!==compare)compare.appendChild(node);
   }
  };
  place();
  const filter=main.querySelector(':scope > .filter-panel > h2');
  if(filter)filter.textContent='학교 · 지역 필터';
  installMobileSchoolSheet(main);
  // Dynamic Redfin mount and lazy comparison must remain source-identical.
  // Observe only DOM additions and never mutate the map container itself.
  if(window.MutationObserver){
   const observer=new MutationObserver(records=>{
    if(records.some(r=>r.addedNodes.length||r.removedNodes.length))place();
   });
   observer.observe(shell,{childList:true,subtree:true});
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();