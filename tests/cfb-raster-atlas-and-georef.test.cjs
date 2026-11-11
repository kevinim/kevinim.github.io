'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const {fit,evaluate}=require('../scripts/measure-cfb-raster-registration.cjs');
const manifest=read('data/cfb-approved-zone-raster-reference-2026.json');
const control=read('data/cfb-elementary-raster-calibration-draft.json');
const targets=read('data/cfb-rezoning-boundary-review-targets-2026.json');
const finder=read('tests/cfb-official-resident-finder-verified-2026-11-07.json');
const tea=read('tea-ratings-2026.json'),nces=read('nces-locations-2024.json');
test('three official 2025–26 raster sources are exact and explicitly NOT digitized GIS',()=>{
 assert.equal(manifest.district,'CFB');
 assert.equal(manifest.approvedSchoolYear,'2025-26');
 assert.deepEqual(manifest.maps.map(x=>x.level),['elementary','middle','high']);
 assert.ok(manifest.maps.every(x=>new URL(x.url).hostname==='resources.finalsite.net'));
 assert.equal(manifest.rasterReferenceOnly,true);
 assert.equal(manifest.georeferenced,false);
 assert.equal(manifest.reconstructedCampusPolygonCount,0);
 assert.equal(manifest.validForAutomaticResidenceAssignment,false);
});
test('14 draft school-site pixel anchors actually map to original TEA/NCES campuses, no fabricated school location',()=>{
 const sites=new Map(tea.data.filter(x=>x.district==='CFB').map(x=>[x.id,x]));
 const location=new Map(nces.data.map(x=>[x.id,x]));
 assert.equal(control.controlPoints.length,14);
 assert.equal(new Set(control.controlPoints.map(x=>x.campusId)).size,14);
 for(const p of control.controlPoints){
  assert.ok(sites.has(p.campusId),'Unknown CFB TEA school '+p.campusId);
  assert.deepEqual(p.latlon,location.get(p.campusId)?.ll);
  assert.ok(p.pixel[0]>=0&&p.pixel[0]<control.rasterPixelSize[0]);
  assert.ok(p.pixel[1]>=0&&p.pixel[1]<control.rasterPixelSize[1]);
  assert.equal(p.pixelConfidence,'rough-visual');
 }
 assert.equal(control.verifiedPixelAnchors,0);
});
test('rough draft has measurable nonzero registration error and cannot be silently released',()=>{
 const raw=fit(control.controlPoints);
 const report=evaluate(control);
 assert.ok(raw.rmsMeters>0&&raw.rmsMeters<2000,'sane but non-certified fit');
 assert.equal(report.verdict,'DRAFT_NO_GO');
 assert.equal(report.imagePreviewAllowed,false);
 assert.equal(report.schoolZonePolygonsPublished,0);
 assert.equal(report.autoResidenceAssignmentAllowed,false);
 assert.equal(report.actualReconstructedFinderHoldoutMatches,0);
 assert.ok(report.reasons.includes('no_same_address_reconstructed_geometry_vs_live_finder_holds'));
});
test('existing verified official Finder results are public test observations, never polygon-validation results',()=>{
 assert.equal(finder.samples.length,2);
 assert.ok(finder.samples.every(x=>x.elementaryMiddleHighVerified===true));
 assert.equal(finder.sourceGeometryCurrentYearIndependent,false);
 assert.equal(finder.localAutomaticHouseAssignmentIntegrated,false);
 assert.ok(finder.samples.every(x=>x.candidateSelected));
 assert.equal(targets.displayMapGeometry,false);
 assert.ok(targets.targets.every(x=>x.mapPublishable===false&&x.finder2026Verified===false));
});
test('CFB map atlas does not add fake GIS or downgrade residential release policy',()=>{
 const script=fs.readFileSync(path.join(root,'features/cfb-approved-zone-atlas.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(script,/rasterReferenceOnly/);
 assert.doesNotMatch(script,/L\.imageOverlay|L\.geoJSON|APPROVED_AUTO_DISTRICTS|localStorage|sessionStorage|iframe\.contentDocument/);
 assert.match(html,/features\/cfb-approved-zone-atlas\.js\?v=1/);
 assert.match(html,/img-src[^"]*https:\/\/resources\.finalsite\.net/);
 assert.equal(require('../features/conditional-school-release.js').releaseSummary().currentYearResidentialDistrictApprovals,0);
});
