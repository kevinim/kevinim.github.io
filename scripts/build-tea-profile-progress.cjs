'use strict';
const fs=require('node:fs');
const path=require('node:path');
const records=require('../tea-ratings-2026.json').data;
const insights=require('../features/carrollton-school-insights.js');
const enrichment=require('../data/tea-campus-enrichment-2026.json');
const publicPeims=require('../data/tea-ethnicity-2025-26-priority.json');
const DEST=path.join(__dirname,'../data/tea-profile-progress-2026.json');
function officialCoverage(records,validPeims,accountability,staar){
  if(accountability.accountabilityYear!==2026||staar.accountabilityYear!==2026||accountability.schoolYear!=="2025-26"||staar.schoolYear!=="2025-26")throw Error("Wrong official TEA source year");
  const ids=new Set(records.map(r=>r.id)),a=accountability.campuses,s=staar.campuses;
  if(ids.size!==records.length||Object.keys(a).length!==ids.size||Object.keys(s).length!==ids.size)throw Error("Official source/inventory mismatch");
  const peims=new Map(validPeims),districts=new Map();
  const total={campuses:ids.size,domainAnyReported:0,domainAllReported:0,staarAnyReported:0,staarAllFourReported:0,scoreBasedComparisonEligible:0,staarSourceAbsent:0,public2025_26CountCampuses:0,fullRaceShareCampuses:0};
  for(const r of records){
    const d=a[r.id],t=s[r.id],dk=String(r.id).slice(0,6);
    if(!d||!t||!/^\d{9}$/.test(r.id)||d.districtId!==dk||d.overall.rating!==r.rating||d.overall.score!==r.score)throw Error("Official campus mismatch "+r.id);
    if(!districts.has(dk))districts.set(dk,{districtId:dk,name:r.districtName,campuses:0,domainAllReported:0,staarAnyReported:0,public2025_26CountCampuses:0,fullRaceShareCampuses:0});
    const group=districts.get(dk);
    const domains=["studentAchievement","schoolProgress","closingTheGaps"].filter(k=>d[k]?.status==="reported").length;
    const subjects=["reading","math","science","socialStudies"].filter(k=>t[k]?.status==="reported").length;
    const enrollment=peims.get(r.id);
    const complete=enrollment&&Object.values(enrollment.counts||{}).length===7&&Object.values(enrollment.counts).every(c=>c.status==="published");
    group.campuses++;group.domainAllReported+=Number(domains===3);group.staarAnyReported+=Number(subjects>0);
    group.public2025_26CountCampuses+=Number(!!enrollment);group.fullRaceShareCampuses+=Number(!!complete);
    total.domainAnyReported+=Number(domains>0);total.domainAllReported+=Number(domains===3);
    total.staarAnyReported+=Number(subjects>0);total.staarAllFourReported+=Number(subjects===4);
    total.scoreBasedComparisonEligible+=Number(domains===3&&subjects>0&&d.overall.rating!=="Not Rated");
    total.staarSourceAbsent+=Number(t.reading?.status==="not-in-source");
    total.public2025_26CountCampuses+=Number(!!enrollment);total.fullRaceShareCampuses+=Number(!!complete);
  }
  return {accountabilityYear:2026,schoolYear:"2025-26",sourceAccountability:"data/tea-accountability-2026-verified-batch.json",sourceStaar:"data/tea-staar-meets-2026-verified-batch.json",...total,byDistrict:[...districts.values()].sort((a,b)=>a.districtId.localeCompare(b.districtId)),caveat:"Reported source scores are not universal QA or deployment approval. Not Rated, suppressed, not-in-source and unavailable are never zero; school address is not home assignment; partial PEIMS counts do not define full-campus ethnicity percentages."};
}
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
      '2025-26 public race counts include FERPA suppressed and omitted cells; count coverage is not complete seven-race percentage coverage.',
      'Source complete for all inventory campus IDs using 2025-26 statewide aggregate; this is partial ethnicity COUNT coverage, not seven-race distribution completeness.'
    ],
    official2026:officialCoverage(records,validPeims,require('../data/tea-accountability-2026-verified-batch.json'),require('../data/tea-staar-meets-2026-verified-batch.json')),
    productionMetricSemantics:{
      reviewedOn:'2026-11-12',
      officialAcademicBatches:{state:'deployed',integrationPullRequest:264,sourceYear:'2025-26'},
      publishedPeimsCountDisplay:{state:'deployed',integrations:[264,265,266],sourceYear:'2025-26'},
      historicalManualImportCountersAreNotOfficialBatchCoverage:true,
      legacyCounters:['domainComponentsReviewed','subjectsReviewed','ethnicityReviewed','imported2026Components','imported2025_26Ethnicity'],
      label:'Legacy/manual detail counters cannot be interpreted as zero Production TEA/PEIMS coverage; use official2026 and source-specific PEIMS checks instead.'
    }
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
