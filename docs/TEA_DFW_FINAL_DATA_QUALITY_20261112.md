# DFW school data quality — final cross-file reconciliation (2026-11-12)

## Decision and scope

**PASS_WITH_KNOWN_LIMITATIONS for published TEA 2026 campus academic scores and PEIMS 2025–26 published-only race/ethnicity counts.**
**NO-GO for certifying any household's assigned school or a physically complete DFW campus denominator from these administrative source files.**
**NO-GO for whole-school seven-group ethnicity proportions at any campus with masked or unlisted cells.**

This is a **no-new-source, no-PII offline verification** of the existing dashboard datasets and 2026-11-11 original TEA CSV independent source audits. A CI pass does not prove upstream sources have not changed since Nov 11, or certify that an official district street-address Finder will answer for every house. Campus IDs are public nine-digit TEA codes, not student IDs.

### Final measured quality

| Gate | Result | Meaning |
| --- | --- | --- |
| Inventory ↔ 2026 official accountability | 2,282 / 2,282 | Exact campus ID, district code, official overall grade/score, 2025–26 source year |
| All three scaled 2026 academic domains reported | 2,063 / 2,282 (90.4%) | Official published *per-campus* scores, not any student-specific results |
| Any 2025–26 STAAR All Students Meets subject reported | 2,105 / 2,282 (92.2%) | Missing/suppressed subjects remain unavailable, never 0 |
| Entire four-subject STAAR source row absent | 110 / 2,282 | 67 paired-rated records, five other zero-tested-grade no-pair cases, 38 positive-tested-grade special settings |
| Positive-tested-grade STAAR no-row **individual cause unconfirmed** | **14** | 3 AEA + 11 other setting; official program/AEA label does not prove a source-row exclusion code |
| Independent official PEIMS 2025–26 ethnicity CSV parity | **15,974 / 15,974 cells matched**, 0 observed mismatches | TEA original as checked Nov 11; 8,277 published, 5,141 source masked, 2,556 not listed |
| Independent published PEIMS campus denominator | 2,126 / 2,282 gender totals publicly countable | **Cannot** infer protected racial-subgroup values by subtraction |
| Fully public seven ethnicity cells + same-source published denominator | **6 / 2,282** | Other 2,276 show only published category counts/partial published-only ratios, not complete school composition |
| DFW 11-county administrative-county proxy | 2,182 TEA rows | **Not** a geocoded count of physical schools inside the area |
| Verified public ISD official parent route | 107 / 108 | A school district website's official route is **not** automatically a current school-zone GIS source |
| TexasWorks 41 source operator-address localities | 6 operator-local / 34 operator-nonlocal / **1 ID-name pending** | Operator city/ZIP is a source candidate, not independently certified building coordinate, district attendance, or current operation |

### Geographic and current operational safeguards

- TexasWorks campus TEA ID `061806029` (**TEXASWORKS - EARLY** vs operator Brownwood / Early label): **exact campus identity crosswalk unverified**. The 34 operator non-local campuses must not be counted as physically in 11-county DFW simply because the administrative district county is Denton. Do not silently delete statewide TEA data; segregate geographic eligibility from source validity.
- Source manifest `data/dfw-noncfb-campus-transition-evidence-2026.json` has **7 independently sourced transitions**: 3 current-year repurposed/consolidated TEA campuses (**Paloma Creek, Dove, Bransford**), 2 still-open feeder/future-year changes (**Carroll Elementary; Durham Intermediate**), and 2 **2026–27 newly opened Northwest campuses without a TEA 2026 rating/ID in this snapshot** (**Romer Elementary, Barksdale Middle**). Existing `school-lifecycle.js` must hide retired camps from regular map recommendations without altering archived TEA scores.
- The additional **Staley Middle** closure in Frisco was already represented in `school-lifecycle.js`; verified against the [district's original closure announcement](https://schools.friscoisd.org/article/2660210) and [Nov 2026 update](https://schools.friscoisd.org/article/3246031). Never label it 2026–27 active.
- A 2027–28 Durham closure proposal is **future**, not grounds to mark that campus closed during 2026–27. Current grade-specific grandfathering at Northwest/Carrollton must use official Finder with year and grade.
- [Denton board-approved 2026–27 Paloma Creek change](https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification-26-27) and [Northwest board-approved 2026–27 zones](https://www.nisdtx.org/departments/facilities/attendance-boundaries/proposed-2026-2027-boundaries) are school-year annotations, not licensed reusable school-specific polygons.
- All physical DFW geocodes for the other TEA campuses remain **not independently validated** in this QA. The DFW coverage panel's denominator and official parent routes remain administrative proxy and source-reference measures.

### Exact unresolved STAAR source-row explanations (14)

| Campus ID | TEA campus | Current evidence only |
| --- | --- | --- |
| 057903117 | HUIE SPECIAL EDUC CTR | other special setting; individual source-row cause unknown |
| 057909007 | P A S S LEARNING CTR | other special setting; unknown |
| 057912007 | DALLAS CO SCHOOL FOR ACCELERATED LRNG | other special setting; unknown |
| 057916008 | P A S S LEARNING CTR | other special setting; unknown |
| 061901005 | LESTER DAVIS | other special setting; unknown |
| 061911012 | LEGACY LEARNING CENTER | other special setting; unknown |
| 116905004 | GREENVILLE ALTERNATIVE EDUCATIONAL PROGRAM | other special setting; unknown |
| 220905019 | METRO OPPORTUNITY | other special setting; unknown |
| 220905035 | TRANSITION CTR | Official AEA Dropout Recovery School, **not** exact STAAR row-absence cause |
| 220905210 | CHILDREN'S MEDICAL CTR | other special setting; unknown |
| 220905211 | WOMEN'S HAVEN | other special setting; unknown |
| 220905212 | BRIDGE ASSOC | Official AEA Residential Facility, **not** exact STAAR row-absence cause |
| 220905242 | TARRANT YOUTH RECOVERY | Official AEA Residential Facility, **not** exact STAAR row-absence cause |
| 220905252 | INSIGHTS LEARNING CENTER | other special setting; unknown |

Do **not** fill with 0, infer that AEA categorization explains their missing row, or penalize these campuses' TEA grades. Only a TEA-issued per-campus exclusion/attribution rationale or source amendment can resolve the 14 individually.

### Old misleading management counters corrected

1. `data/tea-2026-uat-progress.json` previously stated **"UAT only; not deployed to production"** after official batch #264 deployed. Its generator and compatible snapshot now say **Production integrated** with #264 source provenance. The file's historical filename is kept because some fallback displays still load it.
2. `data/tea-profile-progress-2026.json` had legacy manually reviewed/imported counters (e.g. `imported2026Components: 0`) alongside **official2026.domainAllReported: 2,063** and **official2026.staarAnyReported: 2,105**. The counters are not identical measures. A new `productionMetricSemantics` property explicitly documents Production source integration and prohibits treating legacy manual counters as absence of TEA results.
3. `scripts/audit-tea-dfw-final-data-quality.cjs` independently requires these two progress files to agree with the actual academic batches; CFB/Denton original district-school boundary authority is not inferred.
4. The existing display's **fallback** for a missing or invalid current academic progress report remains cautious; a verified current `official2026` primary progress report is the authoritative displayed status.

### How to reproduce and keep this safe

```bash
node scripts/build-tea-academic-uat-progress.cjs --check
node scripts/build-tea-profile-progress.cjs --check
node --test tests/tea-dfw-final-data-quality.test.cjs
node scripts/audit-tea-dfw-final-data-quality.cjs
```

Review `.github/workflows/tea-dfw-final-data-quality-qa.yml`: extra negative checks reject fabricated scores, unmasked suppressed percentages, nonlocal campus promotion, false 2026–27 closure/opening, fake year/grade evidence, unconfirmed 14 STAAR causes, and stale Production integration metadata. No third-party geocoding, no address input, no paid service, no new school polygons, no TEA/PEIMS source count changes, no current-year assignment grants.

**What remains externally unresolved, not a code/test defect:** official or operator campus-location source identity for TexasWorks Early; individual official STAAR row-absence reasons for the 14; new-school future official TEA ratings/IDs; entire DFW physical school location validation; current 2026–27 exact residential school-zone GIS authority. Keep these labelled and never claim total completeness based on this QA's green CI alone.
