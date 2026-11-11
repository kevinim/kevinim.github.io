'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const live=read('data/cfb-ag03-official-finder-reconfirmed-public-samples-2026.json');
const prior=read('tests/cfb-official-resident-finder-verified-2026-11-07.json');
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
test('2/2 exact native official Finder rechecks reproduce all 6 historical grade labels',()=>{
  assert.equal(live.district,'CFB');
  assert.equal(live.properties.length,2);
  assert.equal(live.summary.reconfirmedPublicBaseAddresses,2);
  assert.equal(live.summary.gradeLevelFinderObservationsReconfirmed,6);
  assert.equal(live.verdict,'OFFICIAL_FINDER_EXACT_NATIVE_CANDIDATE_RECONFIRMED_FOR_TWO_PUBLIC_BASE_ADDRESSES');
  for(const x of live.properties){
    assert.equal(x.candidateSelected,true);
    assert.equal(x.exactCandidateMatched,true);
    assert.equal(x.status,'FINDER_UI_RECONFIRMED');
    assert.equal(x.polygonCompared,false);
    assert.equal(x.individualUnitCovered,false);
    const match=prior.samples.find(p=>norm(p.address)===norm(x.address));
    assert.ok(match,'Only pre-existing public fixtures may be read/reconfirmed');
    for(const grade of ['elementary','middle','high']){
      assert.equal(norm(x.observedLabels[grade]),norm(match.assigned[grade]));
    }
  }
});
test('official Finder UI evidence never certifies a raster polygon or current-year vector GIS',()=>{
  assert.equal(live.summary.certifiedGISPolygonHoldouts,0);
  assert.equal(live.summary.geometricallyCertifiedCampusZones,0);
  assert.equal(live.summary.validForAutomaticResidenceAssignment,false);
  assert.equal(live.yearExplicitInsideFinderWidget,false);
  assert.equal(new URL(live.finder).hostname,'app.guidek12.com');
  assert.ok(live.evidenceRun.includes('/actions/runs/42894866573'));
});
