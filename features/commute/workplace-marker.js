/* Workplace destination pin used by ZIP-to-work and home-to-work routes.
   Pure icon factory; existing routing and map marker lifecycle are unchanged. */
(function(root){
  'use strict';
  const svg='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18m-11 0v2h4v-2"></path></svg>';
  function workDestinationIcon(Leaflet){
    if(!Leaflet || typeof Leaflet.divIcon!=='function')throw new TypeError('Leaflet required');
    return Leaflet.divIcon({
      className:'work-destination-pin',
      html:'<div class="work-pin-body" role="img" aria-label="업무 목적지">'+svg+'<span>직장</span></div>',
      iconSize:[94,50],iconAnchor:[47,48],popupAnchor:[0,-46]
    });
  }
  root.workDestinationIcon=workDestinationIcon;
  if(typeof module==='object'&&module.exports)module.exports={workDestinationIcon};
})(typeof window!=='undefined'?window:globalThis);
