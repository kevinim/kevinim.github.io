'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const source=require('../data/denton-2026-27-gis-source-disposition.json');
const pdf=require('../denton-official-zone-references.js');
const {inspect}=require('../scripts/check-denton-geopdf-status.cjs');
const copy=()=>structuredClone(source);
test('Denton 39 actual official 2026-27 GeoPDF-derived staging candidates are NOT 39 public campus GIS',()=>{
 const a=inspect(copy());assert.equal(a.status,'SOURCE_QA_PASS_GIS_PUBLICATION_NO_GO');
 assert.deepEqual(a.errors,[]);
 assert.equal(a.officialPdfRoster,39);
 assert.equal(a.stagingCandidates,39);
 assert.equal(a.currentDashboardPolygons,0);
 assert.equal(a.sourceOwnerRightsVerified,false);
 assert.equal(a.independentlyCertifiedCurrentHouseAssignments,0);
});
test('GeoPDF source and 2028-29, municipality scope, rights and official Finder cannot be forged',()=>{
 const cases=[
  m=>{m.schoolYear='2028-29';},
  m=>{m.geoPdfDerivedStaging.previousStagingCandidateCount=40;},
  m=>{m.geoPdfDerivedStaging.currentDashboardPolygonCount=39;},
  m=>{m.geoPdfDerivedStaging.derivativeRedistributionLicenseVerified=true;},
  m=>{m.geoPdfDerivedStaging.independentAddressBoundaryCertified=true;},
  m=>{m.geoPdfDerivedStaging.publicationApproved=true;},
  m=>{m.geoPdfDerivedStaging.previousNearBoundaryParcelMeters=250;},
  m=>{m.geoPdfDerivedStaging.priorQualityEvidenceDate='2026-11-18';},
  m=>{m.geoPdfDerivedStaging.aggregatePdfReferences[0].url='https://evil.invalid/denton.pdf';},
  m=>{m.geoPdfDerivedStaging.aggregatePdfReferences[0].expectedCandidatePolygons=25;},
  m=>{m.geoPdfDerivedStaging.aggregatePdfReferences.push({...m.geoPdfDerivedStaging.aggregatePdfReferences[0]});},
  m=>{m.sources.find(x=>x.kind==='town-of-flower-mound-partial-municipal-school-assignment-attribute-gis').usableAsCurrentCampusPolygon=true;},
  m=>{m.sources.find(x=>x.kind==='future-2028-29-proposed-attendance-rezoning').usableAsCurrentCampusPolygon=true;},
  m=>{m.originalVectorRecordsRequest.licensingConsentVerified=true;},
  m=>{m.originalVectorRecordsRequest.receivedResponseAsOf='reply received and approved';}
 ];
 for(const modify of cases){
  const m=copy();modify(m);
  const a=inspect(m);
  assert.equal(a.status,'FAIL');assert.ok(a.errors.length);
 }
});
test('official source selector has a collapsed, accessible 3-grade original GeoPDF evidence panel',()=>{
 class E {
  constructor(tag){this.tagName=tag;this.children=[];this.id='';this.textContent='';this.attributes={};}
  appendChild(child){this.children.push(child);return child}
  querySelector(s){
   if(!s.startsWith('#'))return null;
   const id=s.slice(1);
   const find=e=>e.id===id?e:e.children.map(find).find(Boolean)||null;
   return find(this);
  }
 }
 const doc={createElement:t=>new E(t)};
 const host=new E('details');
 assert.equal(pdf.addGeoPdfSourcePanel(doc,host),true);
 assert.equal(pdf.addGeoPdfSourcePanel(doc,host),false,'no duplicate panels');
 assert.equal(host.children.length,1);
 const panel=host.querySelector('#dentonGeoPdfResearchStatus');
 assert.ok(panel);
 assert.equal(panel.tagName,'details');
 assert.match(panel.children[0].textContent,/39개 후보 검증/);
 assert.match(panel.children[1].textContent,/지도에 연결된 폴리곤은 0개/);
 const anchors=panel.children[2].children;
 assert.equal(anchors.length,3);
 for(const [i,level] of ['elementary','middle','high'].entries()){
  assert.equal(anchors[i].href,pdf.ALL[level]);
  assert.equal(anchors[i].target,'_blank');
  assert.equal(anchors[i].rel,'noopener noreferrer');
 }
 assert.match(panel.children[3].textContent,/2028–29/);
 assert.equal(pdf.GEOPDF_STATUS.publiclyRenderedPolygons,0);
 assert.equal(pdf.GEOPDF_STATUS.derivativeRedistributionApproved,false);
});
test('the change is reference-only and does not affect maps, addresses or loaded geometry',()=>{
 const c=fs.readFileSync('denton-official-zone-references.js','utf8');
 assert.match(c,/addGeoPdfSourcePanel/);
 assert.match(c,/dentonGeoPdfResearchStatus/);
 assert.doesNotMatch(c,/fetch\(|L\.geoJSON|L\.imageOverlay|localStorage|sessionStorage|\.innerHTML\s*=/);
 assert.equal(require('../features/conditional-school-release.js').releaseSummary().currentYearResidentialDistrictApprovals,0);
});
