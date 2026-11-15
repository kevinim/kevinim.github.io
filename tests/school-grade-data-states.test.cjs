'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../features/school-grade-zones-uat-core.js');
const {context,response,flush}=require('./helpers/bounded-context.cjs');
const feature={type:'Feature',properties:{school:'Synthetic Elementary',gradeLevel:'elementary',campusId:'043907101',sourceVintage:'2026-27',verifiedYear:'2026-27',yearVerified2627:true},geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}};
const rated={id:'043907101',district:'043907',name:'Synthetic Elementary',rating:'A',score:95};
test('TEA missing, Not Rated, ambiguous identity and invalid record have distinct outcomes',()=>{
 assert.equal(core.matchRatingResult(feature,'043907',[]).status,'unlinked');
 assert.equal(core.matchRatingResult(feature,'043907',[{...rated,rating:'Not Rated',score:null}]).status,'not-rated');
 assert.equal(core.matchRatingResult(feature,'043907',[rated,{...rated}]).status,'ambiguous');
 assert.equal(core.matchRatingResult({...feature,properties:{...feature.properties,campusId:'invalid'}},'043907',[rated]).status,'invalid-record');
 assert.equal(core.matchRatingResult(feature,'043907',[{...rated,score:101}]).status,'invalid-record');
});
test('missing joins never increment official Not Rated counts; campus and piece totals differ',()=>{
 const absent=core.build([feature],[],null,{district:'043907',liveFinder:true});
 assert.equal(absent.nonRated,0);assert.equal(absent.unlinked,1);
 const joined=core.build([feature,structuredClone(feature)],[rated],null,{district:'043907',liveFinder:true});
 assert.equal(joined.matched,2);assert.equal(joined.campusCounts.rated,1);
});
test('source loading, full failure, partial result and successful empty source remain distinct',()=>{
 assert.equal(core.dataAvailability([{polygon:'loading'}]).status,'loading');
 assert.equal(core.dataAvailability([{polygon:'error'}]).status,'error');
 assert.equal(core.dataAvailability([{polygon:'ready'},{polygon:'error'}]).status,'partial');
 assert.equal(core.dataAvailability([{polygon:'ready'},{polygon:'loading'}]).status,'partial');
 assert.equal(core.dataAvailability([{polygon:'ready'}]).status,'ready');
});
test('retry only rereads the requested failed district and clears its old error',async()=>{
 const seen=[];const h=context(url=>{seen.push(String(url));return Promise.resolve(response({features:Array.from({length:19},()=>feature)}))});
 h.run("state.sourceStatus={FISD:{polygon:'ready',feeder:'not-required'},LISD:{polygon:'error',feeder:'not-required'}};state.zoneLoadErrors.LISD='old';state.zoneData.FISD=[{properties:{school:'preserved'}}];convertMetrostudyZones=j=>j.features;");
 await h.ctx.loadBoundaryData(['LISD']);await flush();
 assert.equal(seen.length,1);assert.ok(seen[0].includes('03c099e24d304c4fa0f4ce8a76c10062'));
 assert.equal(h.run('state.sourceStatus.FISD.polygon'),'ready');
 assert.equal(h.run('state.zoneData.FISD[0].properties.school'),'preserved');
 assert.equal(h.run('state.sourceStatus.LISD.polygon'),'ready');
 assert.equal(h.run("state.zoneLoadErrors.LISD||null"),null);
});

test('an older source failure cannot clear the successful replacement retry',async()=>{
 let calls=0,rejectFirst;const h=context(()=>{calls++;if(calls===1)return new Promise((_resolve,reject)=>{rejectFirst=reject});return Promise.resolve(response({features:Array.from({length:19},()=>feature)}))});
 h.run('convertMetrostudyZones=j=>j.features;');const old=h.ctx.loadBoundaryData(['LISD']);await flush();
 await h.ctx.loadBoundaryData(['LISD']);rejectFirst(Error('old request failed'));await old;
 assert.equal(h.run('state.sourceStatus.LISD.polygon'),'ready');assert.equal(h.run('state.zoneData.LISD.length'),19);assert.equal(h.run('state.zoneLoadErrors.LISD||null'),null);
});
test('a failed boundary source is explained even when reference overlays are disabled',()=>{
 const h=context(()=>Promise.resolve(response({}))),children=[];
 h.ctx.districtZoneKey=x=>x;h.ctx.districtZoneDisplay=()=> 'historical';h.ctx.districtInfo=()=>({});
 h.ctx.SchoolBoundaryMatch={findSchoolBoundary:()=>({features:[]}),boundarySchoolSource:x=>x,boundaryMissingExplanation:()=>({reason:'Source unavailable',footnote:'Official Finder remains available'})};
 h.ctx.document.createElement=()=>({});const note=h.el('zoneNotice');note.appendChild=x=>children.push(x);note.replaceChildren=()=>{children.length=0};
 h.run("map={};zoneGroup={clearLayers(){}};schoolZoneInfo=()=>({});renderSchoolZoneMapHint=()=>{};state.selectedSchool={district:'043907',type:'elementary',name:'Synthetic'};state.showOldZones=false;state.showHistoric=false;state.zoneLoadErrors['043907']='synthetic unavailable';");
 h.ctx.drawBoundary();assert.equal(children[0].textContent,'Source unavailable');assert.equal(h.run('state.showOldZones'),false);assert.equal(h.run('state.showHistoric'),false);
});
