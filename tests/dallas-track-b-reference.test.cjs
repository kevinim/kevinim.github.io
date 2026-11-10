'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../dallas-attendance-live.js'),gate=require('../features/conditional-school-release.js');
const rectangle=[[-96.9,32.7],[-96.7,32.7],[-96.7,32.9],[-96.9,32.9],[-96.9,32.7]];
const point=[-96.797,32.776];
const response=obj=>({ok:true,json:async()=>obj});
function mockFetch(url,{signal}={}){
 assert.equal(signal?.aborted,false);
 const u=new URL(url);assert.equal(u.origin,'https://services.arcgis.com');
 assert.ok(!u.href.includes('address='),'no home address may be sent to GIS');
 const spec=M.SOURCES.find(s=>u.pathname.includes('/'+s.service+'/'));
 assert.ok(spec,'untrusted GIS source');
 if(u.searchParams.get('f')==='pjson')return Promise.resolve(response({
  type:'Feature Layer',geometryType:'esriGeometryPolygon',
  fields:[{name:spec.nameField},{name:spec.campusField}],
  capabilities:'Query',editingInfo:{lastEditDate:Date.UTC(2026,6,22)}
 }));
 assert.equal(u.searchParams.get('geometry'),point.join(','));
 assert.equal(u.searchParams.get('f'),'geojson');
 const fields={[spec.nameField]:spec.level+' SCHOOL',[spec.campusField]:spec.level==='elementary'?12:spec.level==='middle'?34:56};
 return Promise.resolve(response({type:'FeatureCollection',features:[
  {type:'Feature',properties:fields,geometry:{type:'Polygon',coordinates:[rectangle]}}
 ]}));
}
test('user-initiated Dallas live GIS point lookup yields only three unverified reference polygons',async()=>{
 const out=await M.lookup(point,new AbortController().signal,mockFetch);
 assert.equal(out.status,'publisher-reference-only');
 assert.equal(out.features.length,3);
 assert.equal(out.yearCertified,false);
 assert.equal(out.addressAssignmentCertified,false);
 assert.equal(out.features.every(f=>f.properties.sourceYearVerified===false),true);
 assert.equal(out.features.every(f=>M.inside(point,f.geometry)),true);
 assert.deepEqual(out.features.map(f=>f.properties.gradeLevel),['elementary','middle','high']);
});
test('source policy rejects arbitrary coordinates and never approves school assignment',async()=>{
 await assert.rejects(M.lookup([-80,20],new AbortController().signal,mockFetch),/supported geographic bounds/);
 assert.equal(gate.releaseSummary().currentYearResidentialDistrictApprovals,0);
 const x=M.compareReportedSchool({status:'ready',names:{elementary:'Alpha School'}},{gradeLevel:'elementary',schoolName:'Alpha ES',schoolYear:'2026–27'});
 assert.equal(x.productionAssignmentApproved,false);assert.equal(x.independentlyVerified,false);
});
test('Track B shows warning at panel and polygons and preserves all existing release gates',()=>{
 const home=fs.readFileSync('home-lookup-v2.js','utf8');
 const html=fs.readFileSync('index.html','utf8');
 assert.match(home,/ConditionalSchoolRelease\?\.apply\(rawSchoolCandidate\)/);
 assert.match(home,/Dallas 참고 GIS이며 현재 배정학교가 아닙니다/);
 assert.match(home,/Dallas 참고 GIS 경계 표시 \(배정 미인증\)/);
 assert.match(home,/Dallas 참고 GIS · 학교 배정 미인증/);
 assert.match(home,/clearDallasReference\(\)/);
 assert.match(html,/Dallas 참고 GIS 버튼을 누르면 선택한 좌표만/);
 assert.match(html,/dallas-attendance-live\.js\?v=1/);
 assert.match(html,/https:\/\/services\.arcgis\.com/);
 assert.match(html,/reference-gis-global-warning/);
});
