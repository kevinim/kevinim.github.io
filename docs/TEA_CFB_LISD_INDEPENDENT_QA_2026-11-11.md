> **2026-11-11 current-main integration note:** This is a 92-campus historical *independent academic evidence* QA ledger from #235, retained byte-for-byte as an as-of snapshot. Subsequent statewide official PEIMS raw category parity has separately passed via #239 and exact campus count connections via #264. Historical counts in this file labelled “independently rechecked in this cohort” are not automatically revised; do not treat those 0/92 cohort-specific checks as a denial of the later statewide source audit. Even after statewide category source verification, complete seven-category whole-school race distributions and school-residence attendance zones remain separate requirements. The #235 academic report review independently verifies 9/92 subject/domain sets, not all 92, and the 87 district-listing source rows are component-level partial evidence. No new source-derived narratives are displayed automatically by merging this QA-only artifact.

# CFB / Lewisville TEA 2026 campus independent QA — 2026-11-11

## Scope and rule
This is a **separate evidence ledger and test suite**. Batches 01 and 02 now independently verify nine campuses' official 2026 domain and subject test metrics. This is **not** yet a complete 2025–26 demographic or source-verified full campus profile. Only **CFB ISD 35** and **Lewisville ISD 57** TEA campus records are included. Existing 18 manually written school analyses, shared enrichment pipeline, GIS/address-to-school code, `main`, and PR #230/#232 data are not edited.

## Independently rechecked on 2026-11-11

| Gate | Verified or staged | Total | Meaning |
| --- | ---: | ---: | --- |
| 9-digit TEA campus IDs / inventory | 92 | 92 | All IDs on `main` match distinct PR #232 staged records, including district codes |
| District membership | 35 CFB + 57 LISD | 92 | No out-of-cohort PR #232 campus record |
| Overall TEA 2026 rating presence | 88 | 92 | 4 are `Not Rated`, not `F` |
| 2025–26 PEIMS published group cells in #232 | 393 | 644 | Published **counts**, not full race/ethnicity shares |
| 2025–26 PEIMS suppressed cells in #232 | 180 | 644 | Masked values remain unquantified |
| 2025–26 PEIMS unlisted cells in #232 | 71 | 644 | Not equivalent to reported zero |
| Source-independent original PEIMS row and total-enrollment verification | 0 | 92 | PR #232 normalized data used for join/status audit; original TEA CSV row-by-row check still pending |
| Official 2026 Student Achievement + Closing the Gaps scaled values | 87 | 92 | Two TEA district-wide 2026 Campus Listings directly reviewed (94.57%); 5 have no published values |
| Full 2026 three scaled domains + STAAR test-subject values | 9 | 92 | Item-by-item TEA 2026 Summary and STAAR school reports checked (9.78%); 78 have only partial domain data and 5 have no published domain data |
| Independently verified 2026 STAAR Reading / Math / Science / Social Studies | 9 | 92 | Official TEA 2026 all-student test percentages; social studies N/A for elementary; remaining 83 subject sets not source checked |
| New evidence-based school strengths/improvement analyses | 6 | 92 | Three in batch 01 (Independence, Tom Hicks, Arbor Creek), three in batch 02 (Castle Hills, Las Colinas, STEM Memorial); 18 existing narratives untouched |
| **Fully verified academic + demographic campuses** | **0** | **92** | **0%** — 2025–26 PEIMS original campus enrollment totals are still unverified; race masking prevents full-share percentages |

## Verified source locations, not unverified numbers

- Official TEA 2026 accountability and STAAR campus exports: https://rptsvr1.tea.texas.gov/perfreport/account/acct_download?year=2026
- 2025–26 TEA PEIMS public campus-level student enrollment reports: https://rptsvr1.tea.texas.gov/adhocrpt/adste.html
- PR #232, public count records staged separately: https://github.com/kevinim/kevinim.github.io/pull/232
- PR #230, source-verified **2024–25** ethnicity percentages: https://github.com/kevinim/kevinim.github.io/pull/230
- Official STAAR Assessment Analytics (not identical to accountability STAAR): https://txreports.emetric.net/

**Evidence boundary:** Exact 92/92 ID joins, group-cell statuses, and scoped roster have been independently checked against the GitHub files. The original TEA PEIMS raw CSV line-by-line counts have **not** been independently re-downloaded in this QA and the PR #232 dataset does not contain verified total enrollment per campus. In particular no full 7-group 2025–26 proportions can be responsibly computed from masked cells. Published percentages from 2024–25 are not re-labeled 2025–26.

## Per-campus ledger

`data/tea-cfb-lisd-campus-qa-ledger-2026.json` carries each of 92 exact campus IDs, official campus name, district, 2026 overall rating, original campus profile URL, per-campus **count of published/suppressed/unlisted group cells**, missing enrollment totals, and explicit null academic component/subject values. This is a QA audit snapshot, **not** a production school profile input. 87 campuses carry official Student Achievement + Closing the Gaps values and separate Academic Growth/Relative Performance scores; nine also carry individually confirmed three domains and STAAR subject measures. Six new metric-only analyses are recorded separately in `data/tea-cfb-lisd-academic-2026-verified-batch01.json` and `data/tea-cfb-lisd-academic-2026-verified-batch02.json`. No original PEIMS group counts are copied from #232 and no individual student records are accessed.

## Independently verified 2026 academic batch 01

`data/tea-cfb-lisd-academic-2026-verified-batch01.json` preserves exact TEA 2026 campus summary and STAAR report URLs, three scaled academic domain scores, published All Students `Meets Grade Level or Above` test percentages, official meets/total test counts, and `not-applicable` where no Social Studies test is reported. These percentages describe **test results**, not the population of individual students or PEIMS ethnicity. Source records:

| Campus ID | District | School | 2026 three scaled domain scores (Achievement / Progress / Gaps) | STAAR Meets tests % (RLA / Math / Science / Social) | New metric note? |
| --- | --- | --- | --- | --- | --- |
| `057903122` | CFB | Kent EL | 93 / 92 / 85 | 77 / 76 / 47 / N/A | No, existing curated narrative preserved |
| `061902118` | LISD | Hebron Valley EL | 82 / 73 / 73 | 65 / 47 / 40 / N/A | No, existing curated narrative preserved |
| `061902140` | LISD | Coyote Ridge EL | 73 / 78 / 72 | 57 / 42 / 31 / N/A | No, existing curated narrative preserved |
| `061902142` | LISD | Independence EL | 76 / 70 / 70 | 56 / 45 / 34 / N/A | Yes, source-based subject comparison |
| `061902134` | LISD | Tom Hicks EL | 92 / 86 / 83 | 83 / 68 / 51 / N/A | Yes, source-based subject comparison |
| `061902047` | LISD | Arbor Creek Middle | 91 / 85 / 91 | 75 / 61 / 65 / 52 | Yes, source-based subject comparison |

Official 2026 Summary and STAAR reports for every row use the same source pattern (9-digit TEA campus ID and `ccyy=2026`): `https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=061902142&lev=C&prgopt=reports%2Facct%2Fsummary.sas` and its `domain1a.sas` counterpart. All six summary/STAAR pages were independently read. **Batches 01+02 combined academic completeness 9/92 (9.78%), full academic-plus-verified PEIMS total still 0/92**.


## AG01 / AG02 handoff acceptance

1. AG01 academic export: retrieve official TEA **2026 Campus** Accountability Component Scores and STAAR source files plus same-year variable dictionaries. Bind rows on exact 9-digit campus ID. Reject cross-district IDs, non-2026 years, out-of-range values, unsupported Not Rated conversions, and suppressed cells. The accountability summary grade alone is **not** sufficient to infer three domain scores or subject meets rates.
2. AG02 demographics: independently verify the official **2025–26** aggregate enrollment report's campus total and seven ethnicity categories. Match each TEA row to the existing #232 record. Retain group masks/unlisted status; do not infer suppressed cells from total-minus-published.
3. The QA engineer adds independently checked academic rows and total enrollment, with per-row TEA source URL and variable definitions, in **a new cohort-specific data batch**. A campus becomes metric-complete only when authoritative scores, subjects, enrollment total, and privacy-safe ethnicity representation satisfy acceptance criteria.
4. Strength and improvement narrative: identify only actual within-campus domain/subject differences, cite the year/source, and avoid causal claims about grade or use of race as a quality measure. Preserve all pre-existing 18 analyses.
5. Required checks after a real data delivery: `node --test tests/tea-cfb-lisd-independent-qa.test.cjs`, existing official pipeline tests, PR exact-head Actions, desktop/mobile campus selection, privacy/CSP, and no Allen marker, school boundary, or address-assignment changes.

## Release gate

**QA staging for 87 official 2026 campus-listing partial domain rows and nine independently verified full academic subject records; not production publication. The other 83 subject records and 92 original 2025–26 PEIMS enrollment totals remain blocked until independently verified.** This branch changes only independent cohort QA data batches, the QA ledger, an isolated test and read-only CI, and this document. PR stays **Draft**. Never merge or deploy to production without explicit authorization.

## District-wide official TEA Campus Listings — 92 IDs, 87 published domain fragments

The two official TEA 2026 *A–F Accountability Campus Listing* reports were independently read by district and source rows transcribed into `data/tea-cfb-lisd-2026-official-campus-listing-92.json`, preserving exact 9-digit Campus IDs and the **published** Overall, Student Achievement, Academic Growth, Relative Performance, and Closing the Gaps scaled scores. Original source URLs:

- CFB (35 rows): https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=057903122&lev=C&prgopt=reports%2Facct%2Fca.sas
- Lewisville (57 rows): https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=061902118&lev=C&prgopt=reports%2Facct%2Fca.sas

**Coverage:** 92/92 exact campus IDs with 2026 rows; 87/92 with Student Achievement and Closing the Gaps values (94.57%), remaining **five unavailable: four Not Rated** (CFB `057903005`, `057903009`, `057903117`; LISD `061902007`) **plus one paired Lewisville early-childhood campus** (`061902141`) with B overall but no separately rated domains. This paired-school result must never be conflated with Not Rated overall. There are zero discrepancies between official listing overall scores and main inventory.

The two district listings **do not** publish a separate single *School Progress* scaled-score column; they provide its Academic Growth and Relative Performance components. Those two metrics are stored independently, with no fabricated combined School Progress score. For nine campuses, that combined value was independently verified from the campus-specific Summary reports (academic batches 01 and 02). For the remaining 78 with source-published domain fragments, School Progress combined and STAAR test subject rates stay null.

The `Students` column on the accountability report is 2026 accountability membership and **must not be relabeled** as TEA PEIMS 2025–26 ethnicity-group total enrollment. The 2025–26 PEIMS source row and denominator remain separately pending. This QA's internal ID, grade and numeric sanity checks do not prove every manually transcribed source number in the 92 rows; external raw download/extraction and source-to-staging parity is a further QA hardening gate before Production.

## Additional source-verified academic batch 02 (2026)

`data/tea-cfb-lisd-academic-2026-verified-batch02.json` adds three distinct campuses, each independently checked against two official September 2026 TEA campus reports: `Overall Summary` and `STAAR Performance`. All test rates are official percent of **tests**, not student-count percentages. Existing 18 pilot analyses remain untouched.

| Campus | TEA Campus ID | 2026 scaled Achievement / Progress / Gaps | STAAR All Students Meets RLA / Math / Science |
| --- | --- | --- | --- |
| Castle Hills Elementary | `061902136` | 94 / 89 / 92 | 82 / 79 / 56 |
| Las Colinas Elementary | `057903120` | 94 / 92 / 92 | 83 / 75 / 79 |
| STEM Academy at Memorial Elementary | `061902145` | 92 / 91 / 84 | 83 / 67 / 56 |

Official TEA 2026 Summary source examples: https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=061902136&lev=C&prgopt=reports%2Facct%2Fsummary.sas and matching `domain1a.sas` STAAR source links, with each per-campus source preserved inside the batch. Published `meetsTests` / `totalTests` figures reconcile with the shown whole-percent rates. All three elementary schools have no Social Studies test reported (N/A, not 0%). The independent QA test now enforces both batches' distinct IDs and numeric source-transcription parity.

**Latest verified state: 92 exact campus IDs; 87 have published Student Achievement / Closing the Gaps; nine have full three domains plus STAAR subject rates (9.78%); 78 are academic-partial; five have no publishable academic domain figures. Academic + independently verified PEIMS student enrollment total: 0/92.**
