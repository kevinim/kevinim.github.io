# Verified TEA 2026 campus accountability and STAAR data batch

**Official 2026 source dataset integrated into Production via PR #264; this file is the source/provenance and missing-data runbook, not school-address GIS certification.**
Retrieved 2026-11-11. TEA accountability year 2026; assessment school year 2025–26. Exact 9-digit Campus IDs matched to the existing 2,282-campus DFW inventory.

## Independent artifacts
- data/tea-accountability-2026-verified-batch.json: Accountability Summary with official overall rating and three independently rated/scored domains (scaled score, not raw component).
- data/tea-staar-meets-2026-verified-batch.json: official All Students, grades 3–12, percent at Meets Grade Level or above in Reading, Math, Science, Social Studies.
- scripts/verify-tea-2026-extracts.cjs and tests/tea-2026-official-extracts.test.cjs: fail-closed campus identity, source/year/metric, masking, cardinality, score and grade checks.
- .github/workflows/verify-tea-2026-extracts.yml: PR-specific gating, plus existing TEA tests.

The original data-extraction PR #244 did not modify shared `data/tea-campus-enrichment-2026.json` or GIS; its two official source batch JSON blobs and source verifier were subsequently integrated byte-for-byte into Production via PR #264. Dashboard school detail panels now read these source fields, while verified residential school assignment remains a separate GIS/Finder problem. All data are public **campus-level aggregates**; no student-level data, group subtotals, addresses or personal identifiers are stored.

## Official sources
TEA official 2026 download portal:
https://rptsvr1.tea.texas.gov/perfreport/account/acct_download?year=2026

Original exact GET download and data-dictionary URLs for each category and selection keys are stored under each file's source metadata. Report Level is Campus; CSV has two header lines, descriptive labels then official variable names.

| Metric | TEA category | Exact variable | Meaning |
|---|---|---|---|
| ID | RATE | CAMPUS | 9-character text ID |
| Overall | RATE | C_RATING, CDALLS | Official grade and scaled score |
| Student Achievement | RATE | CD1G, CD1S | Official domain grade and scaled score |
| School Progress | RATE | CD2G, CD2S | Official domain grade and scaled score |
| Closing the Gaps | RATE | CD3G, CD3S | Official domain grade and scaled score |
| Reading | D1_STAAR1 | CDA00AR01226R | All Students, Meets GL percent |
| Math | D1_STAAR2 | CDA00AM01226R | All Students, Meets GL percent |
| Science | D1_STAAR3 | CDA00AC01226R | All Students, Meets GL percent |
| Social Studies | D1_STAAR3 | CDA00AS01226R | All Students, Meets GL percent |

Do not confuse RATE2 component raw scores/weights with RATE summary **scaled domain** scores. The RATE download key selections were RATE, D1, D2, D3. STAAR selections were CR222, CM222, CC222, CS222. Exact campus-to-district six-digit prefix matching was independently checked. No campus was joined by name, ZIP, or district alias.

## Source intake and identity reconciliation (2026-11-11)

| Official CSV dataset | Official campus rows | Matched inventory | Rows outside dashboard inventory | Inventory campuses without source row |
|---|---:|---:|---:|---:|
| Accountability RATE | 9,105 | 2,282 | 6,823 | 0 |
| STAAR Reading | 8,569 | 2,172 | 6,397 | 110 |
| STAAR Math | 8,569 | 2,172 | 6,397 | 110 |
| STAAR Science/Social Studies | 8,569 | 2,172 | 6,397 | 110 |

Source rows outside the dashboard inventory are legitimate statewide campus IDs *not in this selected source set*; they are not join errors. The 110 inventory campuses absent from the STAAR source are recorded as not-in-source, not automatically Not Rated or failed.

| Metric | Valid published numeric scores | Official Not Rated | Suppressed | Unavailable/blank | STAAR row absent |
|---|---:|---:|---:|---:|---:|
| Student Achievement | 2,101 | 181 | 0 | 0 | n/a |
| School Progress | 2,082 | 200 | 0 | 0 | n/a |
| Closing the Gaps | 2,063 | 219 | 0 | 0 | n/a |
| STAAR Reading Meets % | 2,103 | n/a | 39 | 30 | 110 |
| STAAR Math Meets % | 2,079 | n/a | 55 | 38 | 110 |
| STAAR Science Meets % | 1,931 | n/a | 50 | 191 | 110 |
| STAAR Social Studies Meets % | 840 | n/a | 34 | 1,298 | 110 |

Each subject or domain status row totals 2,282 campuses. Not Rated is evaluated separately for each accountability domain, not assumed from overall grade. The original official URL and variable mapping are recorded in each batch, and actual published values are not inferred.

Official TEA 2026 suppression explanation:
https://rptsvr1.tea.texas.gov/perfreport/account/2026/masking.html

According to TEA, -1 means masked small counts, -3 complementary racial/ethnic masking, and blank means data unavailable. All are kept as null/non-numeric status, not 0. STAAR percentages use only published All Students values; missing school-level subjects are not proof of poor quality, and no values are reverse-calculated. No individual student records or racial subgroup values were copied.

## Runbook and release gate
Run from the repository root:
- node --check scripts/verify-tea-2026-extracts.cjs
- node scripts/verify-tea-2026-extracts.cjs
- node --test tests/tea-2026-official-extracts.test.cjs
- node --test tests/tea-campus-enrichment-pipeline.test.cjs tests/carrollton-school-insights.test.cjs
- node scripts/build-tea-profile-progress.cjs --check

Review exact-head GitHub Actions, original data drift, independent campus spot-checks, UI privacy and school click/marker regressions for any future change. PR #264 integration is already deployed, but TEA public score coverage does **not** certify physical DFW campus location, actual address-to-school assignment, current attendance-zone polygons or complete 2025–26 PEIMS ethnicity percentages. The separate QA evidence in PR #267 documents 110 STAAR-source absences and their unresolved causes.
