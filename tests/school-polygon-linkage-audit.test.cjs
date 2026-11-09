'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {classify,auditLinkage,CORE}=require('../scripts/school-polygon-linkage-audit.cjs');
function row(overrides={}){
 return {school:'Example Elementary',district:'PISD',type:'elementary',
  matchStatus:'school-not-in-polygon-source',polygonCount:64,
  eligiblePolygonCount:30,sourceConfigured:true,sourceLoadError:false,
  idEvidence:false,nameEvidence:false,...overrides};
}
function source(d,overrides={}){
 return {district:d,sourceKey:d==='PISD'?'PISD_LOOKUP':d,polygonCount:12,
  sourceConfigured:d!=='CFB',sourceLoadError:false,liveFinderConfirmed:false,
  gradeCounts:{elementary:8,middle:3,high:1},...overrides};
}
test('classification distinguishes source unconfigured from remote failure and missing grade',()=>{
 assert.equal(classify(row({district:'CFB',sourceConfigured:false,polygonCount:0,
  eligiblePolygonCount:0,matchStatus:'no-district-polygon-source'})),'no-source-configured');
 assert.equal(classify(row({sourceLoadError:true,polygonCount:0,
  eligiblePolygonCount:0,matchStatus:'no-district-polygon-source'})),'source-fetch-failed');
 assert.equal(classify(row({polygonCount:0,eligiblePolygonCount:0,
  matchStatus:'no-district-polygon-source'})),'no-loaded-polygon-source');
 assert.equal(classify(row({eligiblePolygonCount:0,
  matchStatus:'no-grade-polygon-source'})),'no-grade-polygon-source');
});
test('a special campus is never counted as a pipeline defect',()=>{
 assert.equal(classify(row({matchStatus:'special-campus-no-standard-zone',
  idEvidence:true})), 'special-campus-no-standard-zone');
});
test('matching hints are not reported as confirmed source absence',()=>{
 assert.equal(classify(row({idEvidence:true})), 'possible-id-linkage-gap');
 assert.equal(classify(row({nameEvidence:true})), 'possible-name-linkage-gap');
 assert.equal(classify(row({})), 'school-not-found-in-source');
});
test('district result separates linked polygon and unknown data, with loaded-directory denominator',()=>{
 const rows=[
  row({district:'PISD',school:'School A',matchStatus:'matched'}),
  row({district:'PISD',school:'School B'}),
  row({district:'AISD',school:'School C',sourceLoadError:true,
    polygonCount:0,eligiblePolygonCount:0,matchStatus:'no-district-polygon-source'}),
  row({district:'CFB',school:'School D',polygonCount:0,eligiblePolygonCount:0,
    sourceConfigured:false,matchStatus:'no-district-polygon-source'})
 ];
 const report=auditLinkage({rows,sources:[
  source('PISD'),source('AISD',{polygonCount:0,sourceLoadError:true}),
  source('CFB',{polygonCount:0})
 ]});
 assert.equal(report.coverage.totalLoadedDirectory,4);
 assert.equal(report.coverage.matched,1);
 assert.equal(report.coverage.matchRateLoadedPercent,25);
 assert.equal(report.topSix.totalLoadedDirectory,4);
 assert.equal(report.coverage.unverified,1);
 assert.equal(report.byDistrict.CFB.statusCounts['no-source-configured'],1);
 assert.equal(report.byDistrict.AISD.unverified,1);
 assert.equal(report.status,'INCONCLUSIVE_SOURCE_AVAILABILITY');
});
test('matching and drawable polygon sample yields pass with source limitations, not official coverage',()=>{
 const r=auditLinkage({rows:[row({district:'PROSPER',school:'School A',matchStatus:'matched',
   polygonCount:31,eligiblePolygonCount:20})],
  sources:[source('PROSPER',{polygonCount:31,sourceConfigured:true})],
  renderChecks:[{district:'PROSPER',school:'School A',status:'passed',actualLayers:1}]
 });
 assert.equal(r.status,'PASS_WITH_SOURCE_LIMITATIONS');
 assert.equal(r.coverage.sampledRenderChecks,1);
 assert.equal(r.coverage.sampledRenderFailures,0);
 assert.match(r.auditMeaning,/not districtwide student assignment coverage/i);
});
test('matched name but zero actual Leaflet layers is a rendering pipeline failure',()=>{
 const r=auditLinkage({rows:[row({district:'AISD',matchStatus:'matched'})],
  sources:[source('AISD')],
  renderChecks:[{district:'AISD',school:'Example Elementary',
    status:'failed',actualLayers:0,reason:'matched-geometry-not-rendered'}]});
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.blocked,true);
 assert.equal(r.coverage.sampledRenderFailures,1);
});
test('stale year never becomes current by a successful name match',()=>{
 const r=auditLinkage({rows:[row({district:'AISD',matchStatus:'matched'})],
  sources:[source('AISD')]});
 assert.equal(r.byDistrict.AISD.limitation,'historical-2019-2023-reference');
 assert.equal(r.schools[0].sourceMode,'historical-2019-2023-reference');
});
test('match is not allowed when a source is unavailable, even if a stale local cache exists',()=>{
 const r=auditLinkage({rows:[row({district:'LISD',matchStatus:'matched',sourceLoadError:true})],
  sources:[source('LISD',{sourceLoadError:true})]});
 assert.equal(r.coverage.matched,0);
 assert.equal(r.byDistrict.LISD.unverified,1);
});
test('invalid match, negative source count or duplicate source state is rejected',()=>{
 assert.throws(()=>classify(row({polygonCount:-1})),/invalid_school/);
 assert.throws(()=>classify(row({matchStatus:'invented-verified'})),/invalid_school/);
 assert.throws(()=>auditLinkage({sources:[source('PISD'),source('PISD')]}),/duplicate_district_source/);
});
test('report category totals and district rows reconcile exactly',()=>{
 const rows=[row({district:'PISD',school:'a',matchStatus:'matched'}),
   row({district:'PISD',school:'b'}),row({district:'CFB',school:'c',sourceConfigured:false,polygonCount:0,eligiblePolygonCount:0,matchStatus:'no-district-polygon-source'})];
 const r=auditLinkage({rows,sources:[source('PISD'),source('CFB')]});
 assert.equal(CORE.length,6);
 assert.equal(Object.values(r.reasons).reduce((a,b)=>a+b,0),r.coverage.totalLoadedDirectory);
 assert.equal(Object.values(r.byDistrict).reduce((a,d)=>a+d.totalLoadedDirectory,0),r.coverage.totalLoadedDirectory);
});
