'use strict';
// Navigation only. An official campus/attendance-zone finder is not a machine-readable
// API response and a campus's physical address is not a student's assignment.
// Never append a school, residential address, ZIP, coordinates or user query to these URLs.
(function(factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.WestSchoolOfficialFinder=api;
})(function(){
  const ENTRIES=Object.freeze({
    '220919':Object.freeze({
      name:'Carroll ISD',
      url:'https://apps.myplanware.com/schoolsearch/carroll',
      host:'apps.myplanware.com',
      kind:'address-search',
      label:'Carroll ISD 공식 주소별 배정 검색',
      guidance:'Carroll ISD 공식 SchoolSearch에서 2026–27학년도와 거주지 주소를 직접 확인하세요. Southlake·Westlake 주소가 반드시 Carroll ISD 배정이라는 뜻은 아닙니다.',
      source:'https://www.southlakecarroll.edu/district-information/district-departments/student-services/online-enrollment-portal/frequently-asked-questions'
    }),
    '220907':Object.freeze({
      name:'Keller ISD',
      url:'https://www.kellerisd.net/schoollocator',
      host:'www.kellerisd.net',
      kind:'address-search',
      label:'Keller ISD 공식 주소별 학교 검색',
      guidance:'Keller ISD의 Find My School에서 거주지 주소를 직접 확인하세요. 시정부 ArcGIS의 2018–19 과거 경계는 현재 배정으로 사용하지 않습니다.',
      source:'https://www.kellerisd.net/about-kisd/maps'
    }),
    '061911':Object.freeze({
      name:'Northwest ISD',
      url:'https://apps.myplanware.com/schoolsearch/northwest',
      host:'apps.myplanware.com',
      kind:'address-search',
      label:'Northwest ISD 공식 2026–27 주소별 배정 검색',
      guidance:'Northwest ISD SchoolSearch에서 School Year 2026–27을 선택한 뒤 거주지 주소를 직접 입력하세요. Proposed 2027–28은 현재 배정이 아닙니다.',
      source:'https://www.nisdtx.org/departments/facilities/attendance-boundaries'
    }),
    '220906':Object.freeze({
      name:'Grapevine-Colleyville ISD',
      url:'https://www.gcisd.net/page/attendance-area-maps/',
      host:'www.gcisd.net',
      kind:'official-map',
      label:'GCISD 공식 배정 지도 (주소별 최종 확인 필요)',
      guidance:'GCISD는 초·중·고교 공식 배정 지도를 제공합니다. 주소별 검색 기능은 확인되지 않았으므로 경계 근처 주소는 교육청에 직접 문의하세요.',
      source:'https://www.gcisd.net/page/attendance-area-maps/'
    })
  });
  const CODES=Object.freeze(Object.keys(ENTRIES));
  function isSafe(entry){
    try{
      const uri=new URL(entry.url);
      const src=new URL(entry.source);
      const valid=(u)=>u.protocol==='https:'&&!u.username&&!u.password&&
        !u.hash&&!u.search&&!u.port;
      return valid(uri)&&valid(src)&&uri.hostname===entry.host&&
        (src.hostname==='www.southlakecarroll.edu'||src.hostname==='www.kellerisd.net'||
         src.hostname==='www.nisdtx.org'||src.hostname==='www.gcisd.net')&&
        (entry.kind==='address-search'||entry.kind==='official-map')&&
        typeof entry.label==='string'&&typeof entry.guidance==='string';
    }catch{return false;}
  }
  function lookup(code){
    const e=typeof code==='string'?ENTRIES[code]:null;
    return e&&isSafe(e)?e:null;
  }
  function createAnchor(doc,code){
    const e=lookup(code);
    if(!e)return null;
    const a=doc.createElement('a');
    a.className='cardlink west-dfw-direct-lookup';
    a.href=e.url;
    a.target='_blank';
    a.rel='noopener noreferrer';
    a.textContent=e.label+' ↗';
    a.dataset.district=code;
    a.dataset.lookupKind=e.kind;
    return a;
  }
  function addToMissingBoundaryNote(doc,container,code){
    if(!container||!lookup(code)||container.querySelector('.west-dfw-direct-lookup'))return false;
    const p=doc.createElement('p');
    p.className='source boundary-footnote west-dfw-zone-help';
    p.textContent=lookup(code).guidance;
    container.appendChild(p);
    const a=createAnchor(doc,code);
    container.appendChild(a);
    return true;
  }
  return Object.freeze({CODES,lookup,isSafe,createAnchor,addToMissingBoundaryNote});
});