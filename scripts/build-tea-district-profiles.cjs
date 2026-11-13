#!/usr/bin/env node
'use strict';
/* Reproducible, source-preserving district shards. No inferred or student-level data. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const accountability=read('data/tea-accountability-2026-verified-batch.json');
const staar=read('data/tea-staar-meets-2026-verified-batch.json');
const peims=read('data/tea-ethnicity-2025-26-priority.json');
const rating=read('tea-ratings-2026.json');
const outDir=path.join(root,'data','tea-district-profiles-2026');
const check=process.argv.includes('--check');
const sourceIds=Object.keys(accountability.campuses).sort();
if(accountability.schemaVersion!==1||staar.schemaVersion!==1||peims.schemaVersion!==1||
 accountability.accountabilityYear!==2026||staar.accountabilityYear!==2026||
 accountability.schoolYear!=='2025-26'||staar.schoolYear!=='2025-26'||peims.schoolYear!=='2025-26'||
 sourceIds.length!==2282||Object.keys(staar.campuses).length!==2282||
 Object.keys(peims.campuses).length!==2282||rating.data.length!==2282)
 throw Error('TEA / PEIMS source snapshot changed; stop until source review');
const ratingById=new Map(rating.data.map(row=>[row.id,row]));
const staarUrls=Object.fromEntries(['D1_STAAR1','D1_STAAR2','D1_STAAR3'].map(k=>[k,staar.source.groups[k].url]));
const districts=new Map();
for(const id of sourceIds){
 const row=ratingById.get(id),a=accountability.campuses[id],s=staar.campuses[id],p=peims.campuses[id];
 if(!/^\d{9}$/.test(id)||!row||!a||!s||!p||a.districtId!==id.slice(0,6)||
 p.district!==row.district||a.officialCampusName!==row.officialName||
 a.overall.rating!==row.rating||a.overall.score!==row.score)
 throw Error('Exact campus/source parity failed: '+id);
 const districtId=id.slice(0,6);
 if(!districts.has(districtId))districts.set(districtId,{});
 districts.get(districtId)[id]={accountability:a,staar:s,peims:p};
}
const generated=new Map();
for(const [districtId,campuses] of [...districts].sort(([a],[b])=>a.localeCompare(b))){
 const payload={
  schemaVersion:1,accountabilityYear:2026,schoolYear:'2025-26',districtId,
  source:{
   domainUrl:accountability.source.url,
   staarUrls,
   peimsDistrictUrl:peims.sources[districtId]||null,
   peimsStatewideUrl:peims.statewideSource
  },
  campusCount:Object.keys(campuses).length,
  campuses
 };
 const data=JSON.stringify(payload)+'\n';
 generated.set(districtId+'.json',data);
}
if(!check)fs.mkdirSync(outDir,{recursive:true});
for(const [name,data] of generated){
 const target=path.join(outDir,name);
 if(check){
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==data)throw Error('Missing or stale district shard: '+name);
 }else fs.writeFileSync(target,data,'utf8');
}
if(check){
 const actual=fs.readdirSync(outDir).filter(x=>x.endsWith('.json'));
 if(actual.length!==generated.size||actual.some(x=>!generated.has(x)))throw Error('Unexpected district shard; source review required');
}
const total=[...generated.values()].reduce((sum,s)=>sum+Buffer.byteLength(s),0);
console.log((check?'Verified':'Generated')+' TEA/STAAR/PEIMS exact campus shards: '+sourceIds.length+
 ' campuses / '+districts.size+' districts / '+total+' source JSON bytes');
