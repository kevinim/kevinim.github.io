'use strict';
const fs=require('node:fs'),test=require('node:test'),assert=require('node:assert/strict');
const x=JSON.parse(fs.readFileSync('data/dfw-agent01-gis-source-inventory-2026.json','utf8'));
const census=JSON.parse(fs.readFileSync('data/dfw-school-coverage-matrix-2026.json','utf8'));
test('agent01 never inflates current-school polygon coverage or certifies new assignments',()=>{
 assert.equal(x.newCurrentYearAttendancePolygonSourcesVerified,0);
 assert.equal(x.newDistrictsReleasedToDashboard,0);
 assert.equal(x.schoolClickE2ECertified,false);
 assert.equal(x.productionAllowed,false);
 assert.equal(x.baseline.mainNotEquivalentToDraft,true);
});
test('candidate district codes match TEA matrix; do not duplicate parallel agent districts',()=>{
 const byCode=new Map(census.districts.map(v=>[v.code,v.name]));
 for(const c of x.candidates){
  assert.ok((byCode.get(c.districtCode)||'').includes(c.district.toUpperCase()),c.districtCode+' district mismatch');
  assert.equal(c.currentYearCertified,false);
  assert.notEqual(c.geometryStage,'production');
  assert.match(c.sourceURL||c.officialDistrictPage,/^https:\/\//);
 }
 for(const c of x.candidates)assert.equal(/denton|carrollton.farmers.branch|dallas isd/i.test(c.district),false);
});
test('Irving maps cover three distinct grade levels and exact publisher web map IDs',()=>{
 const v=x.candidates.find(c=>c.districtCode==='057912');
 assert(v);assert.deepEqual(v.webmaps.map(z=>z.grade),['elementary','middle','high']);
 for(const row of v.webmaps){assert.match(row.arcgisWebmapId,/^[a-f\d]{32}$/);if(row.grade==='elementary')assert.match(row.academicYear,/^2024-25/);else assert.equal(row.academicYear,null);}
 assert.equal(new Set(v.webmaps.map(x=>x.arcgisWebmapId)).size,3);
 assert.ok(v.requiredForActivation.length>=4,'all remaining gates must be explicit');
 assert.equal(v.choiceCampuses[0].ordinaryAttendanceZoneRequired,false);
 assert.equal(v.officialLocator.arcgisLiveWebMapId,'8004c79f6dd144b6996e7240c5182507');
 assert.equal(v.officialLocator.yearOfEachBoundaryOfficiallyCertified,false);
});
