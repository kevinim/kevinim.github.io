#!/usr/bin/env node
// Public apartment-directory source drift check, not a residence enrollment API.
// The official 2026–27-linked LISD map contains contradictory campus labels
// for 5289 State Highway 121. Never elect a winner from this script.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const cached=JSON.parse(readFileSync(new URL('../lewisville-official-apartments.json',import.meta.url),'utf8'));
const reference=cached.apartments.filter(r=>r.name==='Budget Suites of America'&&/^(?:5289|2175)\b/.test(r.address));
const source='https://server.metrostudygis.com/arcgis/rest/services/apartments_lewisville/FeatureServer/0';
const report={checkedAt:new Date().toISOString(),district:'LISD',source,kind:'source-directory-vs-published-map-audit',notUnitEnrollmentVerification:true,officialCampusAssignmentFor5289:'unresolved',referenceApartmentCount:cached.apartments.length,referenceLocations:reference.map(x=>({address:x.address,tableSchools:[x.elementary,x.middle,x.intermediate,x.high]})),status:'not-evaluated',currentSourceRecords:[]};
try{
 const u=new URL(source+'/query');
 for(const [k,v] of Object.entries({where:'1=1',outFields:'*',returnGeometry:'true',outSR:'4326',resultRecordCount:'400',f:'json'}))u.searchParams.set(k,v);
 const res=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(!res.ok)throw Error('HTTP '+res.status);
 const data=await res.json();
 if(data?.error)throw Error(JSON.stringify(data.error));
 if(!Array.isArray(data.features)||data.features.length<100)throw Error('Apartment source missing rows ('+(data.features?.length||0)+')');
 report.sourceRecordCount=data.features.length;
 for(const expected of reference){
  const prefix=String(expected.address.match(/^\d+/)?.[0]||'');
  // Use an exact street number token across the public directory attributes;
  // neither apartment name nor school names are unique across both branches.
  const matches=data.features.filter(x=>
   Object.values(x.attributes||{}).some(val=>
    new RegExp('(^|[^0-9])'+prefix+'([^0-9]|$)').test(String(val||''))));
  const output={expectedAddress:expected.address,exactStreetNumber:prefix,matchCount:matches.length};
  if(matches.length===1){
   const f=matches[0];
   output.point=f.geometry?.x!=null&&f.geometry?.y!=null?[f.geometry.x,f.geometry.y]:null;
   output.fields=Object.fromEntries(Object.entries(f.attributes||{}).filter(([key,val])=>
    /(ELEM|MID|HIGH|INT|ADDR|ADDRESS|SITE|COMPLEX|NAME)/i.test(key)&&
    val!=null).map(([key,val])=>[key,String(val).slice(0,140)]));
  }
  report.currentSourceRecords.push(output);
  console.log('LISD official apartment directory '+prefix+': '+matches.length+' exact street-number matches; '+(output.point?'published point '+output.point.join(','):'point unresolved'));
 }
 report.status=report.currentSourceRecords.every(x=>x.matchCount===1&&x.point)?'both-public-directory-records-found-not-zoning-resolved':'live-directory-records-ambiguous';
}catch(error){
 report.status='live-directory-unavailable';
 report.error=String(error?.message||error).slice(0,450);
 console.warn('LISD official apartment directory review remains pending: '+report.error);
}
console.log('LISD SOURCE STATUS: '+report.status+'; 5289 school dispute remains unresolved; never select apartment row over polygon based only on place name.');
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/lisd-5289-budget-suites-source-drift.json',JSON.stringify(report,null,2)+'\n');
