#!/usr/bin/env node
'use strict';
// NOAA Storm Events original, county-coded historical records only.
// This ETL never claims that occurrence counts predict future parcel risk.
const {gunzipSync}=require('node:zlib');
const {createHash}=require('node:crypto');
const {mkdirSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const FILES=[
 {year:2024,revision:'20260728'},
 {year:2025,revision:'20260819'}
];
const COUNTIES=['COLLIN','DALLAS','DENTON','TARRANT','ROCKWALL','KAUFMAN',
 'ELLIS','GRAYSON','HUNT','PARKER','JOHNSON','WISE'];
const CATEGORIES={
 'Thunderstorm Wind':'wind','High Wind':'wind','Strong Wind':'wind',
 'Tornado':'tornado','Hail':'hail',
 'Flash Flood':'flood','Flood':'flood',
 'Lightning':'lightning','Wildfire':'wildfire',
 'Tropical Storm':'wind','Hurricane':'wind','Hurricane (Typhoon)':'wind'
};
const BASE='https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/';
const OUTPUT=path.join(__dirname,'..','data','noaa-storm-events-dfw-2024-2025.json');

function parseCSV(text,onRow){
 let row=[],field='',quoted=false,rows=0;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'&&text[i+1]==='"'){field+='"';i++}
   else if(ch==='"')quoted=false;
   else field+=ch;
  }else if(ch==='"'&&field==='')quoted=true;
  else if(ch===','){row.push(field);field=''}
  else if(ch==='\n'){
   row.push(field.replace(/\r$/,''));
   if(row.some(v=>v!=='')){onRow(row);rows++}
   row=[];field='';
  }else field+=ch;
 }
 if(quoted)throw Error('Malformed NOAA CSV with unterminated quoted field');
 if(field.length||row.length){row.push(field.replace(/\r$/,''));onRow(row);rows++}
 return rows;
}
function summarizeRecords(records){
 const aggregated=new Map();
 for(const r of records){
  const key=[r.county,r.year,r.category].join('|');
  const item=aggregated.get(key)||{county:r.county,year:r.year,category:r.category,count:0,monthly:Array(12).fill(0)};
  item.count++;
  if(r.month>=1&&r.month<=12)item.monthly[r.month-1]++;
  aggregated.set(key,item);
 }
 return [...aggregated.values()].sort((a,b)=>a.county.localeCompare(b.county)||a.year-b.year||a.category.localeCompare(b.category));
}
async function downloadYear(year,revision){
 const file='StormEvents_details-ftp_v1.0_d'+year+'_c'+revision+'.csv.gz';
 const url=BASE+file;
 let res;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   res=await fetch(url,{signal:AbortSignal.timeout(120000),headers:{'User-Agent':'NorthDallasExplorer/NOAA-source-audit (public-source-etl)'}});
   if(res.ok)break;
   throw Error('HTTP '+res.status);
  }catch(error){
   if(attempt===3)throw Error('NOAA bulk '+year+' download failed: '+error.message);
   await new Promise(resolve=>setTimeout(resolve,attempt*1800));
  }
 }
 const binary=Buffer.from(await res.arrayBuffer());
 if(binary.length<1000000)throw Error('Too small NOAA bulk file; likely failed download');
 const digest=createHash('sha256').update(binary).digest('hex');
 const csv=gunzipSync(binary).toString('utf8');
 const rows=[];
 let headers=null,rawRows=0,texasCountyRows=0;
 parseCSV(csv,row=>{
  if(!headers){headers=new Map(row.map((name,i)=>[name.replace(/^\uFEFF/,'').trim(),i]));return}
  rawRows++;
  const v=name=>row[headers.get(name)]||'';
  if(v('STATE').toUpperCase()!=='TEXAS'||v('CZ_TYPE')!=='C')return;
  texasCountyRows++;
  const county=v('CZ_NAME').toUpperCase().trim();
  const category=CATEGORIES[v('EVENT_TYPE')];
  if(!COUNTIES.includes(county)||!category)return;
  const eventMonth=Number(String(v('BEGIN_YEARMONTH')).slice(-2));
  const rowYear=Number(String(v('BEGIN_YEARMONTH')).slice(0,4));
  if(rowYear!==year||!(eventMonth>=1&&eventMonth<=12))return;
  rows.push({county,year,category,month:eventMonth});
 });
 for(const col of ['STATE','CZ_TYPE','CZ_NAME','EVENT_TYPE','BEGIN_YEARMONTH']){
  if(!headers?.has(col))throw Error('NOAA CSV missing required field '+col);
 }
 if(!rawRows||!rows.length)throw Error('NOAA source unexpectedly has no DFW storm event records');
 return {source:{year,revision,url,sha256: digest,bytes:binary.length,rawRows,texasCountyRows,selectedCountyRows:rows.length},records:rows};
}
async function main(){
 const outcomes=[];
 for(const f of FILES)outcomes.push(await downloadYear(f.year,f.revision));
 const records=outcomes.flatMap(x=>x.records);
 const summary=summarizeRecords(records);
 const snapshot={
  metadata:{
   source:'NOAA National Centers for Environmental Information / Storm Events Database',
   bulkIndex:BASE,
   sourceFiles:outcomes.map(x=>x.source),
   analyzedYears:FILES.map(x=>x.year),
   counties:COUNTIES,
   geography:'County-coded (CZ_TYPE=C) reported events only; no ZIP, tract, address or parcel attribution',
   includedCategories:{wind:'Thunderstorm Wind / High Wind / Strong Wind / Tropical Storm / Hurricane',
    tornado:'Tornado',hail:'Hail',flood:'Flash Flood / Flood',lightning:'Lightning',wildfire:'Wildfire'},
   selectedEvents:records.length,
   aggregatedRows:summary.length,
   constraints:[
    'NOAA event records are not independent storm days, damage claims, or a forecast of future home risk.',
    'Only selected categories and county-coded records are counted. NOAA forecast zones (CZ_TYPE=Z) are excluded to avoid misleading county allocation.',
    'Historical event counts are not population-normalized, do not use ACS ZIP populations, and must not be colored as FEMA risk ratings.',
    '2024/2025 CSV files are periodically revised; source filename revision and SHA-256 identify the exact source snapshots.',
    'There can be reporting lags, revisions, overlapping episodes and missing or unreported local incidents.'
   ]
  },
  summary
 };
 const expected=summary.reduce((sum,row)=>sum+row.count,0);
 if(expected!==records.length)throw Error('Aggregate NOAA counts do not reconcile to input events');
 if(summary.some(row=>row.monthly.length!==12||row.monthly.reduce((a,b)=>a+b,0)!==row.count))throw Error('NOAA month subtotal mismatch');
 mkdirSync(path.dirname(OUTPUT),{recursive:true});
 writeFileSync(OUTPUT,JSON.stringify(snapshot,null,2)+'\n');
 console.log('PASS NOAA historical county-coded storm records '+JSON.stringify({
  file:OUTPUT,selected:records.length,aggregates:summary.length,
  bySource:outcomes.map(x=>({year:x.source.year,selected:x.source.selectedCountyRows,sha256:x.source.sha256})),
  monthlyTotalsReconciled:true
 }));
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1});
module.exports={parseCSV,summarizeRecords,COUNTIES,CATEGORIES,FILES};
