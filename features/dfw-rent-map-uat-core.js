/* Rental/map UAT helpers: source links only, no live listing feed. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DfwRentMapUatCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const cities = Object.freeze([
    {key:'all',label:'DFW 북부',lat:33.10,lng:-96.81,zoom:10},
    {key:'plano',label:'Plano',lat:33.057,lng:-96.747,zoom:11},
    {key:'frisco',label:'Frisco',lat:33.15,lng:-96.82,zoom:11},
    {key:'allen',label:'Allen',lat:33.105,lng:-96.674,zoom:11},
    {key:'carrollton',label:'Carrollton',lat:32.99,lng:-96.89,zoom:11},
    {key:'irving',label:'Irving',lat:32.90,lng:-96.96,zoom:11}
  ]);
  // Geographic reference neighborhoods ONLY; these are not building pins
  // or recorded family destinations. Users must verify exact addresses/routes.
  const referencePlaces = Object.freeze([
    {label:'Plano 업무지구 인근',lat:33.078,lng:-96.826,color:'#2563eb',detail:'Communications Pkwy 인근 · 대략적 위치'},
    {label:'Irving Las Colinas',lat:32.887,lng:-96.959,color:'#7c3aed',detail:'Las Colinas 지역 · 대략적 위치'},
    {label:'Dallas Mockingbird',lat:32.836,lng:-96.775,color:'#dc6916',detail:'E Mockingbird Ln 지역 · 대략적 위치'}
  ]);
  function safeZip(value) {
    const z=String(value??'').trim();
    return /^[0-9]{5}$/.test(z) ? z : '';
  }
  function redfinUrl(zip,kind) {
    const z=safeZip(zip);
    if (!z) return '';
    return 'https://www.redfin.com/zipcode/'+z+
      (kind==='apartments' ? '/apartments-for-rent' : '/houses-for-rent');
  }
  function cityByKey(key) { return cities.find(c=>c.key===key)||null; }
  function mapScaleLabel(zoom) {
    if (!Number.isFinite(zoom)) return '지도 준비 중';
    if (zoom <= 11) return '도시 중심 보기';
    if (zoom <= 12) return '세부 지역 보기';
    return '도로·학교 상세 보기';
  }
  return {cities,referencePlaces,safeZip,redfinUrl,cityByKey,mapScaleLabel};
});
