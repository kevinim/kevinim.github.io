#!/usr/bin/env node
'use strict';
// AG04 independent, bounded live browser smoke. 2 pre-existing PUBLIC fixture
// addresses only; no broad queries, private API, address collection or screenshots.
// Report intentionally contains neither addresses nor school names.
// CI live smoke verifies Finder current UI only, NEVER geometry or school-year.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const source = require('../tests/cfb-official-resident-finder-verified-2026-11-07.json');
const dest = path.join(process.cwd(),'artifacts/cfb-ag04/independent-live-finder-redacted.json');
const FINDER = 'https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/';
const GRADES = ['elementary','middle','high'];

function norm(x) {
  return String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
function observedAssignedSchools(bodyText) {
  // Context must explicitly say 'Assigned school' after the campus name.
  // A Matching Results school directory is not evidence.
  const lines = String(bodyText||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const names = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === 'Assigned school' && !names.includes(lines[i-1])) names.push(lines[i-1]);
  }
  return {
    elementary: names.filter(x=>/Elementary \(K-5\)/i.test(x) && !/Bilingual/i.test(x)),
    middle: names.filter(x=>/Middle School \(6-8\)/i.test(x) && !/Bilingual/i.test(x)),
    high: names.filter(x=>/High School \(9-12\)/i.test(x) && !/Bilingual/i.test(x))
  };
}
async function selectNativeCandidate(page, fixture, result) {
  const addressField = page.locator('.address_input input[type="text"]').first();
  await addressField.waitFor({state:'visible',timeout:25000});
  const candidates = page.locator('.address_input .search_result_container .search_result');
  const want = norm(fixture.candidateSelected);
  const search = async (typed,delay) => {
    await addressField.fill('');
    await addressField.pressSequentially(typed,{delay});
    await page.waitForTimeout(1700);
    const names = await candidates.allInnerTexts();
    const idx = names.findIndex(s=>norm(s) === want);
    return {idx,count:names.length};
  };
  let match = await search(fixture.address.split(',')[0],45);
  if (match.idx < 0) match = await search(fixture.address,30);
  result.autocompleteChoices = match.count;
  if (match.idx < 0) return false;
  await candidates.nth(match.idx).click({timeout:16000});
  result.exactNativeCandidateSelected = true;
  return true;
}
async function oneCase(browser, fixture, index) {
  const result = {
    id: 'PUBLIC-' + String(index+1), assetType: fixture.type,
    exactNativeCandidateSelected: false, finderSchoolYear: 'NOT_INFERRED_FROM_CURRENT_URL',
    state: 'WARNING', cause: 'FINDER', failurePhase: null,
    gradeResults: Object.fromEntries(GRADES.map(g=>[g,'NOT_OBSERVED']))
  };
  const context = await browser.newContext({viewport:{width:1366,height:900},locale:'en-US'});
  const page = await context.newPage();
  try {
    result.failurePhase = 'load_official_website';
    await page.goto(FINDER,{waitUntil:'domcontentloaded',timeout:65000});
    result.failurePhase = 'native_autocomplete';
    if (!await selectNativeCandidate(page,fixture,result)) {
      result.cause = 'ADDRESS';
      result.failurePhase = 'NO_EXACT_NATIVE_AUTOCOMPLETE_SELECTION';
      return result;
    }
    result.failurePhase = 'assigned_school_label';
    await page.waitForFunction(
      () => document.body && document.body.innerText.includes('Assigned school'),
      null,{timeout:20000}
    );
    const assigned = observedAssignedSchools(await page.locator('body').innerText());
    for(const grade of GRADES) {
      const names = assigned[grade], expected = fixture.assigned[grade];
      result.gradeResults[grade] = names.length !== 1 ?
        'WARNING_NOT_EXACTLY_ONE_ASSIGNED_SCHOOL' :
        norm(names[0]) === norm(expected) ? 'PASS' : 'FAIL_NAME_CHANGED';
    }
    const status = Object.values(result.gradeResults);
    result.state = status.every(x=>x==='PASS') ? 'PASS' :
      status.some(x=>x==='FAIL_NAME_CHANGED') ? 'FAIL' : 'WARNING';
    result.cause = result.state === 'PASS' ? 'NONE' :
      result.state === 'FAIL' ? 'FINDER' : 'FINDER_INCOMPLETE';
    result.failurePhase = null;
  } catch(err) {
    result.failurePhase = result.failurePhase || 'unknown';
    result.errorClass = err?.name || 'Error'; // NEVER save raw provider DOM
    result.state = 'WARNING';
  } finally {
    await context.close();
  }
  return result;
}
async function main() {
  if (source.district!=='CFB' || source.samples.length!==2) {
    throw Error('EXACT_TWO_PREEXISTING_PUBLIC_FIXTURES_REQUIRED');
  }
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  const rows = [];
  try {
    // Always continue after a broken/uncertain case.
    for(let i=0;i<source.samples.length;i++) {
      rows.push(await oneCase(browser,source.samples[i],i));
    }
  } finally {await browser.close()}
  const grades = Object.fromEntries(GRADES.map(g=>[g,{
    pass: rows.filter(x=>x.gradeResults[g]==='PASS').length,
    fail: rows.filter(x=>x.gradeResults[g]==='FAIL_NAME_CHANGED').length,
    warning: rows.filter(x=>x.gradeResults[g]!=='PASS' && x.gradeResults[g]!=='FAIL_NAME_CHANGED').length
  }]));
  const report = {
    district:'CFB', checkedAt:new Date().toISOString(),
    status:'INDEPENDENT_LIVE_FINDER_PUBLIC_PROPERTY_RECHECK_ONLY',
    testPropertyCount:rows.length,exactNativeAddressSelections:rows.filter(x=>x.exactNativeCandidateSelected).length,
    finderPassProperties:rows.filter(x=>x.state==='PASS').length,
    gradeResults:grades, schoolYearCertified:false, geometryChecked:false,
    residenceUnitAssignmentCertified:false, autoResidenceAssignmentApproved:false,
    samples:rows
  };
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
  process.stdout.write('CFB_AG04_INDEPENDENT_LIVE '+JSON.stringify(report)+'\n');
  if (report.finderPassProperties!==2) process.exitCode=2;
}
main().catch(err => {
  console.error('CFB_AG04_LIVE_FATAL', err?.name || 'Error');
  process.exitCode=1;
});
