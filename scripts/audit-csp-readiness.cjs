#!/usr/bin/env node
'use strict';
/**
 * Read-only CSP source integrity and launch-readiness inventory.
 * Current main uses an exact HTML-parser-normalized inline-script SHA-256 hash.
 * This is NOT an XSS certification or a header CSP check.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

function extractCspMeta(html){
 if(typeof html!=='string')return null;
 const match=/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i.exec(html);
 return match?{value:match[1],offset:match.index}:null;
}
function parseDirectives(policy){
 const out=new Map();
 for(const raw of String(policy||'').split(';')){
  const parts=raw.trim().split(/\s+/).filter(Boolean);
  if(parts.length)out.set(parts[0].toLowerCase(),parts.slice(1));
 }
 return out;
}
function analyzeCspPage(html,name){
 const errors=[],warnings=[],meta=extractCspMeta(html);
 if(!meta)return{name,errors:['missing source-level CSP meta on '+name],warnings,summary:null};
 const directives=parseDirectives(meta.value);
 const scripts=directives.get('script-src')||[];
 if(!scripts.length)errors.push(name+': missing script-src');
 for(const dangerous of ["'unsafe-eval'","'wasm-unsafe-eval'","'unsafe-inline'","data:","blob:","*","https:","http:"]){
  if(scripts.includes(dangerous))errors.push(name+': unsafe script-src token '+dangerous);
 }
 if(!(directives.get('script-src-attr')||[]).includes("'none'"))
  errors.push(name+': inline event attributes are not prohibited by script-src-attr');
 if(!(directives.get('object-src')||[]).includes("'none'"))errors.push(name+': object-src must deny plugins');
 if(!(directives.get('base-uri')||[]).includes("'self'"))errors.push(name+': base-uri must be restricted');
 if(!(directives.get('form-action')||[]).includes("'self'"))warnings.push(name+': form-action not restricted to self');
 const firstScript=/<script\b/i.exec(html);
 if(firstScript&&meta.offset>firstScript.index)errors.push(name+': CSP declared after scripts begin');
 const inline=[...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(x=>x.trim());
 const hashes=scripts.filter(x=>/^'sha256-[A-Za-z0-9+/]+=*'$/.test(x));
 if(inline.length!==hashes.length)
  errors.push(name+': each inline bootstrap must have a dedicated sha256 hash');
 const normalizedHash=text=>crypto.createHash('sha256').update(text.replace(/\r\n?/g,'\n'),'utf8').digest('base64');
 for(const script of inline){
  const token="'sha256-"+normalizedHash(script)+"'";
  if(!hashes.includes(token))errors.push(name+': inline JS changed without updating CSP hash');
 }
 const tagAttributes=[...html.matchAll(/<[^>]+\s(onclick|onchange|oninput|onerror|onload|onsubmit)\s*=\s*["']/gi)];
 if(tagAttributes.length)errors.push(name+': literal inline HTML event handler attribute remains');
 if(!directives.has('default-src'))warnings.push(name+': default-src absent; unrestricted fallback for unspecified fetch directives');
 if(!directives.has('connect-src'))warnings.push(name+': connect-src absent; external fetch/WebSocket destinations not restricted');
 if(!directives.has('img-src'))warnings.push(name+': img-src absent; map/image destinations not restricted');
 warnings.push(name+': frame-ancestors and CSP Report-Only require HTTP response headers, not meta CSP');
 if(inline.length)warnings.push(name+': '+inline.length+' legacy inline bootstrap(s) hash-locked; editing code requires hash update; externalization can simplify future maintenance');
 return{name,errors,warnings,summary:{
  policy:meta.value,
  inlineScriptBlocks:inline.length,
  inlineScriptBytes:inline.reduce((sum,x)=>sum+x.length,0),
  inlineEventAttributes:tagAttributes.length,
  inlineHashes:hashes.length,
  missingDefaultSrc:!directives.has('default-src'),
  missingConnectSrc:!directives.has('connect-src'),
  allowsUnsafeInline:scripts.includes("'unsafe-inline'"),
 }};
}
function checkCurrentRepo(root=path.resolve(__dirname,'..')){
 return ['index.html','reviewed.html'].map(name=>analyzeCspPage(fs.readFileSync(path.join(root,name),'utf8'),name));
}
function main(){
 const rows=checkCurrentRepo();
 for(const row of rows){
  console.log('CSP PAGE: '+row.name);
  if(row.summary)console.log('INVENTORY: '+JSON.stringify(row.summary));
  row.warnings.forEach(x=>console.log('FOLLOW-UP: '+x));
  row.errors.forEach(x=>console.error('FAIL: '+x));
 }
 if(rows.some(x=>x.errors.length))process.exitCode=1;
 else console.log('PASS: strict hash-locked CSP baseline verified; deployment headers and all XSS paths NOT CERTIFIED.');
}
if(require.main===module)main();
module.exports={extractCspMeta,parseDirectives,analyzeCspPage,checkCurrentRepo};
