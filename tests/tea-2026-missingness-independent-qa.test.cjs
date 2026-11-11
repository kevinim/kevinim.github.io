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
