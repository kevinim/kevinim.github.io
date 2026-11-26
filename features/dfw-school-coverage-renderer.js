'use strict';
/* Lazy source-backed coverage view. No household address processing or external calls.
 * Never infer a campus attendance assignment or show baseline as 2026-27 GIS proof.
 */
(function(){
 const FILE='./data/dfw-school-coverage-matrix-2026.json';
 const LOCALITY_FILE='./data/tea-texasworks-locality-2026.json';
 const PUBLIC_SOURCE_FILE='./data/dfw-cfb-denton-public-source-status-20261120.json';
 const PLANO_LEWISVILLE_FILE='./data/dfw-plano-lewisville-source-vintage-20261120.json';
 const NEXT_GIS_FILE='./data/dfw-next-gis-source-candidates-20261121.json?v=3';
 const priorityLabel={P0:'P0 · 공식 안내 조사',P1:'P1 · 원본/제도 점검',P2:'P2 · 보완'};
 const reasonLabels={
  'official-parent-lookup-not-yet-verified':'학군 공식 확인 경로 미등록',
  'official-parent-route-linked-but-campus-gis-not-ingested':'공식 안내 연결 · 학교별 GIS 미구성',
  'other-lea-admissions-model-needs-classification':'별도 운영기관 · 입학 방식 확인 필요',
  'choice-not-address-zoning':'학교 선택제 · 주소 자동 배정 아님',
  'historical-campus-polygons-not-current-assignment':'과거 경계 · 현행 여부 미검증',
  'finder-linked-polygons-year-not-confirmed':'Finder 관련 도형 연도 미확인',
  'live-finder-source-can-change-since-reference-run':'공식 Finder 실시간 재검증 필요',
  'current-year-source-reference-still-needs-live-recheck':'2026–27 원본 · 실시간 확인 필요',
  'campus-polygon-evidence-unreviewed':'학교별 GIS 검증 이력 미확인'
 };
 const el=(tag,cls,text)=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(text!==undefined)x.textContent=String(text);
  return x;
 };
 function init(){
  const panel=document.getElementById('dfwSchoolCoveragePanel');
  const content=document.getElementById('dfwSchoolCoverageContent');
  if(!panel||!content)return;
  let started=false;
  panel.addEventListener('toggle',()=>{
   if(panel.open&&!started){started=true;load(content)}
  });
  if(panel.open){started=true;load(content)}
 }
 async function load(mount){
  // A live region around 152 table rows would produce excessive announcements.
  // Limit screen-reader notifications to the loading/error message and row count.
  mount.setAttribute('aria-live','off');
  mount.setAttribute('aria-busy','true');
  const status=el('p',null,'DFW 학군 연결 현황을 불러오는 중…');
  status.setAttribute('role','status');
  mount.replaceChildren(status);
  try{
   const response=await fetch(FILE,{cache:'force-cache'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(data.schemaVersion!==1||!Array.isArray(data.districts)||
      data.districts.length!==data.summary?.teaDistrictCodes)throw Error('자료 버전 불일치');
   // Independent evidence requests can run concurrently after core validation.
   // One missing source stays unknown; it never becomes certified by fallback.
   const optional=async(url,validate)=>{
    try{
     const evidence=await fetch(url,{cache:'force-cache'});
     return evidence.ok?validate(await evidence.json()):null;
    }catch(_error){return null;}
   };
   const [locality,publicSources,vintageSources,nextGIS]=await Promise.all([
    optional(LOCALITY_FILE,extra=>
     validTexasWorks(extra,data.districts.find(x=>x.code==='061806'))?extra:null),
    optional(PUBLIC_SOURCE_FILE,validPublicSources),
    optional(PLANO_LEWISVILLE_FILE,validPlanoLewisvilleSources),
    optional(NEXT_GIS_FILE,validNextGISSources)
   ]);
   render(mount,data,locality,publicSources,vintageSources,nextGIS);
  }catch(_error){
   const error=el('p',null,'학군 연결 현황을 불러올 수 없습니다. 페이지 새로고침 후 다시 열어주세요.');
   error.setAttribute('role','alert');
   mount.replaceChildren(error);
  }finally{
   mount.setAttribute('aria-busy','false');
  }
 }
 function validPublicSources(data){
  if(data?.schemaVersion!==1||data.reviewedOn!=='2026-11-20'||
     data.districtReplyRequired!==false||data.exactAddressAutoAssignmentCertified!==false||
     !Array.isArray(data.entries)||data.entries.length!==2)return null;
  const rows=new Map();
  for(const e of data.entries){
   if(!['057903','061901'].includes(e?.code)||rows.has(e.code)||
      e.researchPass!=='public-sources-inventoried'||e.currentYearCertifiedCampusPolygons!==0||
      e.officialResidenceLookupAutoIntegrated!==false||e.sourceGeometryRightsConfirmed!==false||
      e.currentOfficialSchoolLookup?.available!==true||
      e.currentOfficialSchoolLookup?.readsResultsIntoDashboard!==false)return null;
   if(e.code==='057903'&&
      (e.approvedBoundaryRaster?.count!==3||e.historicalMunicipalGIS?.cfbFeatureCount!==30||
       e.historicalMunicipalGIS?.sourceLastEditedYear!==2020||
       e.historicalMunicipalGIS?.academicYearConfirmed!==false||
       e.currentParentLookupSchoolYear!=='2026–27'))return null;
   if(e.code==='061901'&&
      (e.officialPdfMaps?.count!==39||
       e.officialPdfMaps?.grades?.elementary!==26||
       e.officialPdfMaps?.grades?.middle!==9||
       e.officialPdfMaps?.grades?.high!==4||
       e.qaOnlyDerivedShapes?.count!==39||e.qaOnlyDerivedShapes?.published!==false||
       e.qaOnlyDerivedShapes?.nearBoundaryPublicParcelMeters!==20.6||
       e.qaOnlyDerivedShapes?.uncertainEdgeGuardMeters!==100))return null;
   rows.set(e.code,e);
  }
  return rows.size===2?rows:null;
 }
 function validPlanoLewisvilleSources(data){
  if(data?.schemaVersion!==1||data.reviewedOn!=='2026-11-20'||
     data.districtReplyRequired!==false||data.schoolAddressOfficialCertification!==false||
     data.geometryReuseAuthorizationInferred!==false||!Array.isArray(data.districts)||
     data.districts.length!==2)return null;
  const rows=new Map();
  for(const entry of data.districts){
   if(!entry||!['043910','061902'].includes(entry.code)||rows.has(entry.code)||
      entry.locatorYear!=='2026–27'||entry.verifiedFor2026_27!==false||
      entry.displayReferenceOnly!==true||entry.locatorInteractiveResultReadByDashboard!==false||
      entry.currentResidentialAutomaticAssignmentCertified!==false||
      entry.sourceGeometryRightsIndependentlyConfirmed!==false)return null;
   if(entry.code==='043910'&&
      (entry.key!=='PISD'||entry.inventoryCampusRecords!==69||
       entry.sourceFieldYear!=='2025–26'||
       entry.servicePolygonCounts?.total!==64||
       entry.servicePolygonCounts?.elementary!==44||
       entry.servicePolygonCounts?.middle!==11||
       entry.servicePolygonCounts?.high!==6||
       entry.servicePolygonCounts?.senior!==3||
       entry.linkedAppCampusCount!==62||entry.loadedAppCampusCount!==63||
       entry.cityHistoricalZones?.sourceAcademicYear!=='2019–20'||
       entry.cityHistoricalZones?.sourceLastEditedOn!=='2020-01'||
       entry.cityHistoricalZones?.current!==false||
       entry.districtIndependentResidentialAddressConfirmed!==0))return null;
   if(entry.code==='061902'&&
      (entry.key!=='LISD'||entry.inventoryCampusRecords!==57||
       entry.featureCountMixedMultipart!==696||
       entry.linkedAppCampusCount!==53||entry.loadedAppCampusCount!==54||
       entry.sourceFieldYear!=='high 2025–26; elementary/middle unverified'||
       entry.apartmentEvidence?.rows!==174||
       entry.apartmentEvidence?.uniqueNames!==173||
       entry.apartmentEvidence?.referencePolygonPointMatches!==173||
       entry.apartmentEvidence?.conflicts!==1||
       entry.apartmentEvidence?.conflictingGradeLevels!==4||
       entry.apartmentEvidence?.schoolYearVerified!==false||
       entry.apartmentLocatorDedicated!==true))return null;
   rows.set(entry.code,entry);
  }
  return rows.size===2?rows:null;
 }
 function validNextGISSources(data){
  const known=['057914','043914','199901','057916','043908'];
  if(data?.schemaVersion!==1||data.reviewedOn!=='2026-11-21'||
     data.schoolAssignmentCertified!==false||data.publicGeometryHosted!==false||
     data.geometryRedistributionApproved!==false||
     !Array.isArray(data.districts)||data.districts.length!==5)return null;
  const out=new Map();
  for(const d of data.districts){
   if(!d||!known.includes(d.code)||out.has(d.code)||!Number.isSafeInteger(d.inventoryCampuses)||
      d.installedSchoolPolygons!==0||d.liveSchoolAssignmentCertified!==false||
      d.sourceReuseRightsVerified!==false||
      typeof d.officialParent!=='string'||!d.officialParent.startsWith('https://')||
      typeof d.notes!=='string'||d.notes.length>1000)return null;
   if(d.code==='057914'){
    if(d.inventoryCampuses!==51||d.sourceKind!=='municipal-attendance-polygon'||
       d.publisherGIS!=='https://gisservice.cityofmesquite.com/arcgis/rest/services/onlinemaps/neighborhood_vitality/MapServer/6'||
       d.officialParent!=='https://www.mesquiteisd.org/189249_2'||
       d.sourceGeometry!=='esriGeometryPolygon'||
       JSON.stringify(d.schoolAttributes)!=='["ES_ZONE","MS_Zone","HS_Zone"]'||
       d.sourceSchoolYear!==null||d.sourceLastEdited!==null)return null;
   }else if(d.code==='043914'){
    // The matching-name Abilene Wylie Bulldogs (Buffalo Gap Rd) is a DIFFERENT ISD.
    if(d.inventoryCampuses!==22||d.sourceKind!=='district-current-maps-feeder-only'||
       d.publisherGIS!==null||d.sourceDocument!==null||d.sourceSchoolYear!==null||
       d.publisher!=='Wylie ISD (southern Collin County)'||
       d.officialParent!=='https://www.wylieisd.net/our-district/district-profile/district-maps'||
       d.sourceContextUrl!=='https://www.wylieisd.net/our-district/rezoning-2025-26'||
       typeof d.sourceYearEvidence!=='string'||!d.sourceYearEvidence.includes('Abilene'))return null;
   }else if(d.code==='199901'){
    if(d.inventoryCampuses!==23||d.sourceKind!=='district-pdf-conflicting-year-label'||
       d.publisherGIS!==null||d.sourceSchoolYear!==null||
       d.sourceDocument!=='https://resources.finalsite.net/images/v1746561842/rockwallisdcom/xu447xmnec7gsjl7ekfh/2026-2027ZoningwithnewMS.pdf'||
       d.officialParent!=='https://www.rockwallisd.com/new-student/new-student/school-attendance-areas'||
       typeof d.sourceYearEvidence!=='string'||!d.sourceYearEvidence.includes('2023-24'))return null;
   }else if(d.code==='057916'){
    if(d.inventoryCampuses!==51||d.sourceKind!=='district-historical-pdf-plus-finder'||
       d.publisherGIS!==null||d.sourceSchoolYear!==null||
       d.officialParent!=='https://web.risd.org/home/schools/'||
       d.sourceDocument!=='https://web.risd.org/home/wp-content/uploads/2024/03/OnlineProjectResizeMp.pdf')return null;
   }else if(d.code==='043908'){
    // Approved elementary zoning does not certify this Finder's selected map year or E/M/H geometry.
    if(d.inventoryCampuses!==9||d.sourceKind!=='district-interactive-zoning-reference-only'||
       d.publisher!=='Melissa ISD'||d.publisherGIS!==null||d.sourceSchoolYear!==null||
       d.approvedElementaryYear!=='2026-27'||d.locatorGuideSchoolYear!=='2025-26'||
       d.reviewedOn!=='2026-11-25'||d.liveMapCurrentYearIndependentlyVerified!==false||
       d.sourceLastEdited!==null||
       d.officialParent!=='https://www.melissaisd.org/page/interactive-zoning-map'||
       d.sourceContextUrl!=='https://www.melissaisd.org/o/nce/article/2608592'||
       !d.notes.includes('Cardinal Renaissance Academy'))return null;
   }
   out.set(d.code,d);
  }
  return known.every(code=>out.has(code))?out:null;
 }
 function validTexasWorks(extra,district){
  if(!extra||extra.schemaVersion!==1||extra.districtId!=='061806'||
     !district||district.name!=='TEXAS WORKS'||extra.inventoryCount!==district.teaCampusRecords||
     extra.inventoryCount!==41||!Array.isArray(extra.campuses)||
     extra.campuses.length!==41)return false;
  const statuses=['operator-address-in-11-county-msa','operator-address-outside-11-county-msa','pending-exact-name-crosswalk'];
  const ids=new Set(),counts=[0,0,0];
  for(const entry of extra.campuses){
   if(!/^061806\d{3}$/.test(entry.campusId||'')||ids.has(entry.campusId)||
      typeof entry.officialCampusName!=='string'||!entry.officialCampusName.startsWith('TEXASWORKS - ')||
      typeof entry.operatorLocation!=='string'||entry.operatorLocation.length<3||
      !/^\d{5}$/.test(entry.operatorZIP||'')||
      entry.sourceURL!=='https://texasworks.com/learning/landing-page-find-a-campus/')return false;
   const i=statuses.indexOf(entry.locationEvidence);if(i<0)return false;
   ids.add(entry.campusId);counts[i]++;
  }
  return counts[0]===extra.counts?.operatorAddressIn11CountyMSA&&
   counts[1]===extra.counts?.operatorAddressOutside11CountyMSA&&
   counts[2]===extra.counts?.pendingExactCampusCrosswalk;
 }
 function render(mount,data,locality,publicSources,vintageSources,nextGIS){
  mount.replaceChildren();
  const s=data.summary;
  const stats=el('div','dfw-coverage-stats');
  for(const [value,label] of [
   [s.publicISDsWithRegisteredParentRoute+'/'+s.publicISDs,'공식 안내 등록 ISD (26년 자료)'],
   [s.registeredParentRouteRatePublicISDPercent+'%','공식 안내 등록률 · 배정선 완성률 아님'],
   [s.publicISDsMissingRegisteredParentRoute,'미등록 ISD · 확인 필요'],
   [s.teaDistrictCodes,'전체 TEA 운영 주체 (기타 '+s.otherLEAs+' 포함)']
  ]){
   const card=el('div','dfw-coverage-stat');
   card.append(el('strong',null,value),el('span',null,label));
   stats.appendChild(card);
  }
  mount.appendChild(stats);
  mount.appendChild(el('p','dfw-coverage-help',
   '기준: DFW 광역통계권 11개 카운티 · TEA 2026 예비 학교 기록. 학군 행정상 소속 카운티 기록이며 실제 개별 캠퍼스의 DFW 소재지를 뜻하지 않습니다. TexasWorks처럼 여러 도시에 있는 운영기관은 별도 확인이 필요합니다.'));
  mount.appendChild(el('p','dfw-coverage-help',
   'GIS 배정선 연결률과 실제 주소·학년별 배정 확인률은 아직 전체 학군 기준으로 산출할 수 없습니다. 미검증을 0%로 표시하지 않습니다.'));
  const controls=el('div','dfw-coverage-filter');
  const select=el('select');
  select.setAttribute('aria-label','학군 데이터 연결 우선순위');
  for(const [value,title] of [['P0','P0 · 공식 안내 미등록'],['P1','P1 · 자료 보강'],['P2','P2 · 후속'],['all','전체 152개 운영 주체']]){
   const option=el('option',null,title);option.value=value;select.appendChild(option);
  }
  const input=el('input');input.type='search';
  input.setAttribute('aria-label','학군명·카운티 검색');input.placeholder='학군명·카운티 검색';
  controls.append(select,input);
  for(const [code,title] of [['057903','CFB 자료'],['061901','Denton 자료'],['043910','Plano 연도'],['061902','Lewisville 연도'],['057914','Mesquite GIS'],['043914','Wylie 지도'],['199901','Rockwall 지도'],['057916','Richardson 지도'],['043908','Melissa 지도']]){
   const jump=el('button','dfw-coverage-more',title);
   jump.type='button';jump.dataset.districtCode=code;
   jump.addEventListener('click',()=>{
    const district=data.districts.find(d=>d.code===code);
    if(!district)return;
    select.value='all';input.value=district.code;shown=20;display();
    wrap.scrollIntoView?.({block:'nearest',behavior:'auto'});
   });
   controls.appendChild(jump);
  }
  mount.appendChild(controls);
  const label=el('p','dfw-coverage-help');
  label.setAttribute('role','status');label.setAttribute('aria-live','polite');
  mount.appendChild(label);
  const wrap=el('div','dfw-coverage-table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');
  wrap.setAttribute('aria-label','DFW 학군별 학교 배정 연결 현황');
  const table=el('table');
  const head=el('thead'),headRow=el('tr');
  for(const name of ['학군 / 카운티','TEA 학교 기록','공식 안내 / 미연결 사유','GIS 상태']){
   const th=el('th',null,name);th.scope='col';headRow.appendChild(th);
  }
  head.appendChild(headRow);table.appendChild(head);
  const body=el('tbody');table.appendChild(body);wrap.appendChild(table);mount.appendChild(wrap);
  const more=el('button','dfw-coverage-more','20개 더 보기');
  more.type='button';mount.appendChild(more);
  const foot=el('p','dfw-coverage-help',
   '기존 7개 학군의 GIS 숫자는 과거 브라우저 검증 최소치일 뿐, 학년도·주소별 배정 보증이 아닙니다. 다른 학군은 GIS 확인 전까지 수치를 표시하지 않습니다.');
  mount.appendChild(foot);
  mount.appendChild(el('p','dfw-coverage-help','추가 5개 학군의 공개 GIS/지도 원본이 조사되었으나 2026–27 자동 배정 GIS가 새로 탑재된 것은 아닙니다.'));
  const byCode=new Map(data.districts.map(d=>[d.code,d]));
  let shown=20;
  const safeLink=url=>{
   if(typeof url!=='string')return null;
   return window.TrustedLinkPolicy?.official?.(url)||null;
  };
  function display(){
   const term=input.value.trim().toLocaleLowerCase();
   const matching=data.priorityQueue.map(code=>byCode.get(code)).filter(Boolean).filter(d=>
    (select.value==='all'||d.priority===select.value)&&
    (!term||[d.name,d.countyOfRecord,d.code].some(v=>String(v).toLocaleLowerCase().includes(term))));
   const page=matching.slice(0,shown);
   body.replaceChildren();
   for(const d of page){
    const row=el('tr');
    const name=el('td');name.append(el('strong',null,d.name),el('div','dfw-coverage-help',d.countyOfRecord+' (행정 소속) · '+d.code));
    if(d.code==='061806'){
     name.appendChild(el('div','dfw-coverage-help',
      locality?'운영자 공개 주소 대조 · DFW 11카운티 내 '+locality.counts.operatorAddressIn11CountyMSA+
        ' · 범위 밖 '+locality.counts.operatorAddressOutside11CountyMSA+
        ' · 명칭/ID 추가 확인 '+locality.counts.pendingExactCampusCrosswalk:
       '학교 실제 소재지 대조자료 미확인 · 41개를 DFW 소재 학교로 계산하면 안 됩니다'));
     name.appendChild(el('div','dfw-coverage-help',
      '공개 주소 위치 참고만 가능 · 집 주소의 배정학교나 현행 GIS 경계 인증이 아닙니다'));
    }
    const n=el('td',null,d.teaCampusRecords);n.style.textAlign='right';
    const route=el('td');
    route.append(el('div',null,reasonLabels[d.missingReason]||d.missingReason));
    const url=safeLink(d.parentGuidance.officialUrl);
    if(url){
     const a=el('a',null,'학군 공식 안내');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
     route.appendChild(a);
    }else route.append(el('div','dfw-coverage-help','링크 검증 필요'));
    const zone=d.geometry;
    let geometryText=zone.status==='reference-browser-minimum-only'?
     '참고 매칭 '+zone.referenceMatchedMinimum+'/'+zone.referenceLoadedMinimum:
     zone.status==='no-dashboard-school-polygons-configured'?'앱 지도 경계 미구성':'GIS 원본 검증 필요';
    if(zone.vintageMode==='historical-2019-2023-reference')geometryText+=' · 과거자료';
    else if(zone.vintageMode?.includes('not-confirmed')||zone.vintageMode?.includes('mixed-vintages'))geometryText+=' · 연도 미확정';
    const gis=el('td',null,geometryText);
    const proof=publicSources?.get(d.code);
    if(proof){
     const detail=el('details','dfw-source-disposition');
     detail.appendChild(el('summary',null,'공개자료 조사 완료 · 현행 학교별 GIS 미확보'));
     if(d.code==='057903'){
      detail.appendChild(el('p',null,
       '2025–26 교육청 승인 지도 3장(래스터) · 2026–27 공식 Finder·진학표 · 2020년 최종 수정 시 GIS 30개(초20/중6/고4). 2020은 GIS 수정연도이며 인증된 학년도가 아닙니다.'));
      detail.appendChild(el('p',null,
       'McCoy/Blanton·Furneaux/Woodlake/Woodland 공식 문구 충돌 · 현행 학교별 GIS 0개 · 자동 주소 배정 미인증.'));
     }else{
      detail.appendChild(el('p',null,
       '2026–27 교육청 공식 PDF 39개(초26/중9/고4) · PDF 추출 후보 39개는 QA 전용, 지도 배포 0개.'));
      detail.appendChild(el('p',null,
       '경계 인접 공공 필지 20.6m 사례가 100m 불확실성 기준에 미달 · 자동 주소 배정 미인증.'));
     }
     detail.appendChild(el('p',null,
      '공식 원본 공개 ≠ 재배포 허가 ≠ 주소별 배정 인증. 교육청 회신 대기 없이 공개자료 조사는 마감.'));
     const link=safeLink(proof.currentOfficialSchoolLookup.sourceUrl);
     if(link){
      const anchor=el('a',null,'학군 공식 주소 검색기');
      anchor.href=link;anchor.target='_blank';anchor.rel='noopener noreferrer';
      detail.appendChild(anchor);
     }
     gis.appendChild(detail);
    }
    const vintage=vintageSources?.get(d.code);
    if(vintage){
     const detail=el('details','dfw-source-disposition');
     detail.appendChild(el('summary',null,'공식 검색기 운영 · GIS 학년도 미검증'));
     if(d.code==='043910'){
      detail.appendChild(el('p',null,
       'Plano 2026–27 공식 SchoolFinder는 2025–26 표기 ArcGIS 64개 구역(초44·중11·고6·Senior High 3)에 연결됩니다. 앱 학교명 참고 연결은 62/63이며 주소별 공식 배정 검증률이 아닙니다.'));
      detail.appendChild(el('p',null,
       '시 정부의 별도 OpenData GIS는 2019–20 자료(2020년 1월 최종 수정)입니다. 이 구역을 2026–27 현행 경계로 취급하지 않습니다.'));
      detail.appendChild(el('p',null,
       'Plano는 Senior High 단계가 별도로 있고 Jackson Elementary는 Coit Road 동·서쪽 진학 경로가 나뉩니다. 학교급별 공식 SchoolFinder 재확인이 필요합니다.'));
     }else{
      detail.appendChild(el('p',null,
       'Lewisville 2026–27 공식 School Locator 운영 중. 연결 도형은 고등학교 2025–26, 초·중학교 적용 연도 미확인입니다. 앱 참고 학교명 연결 53/54는 배정 검증률이 아닙니다.'));
      detail.appendChild(el('p',null,
       '공개 아파트 목록 174행 중 1건(Budget Suites of America, 5289 S Highway 121)은 지도 경계와 초·중·9학년·고등 4단계가 충돌합니다. 어느 쪽도 자동 확정하지 않습니다.'));
      detail.appendChild(el('p',null,
       '아파트 주소는 공식 Find an Apartment 기능으로 별도 조회해야 합니다. 건물·호수별 차이와 실제 학년도는 미인증입니다.'));
     }
     detail.appendChild(el('p',null,
      '2026–27 공식 검색기 공개 ≠ 연결 도형의 현행 연도 검증 ≠ 주소별 확정 배정 ≠ 데이터 재배포 허가. 교육청 회신을 기다리지 않습니다.'));
     const url=safeLink(vintage.locatorSource);
     if(url){
      const anchor=el('a',null,d.code==='043910'?'Plano 공식 SchoolFinder':'Lewisville 공식 School Locator');
      anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';
      detail.appendChild(anchor);
     }
     gis.appendChild(detail);
    }
    const newEvidence=nextGIS?.get(d.code);
    if(newEvidence){
     const detail=el('details','dfw-source-disposition');
     detail.appendChild(el('summary',null,
      d.code==='057914'?'시정부 학교별 GIS 후보 발견 · 지도 미탑재':'공식 경계 참고자료 확보 · 지도 GIS 미탑재'));
     const schoolYear=newEvidence.sourceSchoolYear||'학년도 미확인';
     detail.appendChild(el('p',null,
      '출처: '+newEvidence.publisher+' · '+schoolYear+' · 2026–27 주소 배정 미인증 · 앱 학교별 폴리곤 0개'));
     if(d.code==='057914'){
      detail.appendChild(el('p',null,
       '시 GIS 도형에서 초·중·고 구역명(ES_ZONE / MS_Zone / HS_Zone)을 확인했습니다. 전체 구역·캠퍼스 ID·현행 연도·재사용 조건은 미검증입니다.'));
     }
     detail.appendChild(el('p',null,newEvidence.notes));
     const sourceUrl=safeLink(newEvidence.publisherGIS)||safeLink(newEvidence.officialParent);
     if(sourceUrl){
      const a=el('a',null,d.code==='057914'?'시정부 GIS 원본 열기':'학군 공식 자료 열기');
      a.href=sourceUrl;a.target='_blank';a.rel='noopener noreferrer';detail.appendChild(a);
     }
     gis.appendChild(detail);
    }
    row.append(name,n,route,gis);body.appendChild(row);
   }
   more.hidden=page.length>=matching.length;
   label.textContent=(select.value==='all'?'전체':priorityLabel[select.value])+' · '+matching.length+'개 학군/운영 주체 중 '+page.length+'개 표시';
   if(matching.length===0) {
    const row=el('tr'),cell=el('td',null,'검색 조건에 맞는 학군이 없습니다.');
    cell.colSpan=4;row.appendChild(cell);body.appendChild(row);
   }
  }
  select.addEventListener('change',()=>{shown=20;display()});
  input.addEventListener('input',()=>{shown=20;display()});
  more.addEventListener('click',()=>{shown+=20;display()});
  display();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();
