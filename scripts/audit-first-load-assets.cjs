#!/usr/bin/env node
'use strict';
// Read-only baseline for the dashboard first-load plan. No network, bundling, or deploy.
const fs=require('node:fs');
const path=require('node:path');

function collectAssets(html){
  const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
  const styles=[...html.matchAll(/<link\b[^>]*>/gi)].filter(m=>/\brel=["']stylesheet["']/i.test(m[0])).map(m=>m[0].match(/\bhref=["']([^"']+)["']/i)?.[1]).filter(Boolean);
  return {scripts,styles};
}
function siteFile(root,url){
  if(/^(?:https?:)?\/\//i.test(url)||/^(?:data|blob):/i.test(url))return null;
  const pathname=url.split(/[?#]/,1)[0].replace(/^\//,'');
  const file=path.resolve(root,pathname);
  return file.startsWith(root+path.sep)?file:null;
}
function summarize(root,html){
  const {scripts,styles}=collectAssets(html);
  const urls=[...scripts.map(url=>({kind:'script',url})),...styles.map(url=>({kind:'style',url}))];
  const local=[],remote=[],missing=[],duplicates=[];
  const keys=new Set();
  for(const item of urls){
    const key=item.url.split(/[?#]/,1)[0];
    if(keys.has(key))duplicates.push(item.url);
    keys.add(key);
    const file=siteFile(root,item.url);
    if(!file){remote.push(item);continue}
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){missing.push(item);continue}
    local.push({...item,path:path.relative(root,file).replaceAll(path.sep,'/'),bytes:fs.statSync(file).size});
  }
  const workflows=path.join(root,'.github','workflows');
  const workflowFiles=fs.existsSync(workflows)?fs.readdirSync(workflows).filter(n=>/\.ya?ml$/i.test(n)):[];
  return {
    htmlBytes:Buffer.byteLength(html,'utf8'),
    scriptTags:scripts.length,stylesheetLinks:styles.length,
    localReferences:local.length,externalReferences:remote.length,
    localReferencedBytes:local.reduce((n,x)=>n+x.bytes,0),
    missing,duplicates,workflowFileCount:workflowFiles.length,
    largestLocal:local.sort((a,b)=>b.bytes-a.bytes).slice(0,12),
    // Request count and browser load time require network+HAR; they cannot be inferred here.
    scope:'STATIC_HTML_REFERENCES_ONLY',
    limitations:['Does not include dynamically fetched JS/CSS/JSON, images, Leaflet tiles or request duplication',
                 'Workflow file count is not number of checks invoked per PR']
  };
}
function main(){
  const root=path.resolve(process.env.AUDIT_ROOT||path.join(__dirname,'..'));
  const report=summarize(root,fs.readFileSync(path.join(root,'index.html'),'utf8'));
  if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else{
    console.log('HTML',report.htmlBytes,'bytes; scripts',report.scriptTags,'stylesheets',report.stylesheetLinks);
    console.log('Local refs',report.localReferences,'external refs',report.externalReferences,
      'local bytes',report.localReferencedBytes,'workflows',report.workflowFileCount);
    console.log('Missing refs',report.missing.length,'duplicate paths',report.duplicates.length);
    console.log('NOTE: static source inventory is not a measured page load or PR CI job count.');
  }
  if(process.argv.includes('--check')&&(report.missing.length||report.duplicates.length))process.exitCode=1;
}
if(require.main===module)main();
module.exports={collectAssets,siteFile,summarize};
