#!/usr/bin/env node
// Advisory availability check for public school district source pages.
// HTTP/page availability != a working property-specific attendance finder.
// No private residential addresses or browser-agent credits are used.
import {mkdirSync,writeFileSync} from 'node:fs';
const sources=[
 {code:'AISD',kind:'public-district-page',url:'https://www.allenisd.org/page/findaschool',pattern:/find\s*a\s*school|campus assignment|street name/i},
 {code:'PISD',kind:'public-district-page',url:'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder',pattern:/SchoolFinder|School Finder/i},
 {code:'LISD',kind:'public-district-page',url:'https://www.lisd.net/resources/families/school-locator',pattern:/School Locator/i},
 {code:'CFB',kind:'public-district-page',url:'https://www.cfbisd.edu/students/school-maps-locator-system',pattern:/School Search|school search/i},
 {code:'CFB',kind:'external-locator-page',url:'https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/',pattern:/SchoolSearch|Find your address|Find on Map|GuideK12/i},
 // District Student Services still links this legacy short domain; do NOT treat it as a validated address resolver.
 {code:'CFB',kind:'district-linked-legacy-url-advisory-only',url:'https://www.cfbmaps.com/',pattern:/SchoolSearch|GuideK12|Carrollton|school locator/i},
 {code:'PISD',kind:'live-finder-geographic-service',url:'https://services4.arcgis.com/uBV8NRVfoRJv7qWn/arcgis/rest/services/Plano_ISD_School_Districts/FeatureServer?f=json',pattern:/layers|currentVersion/i}
];
const checkedAt=new Date().toISOString();
const report={checkedAt,kind:'availability-only',notAddressSchoolVerification:true,checks:[]};
for(const spec of sources){
 let outcome={code:spec.code,kind:spec.kind,url:spec.url,checkedAt,status:'unavailable-or-blocked',propertyAssignmentVerified:false};
 try{
  const response=await fetch(spec.url,{headers:{'accept':'text/html,application/json'},signal:AbortSignal.timeout(18000),redirect:'follow'});
  outcome.httpStatus=response.status;
  outcome.finalUrl=response.url;
  if(response.ok){
   const body=(await response.text()).slice(0,1200000);
   outcome.bodyRecognized=spec.pattern.test(body);
   outcome.status=outcome.bodyRecognized?'reachable-source-page':'page-opened-content-unverified';
  }
 }catch(error){
  outcome.error=String(error?.message||error).slice(0,220);
 }
 report.checks.push(outcome);
 console.log(outcome.code+' '+outcome.kind+': '+outcome.status+(outcome.httpStatus?' (HTTP '+outcome.httpStatus+')':''));
}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/official-school-source-health.json',JSON.stringify(report,null,2)+'\n');
console.log('Live page status is advisory: it cannot certify current-year polygons, enrolled schools, or whether an address lookup works.');
