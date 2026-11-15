#!/usr/bin/env node
'use strict';
// No dashboard workflow may regain repository writeback privileges.
const fs = require('node:fs');
const path = require('node:path');
const known = Object.freeze({});
function indent(s) { return (s.match(/^\s*/) || [''])[0].length; }
function writes(content) {
  return scanPermissions(content).scopes;
}
function scanPermissions(content) {
  // Dependency-free source audit: accept only the proven block form, empty
  // map, or GitHub's read-all/write-all scalar. Deny flow maps, quoted scope
  // values, aliases and merges rather than silently treating them as read-only.
  const lines=String(content||'').split(/\r?\n/),found=new Set();
  let unsupported=/(?:^|[{,])\s*['"]?<<['"]?\s*:/m.test(content)
    || /[{,]\s*['"]?permissions['"]?\s*:/m.test(content)
    || /(?:^|[{,])\s*"[^"\r\n]*\\[^"\r\n]*"\s*:/m.test(content)
    || /^\s*(?:[?:]\s|![^\r\n]*:)/m.test(content);
  for(let i=0;i<lines.length;i++) {
    const declaration=/^(\s*)(['"]?permissions['"]?)\s*:(.*)$/.exec(lines[i]);
    if(!declaration)continue;
    const value=declaration[3].replace(/\s*#.*$/,'').trim();
    if(declaration[2]!=='permissions')unsupported=true;
    if(value){if(!['{}','read-all','write-all'].includes(value))unsupported=true;continue;}
    const base=indent(lines[i]);
    for(let j=i+1;j<lines.length;j++) {
      if(!lines[j].trim()||/^\s*#/.test(lines[j]))continue;
      if(indent(lines[j])<=base)break;
      const scope=/^\s*([a-z-]+):\s*(read|write|none)\s*(?:#.*)?$/.exec(lines[j]);
      if(!scope)unsupported=true;
      else if(scope[2]==='write')found.add(scope[1]);
    }
  }
  return {scopes:[...found].sort(),unsupported};
}
function assess(name,content) {
  const errors=[],warnings=[],{scopes,unsupported}=scanPermissions(content);
  if(unsupported)errors.push('unsupported_permissions_syntax');
  if(/(?:^|[{,])\s*['"]?pull_request_target['"]?\s*:/m.test(content))errors.push('pull_request_target_not_allowed');
  if(/\bwrite-all\b/i.test(content))errors.push('write_all_not_allowed');
  const allowed=known[name]||[];
  for(const scope of scopes)if(!allowed.includes(scope))errors.push('new_write_permission:'+scope);

  if(/['"]?persist-credentials['"]?\s*:\s*['"]?true['"]?(?=\s|[,}]|$)/m.test(content)) {
    errors.push('new_persisted_checkout_credentials');
  }
  return {errors,warnings,scopes};
}
function audit(files) {
  const errors=[],warnings=[],writers=[];
  for(const name of Object.keys(files).sort()) {
    const report=assess(name,files[name]);
    if(report.scopes.length)writers.push({name,scopes:report.scopes});
    for(const code of report.errors)errors.push({name,code});
    for(const code of report.warnings)warnings.push({name,code});
  }
  if(Object.keys(files).length<50)errors.push({name:'[inventory]',code:'missing_workflow_files'});
  return {status:errors.length?'FAIL':warnings.length?'PASS_WITH_REVIEW_WARNINGS':'PASS',workflows:Object.keys(files).length,writers,errors,warnings,
    noDeployment:true,limitations:'Static CI source audit only; owner must review effective branch rules and GitHub token settings'};
}
function main() {
  const dir=path.resolve(__dirname,'../.github/workflows');
  const files=Object.fromEntries(fs.readdirSync(dir).filter(n=>/\.ya?ml$/.test(n))
    .map(n=>[n,fs.readFileSync(path.join(dir,n),'utf8')]));
  const report=audit(files);
  console.log('ACTIONS_PRIVILEGE_AUDIT '+JSON.stringify(report));
  if(report.errors.length)process.exitCode=1;
}
if(require.main===module)try{main()}catch{console.error('ACTIONS_PRIVILEGE_AUDIT failed_to_read');process.exitCode=1}
module.exports={known,writes,assess,audit};

