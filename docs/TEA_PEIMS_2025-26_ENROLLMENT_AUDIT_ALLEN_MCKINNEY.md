# Independent 2025–26 TEA PEIMS enrollment-total QA — Allen / McKinney

This audit is an **independent denominator validation**, not a duplicate seven-category ethnicity count file. PR #237 owns the standalone 56-campus raw group-count batch; PR #233 integrates broader cohorts. This PR does not modify either shared dataset, UI, map markers, GIS, or address-to-school assignments.

Official TEA 2025–26 campus ethnicity CSV sources are stored by district in each data record, together with the separately read official 2025–26 enrollment total URL (2026 Campus Comparison Group or Texas School Report Card school profile). All joins use the exact nine-digit TEA campus ID, including leading zeroes.

## Actual official source counts — November 11, 2026
- 56/56 linked campuses: Allen 23, McKinney 33.
- 342 public ethnicity source rows: 240 exact group-count cells, 102 suppressed/masked, 50 unlisted out of 392 seven-category positions.
- Separately published official enrollment totals found: **55/56**. Missing: **1**.
- **8** campuses have a known *public group-count* sum larger than the total in another official TEA report; this is a cross-report discrepancy. No cause is inferred.
- Allen High `043901001`: seven publicly reported group counts sum to **5,127**, while its 2025–26 TEA School Profile / Comparison Group lists **5,126** students. Exact seven-category shares must remain on hold pending reconciliation.
- One campus has all seven groups publicly reported. **Zero** campuses have seven-group counts that independently reconcile to the official total. When some cells are masked, even a zero known-total remainder must never be used to reveal them.

## QA and release holds
Run `node --test tests/tea-peims-enrollment-total-audit-allen-mckinney.test.cjs` and verify the independent GitHub Actions job on the exact head SHA. Check provenance/source-year alignment and the eight cross-report discrepancies before approving exact ethnicity percentage visualizations. Existing source PR dependencies, school click UAT, privacy/CSP, and marker regression gates remain. **No direct main merge or production deployment.**
