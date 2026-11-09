'use strict';
// Build a privacy-minimized preview. NEVER upload or deploy from this script.
// Keep the live family index.html and source assets untouched.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const gate=require('./public-release-gate.cjs');
const OUTPUT='dist/public-preview';
function replaceExact(text,needle,replacement,label){
 const pos=text.indexOf(needle);
 if(pos<0||text.indexOf(needle,pos+needle.length)>=0)throw Error('Ambiguous or missing template anchor: '+label);
 return text.slice(0,pos)+replacement+text.slice(pos+needle.length);
}
function replaceRegexOnce(text,re,replacement,label){
 const found=[...text.matchAll(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))];
 if(found.length!==1)throw Error('Unexpected template occurrence count for '+label+': '+found.length);
 return text.replace(re,replacement);
}

/**
 * PR #89 replaced unsafe-inline with a hash of the exact HTML inline classic
 * bootstrap. A sanitized public build necessarily changes that script.
 * Recalculate ONLY the hash for the single known script and fail closed on
 * unknown policies or multiple scripts; never weaken the deployed CSP.
 * Browser HTML parsing normalizes CRLF to LF before computing script hashes.
 */
function cspSourceSnapshot(html){
 const metas=[...html.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/gi)];
 if(metas.length!==1)throw Error('Public preview requires exactly one CSP meta policy');
 const meta=metas[0],policy=meta[1];
 if(/'unsafe-inline'|'unsafe-eval'/i.test(policy))throw Error('Unsafe CSP policy rejected');
 if(!/(?:^|;)\s*script-src-attr\s+'none'\s*(?:;|$)/.test(policy))
  throw Error('CSP must explicitly disable HTML event-handler attributes');
 if(!/script-src\s+'self'/.test(policy)||!/object-src\s+'none'/.test(policy)||!/base-uri\s+'self'/.test(policy))
  throw Error('Missing core CSP protections');
 const allowed=[...policy.matchAll(/'sha256-[A-Za-z0-9+/]+=*'/g)].map(x=>x[0]);
 if(allowed.length!==1)throw Error('Expected one exact inline-script CSP hash');
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(x=>!/\bsrc\s*=/.test(x[1]));
 if(scripts.length!==1||!scripts[0][2].trim())
  throw Error('Public preview requires exactly one known inline main bootstrap; external JS changes need privacy review');
 const digest=crypto.createHash('sha256').update(scripts[0][2].replace(/\r\n?/g,'\n'),'utf8').digest('base64');
 return {meta:meta[0],token:allowed[0],expected:"'sha256-"+digest+"'",policy};
}
function verifyCspIntegrity(html){
 const state=cspSourceSnapshot(html);
 if(state.token!==state.expected)throw Error('CSP SHA-256 hash does not match browser-normalized inline bootstrap');
 return state;
}
function relockSanitizedCsp(html){
 const source=cspSourceSnapshot(html);
 const updated=replaceExact(html,source.meta,source.meta.replace(source.token,source.expected),'strict preview CSP hash');
 verifyCspIntegrity(updated);
 return updated;
}

function sanitizeIndex(source){
 verifyCspIntegrity(source);
 let s=source;
 s=replaceRegexOnce(s,/<option value="jpm">[^<]*<\/option>/g,'','personal office option');
 s=replaceExact(s,'<option value="custom">다른 주소 직접 입력</option>','<option value="custom" selected>다른 주소 직접 입력</option>','default custom address');
 s=replaceRegexOnce(s,/<input id="destination" value="[^"]*"/g,'<input id="destination" value=""','destination input default');
 s=replaceRegexOnce(s,/<label class="check"><input type="checkbox" id="oneHourOverlay">[\s\S]*?<\/label><div class="source">[^<]*<\/div>/g,
   '<input type="checkbox" id="oneHourOverlay" hidden disabled aria-hidden="true"><div class="source">특정 회사 기준 사전 계산 지도를 제외했습니다. 목적지 주소를 직접 입력하여 경로를 계산하세요.</div>',
   'personal 60-minute map toggle');
 s=replaceRegexOnce(s,/const JPM_ADDRESS='[^']+';\r?\n/g,'','personal fixed workplace constant');
 s=replaceExact(s,'jpm:JPM_ADDRESS,','','personal preset in office dictionary');
 s=replaceRegexOnce(s,/function savedCommuteFor\(zip\)\{[^\n]*\}/g,'function savedCommuteFor(zip){return null}','personal fixed commute cache');
 // Drop the two personal-only fetch chains; retain downstream data initialization.
 const start=s.indexOf("fetch('./jpm-60min-isochrone-");
 const end=s.indexOf("fetch('./data/dfw-mena-ancestry-",start);
 if(start<0||end<=start)throw Error('Personal commute loader section changed: review before producing a preview');
 const removed=s.slice(start,end);
 if(!removed.includes("fetch('./jpm-road-times-")||removed.length>1600)
   throw Error('Unexpected personalized commute loader contents; human inspection required');
 s=s.slice(0,start)+s.slice(end);
 s=replaceExact(s,"fetch('./jpm-outside-dfw.json'","fetch('./dfw-outside-public.json'",'neutral neighborhood dataset');
 const geocodeStart=s.indexOf("const q=new URLSearchParams({q:/");
 const geocodeFinal="state.dest={ll:p,address:j[0].display_name};";
 const geocodeEnd=s.indexOf(geocodeFinal,geocodeStart);
 if(geocodeStart<0||geocodeEnd<geocodeStart||geocodeEnd-geocodeStart>1200)
   throw Error('Public destination geocoder changed: explicit review is required');
 s=s.slice(0,geocodeStart)+
   "const hits=await geocodeAddress(addr);if(!hits.length)throw Error('주소를 찾을 수 없습니다. 더 구체적인 텍사스 주소를 입력하세요');const candidate=hits[0];const p=[candidate.location.y,candidate.location.x];state.dest={ll:p,address:candidate.address||addr};"+
   s.slice(geocodeEnd+geocodeFinal.length);
 if(/nominatim\.openstreetmap\.org/i.test(s))throw Error('Public Nominatim dependency unexpectedly remains');
 s=s.replaceAll('jpmMinutes','genericCommuteMinutes'); // no precomputed commute time is distributed
 // Public output contains no organization-specific or personalized commute references.
 s=s.replaceAll('JPM 도착','기존 직장 목적지');
 s=s.replaceAll('JPM Plano','기존 직장 목적지');
 s=s.replaceAll('JPM 시간','사전 계산 통근 시간');
 s=s.replaceAll('JPM 도로망','사전 계산 통근');
 // Invisible code branch is disabled by the hidden oneHourOverlay and missing personal data.
 const afterHeader='</header>';
 const notice='<aside role="note" style="max-width:1200px;margin:10px auto;padding:12px 16px;border:1px solid #aebbd0;border-radius:9px;font-size:13px;line-height:1.55">'
   +'<b>주소 검색·데이터 안내</b> · 주소 자동완성과 검색은 Esri 등 외부 서비스로 검색어가 전달되며, 경로 계산 시 좌표가 공개 라우팅 서비스로 전달될 수 있습니다. '
   +'지도 타일 제공업체도 접속 정보를 처리할 수 있습니다. 이 웹페이지는 입력한 주소를 자체 서버에 영구 저장하도록 구성하지 않았으나, 외부 제공업체의 로그·보존 기간까지 통제하지 않습니다. '
   +'실제 학교 배정은 학군 공식 주소검색으로, 홍수·범죄·정전 위험은 공식 최신 자료로 확인하세요. '
   +'<b>현재 화면은 검토용 공개 프리뷰로 운영 배포가 승인되지 않았습니다.</b></aside>';
 s=replaceExact(s,afterHeader,afterHeader+notice,'public privacy notice placement');
 s=relockSanitizedCsp(s);
 if(/\bjpm\b|JPM|JPMorgan|jpm-|8181 Communications/i.test(s))
   throw Error('Personal commute identifier remains in public HTML; review required');
 if(/<input id="destination" value="[^"]+"/.test(s))
   throw Error('A non-empty default commute destination remains');
 return s;
}

/**
 * Stage 1 integration: safely produce a separate *sanitized* public bootstrap.
 * Never copy dashboard-main.js from the source tree into the public artifact.
 * Recreate the former strict hash-locked inline template only IN MEMORY, run
 * the established fail-closed sanitizer, and split its sanitized output back
 * into a same-origin classic external script.
 */
function verifyExternalCspIntegrity(html){
 const match=/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i.exec(html);
 if(!match)throw Error('External bootstrap requires CSP meta');
 const policy=match[1];
 if(/'unsafe-inline'|'unsafe-eval'|'sha256-/i.test(policy))throw Error('External bootstrap CSP must not allow inline scripts');
 if(!/script-src\s+'self'/.test(policy)||!/(?:^|;)\s*script-src-attr\s+'none'\s*(?:;|$)/.test(policy)||
    !/object-src\s+'none'/.test(policy)||!/base-uri\s+'self'/.test(policy)||!/form-action\s+'self'/.test(policy))
  throw Error('External bootstrap CSP protections missing');
 const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(x=>!/\bsrc\s*=/.test(x[1])&&x[2].trim());
 if(inline.length)throw Error('External build must have zero executable inline scripts');
 const tag='<script src="./dashboard-main.js?v=2"></script>';
 if(html.split(tag).length!==2)throw Error('External bootstrap tag missing or duplicated');
 return {policy,inlineHashes:0};
}
function sanitizeExtractedAssets(sourceHtml,sourceJs){
 if(typeof sourceJs!=='string'||!sourceJs.startsWith("\r\n'use strict';")||
    !sourceJs.includes('const DATA=[')||!sourceJs.includes("function savedCommuteFor("))
  throw Error('External bootstrap source structure changed; explicit privacy review required');
 verifyExternalCspIntegrity(sourceHtml);
 const tag='<script src="./dashboard-main.js?v=2"></script>';
 // Exclude this family-only assessment until neutral public release rules
 // and data provenance/legal review are approved.
 let neutral=sourceHtml;
 for(const asset of [
  '<link rel="stylesheet" href="./features/area-assessment.css?v=1">',
  '<script src="./features/area-assessment-core.js?v=1"></script>',
  '<script src="./features/area-assessment.js?v=1"></script>'
 ]){
  neutral=replaceExact(neutral,asset,'','family-only quick assessment in public preview');
 }
 const meta=/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i.exec(neutral);
 const policy=meta[1],hash=crypto.createHash('sha256')
  .update(sourceJs.replace(/\r\n?/g,'\n'),'utf8').digest('base64');
 const hashToken="'sha256-"+hash+"'";
 const virtualMeta=meta[0].replace(policy,replaceExact(policy,'https://unpkg.com',
  'https://unpkg.com '+hashToken,'temporary inline hash source'));
 let virtual=replaceExact(neutral,meta[0],virtualMeta,'temporary locked CSP');
 virtual=replaceExact(virtual,tag,'<script>'+sourceJs+'</script>','temporary in-memory inline bootstrap');
 verifyCspIntegrity(virtual);
 const sanitized=sanitizeIndex(virtual);
 const extracted=[...sanitized.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(x=>!/\bsrc\s*=/.test(x[1])&&x[2].trim());
 if(extracted.length!==1)throw Error('Sanitized bootstrap count is not one');
 const publicJs=extracted[0][2];
 let publicHtml=replaceExact(sanitized,extracted[0][0],tag,'public separate JS asset');
 const newMeta=/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i.exec(publicHtml);
 const tokens=[...newMeta[1].matchAll(/'sha256-[A-Za-z0-9+/]+=*'/g)].map(x=>x[0]);
 if(tokens.length!==1)throw Error('Expected exactly one temporary sanitized hash');
 publicHtml=replaceExact(publicHtml,' '+tokens[0],'','remove temporary inline CSP hash');
 verifyExternalCspIntegrity(publicHtml);
 for(const [label,content] of [['HTML',publicHtml],['JS',publicJs]]){
  if(/\bJPM\b|JPMorgan|JPM_ADDRESS|jpm-|8181 Communications|\bjpmMinutes\b/i.test(content))
   throw Error('Unredacted private office reference in sanitized public '+label);
  if(/nominatim\.openstreetmap\.org/i.test(content))
   throw Error('Unreviewed external geocoder remains in public '+label);
 }
 return {html:publicHtml,js:publicJs};
}

function safeFiles(){
 const tracked=cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
 return tracked.filter(f=>gate.isPublishable(f))
  .filter(f=>!/^jpm-/i.test(path.basename(f)))
  .filter(f=>!/^reviewed\.html$/i.test(f))
  // Legacy uploader has its own bootstrap and is NOT part of the curated public app.
  .filter(f=>!['features/reviewed-bootstrap.js','features/geojson-upload-guard.js','dashboard-main.js',
   'features/area-assessment-core.js','features/area-assessment.js','features/area-assessment.css',
   'data/area-noaa-counts-2024-2025.json'].includes(f))
  .filter(f=>!/(?:^|\/)(?:.*-audit-20\d\d|official-resident-finder-audit)/i.test(f))
  .filter(f=>f!=='index.html' && f!=='jpm-outside-dfw.json' && f!=='dfw-outside-public.json')
  .sort();
}
function build(outdir=OUTPUT){
 const out=path.resolve(outdir), repo=process.cwd();
 if(!out.startsWith(repo+path.sep))throw Error('Preview output must remain inside this repository');
 if(out===repo||out===path.resolve(repo,'dist'))throw Error('Refusing to erase source or build root');
 fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
 for(const f of safeFiles()){
  const source=path.resolve(repo,f);if(!source.startsWith(repo+path.sep))throw Error('Unsafe source path');
  const st=fs.lstatSync(source);if(!st.isFile()||st.isSymbolicLink())throw Error('Unsupported source asset: '+f);
  const target=path.join(out,f);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
 }
 const sanitized=sanitizeExtractedAssets(fs.readFileSync('index.html','utf8'),fs.readFileSync('dashboard-main.js','utf8'));
 fs.writeFileSync(path.join(out,'index.html'),sanitized.html);
 fs.writeFileSync(path.join(out,'dashboard-main.js'),sanitized.js);
 const outside=JSON.parse(fs.readFileSync('jpm-outside-dfw.json','utf8'));
 if(!Array.isArray(outside.data)||!outside.shapes?.features||!outside.race||!outside.minutes)
   throw Error('Neighborhood dataset schema changed');
 const generic={
  year:outside.year,data:outside.data.map(row=>{const {...data}=row;delete data.jpmMinutes;return data;}),
  race:outside.race,minutes:{},shapes:outside.shapes
 };
 fs.writeFileSync(path.join(out,'dfw-outside-public.json'),JSON.stringify(generic));
 const compare=path.join(out,'candidate-compare.js');
 if(fs.existsSync(compare)){
  let code=fs.readFileSync(compare,'utf8');
  code=code.replaceAll('jpmMinutes','genericCommuteMinutes').replaceAll('JPM 도로망','사전 계산 통근');
  fs.writeFileSync(compare,code);
 }
 // This artifact is NOT approved for publishing. CI checks output but does not upload/deploy it.
 const previewFiles=fs.readdirSync(out);
 if(!previewFiles.includes('index.html')||!previewFiles.includes('dfw-outside-public.json'))
   throw Error('Missing expected public preview files');
 for(const f of safeFiles())if(!fs.existsSync(path.join(out,f)))throw Error('Missing preview asset '+f);
 return {files:safeFiles().length+3,location:out,releaseApproved:false};
}
if(require.main===module)try{
 const built=build(process.argv[2]||OUTPUT);
 process.stdout.write('Public preview built locally for security review only; '+built.files+' curated files; NOT DEPLOYED.\n');
}catch(e){process.stderr.write('Public preview blocked: '+e.message+'\n');process.exitCode=1;}
module.exports={sanitizeIndex,sanitizeExtractedAssets,verifyExternalCspIntegrity,safeFiles,build,cspSourceSnapshot,verifyCspIntegrity,relockSanitizedCsp};
