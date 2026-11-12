#!/usr/bin/env node
'use strict';
// Read-only audit. Inventory previously reviewed write-scoped snapshot builders,
// but fail when additional workflows gain write permissions or elevated triggers.
const fs = require('node:fs');
const path = require('node:path');
const known = Object.freeze({
  'build-phase2a-fema-hazards.yml': ['contents'],
  'noaa-storm-snapshot.yml': ['contents']
});
function indent(s) { return (s.match(/^\s*/) || [''])[0].length; }
function writes(content) {
  const lines=String(content||'').split(/\r?\n/);
  const found=new Set();
  for(let i=0;i<lines.length;i++) {
    if(!/^\s*permissions:\s*$/.test(lines[i]))continue;
    const base=indent(lines[i]);
    for(let j=i+1;j<lines.length;j++) {
      const line=lines[j];
      if(!line.trim()||/^\s*#/.test(line))continue;
      if(indent(line)<=base)break;
      const m=/^\s*([a-z-]+):\s*write\s*(?:#.*)?$/.exec(line);
      if(m)found.add(m[1]);
    }
  }
  return [...found].sort();
}
function assess(name,content) {
  const errors=[],warnings=[],scopes=writes(content);
  if(/^\s*pull_request_target\s*:/m.test(content))errors.push('pull_request_target_not_allowed');
  if(/\bwrite-all\b/i.test(content))errors.push('write_all_not_allowed');
  const allowed=known[name]||[];
  for(const scope of scopes)if(!allowed.includes(scope))errors.push('new_write_permission:'+scope);
  if(scopes.length&&allowed.length) {
    if(!content.includes('github.event.pull_request.head.repo.full_name == github.repository'))errors.push('missing_same_repo_guard');
    warnings.push('existing_privileged_snapshot_writer');
  }
  if(/persist-credentials:\s*true/.test(content)) {
    if(name==='noaa-storm-snapshot.yml')warnings.push('existing_persisted_checkout_credentials');
    else errors.push('new_persisted_checkout_credentials');
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
  return {status:errors.length?'FAIL':'PASS_WITH_REVIEW_WARNINGS',workflows:Object.keys(files).length,writers,errors,warnings,
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
