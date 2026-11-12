'use strict';
/* Official 2026 TEA subject highlights for 56 Allen/McKinney schools.
 * Supplemental same-origin verified aggregate; no address, GIS, or race percentages.
 */
(function(root){
 const FIELDS=Object.freeze([['reading','독해'],['math','수학'],['science','과학'],['socialStudies','사회']]);
 const ELIGIBLE=/^04390(?:1|7)\d{3}$/;
 const SOURCE='./data/tea-allen-mckinney-campus-qa-2026.json?v=1';
 function officialUrl(raw,id,type){
  try{
   const u=new URL(raw);
   return u.protocol==='https:'&&u.hostname==='rptsvr1.tea.texas.gov'&&
    u.pathname==='/cgi/sas/broker'&&u.searchParams.get('ccyy')==='2026'&&
    u.searchParams.get('id')===id&&u.searchParams.get('lev')==='C'&&
    u.searchParams.get('prgopt')==='reports/acct/'+type+'.sas';
  }catch(_){return false}
 }
 function describe(id,row){
  if(!ELIGIBLE.test(id)||!row||typeof row!=='object')return null;
  if(row.districtId!==id.slice(0,6)||row.accountability?.year!==2026||
      row.domains?.year!==2026||row.staar?.year!==2026||
      !officialUrl(row.accountability.source,id,'summary')||
      !officialUrl(row.domains.source,id,'summary')||
      !officialUrl(row.staar.source,id,'domain1a'))return null;
  const rating=row.accountability.rating;
  if(rating==='Not Rated'){
   if(row.accountability.score!==null||row.domains.status!=='official-not-reported'||
      row.staar.status!=='official-not-reported')return null;
   if(FIELDS.some(([k])=>row.staar[k]!==null))return null;
   return {kind:'not-rated',summary:'TEA 2026 미평가(Not Rated). 개별 캠퍼스 과목 성적을 0점이나 F등급으로 간주하지 않습니다.',source:row.accountability.source};
  }
  if(!['A','B','C','D','F'].includes(rating)||!Number.isInteger(row.accountability.score))return null;
  const paired=row.accountability.pairedWith;
  if(paired){
   if(row.domains.status!=='official-not-reported'||row.staar.status!=='official-not-reported'||
       FIELDS.some(([k])=>row.staar[k]!==null))return null;
   if(!['campus','district'].includes(paired.type)||typeof paired.name!=='string'||
      paired.name.length>100||!/^[A-Z0-9 ]+$/.test(paired.name))return null;
   return {kind:'paired',summary:'연계 평가: '+paired.name+' 기준 종합등급입니다. 이 캠퍼스 자체의 영역별 점수와 STAAR 과목별 성적은 제공되지 않습니다.',source:row.accountability.source};
  }
  if(row.domains.status!=='official-verified'||row.staar.status!=='official-verified')return null;
  const vals=[];
  for(const [key,label] of FIELDS){
   const value=row.staar[key];
   if(value===null)continue;
   if(!Number.isInteger(value)||value<0||value>100)return null;
   vals.push({key,label,value});
  }
  if(vals.length===0)return null;
  vals.sort((a,b)=>b.value-a.value||FIELDS.findIndex(x=>x[0]===a.key)-FIELDS.findIndex(x=>x[0]===b.key));
  return {kind:'subjects',reported:vals.length,
   highest:vals[0],lowest:vals.length>=2?vals[vals.length-1]:null,
   summary:'2025–26 STAAR 전체 학생의 학년 수준 충족 이상 시험 비율입니다. 학교 내 공개된 과목끼리 비교하며 종합등급의 원인이나 학생 인종의 학업 수준을 설명하지 않습니다.',
   source:row.staar.source};
 }
 function validate(file){
  if(!file||file.schemaVersion!==1||file.accountabilityYear!==2026||file.schoolYear!=='2025-26'||
     !file.campuses||typeof file.campuses!=='object')return null;
  const entries=Object.entries(file.campuses);
  if(entries.length!==56)return null;
  let allen=0,mckinney=0,complete=0,paired=0,notRated=0;
  const results=Object.create(null);
  for(const [id,row] of entries){
   if(!ELIGIBLE.test(id)||Object.hasOwn(results,id))return null;
   if(id.startsWith('043901'))allen++;else mckinney++;
   const info=describe(id,row);
   if(!info)return null;
   if(info.kind==='subjects')complete++;
   else if(info.kind==='paired')paired++;
   else notRated++;
   results[id]=info;
  }
  if(allen!==23||mckinney!==33||complete!==50||paired!==2||notRated!==4)return null;
  return results;
 }
 function node(tag,cls,value){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined)el.textContent=value;
  return el;
 }
 function render(id,info){
  const box=node('section','tea-allen-subject-review');
  box.dataset.campus=id;
  box.setAttribute('aria-label','Allen 및 McKinney 학교별 공식 TEA 과목 검증');
  if(info.kind==='subjects'){
   box.appendChild(node('p','tea-insights-meta','2026 TEA 공식 검증 · 과목별 상대 비교'));
   box.appendChild(node('p','tea-insights-summary',
     '가장 높은 공개 과목: '+info.highest.label+' '+info.highest.value+'%'+
     (info.lowest?' · 상대적으로 낮은 공개 과목: '+info.lowest.label+' '+info.lowest.value+'%':'')));
  }else{
   box.appendChild(node('p','tea-insights-meta',info.kind==='paired'?'2026 TEA 연계 평가':'2026 TEA 미평가'));
  }
  box.appendChild(node('p','tea-insights-meta',info.summary));
  const link=node('a','tea-insights-link','TEA 2026 캠퍼스 공식 보고서');
  link.href=info.source;link.target='_blank';link.rel='noopener noreferrer';
  box.appendChild(link);
  return box;
 }
 let entries=null,started=false,failed=false,observer=null,pending=false;
 function mount(){
  if(typeof document==='undefined')return;
  const host=document.getElementById('detailContent');
  if(!host)return;
  const panels=host.querySelectorAll('.tea-insights-panel[data-campus]');
  let eligible=false;
  for(const panel of panels)if(ELIGIBLE.test(panel.dataset.campus||''))eligible=true;
  if(!eligible)return;
  if(!started){
   started=true;
   if(!root||typeof root.fetch!=='function'){failed=true;return}
   root.fetch(SOURCE,{credentials:'same-origin'}).then(r=>{
    if(!r.ok)throw Error('TEA verified campus data unavailable');
    return r.json();
   }).then(file=>{
    entries=validate(file);if(!entries)throw Error('TEA source verification failed');
    mount();
   }).catch(()=>{failed=true;});
  }
  if(!entries||failed)return;
  for(const panel of panels){
   const id=panel.dataset.campus,info=entries[id];
   if(info&&!panel.querySelector('.tea-allen-subject-review'))
    panel.appendChild(render(id,info));
  }
 }
 function boot(){
  const host=document.getElementById('detailContent');
  if(!host||typeof MutationObserver==='undefined')return;
  observer=new MutationObserver(()=>{
   if(pending)return;
   pending=true;
   Promise.resolve().then(()=>{pending=false;mount()});
  });
  observer.observe(host,{childList:true,subtree:true});
  mount();
 }
 const api={describe,validate,officialUrl};
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&typeof document!=='undefined'){
  root.TEAAllenMcKinneyReview=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 }
})(typeof window!=='undefined'?window:null);
