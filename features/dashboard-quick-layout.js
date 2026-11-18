'use strict';
/* Presentation-only structural migration. No school assignment calculations,
 * map coordinates, ZIP state, APIs or scripts are changed here. */
(function(){
 function mount(){
  const shell=document.querySelector('.shell');
  const main=shell?.querySelector('.main');
  const stats=document.getElementById('txStatsSection');
  if(!shell||!main||!stats)return;
  const elements=[
   shell.querySelector(':scope > .kpis'),
   main.querySelector('#zipInsights'),
   main.querySelector(':scope > .detail'),
   document.getElementById('compareTable')?.closest('section.panel')
  ];
  for(const node of elements)if(node&&!stats.contains(node))stats.appendChild(node);
  // All existing elements retain the same IDs and listeners. The Leaflet map
  // container and the selected ZIP/school model remain in their original nodes.
  const filter=main.querySelector(':scope > .filter-panel > h2');
  if(filter)filter.textContent='학교 · 지역 필터';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();