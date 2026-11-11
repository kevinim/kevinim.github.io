# Independent same-PEIMS-source gender-denominator QA — 2025–26 (23 DFW districts)

This is an independent **aggregate-data quality** extension to PR #239, referencing the ethnicity snapshot from PR #245 (source blob `0ee23f207fb217875f695d08230a4b02c5f9cdc8`). Existing source ethnicity JSON, GIS, UI, school assignment and marker data are NOT modified.

## Source validation
- Official Texas Education Agency PEIMS **2025–26 Selected Campus Totals using district number**: `grouping=e` for seven ethnicity categories, and `grouping=s` for Female/Male. Official source: https://rptsvr1.tea.texas.gov/adhocrpt/adste.html .
- **23** district source CSV pairs independently fetched and checked; **1,343** source Campus IDs; all **9,401** recorded seven-group statuses/numbers match original ethnicity TEA export; no discrepancy.
- **2,664** official gender rows inspected. **1,259** campuses have both gender category counts published; **84** campuses have a protected/masked gender category.
- No campus's *known publicly reported ethnicity counts* exceed its same-year public gender denominator.
- Exactly **5** campuses have all seven ethnicity categories published, and all **5** precisely reconcile to the published same-PEIMS gender total. For all other 1,338 campuses: **partial counts only**; do not compute complete ethnicity shares.
- Confirmed five: ALLEN H S (`043901001`) — 5,127 PEIMS students; HOUSTON MIDDLE (`057912046`) — 753 PEIMS students; JACKIE MAE TOWNSELL EL (`057912123`) — 756 PEIMS students; NORTHWEST H S (`061911001`) — 2,806 PEIMS students; BYRON NELSON H S (`061911007`) — 2,997 PEIMS students.

## Cross-product warning (different TEA reports)
Allen High (`043901001`) PEIMS **gender 2,493 Female + 2,634 Male = 5,127**, and its seven published ethnicity group counts also sum to **5,127**. However **2026 TEA Campus Comparison Group and 2025–26 Texas School Profile give 5,126**. The source-product difference remains unresolved; do not silently substitute the 5,126 denominator for 2025–26 PEIMS ethnicity percentages. The prior PR #239 campus audit separately lists 8 such cross-product mismatches for Allen/McKinney and preserves the official URLs. Their cause is not known. This same-source check does NOT certify cross-product equality.

## Privacy, tests and deployment
This JSON intentionally omits campus-level numeric gender totals whenever one or more ethnicity categories are suppressed or absent, so it cannot be published as a subtraction-based source for protected group counts. All original TEA masks remain untouched in the original upstream dataset. No personal-student rows are fetched.

`node --test tests/tea-peims-2025-26-gender-parity-audit.test.cjs tests/tea-peims-enrollment-total-audit-allen-mckinney.test.cjs`

Data QA status: **CONDITIONAL GO** for five fully published same-source distributions (with explicit denominator provenance and Allen's external-source discrepancy); **counts-only** for other 1,338. No automatic production merge, and upstream #245 integration/mobile/security gates apply.
