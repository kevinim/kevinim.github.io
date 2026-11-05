'use strict';
function unratedExplanation(r){
 if(!r||r.rating!=='Not Rated')return '';
 const name=String(r.officialName||r.name||'').toUpperCase();
 if(/\bJ\s*J\s*A\s*E\s*P\b|JUVENILE JUSTICE/.test(name))return '소년사법 대안교육기관';
 if(/\bD\s*A\s*E\s*P\b|DISCIPLINARY ALTERNATIVE|DISTRICT ALTERNATIVE EDUCATION PROGRAM/.test(name))return '징계 대안교육기관';
 return '';
}
if(typeof module!=='undefined')module.exports={unratedExplanation};
