#!/usr/bin/env node
// Advisory weekly source discrepancy monitor. Official district pages can
// change without warning. This DOES NOT issue house-level CFB assignments.
// A corrected feeder page is a REVIEW SIGNAL, not permission to auto-assign.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const reference=JSON.parse(readFileSync(new URL('../cfb-official-feeder-reference-2026.json',import.meta.url),'utf8'));
const checkedAt=new Date().toISOString();
const report={checkedAt,district:'CFB',kind:'official-2026-27-feeder-Farmers-Branch-source-drift',notAddressAssignment:true,autoAssignAllowed:false,sites:[],status:'not-evaluated'};
const decode=str=>String(str||'').replace(/<[^>]*>/g,' ')
 .replace(/&(?:nbsp|#160|#xA0);/gi,' ')
 .replace(/&amp;/gi,'&').replace(/&(?:mdash|ndash);/gi,'-')
 .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
 .replace(/\s+/g,' ').trim();
function findZonedSchoolRow(html){
 for(const m of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...m[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(x=>decode(x[1]));
  if(cells.length>=7&&/^Farmers Branch$/i.test(cells[0])){
   return {elementary:cells[0],middle:cells[5],high:cells[6],columnCount:cells.length};
  }
 }
 return null;
}
for(const url of reference.crossSourceAudit.sources){
 const item={url,parsed:false,status:'not-checked'};
 try{
  const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(18000)});
  item.httpStatus=res.status;
  if(!res.ok)throw Error('HTTP '+res.status);
  const html=await res.text();
  const row=findZonedSchoolRow(html);
  if(!row)throw Error('Unable to parse 2026–27 Farmers Branch elementary feeder row from HTML');
  item.row=row;item.parsed=true;item.status='row-extracted';
 }catch(error){item.status='source-not-verified';item.error=String(error?.message||error).slice(0,220)}
 report.sites.push(item);
 console.log('CFB 2026–27 source '+url+': '+(item.parsed?item.row.middle+' / '+item.row.high:item.status));
}
const good=report.sites.filter(x=>x.parsed);
const all=good.length===3&&good.every(x=>x.row.middle&&x.row.high);
if(all){
 const unique=new Set(good.map(x=>x.row.middle.toUpperCase()+' / '+x.row.high.toUpperCase()));
 report.status=unique.size===1?'source-conflict-possibly-resolved-requires-human-review':'official-source-contradiction-continues';
 report.distinctFeederPaths=[...unique];
}else{
 report.status='source-incomplete-manual-review-required';
}
console.log('CFB CURRENT OFFICIAL SOURCE STATUS: '+report.status+'; '+good.length+'/3 pages parsed. No property assignment approved.');
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/cfb-farmers-branch-source-drift.json',JSON.stringify(report,null,2)+'\n');
