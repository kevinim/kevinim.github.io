'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {compareBaseline}=require('../scripts/verify-school-linkage-baseline.cjs');
const baseline=JSON.parse(fs.readFileSync('data/school-polygon-linkage-baseline.json','utf8'));
function report(){
 const byDistrict={};
 for(const [d,s] of Object.entries(baseline.districts))
  byDistrict[d]={totalLoadedDirectory:s.minimumLoaded,
   linked:s.minimumLinked,limitation:s.mode,
   source:{sourceLoadError:false,polygonCount:d==='CFB'?0:10}};
 return {byDistrict,
  topSix:{totalLoadedDirectory:baseline.targetSix.minimumLoaded,
   matched:baseline.targetSix.minimumLinked},
  coverage:{sampledRenderChecks:18,sampledRenderFailures:0},
  markerChecks:[{district:'AISD',status:'passed',eligibleSchoolLocations:21,
    expectedVisible:21,matchedMarkers:21,missingNames:[]}]};
}
test('observed baseline accepted without ever asserting districtwide official accuracy',()=>{
 const out=compareBaseline(report(),baseline);
 assert.equal(out.status,'BASELINE_OK');
 assert.equal(out.blockers.length,0);
 assert.match(out.summary,/not current-year official residence assignment/);
});
test('Allen one missing matched source school requires review',()=>{
 const x=report();x.byDistrict.AISD.linked--;
 const out=compareBaseline(x,baseline);
 assert.equal(out.status,'REVIEW_REQUIRED');
 assert.ok(out.blockers.some(v=>v.code==='school_boundary_matches_regressed'));
});
test('One missing Allen marker blocks even if all polygon links exist',()=>{
 const x=report();
 x.markerChecks[0].missingNames=['Example School'];
 x.markerChecks[0].matchedMarkers=20;
 const out=compareBaseline(x,baseline);
 assert.equal(out.status,'REVIEW_REQUIRED');
 assert.ok(out.blockers.some(v=>v.code==='allen_markers_missing_or_not_verified'));
});
test('No Allen marker check never silently passes',()=>{
 const x=report();x.markerChecks=[];
 assert.equal(compareBaseline(x,baseline).status,'REVIEW_REQUIRED');
});
test('live source fetch outage makes counts inconclusive, not an absence proof',()=>{
 const x=report();
 x.byDistrict.FISD.linked=0;
 x.byDistrict.FISD.source.sourceLoadError=true;
 x.topSix.matched=100;
 const out=compareBaseline(x,baseline);
 assert.equal(out.status,'INCONCLUSIVE_SOURCE_AVAILABILITY');
 assert.deepEqual(out.sourceUnavailable,['FISD']);
 assert.equal(out.blockers.length,0);
});
test('available source with zero linked schools is not excused by another live-source status',()=>{
 const x=report();x.byDistrict.LISD.linked=0;
 const out=compareBaseline(x,baseline);
 assert.equal(out.status,'REVIEW_REQUIRED');
 assert.ok(out.blockers.some(v=>v.district==='LISD'));
});
test('changing a source year classification requires review rather than being called current',()=>{
 const x=report();x.byDistrict.PISD.limitation='official-2026-27-confirmed';
 assert.ok(compareBaseline(x,baseline).blockers.some(v=>v.code==='source_freshness_classification_changed'));
});
test('reduced visible sample or polygons trigger review',()=>{
 const x=report();x.coverage.sampledRenderChecks=1;
 assert.ok(compareBaseline(x,baseline).blockers.some(v=>v.code==='insufficient_polygon_render_sample'));
});
