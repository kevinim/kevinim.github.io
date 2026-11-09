'use strict';
// The public artifact is intentionally NOT released; the sole accepted blocker is
// a missing manual attestation that source storage and Pages publishing are separated.
const cp=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {verifyCspIntegrity}=require('./build-public-preview.cjs');
const base=path.resolve('dist/public-preview');
const build=cp.spawnSync(process.execPath,['scripts/build-public-preview.cjs',base],{encoding:'utf8'});
if(build.status!==0){process.stderr.write('Preview build failed: '+build.stderr.slice(0,650)+'\n');process.exit(1);}
const audit=cp.spawnSync(process.execPath,['scripts/public-release-gate.cjs','release',base],{
 encoding:'utf8',env:{...process.env,PUBLIC_SOURCE_SEPARATED:''}
});
if(audit.status!==1)throw Error('Release gate must fail while private source separation is unverified');
const report=JSON.parse(fs.readFileSync('artifacts/security/public-release-audit.json','utf8'));
assert.equal(report.mode,'release');
assert.equal(report.status,'BLOCKED');
assert.deepEqual(report.blockers.map(x=>x.kind),[
 'private-source-separation-not-verified',
 'external-provider-terms-not-approved',
 'data-redistribution-licenses-not-approved',
 'live-browser-qa-not-approved',
 'owner-publication-approval-missing'
]);
assert.equal(report.credentials.length,0);
assert.equal(report.personalization.length,0);
assert.equal(report.nonPublishable.length,0);
assert.equal(report.newSensitive.length,0);
const previewHtml=fs.readFileSync(path.join(base,'index.html'),'utf8');
const previewCsp=verifyCspIntegrity(previewHtml);
assert.equal(previewCsp.policy.includes("script-src-attr 'none'"),true);
assert.equal(previewCsp.policy.includes("'unsafe-inline'"),false);
const assets=['index.html','home-lookup-v2.js','candidate-compare.js','dfw-outside-public.json','schools.json'];
for(const p of assets)assert.ok(fs.existsSync(path.join(base,p)),'Missing public asset '+p);
const forbidden=['jpm-outside-dfw.json','jpm-road-times-2026-11-04.json',
 'jpm-60min-isochrone-2026-11-04.geojson','HANDOFF.md','AGENTS.md','CLAUDE.md',
 '.github/workflows/public-release-security.yml','reviewed.html','scripts/build-public-preview.cjs','features/reviewed-bootstrap.js',
 'features/geojson-upload-guard.js','dashboard-main.js'];
for(const p of forbidden)assert.equal(fs.existsSync(path.join(base,p)),false,'Forbidden public artifact '+p);
function walk(dir,rel=''){
 const entries=[];
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const name=rel?rel+'/'+item.name:item.name;
  if(item.isSymbolicLink())throw Error('Preview symlink is forbidden');
  if(item.isDirectory())entries.push(...walk(path.join(dir,item.name),name));
  else entries.push(name);
 }
 return entries;
}
for(const f of walk(base)){
 if(!/\.(?:html|js|json|geojson|css)$/i.test(f))continue;
 const content=fs.readFileSync(path.join(base,f),'utf8');
 assert.equal(/\bJPM\b|JPMorgan|JPM_ADDRESS|\bjpmMinutes\b|jpm-|8181 Communications/i.test(content),false,
  'Personalized office reference remains in bundled file '+f);
 if(/\.html$|\.js$/i.test(f)){
  for(const match of content.matchAll(/(?:\b(?:src|href)=["']\.\/([^"'?#]+)|\bfetch\(["']\.\/([^"'?#]+))/g)){
   const referenced=match[1]||match[2];
   assert.equal(referenced.includes('..'),false,'Unexpected parent-relative dependency');
   assert.ok(fs.existsSync(path.join(base,referenced)),'Missing bundled relative dependency '+referenced+' from '+f);
  }
 }
}
const outside=JSON.parse(fs.readFileSync(path.join(base,'dfw-outside-public.json'),'utf8'));
assert.deepEqual(outside.minutes,{});
assert.equal(outside.data.every(d=>!Object.hasOwn(d,'jpmMinutes')),true);
assert.equal(fs.readFileSync(path.join(base,'index.html'),'utf8').includes('nominatim.openstreetmap.org'),false);
process.stdout.write('Preview artifact validated; public launch remains BLOCKED pending manual source, provider, licensing, browser QA, and owner approval. No deployment.\n');
