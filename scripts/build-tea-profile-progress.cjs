'use strict';
const fs=require('node:fs');
const path=require('node:path');
const records=require('../tea-ratings-2026.json').data;
const insights=require('../features/carrollton-school-insights.js');
const enrichment=require('../data/tea-campus-enrichment-2026.json');
const publicPeims=require('../data/tea-ethnicity-2025-26-priority.json');
const DEST=path.join(__dirname,'../data/tea-profile-progress-2026.json');
function makeProgress(asOf){
  const entries=records.map(record=>{
    const base=insights.getSchoolInsight(record);
    const imported=enrichment.campuses[record.id]||{};
    const validDomain=insights.validDomains(imported.domains)&&
      /^https:\/\/(?:rptsvr1\.tea\.texas\.gov|tea\.texas\.gov|tea2\.tea\.texas\.gov|txschools\.gov)\//.test(imported.domainsSource||'');
    const demographic=imported.demographics||base?.demographics;
    const validRace=demographic&&insights.checkRace(demographic.race)&&
      Number.isSafeInteger(demographic.enrollment)&&demographic.enrollment>0;
    return {record,base,imported,hasDomain:!!base?.domains||validDomain,
      hasSubject:!!base?.subjects||!!imported.subjects,
      hasRace:!!validRace,
      curated:!!insights.getRecord(record.id)};
  });
  const included=new Set(records.map(r=>r.id));
  const validPeims=Object.entries(publicPeims.campuses).filter(([id,v])=>
    included.has(id)&&insights.validPublishedCampus(id,v));
  const statuses=validPeims.flatMap(([,v])=>Object.values(v.counts).map(c=>c.status));
  const publishedCells=statuses.filter(s=>s==='published').length;
  const suppressedCells=statuses.filter(s=>s==='suppressed').length;
  const unlistedCells=statuses.filter(s=>s==='not-listed').length;
  const total=entries.length;
  const byPriority=[
    {label:'Carrollton · CFB/Lewisville',codes:['CFB','LISD']},
    {label:'Allen',codes:['AISD']},
    {label:'McKinney',codes:['043907']},
    {label:'기타 DFW',codes:null}
  ].map(group=>{
    const selected=entries.filter(x=>group.codes?group.codes.includes(x.record.district):
      !['CFB','LISD','AISD','043907'].includes(x.record.district));
    return {name:group.label,campuses:selected.length,profiles:selected.filter(x=>x.base).length,
      individualAnalysis:selected.filter(x=>x.curated).length,
      domainScores:selected.filter(x=>x.hasDomain).length,
      ethnicity:selected.filter(x=>x.hasRace).length,
      public2025_26CampusCounts:selected.filter(x=>validPeims.some(([id])=>id===x.record.id)).length};
  });
  return {
    asOf,
    scope:'Current dashboard TEA campus inventory; not a census of every Texas school',
    inventoryFile:'tea-ratings-2026.json',
    totalCampuses:total,
    distinctDistricts:new Set(entries.map(x=>x.record.district)).size,
    accountabilityRatingPresent:entries.filter(x=>['A','B','C','D','F'].includes(x.record.rating)).length,
    notRated:entries.filter(x=>x.record.rating==='Not Rated').length,
    profilePanelsConnected:entries.filter(x=>x.base).length,
    individualNarratives:entries.filter(x=>x.curated).length,
    domainComponentsReviewed:entries.filter(x=>x.hasDomain).length,
    subjectsReviewed:entries.filter(x=>x.hasSubject).length,
    ethnicityReviewed:entries.filter(x=>x.hasRace).length,
    public2025_26CampusCounts:validPeims.length,
    public2025_26PublishedCells:publishedCells,
    public2025_26SuppressedCells:suppressedCells,
    public2025_26UnlistedCells:unlistedCells,
    public2025_26CompleteShares:validPeims.filter(([,v])=>Object.values(v.counts).every(c=>c.status==='published')).length,
    imported2026Components:entries.filter(x=>insights.validDomains(x.imported.domains)).length,
    imported2025_26Ethnicity:entries.filter(x=>x.imported.demographics?.year?.replace('-','–')==='2025–26').length,
    cohorts:byPriority,
    notes:[
      'Basic profile means official overall grade and exact campus ID; it is NOT complete domain analysis.',
      'Student race/ethnicity is context, not a school quality indicator.',
      'Suppressed TEA PEIMS counts are unavailable, not zero; no ZIP or district values are imputed.',
      '2025-26 public race counts include FERPA suppressed and omitted cells; count coverage is not complete seven-race percentage coverage.'
    ]
  };
}
if(require.main===module){
  const prior=JSON.parse(fs.readFileSync(DEST,'utf8'));
  const next=JSON.stringify(makeProgress(prior.asOf),null,2)+'\n';
  if(process.argv.includes('--check')){
    if(fs.readFileSync(DEST,'utf8')!==next){
      console.error('TEA coverage snapshot stale; run node scripts/build-tea-profile-progress.cjs --write');
      process.exitCode=1;
    }else console.log('PASS TEA profile progress exact source snapshot');
  }else if(process.argv.includes('--write')){
    fs.writeFileSync(DEST,next);console.log('Updated '+DEST);
  }else console.log(next);
}
module.exports={makeProgress};
