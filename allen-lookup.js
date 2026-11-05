'use strict';
function matchAllenAddress(address, rows, inDistrict) {
  if (inDistrict === false || (inDistrict !== true && !/,\s*Allen\s*,\s*(?:Texas|TX)\b/i.test(address))) return null;
  const m = address.match(/^\s*(\d+)\s+([^,]+),/); if (!m) return null;
  const number = +m[1], street = m[2].toLowerCase().trim().replace(/\s+/g, ' ');
  if (([4450, 4700].includes(number) && /\bridge\b/.test(street)) || (number === 6551 && /mckinney ranch/.test(street)) || (number === 7830 && /van tuyl/.test(street))) return null;
  const matches = rows.filter(r => {
    if (r[0].toLowerCase().trim().replace(/\s+/g, ' ') !== street) return false;
    const range = r[1].match(/^\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*(\(even numbers only\))?\s*$/i);
    return !!range && number >= +range[1] && number <= +(range[2] || range[1]) && (!range[3] || number % 2 === 0);
  });
  return matches.length === 1 ? matches[0] : null;
}
if (typeof module !== 'undefined') module.exports = { matchAllenAddress };
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
