'use strict';
// Official source responses and a user-entered transcription are distinct evidence types.
// This module never upgrades a 2025–26 GIS polygon to a verified 2026–27 polygon.
const PLANO_2026_27_EXPERIENCE='https://experience.arcgis.com/experience/73a3f873d9c040348d6e723ed4b48af4';
const PROSPER_OFFICIAL_POINT_URL='https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchLocation';
const OFFICIAL_REVIEW_DISTRICTS=['FISD','PROSPER','PISD','AISD','LISD','CFB'];
const OFFICIAL_REVIEW_LEVELS=['elementary','middle','freshman','high','senior'];
function officialReviewName(name){
 return String(name||'').toLowerCase().replace(/\b(h\s*\.?\s*s\s*\.?|high school)\b/g,'high')
   .replace(/\b(m\s*\.?\s*s\s*\.?|middle school)\b/g,'middle')
   .replace(/\b(el|elem|elementary school)\b/g,'elementary')
   .replace(/\b(school|campus|elementary|middle|high)\b/g,'')
   .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function officialReviewCandidates(assignment,level){
 if(!assignment||!['current','reference','unverified-year','boundary-review','finder-current','finder-boundary-review'].includes(assignment.status))return [];
 if(assignment.district==='AISD'&&assignment.allen){
  const fields={elementary:2,middle:3,freshman:4,high:5};
  return Number.isInteger(fields[level])?[assignment.allen[fields[level]]].filter(Boolean):[];
 }
 if(!Array.isArray(assignment.features))return [];
 return [...new Set(assignment.features.filter(x=>x.properties?.gradeLevel===level).map(x=>String(x.properties.school||'').trim()).filter(Boolean))];
}
function compareManualSchoolResult(assignment,{district,gradeLevel,schoolName,schoolYear}){
 if(!OFFICIAL_REVIEW_DISTRICTS.includes(district)||!OFFICIAL_REVIEW_LEVELS.includes(gradeLevel)||!schoolName?.trim())return {status:'missing-input'};
 if(schoolYear!=='2026–27')return {status:'year-not-confirmed'};
 if(!assignment||!['current','reference','unverified-year','boundary-review','finder-current','finder-boundary-review'].includes(assignment.status))return {status:'no-candidate'};
 if(district!==assignment.district)return {status:'district-disagrees',predictedDistrict:assignment.district};
 const options=officialReviewCandidates(assignment,gradeLevel);
 if(options.length!==1)return {status:'no-unique-candidate',options};
 const a=officialReviewName(options[0]),b=officialReviewName(schoolName);
 if(!a||!b)return {status:'name-unrecognized',options};
 return {status:a===b?'manually-reported-match':'manually-reported-mismatch',options,sourceKind:'user-transcribed-not-independently-verified',geometryCurrent:assignment.status==='current'||assignment.status==='boundary-review'};
}
function buildProsperOfficialPointUrl(ll){
 if(!Array.isArray(ll)||ll.length!==2||!Number.isFinite(ll[0])||!Number.isFinite(ll[1])||ll[0]<32.8||ll[0]>33.6||ll[1]<-97.5||ll[1]>-96.2)throw Error('outside Prosper region');
 const p=new URLSearchParams({clientId:'PI5FFG7RYZ1',x:ll[1].toFixed(8),y:ll[0].toFixed(8),schoolId:'-1',gradeId:'-1'});
 return PROSPER_OFFICIAL_POINT_URL+'?'+p;
}
function compareProsperOfficialPoint(assignment,payload){
 if(!assignment||assignment.district!=='PROSPER'||!['current','boundary-review'].includes(assignment.status))return {status:'not-prosper-current'};
 if(payload?.resultCode!==200||!Array.isArray(payload.schools))return {status:'invalid-official-response'};
 const expected=new Set((assignment.features||[]).map(x=>String(x.properties?.schoolCode||'').padStart(3,'0')).filter(x=>/^\d{3}$/.test(x)));
 if(expected.size!==3)return {status:'incomplete-geometry',expected:[...expected]};
 const actual=new Set(payload.schools.map(x=>String(x.schoolCode||'').padStart(3,'0')).filter(x=>/^\d{3}$/.test(x)));
 const missing=[...expected].filter(x=>!actual.has(x));
 const unexpected=[...actual].filter(x=>!expected.has(x));
 return {status:missing.length||unexpected.length?'official-code-disagreement':'official-point-codes-match',expected:[...expected],actual:[...actual],missing,unexpected,pointOnly:true,addressExact:payload.exactAddressMatch===true,sourceKind:'direct-public-official-point-lookup'};
}

// Residence-specific comparison is intentionally a USER-TRANSCRIBED check.
// District Finder pages are cross-origin; a publicly exposed GIS query does
// not prove the official residential assignment or vendor API permission.
const RESIDENTIAL_REVIEW_LEVELS=Object.freeze({
 elementary:'초등',middle:'중등',freshman:'9학년',high:'고등',senior:'Senior High'
});
const RESIDENTIAL_GRADE_ORDER=Object.freeze(['elementary','middle','freshman','high','senior']);
const RESIDENTIAL_SUPPORTED_DISTRICTS=new Set(['FISD','PROSPER','PISD','LISD','AISD','043907','CFB','057905','057912']);
const RESIDENTIAL_REFERENCE_STATES=new Set(['current','finder-current','reference','unverified-year']);
function makeResidentialSchoolModel(raw,{precise=false,officialUrl=null}={}){
 const district=String(raw?.district||'');
 const supported=RESIDENTIAL_SUPPORTED_DISTRICTS.has(district);
 const gradeOrder=district==='PISD'
  ?['elementary','middle','high','senior']
  :district==='LISD'||district==='AISD'
   ?['elementary','middle','freshman','high']
   :['elementary','middle','high'];
 const allowed=precise===true&&supported&&RESIDENTIAL_REFERENCE_STATES.has(raw?.status);
 const records=new Map();
 if(allowed&&district==='AISD'&&Array.isArray(raw?.allen)){
  const slots={elementary:2,middle:3,freshman:4,high:5};
  for(const level of gradeOrder){
   const name=String(raw.allen[slots[level]]||'').trim();
   if(name&&name.length<=120)records.set(level,[name]);
  }
 }else if(allowed&&Array.isArray(raw?.features)&&raw.features.length<=24){
  for(const feature of raw.features){
   const p=feature?.properties;
   const level=p?.gradeLevel==='intermediate'?'freshman':p?.gradeLevel;
   const name=typeof p?.school==='string'?p.school.trim():'';
   if(!gradeOrder.includes(level)||!name||name.length>120)continue;
   if(!records.has(level))records.set(level,[]);
   const names=records.get(level);
   if(!names.some(x=>officialReviewName(x)===officialReviewName(name)))names.push(name);
  }
 }
 const candidates=gradeOrder.map(level=>({
  level,label:RESIDENTIAL_REVIEW_LEVELS[level],
  schools:records.get(level)||[],
  sourceVintage:district==='PISD'?'2025–26 표기 GIS':
   district==='LISD'?(level==='high'?'2025–26 표기 GIS':'GIS 적용 연도 미확인'):
   district==='AISD'?'공식 주소표 · 적용 학년도 미표기':
   district==='FISD'||district==='PROSPER'?'2026–27 GIS · 등록 예외 가능':
   district==='043907'?'공식 Finder GIS · 독립 주소 결과 미인증':
   'GIS 원본 학년도 미확인'
 }));
 return {
  district,gradeOrder,candidates,officialUrl:typeof officialUrl==='string'?officialUrl:null,
  precise:precise===true,sourceStatus:String(raw?.status||'unavailable'),
  status:!precise?'imprecise-address':!supported?'district-unknown':
   !RESIDENTIAL_REFERENCE_STATES.has(raw?.status)?'gis-reference-unavailable':'reference-only',
  sourceSignature:JSON.stringify([district,raw?.status,candidates.map(x=>[x.level,x.schools,x.sourceVintage])]),
  independentOfficialResult:false,
  officialLookupIntegrated:false
 };
}
function compareResidentialSchoolReport(model,reported){
 if(!model||!Array.isArray(model.candidates)||!reported||typeof reported!=='object')
  return {status:'invalid-input',results:[]};
 const names=reported.schools||{};
 const exact=reported.exactAddressReviewed===true;
 const year=reported.schoolYear==='2026–27';
 const apartment=reported.residenceType==='apartment';
 const results=model.candidates.map(c=>{
  const value=typeof names[c.level]==='string'?names[c.level].trim():'';
  if(!value)return {level:c.level,status:'not-entered'};
  if(value.length>130)return {level:c.level,status:'invalid-name'};
  if(!exact)return {level:c.level,status:'exact-address-unconfirmed'};
  if(!year)return {level:c.level,status:'year-unconfirmed'};
  if(!model.precise)return {level:c.level,status:'imprecise-address'};
  if(apartment&&model.district==='LISD')
   return {level:c.level,status:'apartment-requires-official-locator'};
  if(model.status!=='reference-only')return {level:c.level,status:'no-gis-reference'};
  if(c.schools.length!==1)return {level:c.level,status:'nonunique-reference'};
  const reference=officialReviewName(c.schools[0]);
  const official=officialReviewName(value);
  if(!reference||!official)return {level:c.level,status:'invalid-name'};
  return {level:c.level,status:reference===official?'user-reported-match':'user-reported-mismatch'};
 });
 const matches=results.filter(x=>x.status==='user-reported-match').length;
 const mismatches=results.filter(x=>x.status==='user-reported-mismatch').length;
 const complete=matches===model.gradeOrder.length&&results.length===model.gradeOrder.length;
 return {
  status:mismatches?'user-reported-discrepancy':
   complete?'user-reported-all-levels-consistent':matches?'user-reported-partial-consistency':
   'not-independent-verification',
  matches,mismatches,reviewedLevels:results.filter(x=>x.status!=='not-entered').length,
  requiredLevels:model.gradeOrder.length,
  results,sourceKind:'user-transcribed-not-independent-official-address-result',
  certified:false,independentOfficialLookup:false
 };
}
function mountResidentialSchoolReview(after,item,raw,registry,official){
 if(!after||typeof after.after!=='function'||!item||typeof document==='undefined')return false;
 const id='homeResidentialSchoolCrosscheck';
 let host=document.getElementById(id);
 if(!host){host=document.createElement('section');host.id=id;host.className='home-assignment-priority';after.after(host)}
 else if(host.previousElementSibling!==after)after.after(host);
 const district=String(raw?.district||'');
 const officialUrl=typeof official==='function'?official(registry?.[district]?.official):null;
 const model=makeResidentialSchoolModel(raw,{precise:item.geocodeQuality?.usableForSchoolCandidate===true,officialUrl});
 // Source/candidate drift invalidates an earlier comparison. No address,
 // student identity, or result is sent to a server or persisted in storage.
 const state=item.residentialSchoolReview||{};
 if(state.signature!==model.sourceSignature){
  state.signature=model.sourceSignature;
  state.result=null;
 }
 state.schools=state.schools||{};
 state.schoolYear=state.schoolYear||'';
 state.residenceType=state.residenceType||'house';
 state.exactAddressReviewed=state.exactAddressReviewed===true;
 item.residentialSchoolReview=state;
 const d=document,el=(tag,cls,txt)=>{
  const node=d.createElement(tag);if(cls)node.className=cls;
  if(txt!==undefined)node.textContent=String(txt);
  return node;
 };
 host.replaceChildren();
 const details=el('details','home-school-evidence');
 details.open=state.open!==false;
 details.addEventListener('toggle',()=>{state.open=details.open});
 details.appendChild(el('summary',null,'공식 주소별 학교 대조 · '+(state.result?.status==='user-reported-all-levels-consistent'?'모든 학교급 수동 일치':'독립 자동 검증 미완료')));
 details.appendChild(el('p','source',
  '1. 공식 검색기에서 동일 주소와 학년도를 조회하세요. 2. 표시된 학교 이름을 아래에 입력해 비교하세요. 대조 결과는 브라우저 메모리에서만 유지되며 교육청 독립 인증이 아닙니다.'));
 if(officialUrl){
  const link=el('a','cardlink','학군 공식 주소 검색기 열기');
  link.href=officialUrl;link.target='_blank';link.rel='noopener noreferrer';
  details.appendChild(link);
 }else details.appendChild(el('p','source','학군 공식 검색기 주소를 확인하지 못했습니다.'));
 const important=model.district==='PISD'
  ?'Plano: 2026–27 Finder지만 연결 GIS는 2025–26 표기입니다. Senior High도 별도 확인, Jackson Elementary는 Coit Rd 기준 진학 경로가 갈립니다.'
  :model.district==='LISD'
   ?'Lewisville: 도형 연도가 혼재합니다. 아파트는 공식 Find an Apartment로 확인하며 Budget Suites 5289 Highway 121은 서로 다른 공식 자료가 충돌합니다.'
   :model.district==='PROSPER'
    ?'Prosper: Infofinder의 브라우저 직접 조회에는 CORS 제한이 있습니다. 좌표 GIS 후보 일치만으로 주소 배정을 인증하지 않습니다.'
    :'GIS 경계의 학교명은 참고용입니다. 실제 학교 배정은 공식 주소별 조회에 따릅니다.';
 details.appendChild(el('p','source',important));
 if(model.status!=='reference-only')
  details.appendChild(el('p','source','참고 GIS 후보 확인 불가: '+(model.status==='imprecise-address'?'주소 좌표가 불확실합니다.':model.status==='district-unknown'?'학군 소속을 확인해야 합니다.':'지도 학교 후보가 없거나 경계·아파트 예외가 있습니다.')+' 공식 검색 결과는 참고로 입력할 수 있지만 일치 판정하지 않습니다.'));
 const yearRow=el('div','field'),yearLabel=el('label',null,'공식 조회 결과 학년도');
 const yearSelect=el('select');yearSelect.setAttribute('aria-label','공식 검색기 결과 학년도');
 for(const [v,label] of [['','학년도 미확인'],['2026–27','2026–27 결과 확인'],['older','과거·다른 학년도']]){
  const option=el('option',null,label);option.value=v;yearSelect.appendChild(option);
 }
 yearSelect.value=state.schoolYear;
 yearSelect.onchange=()=>{state.schoolYear=yearSelect.value;state.result=null};
 yearRow.append(yearLabel,yearSelect);details.appendChild(yearRow);
 const typeRow=el('div','field'),typeLabel=el('label',null,'주거 형태');
 const typeSelect=el('select');typeSelect.setAttribute('aria-label','주거 형태');
 for(const [v,label] of [['house','단독주택·일반 주소'],['apartment','아파트·공동주택']]){
  const option=el('option',null,label);option.value=v;typeSelect.appendChild(option);
 }
 typeSelect.value=state.residenceType;
 typeSelect.onchange=()=>{state.residenceType=typeSelect.value;state.result=null};
 typeRow.append(typeLabel,typeSelect);details.appendChild(typeRow);
 const fields=new Map();
 for(const c of model.candidates){
  const row=el('div','field');
  const title=el('label',null,c.label+' · GIS 참고 후보');
  const hint=el('div','source',(c.schools.length===1?c.schools[0]:c.schools.length>1?'복수 후보 · 자동 비교 보류':'후보 없음')+' · '+c.sourceVintage);
  const label=el('label',null,'공식 검색기 '+c.label+' 학교명');
  const input=el('input');input.type='text';input.maxLength=130;input.autocomplete='off';
  input.setAttribute('aria-label','공식 검색기 '+c.label+' 학교명');
  input.placeholder=c.label+' 학교 이름';input.value=state.schools[c.level]||'';
  input.oninput=()=>{state.schools[c.level]=input.value;state.result=null};
  row.append(title,hint,label,input);
  const status=el('span','source');status.setAttribute('data-crosscheck-level',c.level);
  const rowResult=state.result?.results?.find(x=>x.level===c.level);
  status.textContent=rowResult?.status==='user-reported-match'?'사용자 입력과 GIS 참고 후보 일치':
   rowResult?.status==='user-reported-mismatch'?'불일치 · 공식 검색 결과를 우선 확인':
   rowResult?.status==='apartment-requires-official-locator'?'아파트별 공식 조회 필요':
   rowResult&&rowResult.status!=='not-entered'?'독립 확인 불가 · 확정 배정 아님':'';
  row.appendChild(status);details.appendChild(row);fields.set(c.level,input);
 }
 const confirmation=el('label','source');
 const checkbox=el('input');checkbox.type='checkbox';
 checkbox.checked=state.exactAddressReviewed;
 checkbox.onchange=()=>{state.exactAddressReviewed=checkbox.checked;state.result=null};
 confirmation.append(checkbox,d.createTextNode(' 공식 검색기에서 동일한 주소·필요한 호수·학년도를 직접 확인했습니다.'));
 details.appendChild(confirmation);
 const button=el('button','mini-btn','학교급별 결과 비교');button.type='button';
 const status=el('p','source');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const summary=()=>{
  if(!state.result)return '직접 비교 전 · 공식 주소 조회 자동 연동 미완료';
  const x=state.result;
  return '사용자 입력 대조 '+x.matches+'/'+x.requiredLevels+'개 일치'+(x.mismatches?' · '+x.mismatches+'개 불일치':'')+
   ' · 독립 검증 아님 · 확정 배정 아님';
 };
 status.textContent=summary();
 button.onclick=()=>{
  state.schools=Object.fromEntries([...fields.entries()].map(([level,input])=>[level,input.value]));
  state.schoolYear=yearSelect.value;
  state.residenceType=typeSelect.value;
  state.exactAddressReviewed=checkbox.checked;
  state.result=compareResidentialSchoolReport(model,state);
  // Update with textContent only; never alter home.assignment.
  status.textContent=summary();
  for(const c of model.candidates){
   const one=state.result.results.find(r=>r.level===c.level);
   const label=details.querySelector('[data-crosscheck-level="'+c.level+'"]');
   if(label)label.textContent=one.status==='user-reported-match'?'사용자 입력과 GIS 참고 후보 일치':
    one.status==='user-reported-mismatch'?'불일치 · 공식 검색기 확인 필요':
    one.status==='not-entered'?'미입력':one.status==='apartment-requires-official-locator'?'아파트용 공식 검색기에서 재확인 필요':
    '일치 여부 판단 불가 · 확인 필요';
  }
 };
 details.append(button,status);
 host.appendChild(details);return true;
}
if(typeof window!=='undefined')
 Object.defineProperty(window,'HomeResidentialSchoolCheck',{value:Object.freeze({mount:mountResidentialSchoolReview}),configurable:false,writable:false});
if(typeof module!=='undefined')module.exports={officialReviewName,officialReviewCandidates,compareManualSchoolResult,buildProsperOfficialPointUrl,compareProsperOfficialPoint,PLANO_2026_27_EXPERIENCE,makeResidentialSchoolModel,compareResidentialSchoolReport};
