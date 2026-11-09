#!/usr/bin/env node
'use strict';
// Read-only source migration inventory. NEVER clones/re-creates Git history,
// copies files to a remote host, uploads family data, or changes Pages settings.
// Public CI uploads SUMMARY ONLY; local SHA inventory remains ignored.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const {scanSecrets}=require('./public-release-gate.cjs');

const OUT='artifacts/private-source-migration';
const ROOT=process.cwd();
const CATEGORIES=Object.freeze([
  'source_code_candidate','personalized_source_review','dataset_license_review',
  'documentation_review','deployment_quarantine','restricted_family_review',
]);
const MANDATORY=Object.freeze([
  'index.html','schools.json','district-registry.js','school-boundary-match.js',
  'features/area-assessment.js','features/region-compare.js',
  'scripts/build-family-entry.cjs','scripts/build-public-preview.cjs',
  '.github/workflows/public-release-security.yml',
]);
const PRIVATE_MARKER=/\bJPM_ADDRESS\b|\bJPM Plano\b|\bjpmMinutes\b|\bjpm-[a-z0-9-]+\.(?:json|geojson)\b/i;
const FATAL_NAME=/(?:^|\/)(?:\.git|node_modules|dist|artifacts)(?:\/|$)|(?:^|\/)\.env(?:\..*)?$|(?:^|\/)(?:id_rsa|id_ed25519|credentials(?:\.[^/]+)?|secrets?\.(?:json|ya?ml))$|\.(?:pem|p12|pfx|key)$/i;
const RESTRICTED_NAME=/(?:^|\/)jpm[-_]|(?:^|\/)(?:index|reviewed)\.html$/i;
const DEPLOY_NAME=/^(?:\.github\/|deploy\/)|^(?:CNAME|\.nojekyll|wrangler(?:\.[^/]*)?|netlify\.toml|vercel\.json|firebase\.json|package(?:-lock)?\.json)$/i;
const DOC_NAME=/^(?:docs\/|AGENTS\.md$|CLAUDE\.md$|HANDOFF\.md$|BOUNDARIES\.md$|PUBLIC_.*\.md$|SCHOOL_ZONE_.*\.md$|README\.md$|backend\/README\.md$)|(?:^|\/)README\.md$/i;
const SOURCE_EXT=/\.(?:js|mjs|cjs|css|html|svg|webmanifest|woff2?)$/i;
const DATA_EXT=/\.(?:json|geojson|csv|txt|xml|ya?ml|toml)$/i;
const TEXT_EXT=/\.(?:js|mjs|cjs|css|html|json|geojson|md|txt|xml|ya?ml|toml)$/i;

function validateTrackedPath(file){
 if(typeof file!=='string'||!file||file.startsWith('/')||file.includes('\\')||
    file.split('/').some(x=>!x||x==='.'||x==='..')||/[\x00-\x1f\x7f]/.test(file))
   throw Error('invalid_tracked_path');
 return file;
}
function classify(file,content=''){
 validateTrackedPath(file);
 if(FATAL_NAME.test(file))return 'FORBIDDEN';
 if(DEPLOY_NAME.test(file))return 'deployment_quarantine';
 if(RESTRICTED_NAME.test(file))return 'restricted_family_review';
 if(DOC_NAME.test(file))return 'documentation_review';
 if(SOURCE_EXT.test(file))
   return PRIVATE_MARKER.test(content)?'personalized_source_review':'source_code_candidate';
 if(DATA_EXT.test(file))return 'dataset_license_review';
 return 'documentation_review'; // unknown file types cannot be imported blindly
}
function relativeEntrypointRefs(html){
 // Static HTML/link, script, and literal fetch strings. This is not a full JS
 // dependency tracer. Dynamic fetch filenames still require browser/CI tests.
 const urls=[];
 for(const m of html.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)=["'](\.?\/[^"'?#]+)["']/gi))
   urls.push(m[1]);
 for(const m of html.matchAll(/\bfetch\(\s*["'](\.?\/[^"'?#]+)["']\s*(?=[,)])/g))
   urls.push(m[1]);
 const invalid=[],paths=[];
 for(const value of urls){
  if(value.startsWith('https:')||value.startsWith('http:')||value.startsWith('//'))continue;
  const normalized=value.replace(/^\.\/+/,'');
  try{validateTrackedPath(normalized);paths.push(normalized)}
  catch{invalid.push('unsafe_local_reference')}
 }
 return {paths:[...new Set(paths)].sort(),invalid};
}
function collectTrackedFiles({listFn}={}){
 const output=(listFn||(()=>cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:16*1024*1024})))();
 if(typeof output!=='string')throw Error('git_index_unavailable');
 const files=output.split('\0').filter(Boolean).sort();
 if(!files.length||new Set(files).size!==files.length)throw Error('no_or_duplicate_git_paths');
 files.forEach(validateTrackedPath);
 return files;
}
function fileInfo(root,file){
 const filename=path.resolve(root,file);
 if(!filename.startsWith(path.resolve(root)+path.sep))
   throw Error('outside_checkout');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>12*1024*1024)
   throw Error('unsafe_symlink_or_oversized_file');
 const body=fs.readFileSync(filename);
 return {
  bytes:stat.size,digest:crypto.createHash('sha256').update(body).digest('hex'),
  text:TEXT_EXT.test(file)?body.toString('utf8'):null
 };
}
function audit({root=ROOT,files,readFn}={}){
 const tracked=files||collectTrackedFiles(),input=new Set(tracked);
 const summary=Object.fromEntries(CATEGORIES.map(k=>[k,{files:0,bytes:0}]));
 const inventory=[],errors=[],warnings=[],secretTypes=new Set();
 let personalMarkerFiles=0;
 for(const file of tracked){
  let info;
  try{info=(readFn||fileInfo)(root,file)}
  catch{errors.push('unreadable_or_unsafe_file');continue}
  const content=typeof info.text==='string'?info.text:'';
  const kind=classify(file,content);
  if(kind==='FORBIDDEN'){
   errors.push('forbidden_tracked_path');continue;
  }
  summary[kind].files++;
  summary[kind].bytes+=info.bytes;
  if(PRIVATE_MARKER.test(content))personalMarkerFiles++;
  if(content){
   for(const finding of scanSecrets(file,content)){
    secretTypes.add(finding.kind);
   }
  }
  // Locally useful immutable candidate manifest; not uploaded by public CI.
  inventory.push({path:file,category:kind,sha256:info.digest,sizeBytes:info.bytes});
 }
 if(secretTypes.size)errors.push('possible_credentials_present_review_and_rotate');
 for(const item of MANDATORY)if(!input.has(item))
  errors.push('mandatory_dependency_missing');
 const html=input.has('index.html')?(readFn||fileInfo)(root,'index.html').text:'';
 const deps=relativeEntrypointRefs(html||'');
 if(deps.invalid.length)errors.push('unsafe_static_local_reference');
 const missing=deps.paths.filter(x=>!input.has(x));
 if(missing.length)errors.push('missing_static_local_dependency');
 const held=(summary.restricted_family_review.files+
   summary.dataset_license_review.files+summary.deployment_quarantine.files+
   summary.documentation_review.files+summary.personalized_source_review.files);
 if(!summary.source_code_candidate.files)errors.push('no_code_candidate');
 if(!summary.deployment_quarantine.files)errors.push('no_deploy_quarantine');
 if(!summary.restricted_family_review.files||!summary.dataset_license_review.files)
   errors.push('expected_family_and_data_review_absent');
 if(!errors.length){
   warnings.push('existing_public_git_history_remains_exposed_after_new_private_repository_creation');
   warnings.push('data_license_and_personalization_review_required_before_any_source_import');
   warnings.push('github_actions_pages_and_automatic_deployments_must_be_rebuilt_disabled_in_private_repository');
   warnings.push('static_dependency_scan_is_partial_and_cannot_replace_browser_integration_tests');
 }
 return {
  summary:{
   schemaVersion:1,
   status:errors.length?'BLOCKED':'PREPARED_MANUAL_SOURCE_REVIEW_REQUIRED',
   trackedFiles:tracked.length,
   classes:summary,
   heldForReview:held,
   codeCandidates:summary.source_code_candidate.files,
   staticLocalDependencies:deps.paths.length,
   unresolvedStaticReferences:missing.length,
   personalMarkerFileCount:personalMarkerFiles,
   credentialIndicatorKinds:[...secretTypes].sort(),
   historyMigration:'PROHIBITED_USE_CURATED_CLEAN_INITIAL_COMMIT',
   privateRepositoryCreated:false,hostingChanged:false,
   autoMigrationAllowed:false,releaseApproved:false,
   errors:[...new Set(errors)].sort(),warnings
  },
  // Never upload or deploy this inventory: filenames and hashes of source
  // files may themselves disclose family or development metadata.
  localManifest:{
   schemaVersion:1,sourceTreeOnly:true,
   excludesGitHistory:true,autoImportAuthorized:false,
   records:inventory
  }
 };
}
function main(args=process.argv.slice(2)){
 if(args.length||process.env.AUTO_MIGRATE_SOURCE==='true')
   throw Error('This is an audit only; migration/deployment flags are unsupported');
 const result=audit();
 const destination=path.resolve(OUT);
 fs.mkdirSync(destination,{recursive:true});
 fs.writeFileSync(path.join(destination,'summary.json'),JSON.stringify(result.summary,null,2)+'\n');
 fs.writeFileSync(path.join(destination,'local-manifest.json'),JSON.stringify(result.localManifest,null,2)+'\n');
 console.log('PRIVATE_SOURCE_MIGRATION_PREFLIGHT '+JSON.stringify({
  status:result.summary.status,tracked:result.summary.trackedFiles,
  codeCandidates:result.summary.codeCandidates,
  reviewRequired:result.summary.heldForReview,
  staticReferences:result.summary.staticLocalDependencies,
  missingReferences:result.summary.unresolvedStaticReferences,
  errorCategories:result.summary.errors,
  copies:0,deploys:0,privateRepoCreated:false
 }));
 if(result.summary.errors.length)process.exitCode=1;
}
if(require.main===module)try{main()}catch(e){
 console.error('Migration preflight BLOCKED: '+e.message);
 process.exitCode=1;
}
module.exports={
 CATEGORIES,MANDATORY,validateTrackedPath,classify,relativeEntrypointRefs,
 collectTrackedFiles,fileInfo,audit,main
};
