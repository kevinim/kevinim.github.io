'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {verdict,VIEWPORTS,PUBLIC_BLOCKERS}=require('../scripts/evaluate-final-regression.cjs');
function evidence(){
 return {
  school:{
   blocked:false,
   coverage:{sampledRenderChecks:18,sampledRenderFailures:0},
   topSix:{totalLoadedDirectory:273,matched:240},
   baselineComparison:{status:'BASELINE_OK'},
   byDistrict:Object.fromEntries(['FISD','PISD','AISD','LISD','PROSPER','CFB'].map(x=>[
    x,{totalLoadedDirectory:30,linked:21,limitation:x==='AISD'
      ?'historical-2019-2023-reference':x==='CFB'
      ?'resident-finder-only-no-dashboard-polygons':'official-2026-27-live-feed'}
   ])),
   markerChecks:[{district:'AISD',status:'passed',expectedVisible:21,matchedMarkers:21,missingNames:[]}]
  },
  mobile:{
   views:VIEWPORTS.map(width=>({width,issues:[],clearButton:'pass',groupedSchoolControls:true})),
   issues:[],addressClear:{result:'pass'}
  },
  area:{scenarios:[390,1280].map(width=>({width,selectedZip:'75013',overflow:0}))},
  security:{
   mode:'release',status:'BLOCKED',
   blockers:PUBLIC_BLOCKERS.map(kind=>({kind})),
   credentials:[],personalization:[],newSensitive:[],nonPublishable:[]
  }
 };
}
function cloned(){const e=evidence();e.school.byDistrict.CFB.linked=0;return e;}
test('passing code QA never authorizes a public release or asserts a real UAT',()=>{
 const v=verdict(cloned());
 assert.equal(v.codeQa,'PASS');
 assert.match(v.publicProduction,/NO_GO/);
 assert.match(v.familyUat,/NOT_PROVISIONED/);
 assert.deepEqual(v.errors,[]);
 assert.ok(v.warnings.some(x=>x.startsWith('cfb_')));
 assert.equal(v.checks.allenVisibleMarkers,21);
});
test('missing evidence is not mistaken for success',()=>{
 const v=verdict({});
 assert.equal(v.codeQa,'REVIEW_REQUIRED');
 assert.ok(v.errors.includes('school_browser_evidence_missing'));
 assert.ok(v.errors.includes('mobile_browser_evidence_missing'));
 assert.ok(v.errors.includes('public_release_gate_not_explicitly_blocked'));
});
test('inconclusive official GIS source cannot pass as a verified baseline',()=>{
 const e=cloned();e.school.baselineComparison.status='INCONCLUSIVE_SOURCE_AVAILABILITY';
 assert.ok(verdict(e).errors.includes('school_source_missing_or_baseline_unverified'));
});
test('Allen school markers disappearing is a release blocker independent of boundary counts',()=>{
 const e=cloned();e.school.markerChecks[0].matchedMarkers=0;
 assert.ok(verdict(e).errors.includes('allen_visible_markers_missing'));
});
test('Allen historical GIS must retain its year warning',()=>{
 const e=cloned();e.school.byDistrict.AISD.limitation='official-current';
 assert.ok(verdict(e).errors.includes('allen_boundary_vintage_disclaimer_missing'));
});
test('unconfigured CFB GIS must never become falsely labeled official',()=>{
 const e=cloned();e.school.byDistrict.CFB.limitation='live-current';
 assert.ok(verdict(e).errors.includes('cfb_no_polygon_source_unlabeled'));
});
test('missing map polygon renderer sample blocks release',()=>{
 const e=cloned();e.school.coverage.sampledRenderChecks=0;
 assert.ok(verdict(e).errors.includes('school_render_sample_insufficient'));
 const f=cloned();f.school.coverage.sampledRenderFailures=1;
 assert.ok(verdict(f).errors.includes('school_polygon_render_failed'));
});
test('district directory or polygon linkage drops below observed baseline',()=>{
 const e=cloned();e.school.topSix.totalLoadedDirectory=199;e.school.topSix.matched=180;
 assert.ok(verdict(e).errors.includes('school_six_district_linkage_regressed'));
});
test('all seven mobile widths must run; no overlap or hidden address reset',()=>{
 const e=cloned();e.mobile.views.splice(0,1);
 assert.ok(verdict(e).errors.includes('mobile_viewports_not_all_checked'));
 const f=cloned();f.mobile.issues=[{width:390,items:['horizontal overflow']}];
 assert.ok(verdict(f).errors.includes('mobile_overlap_or_horizontal_overflow'));
 const g=cloned();g.mobile.addressClear.result='failed';
 assert.ok(verdict(g).errors.includes('address_clear_post_selection_unverified'));
});
test('ZIP-based regional risk evidence is required on mobile and desktop',()=>{
 const e=cloned();e.area.scenarios=[{width:390,selectedZip:'75014',overflow:0}];
 assert.ok(verdict(e).errors.some(x=>x.includes('regional_assessment_or_zip_interaction_failed')));
});
test('public preview must remain blocked until owner and provider approvals',()=>{
 const e=cloned();e.security.status='READY_FOR_MANUAL_REVIEW';
 assert.ok(verdict(e).errors.includes('public_release_gate_not_explicitly_blocked'));
 const f=cloned();f.security.blockers.pop();
 assert.ok(verdict(f).errors.some(x=>x.startsWith('public_release_manual_gate_missing_')));
});
test('secret, personal address marker or unapproved public artifact blocks code QA',()=>{
 for(const field of ['credentials','personalization','newSensitive','nonPublishable']){
  const e=cloned();e.security[field].push({file:'sample',kind:'synthetic'});
  assert.ok(verdict(e).errors.includes('sanitized_public_artifact_contains_sensitive_or_unapproved_asset'),field);
 }
});
