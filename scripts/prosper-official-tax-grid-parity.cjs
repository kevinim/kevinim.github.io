'use strict';
// Synthetic, public-only P1 source parity; no household/address, parcel geometry
// or per-point coordinates written to CI artifacts or stdout.
const fs=require('node:fs'),path=require('node:path');
const cad=require('./prosper-public-parcel-overlap-audit.cjs');
const {contains}=require('./school-polygon-linkage-topology.cjs');
const ROOT=path.resolve(__dirname,'..');
const URL_BASE='https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchLocation';
const CLIENT_ID='PI5FFG7RYZ1';
function queryUrl(point){
 if(!Array.isArray(point)||point.length!==2||point.some(x=>!Number.isFinite(x))||
  point[0]<-97.5||point[0]>-96||point[1]<32.8||point[1]>33.8)
  throw Error('unsupported-synthetic-coordinate');
 const u=new URL(URL_BASE);
 for(const [k,v] of Object.entries({
  clientId:CLIENT_ID,x:point[0].toFixed(8),y:point[1].toFixed(8),
  schoolId:-1,gradeId:-1
 }))u.searchParams.set(k,String(v));
 return u.toString();
}
function compare(codes,point,features){
 if(!Array.isArray(codes)||codes.some(x=>typeof x!=='string'||!/^[0-9]{3}$/.test(x)))
  throw Error('invalid-public-locator-codes');
 const key=c=>String(c||'').padStart(3,'0');
 if(new Set(codes).size!==codes.length)throw Error('duplicate-public-locator-codes');
 const byCode=new Map(features.map(f=>[key(f.properties.schoolCode),f.properties.gradeLevel]));
 const hits=features.filter(f=>contains(f.geometry,point));
 const expected=hits.map(f=>key(f.properties.schoolCode));
 const present=new Set(hits.map(f=>f.properties.gradeLevel));
 if(!present.size||present.size===3)throw Error('not-a-synthetic-gap-grid-cell');
 // An extra code in a GIS-covered grade is a disagreement even if all expected
 // codes also appear in the response. Missing grades are separately reported.
 const returnedConflictingGISGrade=codes.some(c=>byCode.has(c)&&
  present.has(byCode.get(c))&&!expected.includes(c));
 const returnedUnknownCampus=codes.some(c=>!byCode.has(c));
 return {allGISCodesReturned:expected.every(c=>codes.includes(c))&&
   !returnedConflictingGISGrade&&!returnedUnknownCampus,
  returnedMissingGISGrade:codes.some(c=>byCode.has(c)&&!present.has(byCode.get(c))),
  returnedUnknownCampus,returnedConflictingGISGrade};
}
async function look(point,fetchFn=fetch){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetchFn(queryUrl(point),{signal:controller.signal});
  if(!r.ok)throw Error('public-locator-HTTP-unavailable');
  const data=await r.json();
  if(!data||data.resultCode!==200||!Array.isArray(data.schools)||data.schools.length>50)
   throw Error('public-locator-malformed-or-rejected');
  return data.schools.map(s=>{
   const code=String(s.schoolCode).padStart(3,'0');
   if(!/^[0-9]{3}$/.test(code))throw Error('public-locator-campus-code-invalid');
   return code;
  });
 }finally{clearTimeout(timer);}
}
async function inspect(selected,features,fetchFn=fetch){
 if(!Array.isArray(selected)||selected.length>293)throw Error('unbounded-selected-cells');
 const sample=selected.slice(0,20);
 const out={qualifiedResidentialProsperTaxCategoryCells:selected.length,
  boundedSyntheticPublicFinderQueries:sample.length,comparable:0,
  publicFinderUnavailable:0,allGISCodesReturned:0,sourceCampusMissingInOfficial:0,
  officialReturnedCampusInMissingGISGrade:0,unrecognizedOfficialCampusCode:0,
  officialReturnedSameGradeConflict:0};
 for(let i=0;i<sample.length;i+=4){
  const batch=sample.slice(i,i+4);
  const results=await Promise.all(batch.map(async c=>{
   for(let tries=0;tries<2;tries++)try{
    const codes=await look(c.point,fetchFn);
    return compare(codes,c.point,features);
   }catch{if(tries===0)await new Promise(resolve=>setTimeout(resolve,250));}
   return null;
  }));
  for(const result of results){
   if(!result){out.publicFinderUnavailable++;continue;}
   out.comparable++;
   if(result.allGISCodesReturned)out.allGISCodesReturned++;
   else out.sourceCampusMissingInOfficial++;
   if(result.returnedMissingGISGrade)out.officialReturnedCampusInMissingGISGrade++;
   if(result.returnedUnknownCampus)out.unrecognizedOfficialCampusCode++;
   if(result.returnedConflictingGISGrade)out.officialReturnedSameGradeConflict++;
  }
 }
 return out;
}
async function run(fetchFn=fetch){
 const f=JSON.parse(fs.readFileSync(path.join(ROOT,'prosper-attendance-2026.geojson'),'utf8'));
 if(f.features.length!==31)throw Error('Prosper source geometry changed');
 const cells=cad.makeSyntheticCells(f.features);
 if(cells.length!==293)throw Error('source synthetic QA count changed');
 const qualified=[];
 const aggregate=await cad.auditCells(cells,fetchFn,c=>qualified.push(c));
 const official=await inspect(qualified,f.features,fetchFn);
 return {schemaVersion:1,sourceYear:'2026-27',scope:'published synthetic grid, public CAD property category and official map click; NOT any residence or attendance certificate',
  totalCells:cells.length,cadSummary:aggregate,officialMapClickSummary:official};
}
if(require.main===module)run().then(report=>{
 const out=path.join(ROOT,'artifacts/school-linkage/prosper-synthetic-parcel-sourcecheck.json');
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log('PROSPER_CAD_OFFICIAL_SYNTHETIC_PARITY '+JSON.stringify({
  sourceCells:report.totalCells,cadCategories:report.cadSummary.categories,
  taxEvidence:report.cadSummary.taxingUnitEvidence,
  sourceFailures:report.cadSummary.sourceFailureChunks,
  official:report.officialMapClickSummary}));
}).catch(e=>{console.error('PROSPER_SYNTHETIC_PARITY_UNAVAILABLE '+String(e.message).slice(0,140));process.exitCode=1});
module.exports={queryUrl,compare,look,inspect,run};
