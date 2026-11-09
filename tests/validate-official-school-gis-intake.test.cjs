'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('../scripts/validate-official-school-gis-intake.cjs');
const policy=require('../data/finder-derived-source-rights-2026.json');
const demoManifest={schemaVersion:1,districtCode:'CFB',schoolYear:'2026-2027',demoOnly:true,
 sourceUrl:'https://example.org/synthetic-official-gis',mapPublishable:false};
const corners=[[[-96.9,32.9],[-96.899,32.9],[-96.899,32.901],[-96.9,32.901],[-96.9,32.9]]];
const feature=(level,id,name)=>({type:'Feature',properties:{district:'CFB',schoolYear:'2026-2027',
 gradeLevel:level,campusId:id,school:name},geometry:{type:'Polygon',coordinates:corners}});
const good={type:'FeatureCollection',features:[feature('elementary','1111','Synthetic Elementary'),
 feature('middle','2222','Synthetic Middle'),feature('high','3333','Synthetic High')]};
const copy=x=>JSON.parse(JSON.stringify(x));
test('synthetic school GIS passes schema QA only: never releases geometry or enrollment proof',()=>{
 const out=run(demoManifest,good,policy);
 assert.equal(out.status,'SCHEMA_REVIEW_ONLY');assert.deepEqual(out.blockers,[]);
 assert.equal(out.mapPublishable,false);assert.equal(out.individualAddressAssignmentVerified,false);
 assert.deepEqual(out.byGrade,{elementary:1,middle:1,high:1});
});
test('real CFB GIS rejects without documented rights and second reviewer',()=>{
 const m=copy(demoManifest);m.demoOnly=false;
 const out=run(m,good,policy);
 assert.equal(out.status,'NO_GO');
 assert.ok(out.blockers.includes('real_gis_rights_or_source_not_cleared'));
 assert.ok(out.blockers.includes('independent_review_missing'));
});
test('falsely self-attested source flag cannot authorize real GIS data',()=>{
 const m=copy(demoManifest);m.demoOnly=false;m.approvedAlternateSource=true;
 m.independentReviewerApproved=true;m.reviewEvidenceUrl='https://example.org/review';
 m.permissionEvidenceUrl='https://example.org/consent';
 assert.ok(run(m,good,policy).blockers.includes('real_gis_rights_or_source_not_cleared'));
});
test('real GIS only passes rights gate for independently allowlisted source URL',()=>{
 const m=copy(demoManifest);m.demoOnly=false;m.independentReviewerApproved=true;
 m.reviewEvidenceUrl='https://example.org/review';
 m.permissionEvidenceUrl='https://example.org/consent';
 const rights=copy(policy);
 rights.districts.CFB.status='approved';
 rights.districts.CFB.approvedUses.publicRedistribution=true;
 rights.districts.CFB.consentEvidenceUrl='https://example.org/consent';
 rights.districts.CFB.approvedOfficialGisUrls=['https://example.org/other'];
 assert.ok(run(m,good,rights).blockers.includes('real_gis_rights_or_source_not_cleared'));
 rights.districts.CFB.approvedOfficialGisUrls=[m.sourceUrl];
 const out=run(m,good,rights);
 assert.equal(out.status,'SCHEMA_REVIEW_ONLY');assert.equal(out.mapPublishable,false);
});
test('nonpolygon Point layer cannot masquerade as an attendance zone',()=>{
 const x=copy(good);x.features[0].geometry={type:'Point',coordinates:[-96.9,32.9]};
 assert.ok(run(demoManifest,x,policy).blockers.some(s=>s.includes('not_polygon_geometry')));
});
test('unclosed or degenerate polygons are blocked',()=>{
 const x=copy(good);x.features[1].geometry.coordinates=[[[0,0],[1,0],[1,1],[0,1]]];
 assert.ok(run(demoManifest,x,policy).blockers.some(s=>s.includes('open_ring')));
 const y=copy(good);y.features[2].geometry.coordinates=[[[0,0],[1,1],[2,2],[0,0]]];
 assert.ok(run(demoManifest,y,policy).blockers.some(s=>s.includes('degenerate_ring')));
});
test('wrong academic year and wrong grade assignments are blocked',()=>{
 const x=copy(good);x.features[0].properties.schoolYear='2025-2026';
 assert.ok(run(demoManifest,x,policy).blockers.some(s=>s.includes('campus_year_or_grade_unverified')));
});
test('same grade and campus ID cannot represent contradictory school names',()=>{
 const x=copy(good);x.features.push(feature('elementary','1111','Different Name'));
 assert.ok(run(demoManifest,x,policy).blockers.some(s=>s.includes('campus_identity_conflict')));
});
test('human release review remains required for any source, including legitimate samples',()=>{
 const x=copy(demoManifest);x.mapPublishable=true;
 assert.ok(run(x,good,policy).blockers.includes('map_publication_not_authorized'));
});
