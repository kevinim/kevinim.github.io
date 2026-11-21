'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const api=require('../features/prosper-boundary-years.js');
const html=fs.readFileSync('index.html','utf8');
const dashboard=fs.readFileSync('dashboard-main.js','utf8');
const feature=fs.readFileSync('features/prosper-boundary-years.js','utf8');

test('Prosper board approval, GIS availability and official address API are distinct fields',()=>{
 const state=api.status('PROSPER');
 assert.equal(api.status('FISD'),null);
 assert.equal(state.current.schoolYear,'2026–27');
 assert.equal(state.current.publicGisAvailable,true);
 assert.equal(state.current.officialAddressAutoVerified,false);
 assert.equal(state.future.schoolYear,'2027–28');
 assert.equal(state.future.approvalDate,'2026-11-16');
 assert.equal(state.future.boardBoundaryApproved,true);
 assert.deepEqual(Array.from(state.future.approvedGrades),['middle','high']);
 assert.equal(state.future.schoolSpecificVectorGISAvailable,false);
 assert.equal(state.future.dashboardAutomaticZoneReady,false);
 assert.equal(state.future.elementaryBoundaryChangeVerified,false);
 assert.equal(state.officialAddress.directDashboardRead,'blocked-by-vendor-cors');
 assert.equal(state.officialAddress.exactAddressAutomaticIntegration,false);
 assert.equal(state.officialAddress.approvedProxyAvailable,false);
 assert.equal(state.officialAddress.publicFinderUrl,'https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1');
});

test('year status renderer is source-labelled and does not leak or automatically send addresses',()=>{
 const doc={createElement(tag){
  const element={tagName:tag,ownerDocument:doc,children:[],attributes:{},textContent:'',
   setAttribute(key,value){this.attributes[key]=value},
   appendChild(child){this.children.push(child);return child},
   querySelector(){return null}};
  return element;
 }};
 const target=doc.createElement('div');
 assert.equal(api.render(target,'FISD'),false);
 assert.equal(target.children.length,0);
 assert.equal(api.render(target,'PROSPER'),true);
 assert.equal(target.children.length,1);
 const first=target.children[0];
 assert.equal(first.attributes['data-prosper-year-status'],'true');
 const contents=first.children.map(x=>x.textContent).join(' ');
 assert.match(contents,/2026–27.*GIS/);
 assert.match(contents,/2027–28/);
 assert.match(contents,/CORS/);
 assert.match(contents,/미확인/);
 assert.match(contents,/직접/);
 const links=first.children.filter(x=>x.tagName==='a');
 assert.equal(links.length,3);
 assert.ok(links.every(x=>x.href.startsWith('https://')&&x.target==='_blank'&&x.rel==='noopener noreferrer'));
 assert.ok(links.some(x=>x.href==='https://www.prosper-isd.net/'));
 assert.ok(links.some(x=>x.href==='https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1'));
 assert.doesNotMatch(feature,/\bfetch\s*\(|\bXMLHttpRequest\b|\bpostMessage\s*\(|localStorage|sessionStorage/);
});

test('the year-status script loads before the main renderer without relaxing certification gate',()=>{
 assert.ok(html.includes('./features/prosper-boundary-years.js?v=1'));
 assert.ok(html.indexOf('./features/prosper-boundary-years.js?v=1')<
  html.indexOf('./dashboard-main.js?v=22'));
 assert.match(dashboard,/ProsperBoundaryYears\?\.render\?\.\(cards,'PROSPER'\)/);
 const gate=require('../features/conditional-school-release.js');
 assert.equal(gate.releaseSummary().currentYearResidentialDistrictApprovals,0);
 assert.equal(gate.apply({district:'PROSPER',status:'current'}).status,'conditional-finder-only');
});
