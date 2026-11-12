'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'data/tea-accountability-2026-verified-batch.json');
const subjects=path.join(root,'data/tea-staar-meets-2026-verified-batch.json');
const dest=path.join(root,'data/tea-2026-uat-progress.json');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function make(accountability,staar){
  if(accountability.accountabilityYear!==2026||staar.accountabilityYear!==2026||
    accountability.schoolYear!=='2025-26'||staar.schoolYear!=='2025-26')
    throw Error('Unexpected year');
  const ids=Object.keys(accountability.campuses);
  if(ids.length!==2282||Object.keys(staar.campuses).length!==ids.length)
    throw Error('Incomplete TEA source batches');
  const counts={campuses:ids.length,domainAllReported:0,domainAnyReported:0,subjectAnyReported:0,
    detailedRelativeComparisonEligible:0,overallNotRated:0,staarSourceRowAbsent:0};
  for(const id of ids){
    const a=accountability.campuses[id],b=staar.campuses[id];
    if(!b||!/^\d{9}$/.test(id))throw Error('STAAR ID mismatch '+id);
    const dc=['studentAchievement','schoolProgress','closingTheGaps'].filter(k=>a[k]?.status==='reported').length;
    const sc=['reading','math','science','socialStudies'].filter(k=>b[k]?.status==='reported').length;
    if(dc===3)counts.domainAllReported++;
    if(dc>0)counts.domainAnyReported++;
    if(sc>0)counts.subjectAnyReported++;
    if(dc===3&&sc>0&&a.overall.rating!=='Not Rated')counts.detailedRelativeComparisonEligible++;
    if(a.overall.rating==='Not Rated')counts.overallNotRated++;
    if(b.reading.status==='not-in-source')counts.staarSourceRowAbsent++;
  }
  return {schemaVersion:1,asOf:'2026-11-12',stage:'Production integrated (PR #264); legacy UAT filename retained for compatibility',
    productionIntegration:{status:'deployed',pullRequest:264,integrationDate:'2026-11-11',sourceYear:'2025-26'},
    inventory:'tea-ratings-2026.json',accountabilityYear:2026,schoolYear:'2025-26',
    originPullRequest:244,sources:['data/tea-accountability-2026-verified-batch.json',
      'data/tea-staar-meets-2026-verified-batch.json'],counts,
    note:'Domain scores are TEA scaled scores. Source-masked, Not Rated, blank and absent STAAR rows do not imply zero; school assignment is independent.'};
}
if(require.main===module){
  const actual=JSON.stringify(make(read(source),read(subjects)),null,2)+'\n';
  if(process.argv.includes('--check')){
    if(fs.readFileSync(dest,'utf8')!==actual)throw Error('TEA academic source/prod status snapshot is stale');
    console.log('PASS TEA academic source/prod status snapshot exact official source/status parity');
  }else if(process.argv.includes('--write'))fs.writeFileSync(dest,actual);
  else process.stdout.write(actual);
}
module.exports={make};
