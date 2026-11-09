'use strict';
// Read-only security assessment. Never print raw credentials or address contents.
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const RULES=[
 ['github-token',/\bgh[pousr]_[A-Za-z0-9]{30,}\b/g],
 ['github-fine-grained-token',/\bgithub_pat_[A-Za-z0-9_]{30,}\b/g],
 ['google-api-key',/\bAIza[A-Za-z0-9_-]{32,}\b/g],
 ['aws-access-key',/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
 ['private-key-header',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
 ['credential-assignment',/\b(?:api[_-]?key|client[_-]?secret|access[_-]?token)\b\s*[:=]\s*['"][^'"\s]{16,}['"]/gi]
];
const SENSITIVE_FILENAME=/(?:^|\/)(?:\.env(?:\..+)?|id_rsa|id_ed25519|credentials(?:\.[^.]+)?|secrets?\.(?:json|ya?ml)|.*\.pem|.*\.p12|.*\.pfx)$/i;
const TEXT_FILE=/\.(?:js|mjs|cjs|html|css|json|geojson|md|ya?ml|txt|xml|toml|env|gitignore)$/i;
const PUBLIC_ROOT_DOC=/^(?:AGENTS\.md|CLAUDE\.md|HANDOFF\.md|BOUNDARIES\.md|SCHOOL_ZONE_.*\.md|README\.md)$/i;
const PERSONAL_MARKERS=[
 ['personal-commute-identifier',/\bJPM_ADDRESS\b|\bJPM Plano\b/gi],
 ['personal-commute-data-file',/^jpm-[^/]*\.(?:json|geojson)$/i]
];
function isRuntimeAsset(file){
 if(file==='index.html')return true;
 if(/^(?:features|vendor|data)\//.test(file))return /\.(?:js|css|json|geojson)$/i.test(file);
 return !file.includes('/')&&/\.(?:js|css|json|geojson)$/i.test(file);
}
function isPublishable(file){
 if(isRuntimeAsset(file))return true;
 if(/^(?:favicon\.ico|robots\.txt|manifest\.webmanifest|CNAME|\.nojekyll)$/.test(file))return true;
 return /^(?:assets|images|vendor)\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|svg|ico|woff2?|ttf)$/i.test(file);
}
function countMatches(text,rule){return [...text.matchAll(new RegExp(rule.source,rule.flags.replace('g','')+'g'))].length;}
function scanSecrets(file,content){
 const out=RULES.map(([kind,rule])=>({kind,file,count:countMatches(content,rule)})).filter(x=>x.count>0);
 if(SENSITIVE_FILENAME.test(file))out.push({kind:'sensitive-filename',file,count:1});
 return out;
}
function scanPersonalization(file,content){
 if(!isRuntimeAsset(file))return [];
 return PERSONAL_MARKERS.map(([kind,rule])=>({kind,file,count:kind==='personal-commute-data-file'?Number(rule.test(file)):countMatches(content,rule)})).filter(x=>x.count>0);
}
function listTracked(){
 return cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:8*1024*1024}).split('\0').filter(Boolean).sort();
}
function baselineContent(base,file){
 if(!base||!/^[a-f0-9]{40}$/i.test(base))return null;
 try{return cp.execFileSync('git',['show',base+':'+file],{encoding:'utf8',stdio:['ignore','pipe','ignore'],maxBuffer:8*1024*1024});}
 catch{return '';}
}
function readText(file){
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()||fs.statSync(file).size>3_000_000)return null;
 const s=fs.readFileSync(file,'utf8');return s.includes('\0')?null:s;
}
function existingBootstrapMovedVerbatim(baseSha,file,content) {
 // Recognize a physical source-file move only when the new runtime JS is
 // byte-for-byte identical to the sole old inline bootstrap in the trusted
 // Git baseline. Any extra/mutated private marker remains a new finding.
 if(file!=='dashboard-main.js'||!baseSha)return null;
 const oldIndex=baselineContent(baseSha,'index.html');
 if(!oldIndex)return null;
 const matches=[...oldIndex.matchAll(/<script>(\r?\n'use strict';[\s\S]*?)<\/script>/g)];
 if(matches.length!==1||matches[0][1]!==content)return null;
 return matches[0][1];
}
function listDist(dir){
 const out=[];
 const walk=(folder,prefix='')=>{
  for(const ent of fs.readdirSync(folder,{withFileTypes:true})){
   const rel=prefix?prefix+'/'+ent.name:ent.name;
   if(ent.isSymbolicLink()||(!ent.isFile()&&!ent.isDirectory()))throw Error('Unsupported release entry: '+rel);
   if(ent.isDirectory())walk(path.join(folder,ent.name),rel);else out.push(rel);
  }
 };
 walk(dir);return out.sort();
}
function analyze(files,opts={}){
 const records=files.filter(f=>TEXT_FILE.test(f)||SENSITIVE_FILENAME.test(f))
  .map(file=>({file,content:readText(path.join(opts.root||'.',file))})).filter(x=>x.content!==null);
 const credentials=records.flatMap(x=>scanSecrets(x.file,x.content));
 const personalization=records.flatMap(x=>scanPersonalization(x.file,x.content));
 const newSensitive=[];
 if(opts.baseSha)for(const {file,content} of records){
  let previous=baselineContent(opts.baseSha,file);if(previous===null)continue;
  if(file==='dashboard-main.js'&&previous===''){
   previous=existingBootstrapMovedVerbatim(opts.baseSha,file,content)||'';
  }
  const current=[...scanSecrets(file,content),...scanPersonalization(file,content)];
  const before=[...scanSecrets(file,previous),...scanPersonalization(file,previous)];
  for(const now of current){
   const prior=before.find(x=>x.kind===now.kind)?.count||0;
   if(now.count>prior)newSensitive.push({file,kind:now.kind,count:now.count-prior});
  }
 }
 const hosts=new Set();let domSinks=0;
 for(const {file,content} of records){
  if(!isRuntimeAsset(file))continue;
  domSinks+=countMatches(content,/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(/g);
  for(const hit of content.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi))hosts.add(hit[1].toLowerCase());
 }
 return {credentials,personalization,newSensitive,domSinks,hosts:[...hosts].sort(),
  developmentFiles:files.filter(f=>PUBLIC_ROOT_DOC.test(f)||/^(?:scripts|tests|\.github)\//.test(f)),
  runtimeCandidates:files.filter(isRuntimeAsset).length,
  nonPublishable:files.filter(f=>!isPublishable(f))};
}
function main(){
 const mode=process.argv[2]||'audit';
 if(!['audit','release'].includes(mode))throw Error('Usage: audit | release <distribution-directory>');
 const release=mode==='release',dir=release?process.argv[3]:null;
 if(release&&(!dir||!fs.existsSync(dir)||!fs.statSync(dir).isDirectory()))
  throw Error('Release mode requires a built distribution directory. No deployment is performed.');
 const files=release?listDist(dir):listTracked();
 const data=analyze(files,{root:dir||'.',baseSha:release?null:process.env.GITHUB_BASE_SHA});
 const blockers=[...data.credentials,...(release?data.personalization:data.newSensitive)];
 if(release){
  if(data.nonPublishable.length)blockers.push({kind:'unapproved-file-in-bundle',file:'[distribution]',count:data.nonPublishable.length});
  if(!files.includes('index.html'))blockers.push({kind:'missing-index',file:'index.html',count:1});
  if(process.env.PUBLIC_SOURCE_SEPARATED!=='confirmed')
   blockers.push({kind:'private-source-separation-not-verified',file:'[deployment-config]',count:1});
  for(const [variable,kind] of [
   ['PUBLIC_PROVIDER_TERMS_CONFIRMED','external-provider-terms-not-approved'],
   ['PUBLIC_DATA_LICENSES_CONFIRMED','data-redistribution-licenses-not-approved'],
   ['PUBLIC_BROWSER_QA_CONFIRMED','live-browser-qa-not-approved'],
   ['PUBLIC_OWNER_GO','owner-publication-approval-missing']
  ]){
   if(process.env[variable]!=='confirmed')
    blockers.push({kind,file:'[deployment-config]',count:1});
  }
 }
 const status=release?(blockers.length?'BLOCKED':'READY_FOR_MANUAL_REVIEW'):
  (data.personalization.length||data.developmentFiles.length?'NOT_READY_FOR_PUBLIC_LAUNCH':'NO_KNOWN_LEGACY_PERSONALIZATION');
 const report={schemaVersion:1,mode,status,...data,blockers,limitations:[
  'Not a penetration test or guarantee of data privacy',
  'Historical secrets require the separate full-history Gitleaks CI job',
  'GitHub Pages settings, data licenses, provider quotas and privacy terms need manual review',
  'Source repository visibility and browser-delivered source code are different exposures']};
 fs.mkdirSync('artifacts/security',{recursive:true});
 fs.writeFileSync('artifacts/security/public-release-audit.json',JSON.stringify(report,null,2)+'\n');
 const summary=['### TX Public Release Security','- Mode: '+mode,'- Status: **'+status+'**',
 '- Credential indicators: '+data.credentials.length,'- Legacy personalization: '+data.personalization.length,
 '- New sensitive indicators: '+data.newSensitive.length,'- Development files in tracked tree: '+data.developmentFiles.length,
 '- HTML sinks for further review: '+data.domSinks,'- Deployment performed: **No**'].join('\n')+'\n';
 process.stdout.write(summary);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
 if(blockers.length){process.stderr.write('Blocked categories: '+[...new Set(blockers.map(x=>x.kind))].join(', ')+'\n');process.exitCode=1;}
}
if(require.main===module)try{main();}catch(e){process.stderr.write('Security check failed: '+e.message+'\n');process.exitCode=2;}
module.exports={isRuntimeAsset,isPublishable,countMatches,scanSecrets,scanPersonalization,analyze,existingBootstrapMovedVerbatim};
