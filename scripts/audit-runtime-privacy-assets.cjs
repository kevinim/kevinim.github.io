#!/usr/bin/env node
'use strict';
// Agent 06: read-only source audit. Never print address text, credentials, or request URLs.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const PAGES=['index.html','reviewed.html'];
const ADDRESS_SCRIPTS=[
 'home-lookup-v2.js','home-lookup.js','texas-address-suggest.js',
 'candidate-compare.js','collin-parcel-check.js','school-assignment.js'
];
const PERSISTENCE=/\b(?:localStorage|sessionStorage|indexedDB|document\.cookie|navigator\.sendBeacon)\b/;
const LOGGING=/\bconsole\.(?:log|info|warn|error|debug)\s*\(/;
const HISTORY=/\b(?:history\.(?:pushState|replaceState)|location\.(?:assign|replace))\s*\(/;
function auditSensitiveScript(filename,source){
 const errors=[];
 if(PERSISTENCE.test(source))errors.push(filename+': address flow accesses persistent storage or a telemetry beacon');
 if(LOGGING.test(source))errors.push(filename+': address flow contains console logging; review for typed address leakage');
 if(HISTORY.test(source))errors.push(filename+': address flow alters browser navigation history');
 return errors;
}
function scanAssetReferences(html,root,page){
 const errors=[],assets=[];
 for(const tag of html.match(/<(?:script|link)\b[^>]*>/gi)||[]){
  const found=/\b(?:src|href)\s*=\s*["']([^"']+)["']/i.exec(tag);
  if(!found)continue;
  const url=found[1];
  if(!url.startsWith('./')&&!url.startsWith('/'))continue;
  let pathname;
  try{pathname=decodeURIComponent(url.split(/[?#]/,1)[0]);}
  catch{errors.push(page+': malformed local asset reference');continue;}
  const absolute=path.resolve(root,pathname.replace(/^\/+/,''));
  if(absolute!==root&&!absolute.startsWith(root+path.sep)){
   errors.push(page+': asset path escaped publication root');continue;
  }
  const rel=path.relative(root,absolute).replace(/\\/g,'/');
  assets.push(rel);
  if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile()){
   errors.push(page+': missing referenced static asset '+rel);
  }
 }
 return {errors,assets};
}
function audit(root=ROOT){
 const errors=[],assets=[];
 for(const page of PAGES){
  const file=path.join(root,page);
  if(!fs.existsSync(file)){errors.push('missing public entrypoint '+page);continue;}
  const result=scanAssetReferences(fs.readFileSync(file,'utf8'),root,page);
  errors.push(...result.errors);assets.push(...result.assets);
 }
 for(const file of ADDRESS_SCRIPTS){
  const absolute=path.join(root,file);
  if(!fs.existsSync(absolute)){errors.push('missing address flow '+file);continue;}
  errors.push(...auditSensitiveScript(file,fs.readFileSync(absolute,'utf8')));
 }
 const theme=path.join(root,'features/theme-toggle.js');
 if(!fs.existsSync(theme))errors.push('missing theme preference module');
 else{
  const source=fs.readFileSync(theme,'utf8');
  if(!source.includes("const KEY='tx-dashboard-theme-v1'")||
     !source.includes('localStorage.setItem(KEY,next)')){
   errors.push('theme storage policy changed: inspect before permitting persistence');
  }
 }
 const index=path.join(root,'index.html');
 if(fs.existsSync(index)){
  const html=fs.readFileSync(index,'utf8');
  for(const name of ['home-lookup-v2.js','texas-address-suggest.js'])
   if(!html.includes('./'+name+'?'))errors.push('main page lacks required address handler '+name);
 }
 return {errors,checkedPages:PAGES.length,addressScripts:ADDRESS_SCRIPTS.length,
   referencedAssets:assets.length,uniqueAssets:new Set(assets).size};
}
if(require.main===module){
 const r=audit(process.argv[2]?path.resolve(process.argv[2]):ROOT);
 console.log(JSON.stringify({status:r.errors.length?'FAIL':'PASS',checkedPages:r.checkedPages,
  addressScripts:r.addressScripts,referencedAssets:r.referencedAssets,
  uniqueAssets:r.uniqueAssets,errorCount:r.errors.length,errors:r.errors},null,2));
 if(r.errors.length)process.exitCode=1;
}
module.exports={audit,auditSensitiveScript,scanAssetReferences};
