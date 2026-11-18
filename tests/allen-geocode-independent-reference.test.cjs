'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {matchAllenAddress}=require('../allen-lookup.js');
const {allenSplitApartmentException}=require('../allen-apartment-exceptions.js');
const {allenRowMatchesSchool}=require('../school-assignment.js');
const release=require('../features/conditional-school-release.js');
const rows=JSON.parse(fs.readFileSync('allen-address-schools.json','utf8')).rows;
const src=fs.readFileSync('home-lookup-v2.js','utf8');
const first=src.indexOf('function schoolAssignmentFor(item){');
const last=src.indexOf('function assignmentRating(',first);
assert.ok(first>=0&&last>first);
const typed='2050 Peak St, Allen, TX 75002';
const lookup=(a,ll)=>matchAllenAddress(a,rows,ll?true:undefined);
const sandbox={
 window:{allenAssignment:lookup},allenSplitApartmentException,
 DISTRICT_REGISTRY:{},districtPolygonStatus:()=>null,
 homeFriscoMatches:()=>[],homeZoneMatches:()=>[],
 state:{zoneReady:true,assignmentLoadFailed:false},
 resolveAssignment:({allen})=>allen?{status:'unverified-year',district:'AISD',allen}:{status:'unavailable'}
};
const schoolAssignmentFor=vm.runInNewContext(src.slice(first,last)+'\nschoolAssignmentFor',sandbox);
test('Allen four official school bands display even when Esri accuracy fails',()=>{
 const result=schoolAssignmentFor({typedAddress:typed,address:'Allen, TX',geocodeQuality:{usableForSchoolCandidate:false}});
 assert.equal(result.district,'AISD');
 assert.equal(result.status,'unverified-year');
 assert.equal(result.locationUnverified,true);
 assert.deepEqual(Array.from(result.allen).slice(2),['Evans','Ereckson','Lowery','Allen High School']);
 assert.equal(release.apply(result).status,'conditional-finder-only','reference must not become certified enrollment');
});
test('Allen without precise coordinates never infers other towns or malformed source ranges',()=>{
 for(const address of ['2050 Peak St, Plano, TX 75002','2050 Peak St','2009 Moss Haven Pl, Allen, TX 75002','2050 Crestview Heights, Allen, TX 75002']){
  const result=schoolAssignmentFor({typedAddress:address,address:'2050 Peak St, Allen, TX 75002',geocodeQuality:{usableForSchoolCandidate:false}});
  assert.equal(result.status,'needs-address-verification',address);
 }
});
test('unit-split apartment exceptions override an apparently matching official address',()=>{
 for(const address of [
  '4450 S Ridge Rd Apt 8202, McKinney, TX 75070',
  '4700 S Ridge Rd Apt 501, McKinney, TX 75070',
  '6551 McKinney Ranch Pkwy Unit 611, McKinney, TX 75070',
  '7830 Van Tuyl Parkway #118, McKinney, TX 75070'
 ]){
  assert.equal(schoolAssignmentFor({typedAddress:address,address,geocodeQuality:{usableForSchoolCandidate:false}}).status,'apartment-split-review');
 }
});
test('verified coordinate path is unchanged and the Allen output stays advisory',()=>{
 const result=schoolAssignmentFor({typedAddress:typed,address:typed,geocodeQuality:{usableForSchoolCandidate:true},ll:[33.10,-96.66]});
 assert.equal(result.status,'unverified-year');
 assert.equal(result.district,'AISD');
 assert.equal(release.decide(result).allowed,false);
});
function element(tag){
 return {tagName:tag.toUpperCase(),children:[],hidden:true,attributes:{},className:'',textContent:'',
  append(...items){this.children.push(...items)},appendChild(node){this.children.push(node);return node},
  replaceChildren(...items){this.children=[...items]},setAttribute(k,v){this.attributes[k]=v},
  scrollIntoView(){}};
}
const ids={homeAssignmentPriority:element('section'),homeAssignmentPriorityStatus:element('span'),
 homeAssignmentPriorityDescription:element('p'),homeAssignmentPrioritySchools:element('div'),
 homeAssignmentPriorityFinder:element('button'),homeCandidates:element('div')};
const viewStart=src.indexOf('let failedGeocodeAllenAddress=');
const viewEnd=src.indexOf('function showOfficialFinderWithoutGeocode(',viewStart);
assert.ok(viewStart>0&&viewEnd>viewStart,'standalone fallback functions exist');
let loaded=true;
const viewSandbox={home:null,document:{createElement:element},el:id=>ids[id],
 window:{allenAssignment:address=>loaded?lookup(address,null):null},
 state:{schools:[]},canonical:value=>String(value).toLowerCase(),
 allenRowMatchesSchool,allenSplitApartmentException,scoreRecord:()=>null};
vm.createContext(viewSandbox);
vm.runInContext(src.slice(viewStart,viewEnd),viewSandbox);
test('failed Esri address search yields four text-only official school cards and a source link',()=>{
 const result=vm.runInContext('renderAllenStreetReferenceWithoutGeocode('+JSON.stringify(typed)+')',viewSandbox);
 assert.equal(result,true);assert.equal(ids.homeAssignmentPriority.hidden,false);
 const cards=ids.homeAssignmentPrioritySchools.children.filter(x=>x.className==='home-assignment-school');
 assert.equal(cards.length,4);
 assert.deepEqual(cards.map(x=>x.children[0].children[0].textContent),['Evans','Ereckson','Lowery','Allen High School']);
 assert.equal(ids.homeAssignmentPrioritySchools.children.at(-1).href,'https://www.allenisd.org/page/findaschool');
 assert.match(ids.homeAssignmentPriorityDescription.textContent,/입학 자격을 인증하지 않습니다/);
});
test('no-geocode split apartments show a warning but never school cards',()=>{
 vm.runInContext('renderAllenStreetReferenceWithoutGeocode("4450 S Ridge Rd Apt 8202, McKinney, TX 75070")',viewSandbox);
 assert.equal(ids.homeAssignmentPrioritySchools.children.filter(x=>x.className==='home-assignment-school').length,0);
 assert.match(ids.homeAssignmentPriorityStatus.textContent,/호수 확인/);
});
test('late official table loading refreshes fallback cards without another address submission',()=>{
 loaded=false;
 vm.runInContext('failedGeocodeAllenAddress='+JSON.stringify(typed)+'; refreshAllenNoGeocodeReference()',viewSandbox);
 assert.equal(ids.homeAssignmentPriority.hidden,true);
 loaded=true;
 vm.runInContext('refreshAllenNoGeocodeReference()',viewSandbox);
 assert.equal(ids.homeAssignmentPrioritySchools.children.filter(x=>x.className==='home-assignment-school').length,4);
});
test('static safeguards: no user residence sent to URL, and plain DOM text content',()=>{
 const fallback=src.slice(viewStart,viewEnd);
 assert.match(fallback,/title.textContent=name/);
 assert.doesNotMatch(fallback,/innerHTML|encodeURIComponent\(address\)|localStorage|sessionStorage|console.log/);
 assert.match(src,/home\.allenAddressReference=rawSchoolCandidate/);
 assert.match(src,/renderAllenStreetReferenceWithoutGeocode\(address\)/);
});
