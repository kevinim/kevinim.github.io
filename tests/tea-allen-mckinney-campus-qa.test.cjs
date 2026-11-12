'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const batch = require('../data/tea-allen-mckinney-campus-qa-2026.json');
const source = require('../data/tea-allen-mckinney-academics-2026-source.json');
const enrollmentSource = require('../data/tea-allen-mckinney-enrollment-2025-26-source.json');
const catalog = require('../tea-ratings-2026.json').data;
const categories = ['black', 'hispanic', 'white', 'native', 'asian', 'pacific', 'multi'];
const subjects = ['reading', 'math', 'science', 'socialStudies'];
const campusIds = Object.keys(batch.campuses).sort();
const earlierChecked = new Set(['043901001', '043907002']);
const official = new Map(catalog.map(r => [r.id, r]));

function checkReportUrl(raw, id, type) {
  const u = new URL(raw);
  assert.equal(u.hostname, 'rptsvr1.tea.texas.gov');
  assert.equal(u.searchParams.get('id'), id);
  assert.equal(u.searchParams.get('ccyy'), '2026');
  assert.equal(u.searchParams.get('prgopt'), 'reports/acct/' + type + '.sas');
}
function pct(x) { return x === null || (Number.isInteger(x) && x >= 0 && x <= 100); }
function domain(x) { return x === null || (Number.isInteger(x) && x >= 0 && x <= 100); }

test('56 current official campus IDs: Allen 23, McKinney 33; 54 newly sourced and 2 previously sourced', () => {
  const expected = catalog.filter(r => /^04390(?:1|7)\d{3}$/.test(r.id)).map(r => r.id).sort();
  assert.deepEqual(campusIds, expected);
  assert.equal(campusIds.length, 56);
  assert.equal(campusIds.filter(id => id.startsWith('043901')).length, 23);
  assert.equal(campusIds.filter(id => id.startsWith('043907')).length, 33);
  const sourceIds = Object.keys(source.rows).sort();
  assert.equal(sourceIds.length, 54);
  assert.deepEqual(sourceIds, campusIds.filter(id => !earlierChecked.has(id)));
  assert.equal(source.accountabilityYear, 2026);
});

test('2025–26 PEIMS privacy masks and absent categories remain unavailable, not zero', () => {
  const tally = { published: 0, suppressed: 0, 'not-listed': 0 };
  let complete = 0;
  for (const [id, c] of Object.entries(batch.campuses)) {
    assert.match(id, /^\d{9}$/);
    assert.equal(c.districtId, id.slice(0, 6));
    assert.equal(c.peims.schoolYear, '2025-26');
    const totalRow = enrollmentSource.rows[id];
    assert.ok(totalRow);
    assert.equal(c.peims.enrollment, totalRow.status === 'published' ? totalRow.count : null);
    assert.equal(c.peims.enrollmentStatus, totalRow.status);
    if (totalRow.status === 'suppressed') assert.equal(c.peims.percentages, null);
    assert.equal(new URL(c.peims.source).hostname, 'rptsvr1.tea.texas.gov');
    assert.deepEqual(Object.keys(c.peims.counts).sort(), [...categories].sort());
    const cells = Object.values(c.peims.counts);
    if (cells.every(c => c.status === 'published')) complete++;
    for (const cell of cells) {
      assert.ok(Object.hasOwn(tally, cell.status));
      tally[cell.status]++;
      if (cell.status === 'published') {
        assert.ok(Number.isSafeInteger(cell.count) && cell.count >= 0);
        assert.equal(cell.publishedMask, undefined);
      } else if (cell.status === 'suppressed') {
        assert.match(cell.publishedMask, /^<\d+$/);
        assert.equal(cell.count, undefined);
      } else {
        assert.equal(cell.count, undefined);
        assert.equal(cell.publishedMask, undefined);
      }
    }
  }
  assert.deepEqual(tally, { published: 240, suppressed: 102, 'not-listed': 50 });
  assert.equal(complete, 1);
});

test('2026 official published ratings agree with catalog; 50 academic data profiles, 4 Not Rated, 2 paired', () => {
  let rated = 0, notRated = 0, paired = 0, fullDomains = 0, staarReports = 0, ready = 0;
  for (const [id, c] of Object.entries(batch.campuses)) {
    const old = official.get(id);
    assert.ok(old);
    assert.equal(c.accountability.rating, old.rating);
    assert.equal(c.accountability.score, old.score);
    assert.equal(c.accountability.verification, '2026-official-campus-summary-source-crosschecked');
    checkReportUrl(c.accountability.source, id, 'summary');
    if (c.accountability.rating === 'Not Rated') {
      notRated++;
      assert.equal(c.accountability.score, null);
    } else rated++;
    if (c.accountability.pairedWith) paired++;
    if (c.domains.status === 'official-verified') fullDomains++;
    if (c.staar.status === 'official-verified') staarReports++;
    if (c.domains.status === 'official-verified' && c.staar.status === 'official-verified') ready++;
    assert.equal(c.domains.year, 2026);
    assert.equal(c.staar.year, 2026);
    checkReportUrl(c.domains.source, id, 'summary');
    checkReportUrl(c.staar.source, id, 'domain1a');
    assert.equal(c.staar.metric, 'All Students — percent of tests at Meets Grade Level standard or above');
    for (const field of subjects) assert.ok(pct(c.staar[field]), id + ' ' + field);
    for (const field of ['studentAchievement', 'schoolProgress', 'closingTheGaps']) {
      assert.ok(domain(c.domains[field]), id + ' ' + field);
    }
    if (c.domains.status === 'official-verified') {
      assert.equal(c.domains.scoreType, 'official-scaled-accountability-domain-scores');
      for (const field of ['studentAchievement', 'schoolProgress', 'closingTheGaps']) {
        assert.ok(Number.isInteger(c.domains[field]), id + ' ' + field);
      }
      assert.ok(Number.isInteger(c.domains.closingTheGapsUnscaledComponent));
    } else {
      assert.equal(c.domains.status, 'official-not-reported');
      assert.equal(c.domains.studentAchievement, null);
      assert.equal(c.domains.schoolProgress, null);
      assert.equal(c.domains.closingTheGaps, null);
    }
    if (c.staar.status === 'official-not-reported') {
      assert.ok(subjects.every(k => c.staar[k] === null));
      assert.deepEqual(c.analysis.strengths, []);
      assert.deepEqual(c.analysis.improvementAreas, []);
    } else {
      assert.equal(c.staar.status, 'official-verified');
      assert.ok(subjects.some(k => Number.isInteger(c.staar[k])));
      assert.equal(c.analysis.status, 'score-backed-noncausal');
      assert.ok(c.analysis.strengths.length > 0);
      assert.ok(c.analysis.improvementAreas.length > 0);
    }
  }
  assert.deepEqual({rated, notRated, paired, fullDomains, staarReports, ready},
    {rated: 52, notRated: 4, paired: 2, fullDomains: 50, staarReports: 50, ready: 50});
  assert.equal(batch.summary.official2026ReportsReviewed, 56);
  assert.equal(batch.summary.newlyAcademicSourceVerified, 50);
  assert.equal(batch.summary.readyForUatAcademicProfiles, 50);
  assert.equal(batch.summary.awaiting2026ComponentsAndStaar, 0);
  assert.equal(batch.summary.fullyAuditedProfiles, 1);
  assert.equal(batch.summary.official2026UnreportedAcademicComponents, 6);
});

test('54 official campus reports reproduce the stored domains, STAAR subjects and sources', () => {
  for (const [id, row] of Object.entries(source.rows)) {
    const c = batch.campuses[id];
    assert.ok(c);
    assert.equal(row.year, 2026);
    assert.equal(c.accountability.source, row.summary.source);
    assert.equal(c.accountability.rating, row.summary.rating);
    assert.equal(c.accountability.score, row.summary.score);
    assert.equal(c.domains.studentAchievement, row.summary.studentAchievement);
    assert.equal(c.domains.schoolProgress, row.summary.schoolProgress);
    assert.equal(c.domains.closingTheGaps, row.summary.closingTheGaps);
    assert.equal(c.domains.closingTheGapsUnscaledComponent, row.summary.closingTheGapsUnscaledComponent);
    assert.equal(c.staar.source, row.staar.source);
    for (const s of subjects) assert.equal(c.staar[s], row.staar[s]);
    checkReportUrl(row.summary.source, id, 'summary');
    checkReportUrl(row.staar.source, id, 'domain1a');
    const reported = subjects.filter(k => Number.isInteger(row.staar[k]));
    if (reported.length >= 2) {
      const max = Math.max(...reported.map(k => row.staar[k]));
      const min = Math.min(...reported.map(k => row.staar[k]));
      assert.equal(c.analysis.strengths.length, reported.filter(k => row.staar[k] === max).length);
      assert.equal(c.analysis.improvementAreas.length, reported.filter(k => row.staar[k] === min).length);
    }
  }
});

test('paired schools and alternative programs are labeled, not treated as failed schools', () => {
  const a = batch.campuses['043901201'];
  const m = batch.campuses['043907125'];
  assert.deepEqual(a.accountability.pairedWith, {type:'district', id:'043901', name:'ALLEN ISD'});
  assert.deepEqual(m.accountability.pairedWith, {type:'campus', id:'043907115', name:'ROY LEE WALKER EL'});
  assert.equal(a.accountability.rating, 'A');
  assert.equal(m.accountability.rating, 'A');
  assert.equal(a.domains.status, 'official-not-reported');
  assert.equal(m.staar.status, 'official-not-reported');
  for (const id of ['043901003','043907005','043907006','043907197']) {
    assert.equal(batch.campuses[id].accountability.rating, 'Not Rated');
    assert.equal(batch.campuses[id].accountability.score, null);
  }
  assert.equal(batch.campuses['043907005'].accountability.accountabilityProgram, 'Alternative Education Accountability');
  assert.equal(batch.campuses['043907006'].accountability.accountabilityProgram, 'Alternative Education Accountability');
});

test('official campus report sentinel values and source-backed, noncausal analyses', () => {
  const allen = batch.campuses['043901001'], mck = batch.campuses['043907002'];
  assert.deepEqual([allen.domains.studentAchievement,allen.domains.schoolProgress,allen.domains.closingTheGaps],[88,80,93]);
  assert.deepEqual([allen.staar.reading,allen.staar.math,allen.staar.science,allen.staar.socialStudies],[75,85,43,86]);
  assert.deepEqual([mck.domains.studentAchievement,mck.domains.schoolProgress,mck.domains.closingTheGaps],[93,91,94]);
  assert.deepEqual([mck.staar.reading,mck.staar.math,mck.staar.science,mck.staar.socialStudies],[61,58,72,73]);
  assert.equal(batch.campuses['043907104'].accountability.score, 57);
  assert.equal(batch.campuses['043907104'].accountability.rating, 'F');
  assert.equal(batch.campuses['043901002'].staar.reading, 86);
  assert.equal(batch.campuses['043901002'].staar.math, 60);
  assert.equal(batch.campuses['043901002'].staar.socialStudies, null);
  assert.equal(batch.campuses['043907118'].peims.counts.hispanic.count, 232);
  assert.equal(batch.campuses['043901001'].peims.counts.asian.count, 1426);
  for (const c of Object.values(batch.campuses)) {
    if (c.analysis.status === 'score-backed-noncausal') {
      assert.ok(c.analysis.strengths.every(s => s.includes('% Meets')));
      assert.ok(c.analysis.improvementAreas.every(s => s.includes('% Meets')));
    }
  }
});


test('2025–26 official Campus Total denominators yield only published category percentages', () => {
  const ids = Object.keys(enrollmentSource.rows).sort();
  assert.deepEqual(ids, campusIds);
  assert.equal(enrollmentSource.schoolYear, '2025-26');
  const suppressed = [], complete = [];
  let partial = 0;
  for (const id of campusIds) {
    const row = enrollmentSource.rows[id];
    const c = batch.campuses[id];
    const u = new URL(row.source);
    assert.equal(u.hostname, 'rptsvr1.tea.texas.gov');
    assert.equal(u.searchParams.get('endyear'), '26');
    assert.equal(u.searchParams.get('key'), id.slice(0,6));
    assert.equal(u.searchParams.get('grouping'), 'g');
    assert.equal(u.searchParams.get('selsumm'), 'ic');
    assert.equal(row.schoolYear, '2025-26');
    assert.equal(c.peims.enrollmentSource, row.source);
    if (row.status === 'suppressed') {
      suppressed.push(id);
      assert.match(row.publishedMask, /^<\d+$/);
      assert.equal(c.peims.enrollment, null);
      assert.equal(c.peims.enrollmentMask, row.publishedMask);
      assert.equal(c.peims.partialPercentages, null);
      assert.equal(c.peims.percentages, null);
      continue;
    }
    assert.equal(row.status, 'published');
    assert.ok(Number.isInteger(row.count) && row.count > 0);
    assert.equal(c.peims.enrollment, row.count);
    assert.equal(c.peims.enrollmentMask, null);
    let known = 0;
    let allPublished = true;
    for (const category of categories) {
      const cell = c.peims.counts[category];
      const pct = c.peims.partialPercentages[category];
      if (cell.status === 'published') {
        known += cell.count;
        assert.equal(pct, Math.round(cell.count * 1000 / row.count) / 10);
      } else {
        allPublished = false;
        assert.equal(pct, null, id + ' ' + category + ' cannot disclose a masked share');
      }
    }
    assert.ok(known <= row.count);
    if (allPublished) {
      assert.equal(known, row.count);
      assert.deepEqual(c.peims.percentages, c.peims.partialPercentages);
      complete.push(id);
    } else {
      assert.equal(c.peims.percentages, null);
      partial++;
    }
  }
  assert.deepEqual(suppressed, ['043901003','043907005','043907197']);
  assert.deepEqual(complete, ['043901001']);
  assert.equal(partial, 52);
  assert.equal(batch.summary.published2025_26EnrollmentTotals, 53);
  assert.equal(batch.summary.suppressed2025_26EnrollmentTotals, 3);
  assert.equal(batch.summary.completeSevenCategoryPercentProfiles, 1);
  assert.equal(batch.summary.partialPublishedPercentProfiles, 52);
  assert.equal(batch.summary.fullyAuditedProfiles, 1);
});
