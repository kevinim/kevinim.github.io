'use strict';
// Independent, offline public-aggregate CSV parity check. No network, no student records.
const fs = require('node:fs');
const path = require('node:path');
const RACE = Object.freeze({
  'American Indian or Alaska Nat': 'native',
  'Asian': 'asian',
  'Black or African American': 'black',
  'Hispanic/Latino': 'hispanic',
  'Native Hawaiian/Other Pacific': 'pacific',
  'Two or more races': 'multi',
  'White': 'white'
});
const GROUPS=Object.freeze(Object.values(RACE));
function fail(message){throw new Error(message);}
function parseCsv(csv){
  if(typeof csv!=='string') fail('CSV input must be UTF-8 text');
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<csv.length;i++){
    const c=csv[i];
    if(c==='"'){
      if(quoted&&csv[i+1]==='"'){field+='"';i++}else quoted=!quoted;
    }else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\r'||c==='\n')&&!quoted){
      if(c==='\r'&&csv[i+1]==='\n')i++;
      row.push(field); if(row.some(x=>x.trim())) rows.push(row);
      row=[];field='';
    }else field+=c;
  }
  if(quoted) fail('Unclosed CSV quoted field');
  row.push(field);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
function sourceCheck(url,districtId){
  let u;try{u=new URL(url)}catch{fail('Invalid TEA official source URL')}
  if(u.protocol!=='https:'||u.hostname!=='rptsvr1.tea.texas.gov'||u.pathname!=='/cgi/sas/broker')fail('Source is not exact TEA HTTPS host/path');
  for(const [k,v] of Object.entries({_service:'marykay',_program:'adhoc.addispatch.sas',endyear:'26',major:'st',minor:'e',format:'c',selsumm:'ic',grouping:'e',loop:'2',key:districtId})){
    if(u.searchParams.get(k)!==v)fail('Official source parameter mismatch: '+k);
  }
  return true;
}
function verifyCohort(dataset, cohort, sourceText){
  if(dataset.schoolYear!=='2025-26')fail('Wrong staging schoolYear');
  if(!/^\d{6}$/.test(cohort.districtId)||!cohort.alias)fail('Invalid manifest district');
  sourceCheck(cohort.sourceUrl,cohort.districtId);
  if(dataset.sources?.[cohort.alias]!==cohort.sourceUrl)fail('Staging official source differs from verified URL '+cohort.alias);
  const rows=parseCsv(sourceText), headerIndex=rows.findIndex(r=>r[0]==='YEAR'&&r.includes('CAMPUS')&&r.includes('ETHNICITY')&&r.includes('ENROLLMENT'));
  if(headerIndex<0)fail('Official TEA CSV header not found');
  const h=rows[headerIndex],idx=Object.fromEntries(h.map((v,i)=>[v,i]));
  for(const k of ['YEAR','DISTRICT','CAMPUS','CAMPUS NAME','ETHNICITY','ENROLLMENT'])if(!Number.isInteger(idx[k]))fail('Missing TEA header '+k);
  const official=new Map();let sourceRows=0,sourcePublished=0,sourceMasked=0;
  for(const row of rows.slice(headerIndex+1)){
    if(row.length!==h.length)fail('Invalid source number of CSV fields');
    if(row[idx.YEAR]!=='2025-2026')fail('Unexpected raw PEIMS school year '+row[idx.YEAR]);
    const id=row[idx.CAMPUS], district=row[idx.DISTRICT], category=RACE[row[idx.ETHNICITY]],v=row[idx.ENROLLMENT];
    if(!/^\d{9}$/.test(id)||district!==cohort.districtId||!id.startsWith(district))fail('Raw campus ID/district mismatch '+id);
    if(!category)fail('Unknown official ethnicity category for '+id+': '+row[idx.ETHNICITY]);
    if(!/^\d+$/.test(v)&&!/^<\d+$/.test(v)&&!['-999','N/A'].includes(v))fail('Invalid raw source count/mask: '+id+' '+v);
    if(!official.has(id))official.set(id,new Map());
    if(official.get(id).has(category))fail('Duplicate source campus/category '+id+'/'+category);
    official.get(id).set(category,v);
    sourceRows++;if(/^\d+$/.test(v))sourcePublished++;else sourceMasked++;
  }
  const staged=Object.entries(dataset.campuses||{}).filter(([id,c])=>c.district===cohort.alias);
  if(staged.length!==cohort.campuses)fail('Staging cohort size changed for '+cohort.alias+': '+staged.length);
  if(official.size!==staged.length)fail('Raw/staging campus coverage differs for '+cohort.alias);
  const errors=[];let omitted=0;
  for(const [id,c] of staged){
    const raw=official.get(id);
    if(!raw){errors.push(id+': campus missing in TEA raw');continue}
    for(const key of GROUPS){
      const v=raw.get(key), cell=c.counts?.[key];
      if(!cell){errors.push(id+': missing staging category '+key);continue}
      if(v===undefined){omitted++;if(cell.status!=='not-listed'||Object.hasOwn(cell,'count')||Object.hasOwn(cell,'publishedMask'))errors.push(id+'/'+key+': absent raw is not-listed, not zero');}
      else if(/^\d+$/.test(v)){if(cell.status!=='published'||cell.count!==Number(v)||Object.hasOwn(cell,'publishedMask'))errors.push(id+'/'+key+': published count discrepancy');}
      else if(cell.status!=='suppressed'||cell.publishedMask!==v||Object.hasOwn(cell,'count'))errors.push(id+'/'+key+': suppression mismatch or count inference');
    }
  }
  for(const id of official.keys())if(!dataset.campuses?.[id]||dataset.campuses[id].district!==cohort.alias)errors.push(id+': unexpected raw campus');
  if(errors.length)fail('TEA original-source parity failed: '+errors.slice(0,8).join('; ')+' (total '+errors.length+')');
  if(cohort.sourceRows!==sourceRows)fail('Official CSV source-row count changed: '+sourceRows+' != '+cohort.sourceRows);
  return {cohort:cohort.alias,campuses:official.size,rows:sourceRows,published:sourcePublished,suppressed:sourceMasked,notListed:omitted,exactMatch:true};
}
function runCli(argv){
  const opt={};for(let i=0;i<argv.length;i+=2){if(!/^--(?:dataset|manifest|csv-dir)$/.test(argv[i])||!argv[i+1])fail('Usage: node qa/tea-peims-raw-parity.cjs --dataset staged.json --manifest evidence.json --csv-dir directory');opt[argv[i].slice(2)]=argv[i+1]}
  for(const k of ['dataset','manifest','csv-dir'])if(!opt[k])fail('Missing --'+k);
  const dataset=JSON.parse(fs.readFileSync(opt.dataset,'utf8'));
  const manifest=JSON.parse(fs.readFileSync(opt.manifest,'utf8'));
  const results=manifest.cohorts.map(cohort=>{
    if(typeof cohort.csvFilename!=='string'||path.basename(cohort.csvFilename)!==cohort.csvFilename)fail('Unsafe CSV filename in manifest');
    return verifyCohort(dataset,cohort,fs.readFileSync(path.join(opt['csv-dir'],cohort.csvFilename),'utf8'));
  });
  console.log(JSON.stringify({verifiedSchoolYear:'2025-26',sourceRevision:manifest.auditedHeadSha,cohorts:results,totalCampuses:results.reduce((n,r)=>n+r.campuses,0),totalRows:results.reduce((n,r)=>n+r.rows,0)},null,2));
}
if(require.main===module){try{runCli(process.argv.slice(2))}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={parseCsv,sourceCheck,verifyCohort,RACE,GROUPS};
