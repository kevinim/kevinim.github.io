'use strict';
// Verify only static public TEA campus aggregates. No student-level data or network calls.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const METRICS=['studentAchievement','schoolProgress','closingTheGaps'];
const SUBJECTS=['reading','math','science','socialStudies'];
const EXPECTED_COLUMNS={studentAchievement:['CD1S','CD1G'],schoolProgress:['CD2S','CD2G'],closingTheGaps:['CD3S','CD3G']};
const EXPECTED_STAAR={reading:['D1_STAAR1','CDA00AR01226R'],math:['D1_STAAR2','CDA00AM01226R'],science:['D1_STAAR3','CDA00AC01226R'],socialStudies:['D1_STAAR3','CDA00AS01226R']};
function requireIt(ok,msg){if(!ok)throw Error(msg);}
function urlFor(url,dsname){
  const u=new URL(url);
  requireIt(u.protocol==='https:'&&u.hostname==='rptsvr1.tea.texas.gov','Non-official TEA report URL');
  requireIt(u.searchParams.get('ccyy')==='2026'&&u.searchParams.get('sumlev')==='C','Wrong year or report level in TEA source URL');
  requireIt(u.searchParams.get('dsname')===dsname,'Incorrect official dataset identifier');
  return u;
}
function statsFrom(rows,field,statuses){
  const out=Object.fromEntries(statuses.map(k=>[k,0]));
  for(const value of Object.values(rows)){const s=value[field].status,k=s==='not-rated'?'notRated':s==='not-in-source'?'notInSource':s;requireIt(k in out,'Invalid status for '+field+': '+s);out[k]++;}
  return out;
}
function validate(domain,staar,ratings){
  requireIt(domain.schemaVersion===1&&staar.schemaVersion===1,'Unsupported batch schema');
  requireIt(domain.accountabilityYear===2026&&staar.accountabilityYear===2026,'Accountability year must be 2026');
  requireIt(domain.schoolYear==='2025-26'&&staar.schoolYear==='2025-26','Wrong tested school year');
  const dsrc=urlFor(domain.source.url,'RATE');
  for(const k of ['RATE','D1','D2','D3'])requireIt(dsrc.searchParams.getAll('key').includes(k),'Missing official accountability CSV selection '+k);
  requireIt(domain.source.sourceColumns.campusId==='CAMPUS','Official campus ID column drift');
  for(const [k,cols] of Object.entries(EXPECTED_COLUMNS)){
    requireIt(domain.source.sourceColumns[k+'Score']===cols[0]&&domain.source.sourceColumns[k+'Rating']===cols[1],'TEA scaled-domain variable mismatch: '+k);
  }
  const inventory=new Map(ratings.data.map(r=>[r.id,r]));
  requireIt(inventory.size===2282&&ratings.data.length===2282,'Unexpected inventory coverage');
  const dids=Object.keys(domain.campuses),sids=Object.keys(staar.campuses);
  requireIt(dids.length===inventory.size&&sids.length===inventory.size,'Campus batch not fully joined');
  for(const id of dids){
    requireIt(/^\d{9}$/.test(id)&&inventory.has(id),'Invalid or unmatched campus: '+id);
    const entry=domain.campuses[id],rating=inventory.get(id);
    requireIt(entry.districtId===id.slice(0,6),'Campus/District 9-digit identity failure '+id);
    requireIt(entry.officialCampusName&&typeof entry.officialCampusName==='string','Missing official campus name '+id);
    requireIt(entry.overall.rating===rating.rating,'Campus overall grade disagrees with independent 2026 catalog '+id);
    requireIt(entry.overall.score===null||(Number.isInteger(entry.overall.score)&&entry.overall.score>=0&&entry.overall.score<=100),'Invalid official overall score '+id);
    for(const metric of METRICS){
      const m=entry[metric];requireIt(m&&typeof m==='object','Domain missing '+metric+' '+id);
      requireIt(['A','B','C','D','F','Not Rated'].includes(m.rating),'Invalid official domain rating '+metric+' '+id);
      if(m.status==='reported')requireIt(Number.isInteger(m.score)&&m.score>=0&&m.score<=100,'Invalid scaled score '+metric+' '+id);
      else {requireIt(m.score===null,'Suppressed/missing score must be null: '+metric+' '+id);
        if(m.status==='not-rated')requireIt(m.rating==='Not Rated','Not Rated marker mismatches official domain grade '+id);
        else requireIt(['suppressed','unavailable'].includes(m.status),'Invalid domain missingness '+metric+' '+id);
        if(m.status==='suppressed')requireIt(typeof m.sourceMarker==='string'&&m.sourceMarker.length>0,'Missing suppression marker');
      }
    }
  }
  for(const subj of SUBJECTS){
    const [ds,col]=EXPECTED_STAAR[subj],spec=staar.source.fieldMap[subj],group=staar.source.groups[ds];
    requireIt(spec.dataset===ds&&spec.rateVariable===col,'STAAR subject variable mapping mismatch '+subj);
    const u=urlFor(group.url,ds);
    requireIt(u.searchParams.get('datafmt')==='C'&&u.searchParams.get('prgopt')==='reports/acct/dd/dd_get_data.sas','Source not a campus public CSV '+subj);
    requireIt(group.sourceRows===group.matchedInventory+group.outsideInventory,'Source rows fail inclusion reconciliation '+subj);
    requireIt(group.matchedInventory+group.missingInventory===inventory.size,'Source row join coverage mismatch '+subj);
    for(const id of sids){
      requireIt(inventory.has(id),'Unmatched STAAR campus '+id);
      const e=staar.campuses[id][subj];requireIt(e&&typeof e==='object','Missing STAAR entry '+subj+' '+id);
      if(e.status==='reported')requireIt(Number.isInteger(e.value)&&e.value>=0&&e.value<=100,'Invalid source percent '+subj+' '+id);
      else{requireIt(e.value===null,'Missing/suppressed STAAR value must remain null '+subj+' '+id);
        if(e.status==='suppressed')requireIt(['-1','-3','*'].includes(e.sourceMarker),'Suppression marker must match official TEA encoding '+id);
        else requireIt(['unavailable','not-in-source'].includes(e.status),'Unknown STAAR missingness '+subj+' '+id);
      }
    }
    const actual=statsFrom(staar.campuses,subj,['reported','suppressed','unavailable','notInSource']);
    for(const [k,n] of Object.entries(actual))requireIt(staar.coverage[subj][k]===n,'STAAR coverage mismatch '+subj+'/'+k);
    requireIt(actual.notInSource===group.missingInventory,'STAAR missing campus count mismatch '+subj);
  }
  requireIt(domain.coverage.statewideRows===domain.coverage.matched+domain.coverage.outOfScope,'TEA 2026 statewide row accounting mismatch');
  requireIt(domain.coverage.matched===inventory.size&&domain.coverage.missingInventory===0,'2026 accountability inventory mismatch');
  for(const metric of METRICS){
    const actual=statsFrom(domain.campuses,metric,['reported','notRated','suppressed','unavailable']);
    for(const [k,n] of Object.entries(actual))requireIt(domain.coverage.domain[metric][k]===n,'Accountability domain count mismatch '+metric+'/'+k);
  }
  return {inventory:inventory.size,accountabilityRows:domain.coverage.statewideRows,accountabilityJoined:domain.coverage.matched,staarSourceRows:staar.source.groups.D1_STAAR1.sourceRows,accountabilityDomain:domain.coverage.domain,staar:staar.coverage};
}
function load(){
  return {
    domain:JSON.parse(fs.readFileSync(path.join(ROOT,'data/tea-accountability-2026-verified-batch.json'),'utf8')),
    staar:JSON.parse(fs.readFileSync(path.join(ROOT,'data/tea-staar-meets-2026-verified-batch.json'),'utf8')),
    ratings:JSON.parse(fs.readFileSync(path.join(ROOT,'tea-ratings-2026.json'),'utf8'))
  };
}
if(require.main===module){try{const result=validate(...Object.values(load()));console.log('TEA official 2026 data verified: '+JSON.stringify(result));}catch(error){console.error('TEA 2026 independent validation failed: '+error.message);process.exitCode=1;}}
module.exports={validate,load,statsFrom,urlFor};