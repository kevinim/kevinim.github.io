'use strict';

// Independent QA for PR #244 source data; official membership/pairing/AEA
// crosswalk counts are separately documented, not silently inferred here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
}
const accountability = read('data/tea-accountability-2026-verified-batch.json');
const staar = read('data/tea-staar-meets-2026-verified-batch.json');
const domains = accountability.campuses;
const subjects = staar.campuses;
const idPattern = /^\d{9}$/;

test('complete exact 9-digit campus inventory and 2026 source year', () => {
  const a = Object.keys(domains).sort();
  const b = Object.keys(subjects).sort();
  assert.equal(accountability.accountabilityYear, 2026);
  assert.equal(staar.accountabilityYear, 2026);
  assert.equal(a.length, 2282);
  assert.deepEqual(b, a);
  assert(a.every(id => idPattern.test(id)));
  for (const id of a) assert.equal(domains[id].districtId, id.slice(0, 6));
});

test('preserve the published 2026 NR domain statuses, never replace with zero', () => {
  const expected = { studentAchievement: 181, schoolProgress: 200, closingTheGaps: 219 };
  for (const [domain, count] of Object.entries(expected)) {
    const actual = Object.values(domains).filter(c => c[domain].status === 'not-rated');
    assert.equal(actual.length, count, domain);
    assert(actual.every(c => c[domain].score === null));
  }
});

test('110 entire STAAR source-row absences are disjoint from privacy suppression', () => {
  const subjectsList = ['reading', 'math', 'science', 'socialStudies'];
  const noRow = Object.entries(subjects).filter(([,c]) => c.reading.status === 'not-in-source');
  assert.equal(noRow.length, 110);
  for (const [id, c] of noRow) {
    assert(subjectsList.every(s => c[s].status === 'not-in-source' && c[s].value === null), id);
    assert.equal(domains[id].closingTheGaps.status, 'not-rated', id);
  }
  for (const c of Object.values(subjects)) {
    for (const s of subjectsList) {
      const field = c[s];
      if (field.status === 'suppressed') {
        assert.equal(field.value, null);
        assert.notEqual(field.status, 'not-in-source');
      }
    }
  }
});

test('paired/linked grade is not incorrectly treated as a campus-owned domain score', () => {
  const c = domains['070912113'];
  assert.equal(c.officialCampusName, 'TURNER PREKINDERGARTEN ACADEMY');
  assert.equal(c.overall.rating, 'B');
  assert.equal(c.overall.score, 83);
  assert(['studentAchievement','schoolProgress','closingTheGaps']
    .every(k => c[k].status === 'not-rated' && c[k].score === null));
  assert(['reading','math','science','socialStudies']
    .every(k => subjects['070912113'][k].status === 'not-in-source'));
});

test('adult/dropout-recovery NR domain records do not lose legitimate reported scores', () => {
  const mesquite = domains['061806021'];
  const sanJuan = domains['061806015'];
  assert.equal(mesquite.studentAchievement.score, 92);
  assert.equal(mesquite.schoolProgress.score, 90);
  assert.equal(mesquite.closingTheGaps.status, 'not-rated');
  assert.equal(sanJuan.studentAchievement.score, 91);
  assert.equal(sanJuan.schoolProgress.status, 'not-rated');
  assert.equal(sanJuan.closingTheGaps.status, 'not-rated');
});

test('overall-rated, all-domains-NR are 67 legitimate distinct linked rating cases', () => {
  const linked = Object.values(domains).filter(c =>
    c.overall.rating !== 'Not Rated' &&
    ['studentAchievement','schoolProgress','closingTheGaps']
      .every(k => c[k].status === 'not-rated')
  );
  assert.equal(linked.length, 67);
  assert(linked.every(c => ['A','B','C','D','F'].includes(c.overall.rating)));
});


const exceptionRegister = read('data/tea-2026-staar-missing-row-qa-exceptions.json');

test('all 43 exceptional unpaired or positive-membership campus IDs reconcile to 110 absent source rows', () => {
  const zero = exceptionRegister.zeroGradeUnpaired;
  const positive = exceptionRegister.positiveGradeNoSTAAR;
  assert.equal(exceptionRegister.accountabilityYear, 2026);
  assert.equal(exceptionRegister.totals.staARowAbsent, 110);
  assert.equal(zero.length, 5);
  assert.equal(positive.length, 38);
  const tracked = [...zero, ...positive];
  const ids = new Set(tracked.map(c => c.campusId));
  assert.equal(ids.size, 43, 'campus IDs must be unique');
  for (const e of tracked) {
    assert.match(e.campusId, /^\d{9}$/);
    assert.equal(e.campusName, domains[e.campusId]?.officialCampusName, e.campusId);
    assert.equal(domains[e.campusId]?.overall.rating, 'Not Rated', e.campusId);
    assert(['reading','math','science','socialStudies']
      .every(k => subjects[e.campusId][k].status === 'not-in-source' &&
        subjects[e.campusId][k].value === null), e.campusId);
  }
  const allMissing = Object.keys(subjects).filter(id =>
    subjects[id].reading.status === 'not-in-source');
  assert.equal(allMissing.length, 110);
  const remaining = allMissing.filter(id => !ids.has(id));
  assert.equal(remaining.length, 67);
  assert(remaining.every(id => domains[id].overall.rating !== 'Not Rated'));
});

test('2026 grade-zero unpaired exceptions are documented from exact official campus reports', () => {
  const zero = exceptionRegister.zeroGradeUnpaired;
  assert.deepEqual(zero.map(x=>x.campusId), [
    '043908106','057833001','057905302','129902116','220802101']);
  assert.equal(zero.filter(x=>x.classification === 'ee-only').length, 3);
  assert.equal(zero.filter(x=>x.classification === 'charter-no-pair').length, 2);
  assert.equal(zero.filter(x=>x.officialEvidenceScope === 'campus').length, 1);
  assert.equal(zero.filter(x=>x.officialEvidenceScope === 'district-listing').length, 4);
  assert.equal(zero.find(x=>x.campusId === '057905302').officialEvidenceUrl.includes('id=057905&lev=D'), true);
  for(const x of zero) {
    assert.equal(x.grades3to12, 0);
    assert.equal(x.officialPaired, false);
    assert(x.totalEnrollment > 0);
    // A district summary may list a campus, but must never be cited as
    // that campus's own independently verified STAAR/domain report.
    const evidence = new URL(x.officialEvidenceUrl);
    assert.equal(evidence.protocol, 'https:');
    assert.equal(evidence.hostname, 'rptsvr1.tea.texas.gov');
    assert.equal(evidence.pathname, '/cgi/sas/broker');
    assert.equal(evidence.searchParams.get('ccyy'), '2026');
    const sourceId = evidence.searchParams.get('id');
    const sourceLevel = evidence.searchParams.get('lev');
    if (x.officialEvidenceScope === 'campus') {
      assert.equal(sourceLevel, 'C', x.campusId);
      assert.equal(sourceId, x.campusId, 'reject wrong-campus source');
    } else if (x.officialEvidenceScope === 'district-listing') {
      assert.equal(sourceLevel, 'D', x.campusId);
      assert.equal(sourceId, x.campusId.slice(0, 6), 'reject wrong-district source');
    } else assert.fail('Unclassified TEA source scope: ' + x.campusId);
    assert.match(x.gradeSpan, /^(EE - EE|KG - 01|KG - 02)$/);
  }
});

test('the 38 positive-enrollment cases remain explicit and are not replaced by assumed school scores', () => {
  const x = exceptionRegister.positiveGradeNoSTAAR;
  const groups = { jjaep: 19, daep: 5, 'aea-registered': 3, 'other-review': 11 };
  for (const [group, n] of Object.entries(groups))
    assert.equal(x.filter(e => e.classification === group).length, n, group);
  for(const e of x) {
    assert(Number.isInteger(e.grades3to12) && e.grades3to12 > 0);
    assert.equal(e.officialOverallRating, 'Not Rated');
    if(['aea-registered','other-review'].includes(e.classification))
      assert.equal(e.specificMissingRowReasonConfirmed, null);
  }
  assert.equal(x.filter(e=>e.grades3to12 < 10).length, 22);
});
