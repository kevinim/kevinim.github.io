'use strict';
const assert = require('node:assert/strict');
const {plan} = require('../features/school-reference-preview.js');
const registry = {PROSPER:{currency:'always',official:'https://example.org/finder'}};
const props = {school:'Christie Elementary',gradeLevel:'elementary',sourceDistrict:'PROSPER',current:true,sourceYearConfirmed:true,sourceVintage:'2026–27',schoolYear:'2026–27',campusId:'043912117',schoolCode:'117'};
function check(p){return plan({district:'PROSPER',status:'current',features:[{type:'Feature',properties:p,geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}}]},registry,x=>x);}
assert.equal(check(props).kind,'reference-only');
assert.ok(check(props).notices.some(n=>n.includes('Christie')));
for(const p of [{...props,campusId:undefined},{...props,campusId:null},{...props,schoolCode:undefined},{...props,schoolCode:'118'},{...props,schoolYear:'2025–26'}]) assert.equal(check(p).kind,'unavailable');
console.log('Prosper campus identity guard passed');
