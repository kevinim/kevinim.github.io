#!/usr/bin/env node
// Middle Eastern / Arab ancestry per ZIP (ZCTA) from the public ACS 2020–2024
// 5-year summary file, table B04006 "People Reporting Ancestry". No API key.
// Under federal race standards in this ACS release, Middle Eastern and North
// African people are counted as White, so race table B03002 cannot show them.
// Ancestry is self-reported and a person may report two ancestries, so groups
// are kept separate and never summed into one "Middle East" total.
import {readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {Readable} from 'node:stream';

const URL_DAT='https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b04006.dat';
// B04006 line numbers, checked against ACS20245YR_Table_Shells.txt.
export const MENA_GROUPS={
 total:1,
 arab:6, egyptian:7, iraqi:8, jordanian:9, lebanese:10, moroccan:11, palestinian:12, syrian:13, arabOther:14, otherArab:15,
 armenian:16, assyrian:17, iranian:48, israeli:50, turkish:91
};
const col=(n,k)=>'B04006_'+k+String(n).padStart(3,'0');

const zips=new Set([
 ...JSON.parse(readFileSync('dfw-demographics.json','utf8')).data.map(d=>d.z),
 ...JSON.parse(readFileSync('dfw-outside-public.json','utf8')).data.map(d=>d.z)
]);
const res=await fetch(URL_DAT);
if(!res.ok)throw Error('HTTP '+res.status+' '+URL_DAT);
const lines=createInterface({input:Readable.fromWeb(res.body),crlfDelay:Infinity});
let header=null;const data={};
for await(const line of lines){
 const cells=line.split('|');
 if(!header){header=cells;continue}
 const geo=cells[header.indexOf('GEO_ID')];
 if(!geo?.startsWith('860Z200US'))continue;
 const z=geo.slice(-5);if(!zips.has(z))continue;
 const row={};
 for(const [name,n] of Object.entries(MENA_GROUPS)){
  const e=Number(cells[header.indexOf(col(n,'E'))]),m=Number(cells[header.indexOf(col(n,'M'))]);
  // Negative values are Census annotation codes (not available), never zero.
  row[name]=[Number.isFinite(e)&&e>=0?e:null,Number.isFinite(m)&&m>=0?m:null];
 }
 data[z]=row;
}
const missing=[...zips].filter(z=>!data[z]);
if(Object.keys(data).length<zips.size*0.95)throw Error('Too few ZCTAs matched: '+Object.keys(data).length+'/'+zips.size);
const out={year:2024,source:'ACS 2020–2024 5-year B04006 (People Reporting Ancestry), summary file '+URL_DAT,
 note:'Each value is [estimate, 90% margin of error]. Self-reported ancestry; one person can report up to two ancestries.',
 groups:MENA_GROUPS,missing,data};
writeFileSync('data/dfw-mena-ancestry-2024.json',JSON.stringify(out)+'\n');
console.log('MENA ancestry ZCTAs',Object.keys(data).length,'of',zips.size,'missing',missing.join(',')||'none');
