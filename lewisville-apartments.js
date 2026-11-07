'use strict';
// Public district-linked 2026–27 map's apartment directory; row school-year unverified.
function lisdKey(v){return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function findLisdApartments(query,rows,max=8){
 const key=lisdKey(query);if(key.length<2||!Array.isArray(rows))return [];
 return rows.map((r,i)=>{
  const n=lisdKey(r.name),a=lisdKey(r.address);
  const rank=n===key?0:n.startsWith(key)?1:n.includes(key)?2:a.includes(key)?3:99;
  return {...r,index:i,rank};
 }).filter(x=>x.rank<99).sort((a,b)=>a.rank-b.rank||a.name.localeCompare(b.name)||a.address.localeCompare(b.address)).slice(0,max);
}
function initLisdApartmentLookup(){
 const section=document.getElementById('lisdApartmentSection');
 const search=document.getElementById('lisdApartmentQuery');
 const results=document.getElementById('lisdApartmentMatches');
 const details=document.getElementById('lisdApartmentDetail');
 const status=document.getElementById('lisdApartmentStatus');
 if(!section||!search||!results||!details||!status)return;
 let db=null,pending=null;
 const node=(tag,label)=>{const el=document.createElement(tag);el.textContent=String(label||'');return el};
 const select=rec=>{
  details.replaceChildren();
  details.appendChild(node('strong',rec.name));
  details.appendChild(node('p',rec.address||'공식 목록에 도로 주소가 없습니다.'));
  if(rec.zoneAudit?.status==='internal-map-conflict'){
   const warning=node('p','주의: 같은 Lewisville 공식 지도의 아파트 표와 학교 경계 도형이 서로 다릅니다. 어느 학교가 맞는지 확인되지 않아 자동 배정을 중단합니다.');
   warning.className='lisd-source-conflict';details.appendChild(warning);
   const listed=[['아파트 공개 표의 초등',rec.elementary],['지도 경계 초등',rec.zoneAudit.polygonAtLocatorPoint.elementary],['아파트 공개 표의 중등',rec.middle],['지도 경계 중등',rec.zoneAudit.polygonAtLocatorPoint.middle],['아파트 표의 9학년 캠퍼스',rec.intermediate],['지도 경계 9학년',rec.zoneAudit.polygonAtLocatorPoint.intermediate],['아파트 공개 표의 고등',rec.high],['지도 경계 고등',rec.zoneAudit.polygonAtLocatorPoint.high]];
   const table=node('dl','');table.className='lisd-campus-grid';
   for(const [title,value] of listed){table.appendChild(node('dt',title));table.appendChild(node('dd',value))}
   details.appendChild(table);
   details.appendChild(node('p','이 항목은 동일한 공식 지도 내부에서 4개 배정 필드가 충돌합니다. 해당 아파트의 정확한 건물·호수·학년도는 Lewisville Student Services 또는 공식 Find an Apartment에서 직접 확인하세요.'));
   status.textContent='공식 지도 내 불일치 · 4개 학교 단계 모두 별도 확인 필요';return;
  }
  const dl=node('dl','');dl.className='lisd-campus-grid';
  for(const [title,value] of [['초등학교',rec.elementary],['중학교',rec.middle],['9학년·중간캠퍼스',rec.intermediate],['고등학교',rec.high]]){
   dl.appendChild(node('dt',title));dl.appendChild(node('dd',value));
  }
  details.appendChild(dl);
  details.appendChild(node('p','2026–27 공식 지도에 연결된 아파트 참고 자료입니다. 원본 레이어의 적용 학년도와 개별 건물·호수 배정은 확인되지 않았습니다. 공식 Find an Apartment를 재조회하세요.'));
  status.textContent='참고용 캠퍼스 정보 표시 · 최종 등록 배정은 학군 확인 필요';
 };
 const render=()=>{
  results.replaceChildren();details.replaceChildren();
  if(!db){status.textContent='공식 아파트 목록을 읽는 중입니다.';return}
  const key=search.value.trim();
  if(key.length<2){status.textContent='아파트명 또는 도로명 일부를 두 글자 이상 입력하세요.';return}
  const list=findLisdApartments(key,db.apartments);
  status.textContent=list.length?list.length+'개 후보 · 개별 호수 배정 미확인':'검색 결과가 없습니다. 공식 학군 검색기에서 확인하세요.';
  for(const item of list){
   const button=node('button','');button.type='button';button.className='lisd-apartment-choice';
   button.appendChild(node('strong',item.name));button.appendChild(node('small',(item.address||'주소 미기재')+(item.zoneAudit?.status==='internal-map-conflict'?' · 학교 도형 불일치':'')));
   button.addEventListener('click',()=>select(item));results.appendChild(button);
  }
 };
 const load=()=>{
  if(pending)return;
  status.textContent='공식 아파트 목록을 불러오는 중입니다.';
  pending=fetch('./lewisville-official-apartments.json').then(r=>{
   if(!r.ok)throw Error('HTTP '+r.status);return r.json();
  }).then(j=>{
   if(j?.metadata?.sourceAcademicYear!==null||j.apartments?.length!==174)throw Error('unexpected data');
   db=j;render();
  }).catch(()=>{db=null;pending=null;status.textContent='자료를 불러오지 못했습니다. 학군 공식 검색기를 사용하세요.'});
 };
 section.addEventListener('toggle',()=>{if(section.open)load()});
 search.addEventListener('input',render);
}
if(typeof module!=='undefined')module.exports={findLisdApartments,lisdKey};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',initLisdApartmentLookup);
