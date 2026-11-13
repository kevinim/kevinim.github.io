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
  // Redfin canonical rental URL filters, confirmed using its own Price and
  // Beds/baths controls. Values are monthly USD; never concatenate raw input.
  function numberOrNull(value,label,max) {
    if (value===undefined||value===null||String(value).trim()==='')return null;
    const raw=String(value).trim();
    if(!/^[0-9]+$/.test(raw))throw new RangeError(label+'은 0 이상의 정수여야 합니다.');
    const number=Number(raw);
    if(!Number.isSafeInteger(number)||number>max)throw new RangeError(label+' 범위를 확인하세요.');
    return number;
  }
  function normalizeRentalFilters(filters) {
    const f=filters||{};
    const minPrice=numberOrNull(f.minPrice,'최소 월 렌트',50000);
    const maxPrice=numberOrNull(f.maxPrice,'최대 월 렌트',50000);
    const minBeds=numberOrNull(f.minBeds,'최소 침실 수',5);
    const maxBeds=numberOrNull(f.maxBeds,'최대 침실 수',5);
    if(minPrice!==null&&maxPrice!==null&&minPrice>maxPrice)
      throw new RangeError('최소 월 렌트는 최대 월 렌트보다 클 수 없습니다.');
    if(minBeds!==null&&maxBeds!==null&&minBeds>maxBeds)
      throw new RangeError('최소 침실 수는 최대 침실 수보다 클 수 없습니다.');
    return {minPrice,maxPrice,minBeds,maxBeds};
  }
  function redfinPrice(value) {
    if(value<1000)return String(value);
    const thousands=Math.floor(value/1000);
    const decimals=String(value%1000).padStart(3,'0').replace(/0+$/,'');
    return thousands+(decimals?'.'+decimals:'')+'k';
  }
  function redfinUrl(zip,kind,filters) {
    const z=safeZip(zip);
    if (!z)return '';
    if(kind!=='houses'&&kind!=='apartments')return '';
    const f=normalizeRentalFilters(filters);
    const prefix='https://www.redfin.com/zipcode/'+z;
    const hasAny=Object.values(f).some(v=>v!==null);
    if(!hasAny)return prefix+(kind==='apartments'?'/apartments-for-rent':'/houses-for-rent');
    // Apartment filter is called 'multifamily' by Redfin's own rental UI.
    const tokens=['property-type='+(kind==='apartments'?'multifamily':'house')];
    if(f.minPrice!==null)tokens.push('min-price='+redfinPrice(f.minPrice));
    if(f.maxPrice!==null)tokens.push('max-price='+redfinPrice(f.maxPrice));
    if(f.minBeds!==null)tokens.push('min-beds='+f.minBeds);
    if(f.maxBeds!==null)tokens.push('max-beds='+f.maxBeds);
    return prefix+'/rentals/filter/'+tokens.join(',');
  }
  function cityByKey(key) { return cities.find(c=>c.key===key)||null; }
  function mapScaleLabel(zoom) {
    if (!Number.isFinite(zoom)) return '지도 준비 중';
    if (zoom <= 11) return '도시 중심 보기';
    if (zoom <= 12) return '세부 지역 보기';
    return '도로·학교 상세 보기';
  }
  return {cities,referencePlaces,safeZip,redfinUrl,normalizeRentalFilters,cityByKey,mapScaleLabel};
});
