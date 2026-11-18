'use strict';
/* Presentation-only structural migration. Original school, map, comparison and
 * rental modules keep their IDs and listeners; only independent panels move. */
(function(){
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