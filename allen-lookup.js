'use strict';
// The published Allen ISD table abbreviates street suffixes and sometimes puts
// cardinal directions after the street type (e.g. "Alder Dr N"). Esri often
// returns "N Alder Drive". Only equivalence aliases are normalized; ambiguous
// street/range matches still return null. Source does not state a school year.
const ALLEN_STREET_TYPES=Object.freeze({
  ROAD:'RD',DRIVE:'DR',STREET:'ST',LANE:'LN',AVENUE:'AVE',BOULEVARD:'BLVD',
  CIRCLE:'CIR',COURT:'CT',PARKWAY:'PKWY',PLACE:'PL',TERRACE:'TER',
  TRAIL:'TRL',HIGHWAY:'HWY',EXPRESSWAY:'EXPY',CRESCENT:'CRES',
  CROSSING:'XING',SQUARE:'SQ',POINT:'PT',CENTER:'CTR',TURNPIKE:'TPKE'
});
const ALLEN_STREET_DIRECTIONS=Object.freeze({
  NORTH:'N',SOUTH:'S',EAST:'E',WEST:'W'
});
function normalizeAllenStreet(street){
  const words=String(street||'').toUpperCase()
    .replace(/[\u2019']/g,'').replace(/\./g,' ')
    .trim().split(/\s+/).filter(Boolean);
  if(words.length<2)return words.join(' ');
  // Only normalize the directional prefix and trailing street type; never
  // rewrite internal words such as "Lane" in "Lane Forest Drive".
  words[0]=ALLEN_STREET_DIRECTIONS[words[0]]||words[0];
  const last=words.length-1;
  if(['N','S','E','W','NORTH','SOUTH','EAST','WEST'].includes(words[last])&&last>=2){
    const direction=ALLEN_STREET_DIRECTIONS[words[last]]||words[last];
    const type=ALLEN_STREET_TYPES[words[last-1]]||words[last-1];
    if(Object.values(ALLEN_STREET_TYPES).includes(type)||['WAY','LOOP','PATH'].includes(type)){
      words.pop();words[last-1]=type;words.unshift(direction);
    }
  }
  const tail=words.length-1;
  words[tail]=ALLEN_STREET_TYPES[words[tail]]||words[tail];
  return words.join(' ');
}
function matchAllenAddress(address, rows, inDistrict) {
  if (inDistrict === false || (inDistrict !== true && !/,\s*Allen\s*,\s*(?:Texas|TX)\b/i.test(address))) return null;
  const m = String(address||'').match(/^\s*(\d+)\s+([^,]+),/); if (!m||!Array.isArray(rows)) return null;
  const number=Number(m[1]), street=normalizeAllenStreet(m[2]);
  // A precise street pin cannot resolve district-specific buildings/units.
  if (([4450, 4700].includes(number) && /\bRIDGE\b/.test(street))
      || (number === 6551 && /\bMCKINNEY RANCH\b/.test(street))
      || (number === 7830 && /\bVAN TUYL\b/.test(street))) return null;
  const matches=rows.filter(r=>{
    if(!Array.isArray(r)||normalizeAllenStreet(r[0])!==street)return false;
    const range=String(r[1]||'').match(/^\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*(\(even numbers only\))?\s*$/i);
    return !!range && number>=+range[1] && number<=+(range[2]||range[1])
       && (!range[3] || number%2===0);
  });
  // Conflicting or duplicated source ranges are explicitly unverified.
  return matches.length===1?matches[0]:null;
}
if (typeof module !== 'undefined') module.exports = { matchAllenAddress, normalizeAllenStreet };
if (typeof document !== 'undefined') {
  let allenRows = null, allenFailed = false, allenDistrict = null;
  window.allenAssignment = (address,ll) => {
    const inside = allenDistrict && ll ? allenDistrict.features.some(f=>geometryContains([ll[1],ll[0]],f.geometry)) : undefined;
    return allenRows ? matchAllenAddress(address,allenRows,inside) : null;
  };
  window.allenAssignmentLoading = () => allenRows === null;
  window.allenAssignmentFailed = () => allenFailed;
  window.allenSchoolRating = (name, type) => {
    const key = canonical(name);
    const matches = (state.ratings || []).filter(r => r.district === 'AISD' && (type === 'freshman' ? canonical(r.name).includes('freshman') : schoolType(r.name) === type) && key.split(' ').every(word => canonical(r.name).split(' ').includes(word)));
    return matches.length === 1 ? ratingText(matches[0]) : 'TEA 미연결';
  };
  fetch('./allen-district-census-2026.geojson').then(r=>{if(!r.ok)throw Error('district data');return r.json()}).then(data=>{if(data.type!=='FeatureCollection'||!data.features?.length)throw Error('district format');allenDistrict=data;window.refreshCandidateComparisons?.();if(typeof refreshHomeSchools==='function')refreshHomeSchools()}).catch(error=>console.error('Allen district boundary:',error));
  fetch('./allen-address-schools.json').then(r => { if (!r.ok) throw Error('Allen address data'); return r.json(); }).then(data => {
    if (!Array.isArray(data.rows)) throw Error('Allen address data format');
    allenRows = data.rows; window.refreshCandidateComparisons?.(); if (typeof refreshHomeSchools === 'function') refreshHomeSchools();
  }).catch(error => { allenRows = []; allenFailed = true; console.error('Allen address lookup:', error); window.refreshCandidateComparisons?.(); if (typeof refreshHomeSchools === 'function') refreshHomeSchools(); });
}
