'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../.github/workflows',name),'utf8');
for(const name of ['build-phase2a-fema-hazards.yml','noaa-storm-snapshot.yml']){
 test(name+' validates PR code without source downloads or repository write access',()=>{
  const text=read(name);
  assert.doesNotMatch(text,/contents:\s*write|persist-credentials:\s*true|\bgit\s+(?:push|commit|config)\b/);
  assert.match(text,/persist-credentials:\s*false/);
  const validate=text.slice(text.indexOf('  validate-pr:'),text.indexOf('  build-snapshot:'));
  assert.match(validate,/github\.event_name == 'pull_request'/);
  assert.match(validate,/node --check scripts\//);
  assert.doesNotMatch(validate,/run: node scripts\//);
  const builder=text.slice(text.indexOf('  build-snapshot:'));
  assert.match(builder,/if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  assert.match(builder,/ref: main/);
  assert.match(builder,/actions\/upload-artifact@[0-9a-f]{40}/);
 });
}
test('runtime privacy regression follows every address and destination request owner',()=>{
 const text=read('agent06-runtime-privacy-release-qa.yml');
 for(const file of ['dashboard-main.js','features/commute/provider-requests.js','features/commute/workplace-destinations.js'])
  assert.ok(text.includes("- '"+file+"'"),file+' changes must run runtime privacy QA');
 assert.match(text,/node --test tests\/snapshot-workflow-security\.test\.cjs/);
});
