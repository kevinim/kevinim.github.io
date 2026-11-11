# Allen / McKinney TEA campus QA — 2026-11-11
## Scope and verified result
56 current dashboard campuses: Allen ISD 23 (TEA district 043901; dashboard may label AISD), McKinney ISD 33 (043907). Cross-joined 56 unique official 9-digit TEA Campus IDs to the live 2025–26 TEA PEIMS ethnicity-group public aggregate exports. Zero campus identity mismatches; original names are retained separately from existing dashboard labels.

- Original TEA CSV: [Allen ISD](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043901&_debug=0) and [McKinney ISD](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043907&_debug=0).
- 342 published source rows: 240 exact category headcounts, 102 literal privacy-masked cells. Another 50 cells across the 56 × 7 grid are **unlisted** in the source, not zero. All 56 source campuses have at least one published ethnicity row.
- Campuses with all seven categories published: 1; with at least one masked: 49; with at least one unlisted: 32.
- Existing catalog rating: 52 A–F and 4 Not Rated. Ratings/scores were **carried from repository inventory** and were not newly independently checked against individual TEA accountability score sheets.
- **Complete 2026 domain + STAAR + PEIMS QA profiles: 0/56; incomplete: 56/56.** Two missing components on all 56: source-verified 2026 Student Achievement / School Progress / Closing the Gaps and source-verified 2026 STAAR Reading / Math / Science / Social Studies. No inferred strengths/challenges are published.

## Completeness and blockers
- 2025–26 PEIMS public ethnicity-count rows joined: Allen 23/23; McKinney 33/33.
- Full seven-category percentages are **not calculated**, because masked/omitted categories cannot be inferred and enrollment denominators have not been independently obtained from a matching official export.
- All 56 academic breakdown profiles remain **blocked on independently verified TEA 2026 campus component and STAAR exports**, including variable meanings and suppression codes. Individual Not Rated is a distinct official catalog condition, not an F grade or automatic ingest failure.
- This batch creates only one isolated dataset, one isolated test suite and this evidence note. It does not alter school markers, assignments, GIS, UI, the shared data aggregate or AG01/AG02 core pipelines. It is **not a production release**.

## QA continuation
Use existing AG01/AG02 source acquisition and normalizer once their 2026 official exports are available. Cross-check exact ID, TEA year, fields, FERPA masks and data provenance; add source-backed domains and subjects to a *new* isolated batch. Narrative strengths and improvement needs must be derived only from explicit scores and never offer causal explanations. Run `node --test tests/tea-allen-mckinney-campus-qa.test.cjs` and all repository CI checks before UAT acceptance; do not merge to main without release approval.
