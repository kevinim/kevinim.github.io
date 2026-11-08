'use strict';
// This tool ONLY prepares a static, public login landing page.
// It never deploys, changes Pages settings, or provides authentication.
const fs=require('node:fs');
const path=require('node:path');
const BASE=path.resolve(process.cwd(),'dist');
const ALLOWED_MODES=new Set(['preview','cutover']);

function normalizeUatUrl(raw){
 if(!raw||typeof raw!=='string')throw new Error('A verified UAT login URL is required');
 let u;try{u=new URL(raw);}catch{throw new Error('UAT host must be a valid HTTPS URL');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)
  throw new Error('UAT host requires HTTPS with no credentials, custom port, query or fragment');
 const host=u.hostname.toLowerCase();
 if(!/^[a-z0-9-]+\.pages\.dev$/.test(host)||host==='pages.dev')
  throw new Error('UAT login target must be the verified Cloudflare Pages primary host; not github.io or preview aliases');
 if(u.pathname!=='/'&&u.pathname!=='')throw new Error('Use the UAT application root only');
 return 'https://'+host+'/';
}
function htmlEscape(value){return String(value).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
function renderLanding(mode,uatUrl){
 if(!ALLOWED_MODES.has(mode))throw new Error('Invalid mode');
 if(mode==='cutover'&&!uatUrl)throw new Error('No confirmed UAT link');
 const login=mode==='cutover'
  ?'<a class="action" rel="noopener noreferrer" href="'+htmlEscape(uatUrl)+'">가족용 UAT 로그인</a>'
  :'<p class="inactive" aria-live="polite">가족용 로그인 환경을 검증 중입니다. 아직 연결되지 않았습니다.</p>';
 return '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8">'
  +'<meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">'
  +'<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;; frame-ancestors &#39;none&#39;">'
  +'<meta name="referrer" content="no-referrer"><title>가족용 지도 로그인</title>'
  +'<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f7fa;color:#182638;font:16px/1.6 system-ui,sans-serif}'
  +'main{box-sizing:border-box;width:min(480px,calc(100vw - 48px));border:1px solid #d5dbe3;background:white;border-radius:18px;padding:30px;box-shadow:0 6px 24px #10203312}'
  +'h1{font-size:1.5rem;line-height:1.3;margin:0 0 12px}p{margin:10px 0 18px}.action{display:inline-block;padding:11px 17px;background:#223d63;color:white;border-radius:9px;text-decoration:none;font-weight:700}'
  +'.action:focus-visible{outline:3px solid #e2a72e;outline-offset:3px}.inactive{color:#536579}.small{font-size:.88rem;color:#536579}</style></head>'
  +'<body><main><h1>가족용 지도</h1>'
  +'<p>실제 대시보드는 별도의 로그인 보호 환경에서 제공됩니다.</p>'
  +login
  +'<p class="small">이 안내 페이지 자체는 공개 주소입니다. 이곳에서는 주소 검색이나 가족 관련 데이터를 제공하지 않습니다.</p>'
  +'</main></body></html>\n';
}
function build(mode='preview',directory){
 if(!ALLOWED_MODES.has(mode))throw new Error('Usage: node scripts/build-family-entry.cjs preview | cutover');
 const dest=path.resolve(directory||path.join(BASE,mode==='cutover'?'family-entry-cutover':'family-entry-preview'));
 if(!dest.startsWith(BASE+path.sep)||dest===BASE)throw new Error('Output must be under dist/; refusing unsafe deletion');
 let uatUrl=null;
 if(mode==='cutover'){
  const required=['UAT_ACCESS_VERIFIED','UAT_PRIVATE_DEPLOY_VERIFIED','UAT_ANONYMOUS_DENIAL_VERIFIED','FAMILY_ENTRY_OWNER_GO'];
  for(const key of required)if(process.env[key]!=='confirmed')throw new Error(key+' is not confirmed; cutover blocked');
  uatUrl=normalizeUatUrl(process.env.FAMILY_UAT_URL);
 }
 const html=renderLanding(mode,uatUrl);
 fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
 fs.writeFileSync(path.join(dest,'index.html'),html,{mode:0o644});
 fs.writeFileSync(path.join(dest,'robots.txt'),'User-agent: *\nDisallow: /\n');
 return {mode,output:dest,files:2,deployPerformed:false};
}
if(require.main===module)try{
 const result=build(process.argv[2]||'preview',process.argv[3]);
 process.stdout.write('Family entry build: '+result.mode+'; 2 public landing files; NO DEPLOYMENT\n');
}catch(e){process.stderr.write('Family entry blocked: '+e.message+'\n');process.exitCode=1;}
module.exports={normalizeUatUrl,renderLanding,build};
