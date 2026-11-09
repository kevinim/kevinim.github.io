#!/usr/bin/env node
'use strict';
/**
 * Compare existing HTML CSPs and record hardening blockers.
 * Read-only, no network. A secure-looking CSP header is NOT proof of XSS safety.
 */
const fs=require('node:fs');
const path=require('node:path');

function extractCspMeta(html){
  if(typeof html!=='string') return null;
  const match=/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i.exec(html);
  return match?{value:match[1],offset:match.index}:null;
}
function parseDirectives(policy){
  const out=new Map();
  for(const raw of String(policy||'').split(';')){
    const parts=raw.trim().split(/\s+/).filter(Boolean);
    if(!parts.length)continue;
    out.set(parts[0].toLowerCase(),parts.slice(1));
  }
  return out;
}
function analyzeCspPage(html,name){
  const errors=[],warnings=[];
  const meta=extractCspMeta(html);
  if(!meta) return {name,errors:['missing source-level CSP meta on '+name],warnings,summary:null};
  const directives=parseDirectives(meta.value);
  const scripts=directives.get('script-src')||[];
  if(!scripts.length)errors.push('missing script-src allowlist in '+name);
  for(const dangerous of ["'unsafe-eval'","'wasm-unsafe-eval'","data:","blob:","*","https:","http:"]){
    if(scripts.includes(dangerous))errors.push(name+': script-src contains overly broad '+dangerous);
  }
  if(scripts.includes("'unsafe-inline'"))warnings.push(name+': script-src allows inline scripts and event handlers; XSS defense is limited');
  if(!(directives.get('object-src')||[]).includes("'none'"))errors.push(name+': object-src must deny plugins');
  if(!(directives.get('base-uri')||[]).includes("'self'"))errors.push(name+': base-uri must be restricted');
  if(!(directives.get('form-action')||[]).includes("'self'"))warnings.push(name+': form-action not restricted to self');
  if(!directives.has('default-src'))warnings.push(name+': default-src absent; unspecified fetch directives are unrestricted');
  if(!directives.has('connect-src'))warnings.push(name+': connect-src absent; remote fetch destinations are not restricted by CSP');
  if(!directives.has('img-src'))warnings.push(name+': img-src absent; external image source policy remains unrestricted');
  // frame-ancestors requires a response HEADER. Meta declarations are ignored.
  warnings.push(name+': frame-ancestors and report-only CSP require hosting response headers, not meta CSP');
  const firstScript=/<script\b/i.exec(html);
  if(firstScript&&meta.offset>firstScript.index)errors.push(name+': CSP declared after scripts begin');
  const inlineScripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter(x=>x[1].trim()).map(x=>x[1].length);
  const eventAttributes=[...html.matchAll(/\bon(?:click|change|input|submit|load|error)\s*=/gi)];
  if(inlineScripts.length)warnings.push(name+': '+inlineScripts.length+' inline bootstrap script(s) must be externalized or nonce/hash-protected before removing unsafe-inline');
  if(eventAttributes.length)warnings.push(name+': '+eventAttributes.length+' possible inline event-handler occurrence(s) must be reviewed and replaced by event listeners before strict CSP');
  return {name,errors,warnings,summary:{
    policy:meta.value,
    inlineScriptBlocks:inlineScripts.length,
    inlineScriptBytes:inlineScripts.reduce((a,b)=>a+b,0),
    inlineEventAttributes:eventAttributes.length,
    missingDefaultSrc:!directives.has('default-src'),
    missingConnectSrc:!directives.has('connect-src'),
    allowsUnsafeInline:scripts.includes("'unsafe-inline'"),
  }};
}
function checkCurrentRepo(root=path.resolve(__dirname,'..')){
  const pages=['index.html','reviewed.html'];
  return pages.map(name=>analyzeCspPage(fs.readFileSync(path.join(root,name),'utf8'),name));
}
function main(){
  const reports=checkCurrentRepo();
  for(const r of reports){
    console.log('CSP PAGE: '+r.name);
    if(r.summary)console.log('INVENTORY: '+JSON.stringify(r.summary));
    for(const w of r.warnings)console.log('FOLLOW-UP: '+w);
    for(const e of r.errors)console.error('ERROR: '+e);
  }
  if(reports.some(x=>x.errors.length)){process.exitCode=1;console.error('FAIL: CSP baseline integrity regression');}
  else console.log('PASS: current CSP baseline verified. STRICT CSP / PUBLIC RELEASE NOT CERTIFIED.');
}
if(require.main===module)main();
module.exports={extractCspMeta,parseDirectives,analyzeCspPage,checkCurrentRepo};
