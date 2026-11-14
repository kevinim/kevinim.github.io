'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../.github/workflows');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const legacy=[
 'verify-dfw-next12-parent-guidance.yml','verify-dfw-next8-parent-guidance.yml',
 'verify-dfw-parent-guidance-batch4.yml','dfw-parent-source-batch5-qa.yml',
 'dfw-parent-source-batch6-qa.yml','verify-tea-display-quality-guard.yml'
];
const dfw=read('dfw-parent-source-batch7-qa.yml'),tea=read('verify-tea-school-profiles.yml');
test('all six prior batch workflows remain replayable without automatic PR or historical branch triggers',()=>{
 for(const name of legacy){
  const s=read(name);
  assert.match(s,/^  workflow_dispatch:\s*$/m,name);
  assert.doesNotMatch(s,/^  pull_request:/m,name+' still launches redundant PR runs');
  assert.doesNotMatch(s,/^  push:/m,name+' still launches obsolete branch pushes');
  assert.match(s,/^permissions:\s*\n  contents: read/m,name);
  assert.match(s,/^jobs:/m,name+' lost historical runnable tests');
 }
});
test('single automatic DFW source owner covers all historical evidence batches and GIS safeguards',()=>{
 assert.match(dfw,/^  pull_request:\s*\n    branches: \[main\]/m);
 assert.match(dfw,/^  workflow_dispatch:/m);
 assert.doesNotMatch(dfw,/^  push:/m);
 for(const p of [
  'district-registry.js','trusted-link-policy.js','data/dfw-school-coverage-matrix-2026.json',
  'data/dfw-parent-source-evidence-batch*.json','tests/dfw-parent-guidance-*.test.cjs',
  'tests/trusted-outbound-links.test.cjs','tests/dfw-school-coverage-runtime.test.cjs'
 ])assert.ok(dfw.includes(p),'missing DFW trigger: '+p);
 for(const name of legacy.slice(0,5))assert.ok(dfw.includes('.github/workflows/'+name),'manual suite must trigger owner test: '+name);
 for(const n of ['next12','batch3','batch4','batch5','batch6','batch7'])
  assert.ok(dfw.includes('tests/dfw-parent-guidance-'+n+'.test.cjs'),'lost source batch '+n);
 for(const n of ['tests/dfw-school-coverage-matrix.test.cjs','tests/dfw-school-coverage-runtime.test.cjs',
  'tests/trusted-outbound-links.test.cjs','tests/audit-gis-upload-links.test.cjs','tests/audit-school-provenance.test.cjs',
  'tests/dfw-neighbor-finders.test.cjs','tests/school-zone-ui.test.cjs','tests/dfw-noncfb-grade-year-source-quality.test.cjs'])
  assert.ok(dfw.includes(n),'lost protective DFW test '+n);
 assert.ok(dfw.includes("e.evidence.length!==8"),'lost independent batch-3 evidence cardinality check');
 assert.ok(dfw.includes('node scripts/check-public-personalization.cjs .'),'lost public-data protection');
});
test('DFW mobile + desktop school browser runs only once for related PRs',()=>{
 assert.equal((dfw.match(/run: node scripts\/test-dfw-school-coverage-browser\.cjs/g)||[]).length,1);
 assert.match(dfw,/^  browser:\s*$/m);
 for(const name of legacy.slice(0,5))assert.doesNotMatch(read(name),/^  pull_request:/m);
});
test('TEA original source/data/masking checks stay in profile owner and browser runs once',()=>{
 assert.match(tea,/^  pull_request:/m);
 assert.match(tea,/^  push:/m);
 for(const token of ['tests/tea-display-quality-guard.test.cjs','tests/carrollton-school-insights.test.cjs',
  'tests/tea-peims-priority-campus.test.cjs','tests/tea-district-profiles.test.cjs',
  'node scripts/build-tea-profile-progress.cjs --check','.github/workflows/verify-tea-display-quality-guard.yml'])
  assert.ok(tea.includes(token),'lost TEA protection: '+token);
 assert.equal((tea.match(/run: node scripts\/test-carrollton-tea-insights-browser\.cjs/g)||[]).length,1);
 assert.match(tea,/^  browser:\s*$/m);
});
test('required cross-cutting privacy, code and school release checks remain automatic',()=>{
 const v=read('verify-main-dashboard.yml'),sec=read('public-release-security.yml');
 const school=read('school-data-preflight.yml');
 assert.match(v,/^  verify:\s*$/m);assert.match(v,/^  pull_request:\s*\n    branches: \[main\]/m);
 assert.match(v,/node --test tests\/ci-rationalization\.test\.cjs/);
 assert.match(sec,/^  pull_request:\s*\n    branches: \[main\]/m);
 assert.match(sec,/^  pr-change-secrets:/m);
 assert.match(sec,/^  privacy-regression:/m);
 assert.match(school,/^  push:\s*\n    branches: \[main\]/m);
});
