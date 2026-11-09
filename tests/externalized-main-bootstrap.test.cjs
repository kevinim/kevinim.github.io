'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const old=cp.execFileSync('git',['show','4f741596a5a594897791d3b931ef39b374bf304e:index.html'],{cwd:root,encoding:'utf8'});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'dashboard-main.js'),'utf8');
const oldStart=old.indexOf("<script>\r\n'use strict'"),oldEnd=old.indexOf('</script>',oldStart);
const original=old.slice(oldStart+8,oldEnd);
const external='<script src="./dashboard-main.js?v=3"></script>';
const oldCsp=old.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
const newCsp=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
function hash(buf){return crypto.createHash('sha256').update(buf).digest('hex')}
test('current production main inline classic bootstrap extracted byte-for-byte, no algorithm changes',()=>{
 assert.ok(oldStart>40000&&oldEnd>oldStart+70000);
 assert.equal(hash(js),hash(original));
 assert.ok(js.startsWith("\r\n'use strict';"));
 assert.ok(js.includes('const DATA=['));
 assert.ok(js.includes('window.WestDFWIntegration')===false,'No new feature logic injected into main');
});
test('strict script CSP remains enforceable after removing the only inline hash',()=>{
 assert.ok(newCsp.includes("script-src-attr 'none'"));
 assert.ok(newCsp.includes("object-src 'none'"));
 assert.ok(newCsp.includes("base-uri 'self'"));
 assert.ok(newCsp.includes("form-action 'self'"));
 assert.ok(newCsp.includes("script-src 'self' https://unpkg.com;"));
 const script=newCsp.split(';').map(x=>x.trim()).find(x=>x.startsWith('script-src '));
 assert.ok(script);
 assert.doesNotMatch(script,/unsafe-inline|unsafe-eval|sha256-/);
 assert.equal((oldCsp.match(/'sha256-[A-Za-z0-9+/]+=*'/g)||[]).length,1);
 assert.equal(newCsp,oldCsp.replace(/ 'sha256-[A-Za-z0-9+/]+=*'/,''));
});
test('externalized page matches previous page except approved source tag and CSP hash',()=>{
 const expected=old.replace("<script>"+original+"</script>",external)
   .replace(/(script-src 'self' https:\/\/unpkg\.com) 'sha256-[A-Za-z0-9+/]+=*'/,'$1');
 const actualText=html.replace(/\r\n/g,'\n'),expectedText=expected.replace(/\r\n/g,'\n');
 if(actualText!==expectedText){
  let i=0;while(i<actualText.length&&i<expectedText.length&&actualText[i]===expectedText[i])i++;
  assert.fail('Only tag/hash allowed; first mismatch offset='+i+
   ', actualLen='+actualText.length+', expectedLen='+expectedText.length+
   ', actual='+JSON.stringify(actualText.slice(Math.max(0,i-35),i+75))+
   ', expected='+JSON.stringify(expectedText.slice(Math.max(0,i-35),i+75)));
 }
 assert.equal(html.split(external).length,2);
 const scriptIndex=html.indexOf(external);
 assert.ok(html.indexOf('./plano-finder-live.js')<scriptIndex);
 assert.ok(html.indexOf('./features/commute/workplace-marker.js')>scriptIndex);
 assert.doesNotMatch(external,/\bdefer\b|\basync\b|type=/);
});
test('all application scripts external, no inline executable tags or event handlers in HTML',()=>{
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
 assert.ok(scripts.length>20);
 assert.equal(scripts.filter(s=>!/\bsrc\s*=/.test(s[1])&&s[2].trim()).length,0);
 assert.doesNotMatch(html,/\s(?:onclick|onload|onerror|onchange|onsubmit)\s*=/i);
});
test('existing West DFW / area / schools / risk scripts remain loaded once',()=>{
 for(const asset of ['features/west-dfw/attach.js','features/area-assessment.js',
 'features/resilience/winter-map.js','school-boundary-match.js','home-lookup-v2.js']){
  assert.equal(html.split(asset).length,2,asset);
 }
});
