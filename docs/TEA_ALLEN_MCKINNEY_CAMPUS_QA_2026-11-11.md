# Allen / McKinney TEA campus QA — 2026-11-11
## Scope and verified result
56 current dashboard campuses: Allen ISD 23 (TEA district 043901; dashboard may label AISD), McKinney ISD 33 (043907). Cross-joined 56 unique official 9-digit TEA Campus IDs to the live 2025–26 TEA PEIMS ethnicity-group public aggregate exports. Zero campus identity mismatches; original names are retained separately from existing dashboard labels.

- Original TEA CSV: [Allen ISD](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043901&_debug=0) and [McKinney ISD](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043907&_debug=0).
- 342 published source rows: 240 exact category headcounts, 102 literal privacy-masked cells. Another 50 cells across the 56 × 7 grid are **unlisted** in the source, not zero. All 56 source campuses have at least one published ethnicity row.
- Campuses with all seven categories published: 1; with at least one masked: 49; with at least one unlisted: 32.
- Existing catalog rating: 52 A–F and 4 Not Rated. Ratings/scores were carried from repository inventory, and independently checked against official 2026 campus reports for **Allen High School `043901001` and McKinney High School `043907002` only**. All other catalog ratings remain catalog-only.
- **Complete all-field profiles: 0/56; remaining partial: 56/56.** Two schools now independently source-audited for both 2026 domains and four STAAR Meets rates, including score-based noncausal strengths/challenges. The other 54 remain pending those academic components. The complete all-field criterion is not met because matching total enrollment / all seven released ethnicity percentages cannot be certified where source cells are masked or unlisted.

## Completeness and blockers
- 2025–26 PEIMS public ethnicity-count rows joined: Allen 23/23; McKinney 33/33.
- Full seven-category percentages are **not calculated**, because masked/omitted categories cannot be inferred and enrollment denominators have not been independently obtained from a matching official export.
- 54 academic breakdown profiles remain **blocked on independently verified TEA 2026 campus component and STAAR exports**, including variable meanings and suppression codes. The two newly reviewed campuses have official 2026 summary and subject report URLs in the isolated JSON. Individual Not Rated is a distinct official catalog condition, not an F grade or automatic ingest failure.
- This batch creates only one isolated dataset, one isolated test suite, one dedicated no-deploy GitHub Actions workflow and this evidence note. It does not alter school markers, assignments, GIS, UI, the shared data aggregate or AG01/AG02 core pipelines. It is **not a production release**.

## Independently source-verified 2026 academic profile samples
Official 2026 campus reports (each includes exact 9-digit campus ID, year and TEA publisher):

| Campus ID | 2026 overall | Scaled Student Achievement | Scaled School Progress | Scaled Closing the Gaps | STAAR Meets RLA | Math | Science | Social Studies | Score-grounded relative strengths / improvement |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 043901001 Allen HS | A 90 | 88 | 80 | 93 | 75% | 85% | 43% | 86% | Social Studies highest 86%; Science lowest 43% |
| 043907002 McKinney HS | A 93 | 93 | 91 | 94 | 61% | 58% | 72% | 73% | Social Studies highest 73%; Mathematics lowest 58% |

Sources:
- [Allen HS 2026 overall/domain report](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=043901001&lev=C&prgopt=reports/acct/summary.sas) / [Allen HS 2026 STAAR report](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=043901001&lev=C&prgopt=reports/acct/domain1a.sas)
- [McKinney HS 2026 overall/domain report](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=043907002&lev=C&prgopt=reports/acct/summary.sas) / [McKinney HS 2026 STAAR report](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=043907002&lev=C&prgopt=reports/acct/domain1a.sas)

**Interpretation safeguards:** domain values above are *scaled TEA domain scores*; Closing the Gaps report separately publishes unscaled component 81/85. STAAR percentages are **All Students, percent of tests Meets Grade Level or above**, not the percent of students or demographic-specific result. Highest/lowest is an intra-campus descriptive comparison, not causal evidence for the TEA grade or an inference about pupil groups.

## QA continuation
Use existing AG01/AG02 source acquisition and normalizer once their 2026 official exports are available. Cross-check exact ID, TEA year, fields, FERPA masks and data provenance; add source-backed domains and subjects to a *new* isolated batch. Narrative strengths and improvement needs must be derived only from explicit scores and never offer causal explanations. Run `node --test tests/tea-allen-mckinney-campus-qa.test.cjs` and all repository CI checks before UAT acceptance; do not merge to main without release approval.
