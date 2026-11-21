'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const audit=require('../data/dfw-gis-coverage-audit-20261121.json');
const matrix=require('../data/dfw-school-coverage-matrix-2026.json');

test('all 108 public ISDs reconcile one-to-one with the existing official-parent-route source matrix',()=>{
 const source=matrix.districts.filter(d=>d.category==='public-isd');
 const index=new Map(source.map(d=>[d.code,d]));
 assert.equal(source.length,108);
 assert.equal(index.size,108);
 assert.equal(audit.districts.length,108);
 assert.equal(new Set(audit.districts.map(d=>d.teaCode)).size,108);
 assert.equal(audit.summary.observedPublicISDs,108);
 assert.equal(audit.summary.officialParentEntryRegistered,108);
 for(const row of audit.districts){
  assert.match(row.teaCode,/^\\d{6}$/);
  const base=index.get(row.teaCode);
  assert.ok(base,'unrecognized source district '+row.teaCode);
  assert.equal(row.isd,base.name,row.teaCode+' name');
  assert.equal(row.countyOfRecord,base.countyOfRecord,row.teaCode+' county');
  assert.equal(row.teaCampusRecords,base.teaCampusRecords,row.teaCode+' campus inventory');
  assert.equal(row.officialParentEntry,base.parentGuidance.officialUrl,row.teaCode+' official source');
  assert.ok(row.officialParentEntry.startsWith('https://'),'source must be HTTPS');
  assert.equal(row.residenceAssignmentCertified,false,'parent entry or GIS is not legal assignment');
 }
});
test('recompute GIS display mode and 11-county rollups without inventing whole-DFW GIS coverage',()=>{
 const modes=audit.districts.reduce((a,d)=>(a[d.polygonDisplay]=(a[d.polygonDisplay]||0)+1,a),{});
 const main=(modes['main-current-source']||0)+(modes['main-reference']||0)+(modes['main-historical-reference']||0);
 assert.deepEqual({
  officialCurrent:modes['main-current-source'],main,optIn:modes['opt-in-reference'],none:modes['not-configured-in-app']
 },{officialCurrent:2,main:6,optIn:2,none:100});
 assert.equal(audit.summary.verified2026_27SchoolZoneSource,2);
 assert.equal(audit.summary.mainPolygonMapSources,main);
 assert.equal(audit.summary.optInPublisherReferenceGIS,2);
 assert.equal(audit.summary.noCampusPolygonDisplay,100);
 assert.equal(audit.summary.independentlyCertifiedAutoResidenceDistricts,0);
 assert.equal(audit.summary.fullDfWParcelGISPercent,null);
 assert.equal(audit.summary.fullDFWCampusGISPercent,null);
 assert.equal(audit.districts.filter(d=>d.polygonDisplay==='main-current-source').map(d=>d.isd).sort().join(','),'FRISCO ISD,PROSPER ISD');
 const grouped=new Map();
 for(const d of audit.districts){
  const c=grouped.get(d.countyOfRecord)||{count:0,mainMap:0,optIn:0,noPolygonDisplay:0};
  c.count++;
  if(d.polygonDisplay.startsWith('main-'))c.mainMap++;
  else if(d.polygonDisplay==='opt-in-reference')c.optIn++;
  else if(d.polygonDisplay==='not-configured-in-app')c.noPolygonDisplay++;
  else assert.fail('invalid GIS display '+d.teaCode);
  grouped.set(d.countyOfRecord,c);
 }
 assert.equal(grouped.size,11);
 for(const c of audit.countySummaries){
  const expected=grouped.get(c.county);
  assert.ok(expected,'unrecognized county '+c.county);
  assert.deepEqual({count:c.count,mainMap:c.mainMap,optIn:c.optIn,noPolygonDisplay:c.noPolygonDisplay},expected);
  grouped.delete(c.county);
 }
 assert.equal(grouped.size,0,'each county accounted once');
});
test('no public-source research or historical reference is silently promoted to a certified school assignment',()=>{
 const research=new Set(['not-evaluated-in-this-audit','public-source-closed','choice-model','historical-source-found','finder-only','official-maps']);
 for(const d of audit.districts){
  assert.ok(research.has(d.publicSourceResearch),'unknown public-source category '+d.teaCode);
  assert.equal(d.residenceAssignmentCertified,false);
  if(d.polygonDisplay==='not-configured-in-app'){
   assert.equal(d.publishedSourceVintage,null,'unconfigured GIS should not invent source vintage');
  }
 }
 assert.match(audit.cautions.join(' '),/Not configured in app does not mean no public GIS exists/);
 assert.match(audit.cautions.join(' '),/not a verified exact-address school finder/i);
});
