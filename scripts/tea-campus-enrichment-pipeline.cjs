'use strict';
/**
 * Official TEA campus CSV intake. No network / browser calls.
 *
 * Source inputs are PRIVACY-SAFE, campus-aggregate CSVs normalized to the
 * header contract in docs/TEA_PROFILE_PIPELINE.md. Do not feed TEA student
 * listings, names, birth dates, IDs, or individual assessment records.
 *
 * Usage: node scripts/tea-campus-enrichment-pipeline.cjs \
 *   --components path/to/tea-components-normalized.csv \
 *   --component-source https://rptsvr1.tea.texas.gov/perfreport/account/acct_download?year=2026 \
 *   --enrollment path/to/peims-enrollment-normalized.csv \
 *   --enrollment-source https://rptsvr1.tea.texas.gov/adhocrpt/adste.html \
 *   --output data/tea-campus-enrichment-2026.json
 *
 * Do not normalize unknown TEA columns by assumption: compare actual official
 * export variable definitions before preparing the input.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const RATINGS=require('../tea-ratings-2026.json');
const RACES=['black','hispanic','white','native','asian','pacific','multi'];
const SUBJECTS={reading:'reading_meets',math:'math_meets',science:'science_meets',social:'social_studies_meets'};
const DOMAIN_COLS={achievement:'student_achievement',progress:'school_progress',gaps:'closing_gaps'};
const OFFICIAL_HOSTS=new Set(['rptsvr1.tea.texas.gov','tea.texas.gov','tea2.tea.texas.gov','txschools.gov']);
const MASKS=new Set(['-999','-9999999','N/A','NA','*','--','SUPPRESSED','MASKED','']);
const RATING_IDS=new Set(RATINGS.data.map(r=>r.id));

function requireOfficialSource(source){
  let u;try{u=new URL(source)}catch{throw Error('Official source must be a valid https URL');}
  if(u.protocol!=='https:' || !OFFICIAL_HOSTS.has(u.hostname))throw Error('Only official TEA source URLs are permitted: '+u.hostname);
  return u.toString();
}
function parseCsv(text){
  if(typeof text!=='string'||text.length>80000000)throw Error('CSV invalid or too large');
  const lines=[];let current=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){field+='"';i++;}
      else if(!quoted && field==='')quoted=true;
      else if(quoted)quoted=false;
      else throw Error('Unexpected CSV quotation');
    }else if(!quoted&&(c===','||c==='\r'||c==='\n')){
      if(c===','){current.push(field);field='';continue;}
      current.push(field);field='';
      if(current.some(v=>v.trim()))lines.push(current);
      current=[];
      if(c==='\r'&&text[i+1]==='\n')i++;
    }else field+=c;
  }
  if(quoted)throw Error('Unterminated CSV quote');
  current.push(field);
  if(current.some(v=>v.trim()))lines.push(current);
  if(!lines.length)throw Error('Empty CSV');
  const [columns,...body]=lines;
  const headers=columns.map(v=>v.trim().toLowerCase());
  if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV header');
  if(headers.some(v=>/(^|_)(student_id|first_name|last_name|birth|date_of_birth|dob|tsds|ssn|local_id)(_|$)/i.test(v)))
    throw Error('Student-level identifiers are prohibited in the intake');
  return body.map((values,i)=>{
    if(values.length!==headers.length)throw Error('CSV row '+(i+2)+' has '+values.length+' fields, expected '+headers.length);
    return Object.fromEntries(headers.map((k,j)=>[k,values[j].trim()]));
  });
}
function requireColumns(rows,columns){
  if(!rows.length)throw Error('No campus rows');
  for(const col of columns)if(!(col in rows[0]))throw Error('Missing normalized column '+col);
}
function count(value,name){
  if(MASKS.has(String(value).trim().toUpperCase()))return null;
  if(!/^\d+$/.test(String(value)))throw Error(name+' invalid non-negative integer: '+value);
  const n=Number(value);
  if(!Number.isSafeInteger(n))throw Error(name+' count unsafe');
  return n;
}
function score(value,name){
  if(MASKS.has(String(value).trim().toUpperCase()))return null;
  if(!/^\d+(\.\d+)?$/.test(String(value)))throw Error(name+' invalid score');
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>100)throw Error(name+' must be from 0 to 100');
  return n;
}
function validateCampus(raw){
  if(!/^\d{9}$/.test(raw))throw Error('Campus ID must be nine digits, including leading zeros');
  if(!RATING_IDS.has(raw))throw Error('Campus ID not in current 2026 dashboard inventory: '+raw);
  return raw;
}
function enrollmentRows(rows,source,year){
  requireColumns(rows,['campus_id','enrollment',...RACES]);
  const url=requireOfficialSource(source),result={},seen=new Set();
  for(const row of rows){
    const id=validateCampus(row.campus_id);
    if(seen.has(id))throw Error('Duplicate PEIMS campus '+id);
    seen.add(id);
    const total=count(row.enrollment,'enrollment');
    const values={};
    for(const race of RACES)values[race]=count(row[race],race);
    // A masked campus must remain missing (never estimate the hidden count).
    if(total===null || total===0 || Object.values(values).some(v=>v===null)){
      result[id]={demographicsStatus:'suppressed-or-unavailable'};
      continue;
    }
    const sum=Object.values(values).reduce((a,b)=>a+b,0);
    if(sum!==total)throw Error('PEIMS ethnicity total does not equal campus enrollment for '+id);
    const pct={};
    for(const race of RACES)pct[race]=Math.round(values[race]*1000/total)/10;
    result[id]={demographics:{
      year,document:'TEA PEIMS Student Enrollment Reports',enrollment:total,
      src:url,race:pct
    }};
  }
  return result;
}
function componentRows(rows,source){
  requireColumns(rows,['campus_id',...Object.values(DOMAIN_COLS)]);
  const url=requireOfficialSource(source),result={},seen=new Set();
  for(const row of rows){
    const id=validateCampus(row.campus_id);
    if(seen.has(id))throw Error('Duplicate component campus '+id);
    seen.add(id);
    const domains={};
    for(const [key,col] of Object.entries(DOMAIN_COLS))domains[key]=score(row[col],col);
    if(Object.values(domains).every(v=>v!==null))result[id]={domains,domainsSource:url};
    else result[id]={domainsStatus:'masked-or-unavailable'};
    const subjects={};
    for(const [key,col] of Object.entries(SUBJECTS)){
      if(Object.hasOwn(row,col)){
        const n=score(row[col],col);
        if(n!==null)subjects[key]=n;
      }
    }
    if(Object.keys(subjects).length)result[id].subjects=subjects;
  }
  return result;
}
function build({components=[],enrollment=[],componentSource,ethnicitySource,year='2025–26',previous={}}){
  if(!/^\d{4}[–-]\d{2}$/.test(year))throw Error('School year must be YYYY–YY');
  if(components.length && !componentSource)throw Error('2026 component report URL required');
  if(enrollment.length && !ethnicitySource)throw Error('PEIMS enrollment source URL required');
  const additions=new Map();
  if(components.length)for(const [id,v] of Object.entries(componentRows(components,componentSource)))additions.set(id,{...v});
  if(enrollment.length)for(const [id,v] of Object.entries(enrollmentRows(enrollment,ethnicitySource,year)))additions.set(id,{...additions.get(id),...v});
  const prior=previous.campuses||{};
  for(const id of Object.keys(prior))validateCampus(id);
  const combined={...prior};
  for(const [id,v] of additions){
    const old=combined[id]||{};
    const cleaned={...old,...v};
    if(v.domainsStatus)delete cleaned.domains;
    if(v.demographicsStatus)delete cleaned.demographics;
    combined[id]=cleaned;
  }
  const campuses=Object.fromEntries(Object.entries(combined).sort((a,b)=>a[0].localeCompare(b[0])));
  return {
    schemaVersion:1,
    accountabilityYear:2026,
    schoolYear:year,
    sources:{
      accountability:'https://rptsvr1.tea.texas.gov/perfreport/account/acct_download?year=2026',
      enrollment:'https://rptsvr1.tea.texas.gov/adhocrpt/adste.html'
    },
    campuses
  };
}
function coverage(data){
  const groups={};
  const camps=data.campuses||{};
  const all=RATINGS.data;
  const defaultSummary={allSchools:all.length,with2026Rating:0,withDomainComponents:0,withSubjectMetrics:0,withVerifiedEthnicity:0,notRated:0};
  for(const r of all){
    const p=r.district;
    const group=groups[p] ||= {...defaultSummary,allSchools:0};
    group.allSchools++;
    const e=camps[r.id]||{};
    if(['A','B','C','D','F'].includes(r.rating)){defaultSummary.with2026Rating++;group.with2026Rating++;}
    else{defaultSummary.notRated++;group.notRated++;}
    if(e.domains){defaultSummary.withDomainComponents++;group.withDomainComponents++;}
    if(e.subjects){defaultSummary.withSubjectMetrics++;group.withSubjectMetrics++;}
    if(e.demographics){defaultSummary.withVerifiedEthnicity++;group.withVerifiedEthnicity++;}
  }
  return {inventory:'tea-ratings-2026.json',year:2026,summary:defaultSummary,byDistrict:groups};
}
function runCli(argv){
  const args={};
  for(let i=0;i<argv.length;i++){
    if(!/^--[a-z-]+$/.test(argv[i]))throw Error('Invalid option '+argv[i]);
    if(args[argv[i]])throw Error('Duplicate option '+argv[i]);
    args[argv[i]]=argv[++i];
  }
  if(!args['--output'])throw Error('--output is required');
  const oldPath=path.resolve(ROOT,'data/tea-campus-enrichment-2026.json');
  const previous=JSON.parse(fs.readFileSync(oldPath,'utf8'));
  const components=args['--components']?parseCsv(fs.readFileSync(args['--components'],'utf8')):[];
  const enrollment=args['--enrollment']?parseCsv(fs.readFileSync(args['--enrollment'],'utf8')):[];
  if(!components.length && !enrollment.length)throw Error('Supply at least one official campus aggregate CSV');
  const data=build({components,enrollment,componentSource:args['--component-source'],ethnicitySource:args['--enrollment-source'],year:args['--year']||'2025–26',previous});
  const output=path.resolve(args['--output']);
  const text=JSON.stringify(data,null,2)+'\n';
  if(args['--write']!=='yes'){
    process.stdout.write('DRY-RUN '+JSON.stringify(coverage(data).summary)+'; add --write yes to publish verified aggregates\n');
    return;
  }
  fs.writeFileSync(output,text);
  process.stdout.write('Written '+output+' '+crypto.createHash('sha256').update(text).digest('hex')+'\n');
}
if(require.main===module){
  try{runCli(process.argv.slice(2));}catch(e){console.error('TEA pipeline rejected input: '+e.message);process.exitCode=1;}
}
module.exports={parseCsv,componentRows,enrollmentRows,build,coverage,RACES,requireOfficialSource};
