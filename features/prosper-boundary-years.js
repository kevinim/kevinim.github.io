'use strict';
// Prosper school-year status and official address-lookup disclosure.
// Board votes, published maps, usable GIS, and actual address APIs are
// separate types of evidence. This feature never performs address requests.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)Object.defineProperty(root,'ProsperBoundaryYears',{value:api,writable:false,configurable:false});
})(typeof window!=='undefined'?window:null,function(){
 const FINDER='https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1';
 const OFFICIAL_BOUNDARIES='https://www.prosper-isd.net/page/attendance-boundaries/';
 const OFFICIAL_2027_NOTICE='https://www.prosper-isd.net/';
 const STATE=Object.freeze({
  district:'PROSPER',
  current:Object.freeze({
   schoolYear:'2026–27',boardBoundaryPublished:true,
   publicGisAvailable:true,geojson:'prosper-attendance-2026.geojson',
   sourceGradeCoverage:Object.freeze(['elementary','middle','high']),
   gisReferenceAutoDisplay:true,officialAddressAutoVerified:false
  }),
  future:Object.freeze({
   schoolYear:'2027–28',approvalDate:'2026-11-16',
   boardBoundaryApproved:true,
   approvedGrades:Object.freeze(['middle','high']),
   officialNoticePublished:true,officialNoticeUrl:OFFICIAL_2027_NOTICE,
   schoolSpecificVectorGISAvailable:false,
   schoolSpecificMapFilesIndependentlyVerified:false,
   addressAssignmentVerified:false,
   elementaryBoundaryChangeVerified:false,
   dashboardAutomaticZoneReady:false
  }),
  officialAddress:Object.freeze({
   provider:'Prosper ISD Infofinder i',
   publicFinderUrl:FINDER,
   api:'SearchAddress',directDashboardRead:'blocked-by-vendor-cors',
   exactAddressAutomaticIntegration:false,approvedProxyAvailable:false
  })
 });
 function status(district){
  if(district!=='PROSPER')return null;
  return STATE;
 }
 function render(target,district){
  if(!target||typeof target.appendChild!=='function'||district!=='PROSPER')return false;
  const doc=target.ownerDocument;
  if(!doc||typeof doc.createElement!=='function')return false;
  // Deduplicate when the caller redraws its panel.
  if(target.querySelector?.('[data-prosper-year-status]'))return true;
  const node=(tag,content,cls)=>{
   const el=doc.createElement(tag);
   if(cls)el.className=cls;
   if(content!==undefined)el.textContent=content;
   return el;
  };
  const wrapper=node('details',undefined,'home-school-evidence prosper-year-status');
  wrapper.setAttribute('data-prosper-year-status','true');
  const label=node('summary','Prosper 2027–28 경계 승인 · 새 학년도 자료 상태');
  wrapper.appendChild(label);
  wrapper.appendChild(node('p',
   '현재 지도: 2026–27 공식 GIS 초·중·고 참고 경계. 2027–28 변경 내용은 아직 이 지도에 적용하지 않았습니다.'));
  wrapper.appendChild(node('p',
   '2027–28: 2026-11-16 교육위원회에서 중·고등학교 경계를 승인했습니다. 교육청 공지 확인됨. 해당 연도 학교별 GIS 폴리곤과 주소별 자동 배정 자료는 현재 확보·검증되지 않았습니다. 초등학교 변경 여부도 미확인입니다.'));
  const official=node('a','2027–28 교육청 공식 안내에서 지도 확인','cardlink');
  official.href=OFFICIAL_2027_NOTICE;
  official.target='_blank';official.rel='noopener noreferrer';
  wrapper.appendChild(official);
  wrapper.appendChild(node('p',
   '주소별 공식 자동 연동: Infofinder SearchAddress는 대시보드 브라우저에서 CORS로 차단됩니다. 교육청이 공개한 검색기를 별도 창에서 직접 사용해야 합니다. 이 버튼은 현재 입력한 집 주소를 자동 전송하지 않습니다.'));
  const finder=node('a','Prosper 공식 주소 검색기 직접 열기','cardlink');
  finder.href=FINDER;finder.target='_blank';finder.rel='noopener noreferrer';
  wrapper.appendChild(finder);
  const source=node('a','학군 경계 자료 모음','cardlink');
  source.href=OFFICIAL_BOUNDARIES;source.target='_blank';source.rel='noopener noreferrer';
  wrapper.appendChild(source);
  target.appendChild(wrapper);
  return true;
 }
 return Object.freeze({status,render});
});
