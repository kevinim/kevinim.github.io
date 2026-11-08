#!/usr/bin/env node
// Reported crime per city police department for the dashboard counties.
// Source: FBI Crime Data Explorer public summarized agency data (NIBRS, no
// API key) — monthly reported offenses and the FBI agency population.
// Geography: Census TIGERweb incorporated place (city limits), because a city
// police department reports crimes inside its city limits. Counts are never
// spread over ZIP codes.
// Output: data/dfw-crime-city-2023-2025.geojson
import {readFileSync,writeFileSync} from 'node:fs';

const CDE='https://cde.ucr.cjis.gov/LATEST';
const PLACES='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/28/query';
const YEARS=[2023,2024,2025];
const OFFENSES={violent:'violent-crime',property:'property-crime'};
const sleep=t=>new Promise(r=>setTimeout(r,t));

// Dashboard counties (county-scopes.json) by name as the FBI agency list spells them.
const scopes=JSON.parse(readFileSync('county-scopes.json','utf8'));
const countyNames=new Set(Object.entries(scopes.counties).filter(([fips])=>fips.startsWith('48'))
 .map(([,c])=>c.name.replace(/ County$/,'').toUpperCase()));

async function json(url,attempt=1){
 try{
  const r=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error('HTTP '+r.status);
  return await r.json();
 }catch(e){if(attempt>=4)throw Error(url+' -> '+e.message);await sleep(1500*attempt);return json(url,attempt+1)}
}

const agencies=Object.values(await json(CDE+'/agency/byStateAbbr/TX')).flat()
 .filter(a=>a.agency_type_name==='City'&&String(a.counties||'').split(', ').some(c=>countyNames.has(c)));
console.log('city agencies in scope',agencies.length);

function yearSummary(resp,agencyName,year){
 const actual=resp?.offenses?.actuals?.[agencyName+' Offenses']||{};
 const part=resp?.populations?.participated_population?.[agencyName]||{};
 const pop=resp?.populations?.population?.[agencyName]||{};
 const months=[...Array(12)].map((_,i)=>String(i+1).padStart(2,'0')+'-'+year);
 // A month counts as reported only when the agency participated that month.
 const reported=months.filter(m=>Number(part[m])>0&&Number.isFinite(Number(actual[m]??0)));
 const count=reported.reduce((n,m)=>n+Number(actual[m]||0),0);
 const population=Math.max(0,...months.map(m=>Number(pop[m])||0));
 return {count,population,monthsReported:reported.length};
}
function stateRate(resp,label,year){
 const r=resp?.offenses?.rates?.[label+' Offenses']||{};
 const vals=[...Array(12)].map((_,i)=>Number(r[String(i+1).padStart(2,'0')+'-'+year]));
 return vals.every(Number.isFinite)?Math.round(vals.reduce((a,b)=>a+b,0)):null;
}

const reference={};const rows=[];
for(const a of agencies){
 const name=a.agency_name,row={ori:a.ori,agency:name,counties:a.counties,years:{}};
 for(const [key,slug] of Object.entries(OFFENSES)){
  const resp=await json(`${CDE}/summarized/agency/${a.ori}/${slug}?from=01-${YEARS[0]}&to=12-${YEARS.at(-1)}`);
  for(const y of YEARS){
   const s=yearSummary(resp,name,y);
   const yr=row.years[y]||(row.years[y]={population:s.population});
   yr.population=Math.max(yr.population,s.population);
   yr[key]=s.count;yr[key+'Months']=s.monthsReported;
   reference[y]=reference[y]||{};
   reference[y][key]??={texas:stateRate(resp,'Texas',y),us:stateRate(resp,'United States',y)};
  }
  await sleep(250);
 }
 rows.push(row);
 if(rows.length%20===0)console.log('fetched',rows.length);
}

// City limits from TIGERweb, matched by place name within Texas.
const features=[];const unmatched=[];
for(const row of rows){
 const base=row.agency.replace(/ Police Department$/,'').replace(/'/g,"''");
 const q=new URLSearchParams({where:`STATE='48' AND BASENAME='${base}'`,outFields:'NAME,BASENAME,GEOID',returnGeometry:'true',outSR:'4326',maxAllowableOffset:'0.0004',geometryPrecision:'5',f:'geojson'});
 const g=await json(PLACES+'?'+q);
 if(g.features?.length!==1){unmatched.push(row.agency+' ('+(g.features?.length||0)+')');continue}
 const f=g.features[0];
 const years={};
 for(const [y,v] of Object.entries(row.years)){
  const full=k=>v[k+'Months']===12&&v.population>0;
  years[y]={population:v.population,violent:v.violent,property:v.property,violentMonths:v.violentMonths,propertyMonths:v.propertyMonths,
   violentRate:full('violent')?Math.round(v.violent/v.population*1e5):null,
   propertyRate:full('property')?Math.round(v.property/v.population*1e5):null};
 }
 features.push({type:'Feature',properties:{ori:row.ori,agency:row.agency,city:f.properties.BASENAME,placeGeoid:f.properties.GEOID,counties:row.counties,years},geometry:f.geometry});
 await sleep(150);
}
const out={type:'FeatureCollection',metadata:{
 source:'FBI Crime Data Explorer, summarized agency data (NIBRS), '+CDE,
 geometry:'Census TIGERweb Incorporated Places (tigerWMS_Current layer 28), simplified',
 generatedAt:new Date().toISOString().slice(0,10),years:YEARS,
 rateDefinition:'reported offenses / FBI agency population x 100,000; null unless all 12 months were reported',
 offenseGroups:{violent:'FBI violent crime (murder, rape, robbery, aggravated assault)',property:'FBI property crime (burglary, larceny-theft, motor vehicle theft, arson)'},
 reference,unmatchedAgencies:unmatched},features};
writeFileSync('data/dfw-crime-city-2023-2025.geojson',JSON.stringify(out)+'\n');
console.log('features',features.length,'unmatched',unmatched.length,unmatched.join('; '));
