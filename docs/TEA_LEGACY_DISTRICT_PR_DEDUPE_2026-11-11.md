# TEA PEIMS 2025–26 — candidate district batch reconciliation

## Goal

Make a source-grounded decision on six open, stale, district-scoped staging pull requests (#234, #236, #240, #241, #242 and #243). The immutable currently deployed 2,282-campus official PEIMS snapshot was independently audited by #239. Do not merge duplicate source data or independently count the same schools twice.

The read-only workflow pins the candidate pull request **head Git commit SHA**, fetches those six PR refs from this public repository, checks that each ref is unchanged, and compares every one of seven group statuses and every publicly reported enrollment count with the canonical source currently on `main`. Protected cells remain unavailable and are never inverted or imputed. Where both sources expose a suppression threshold, it is also compared exactly.

| Candidate PR | District | Candidate campuses |
|---|---|---:|
| #234 | Plano ISD | 69 |
| #236 | Frisco ISD | 76 |
| #240 | Prosper ISD | 32 |
| #241 | Denton ISD | 46 |
| #242 | Dallas ISD | 237 |
| #243 | Irving ISD | 35 |
| **Total** | | **495** |

## Release decision

- **PASS all 495 campus source entries**: close the six original PRs as superseded by the main canonical snapshot; add links to the exact-head action run and clarify that no school records were dropped. Leave their branches/history intact.
- **Any mismatch, missing source, or drifted source PR head**: NO-GO for closing that PR until independently reconciled against the original TEA 2025–26 CSV; never silently overwrite canonical data.
- This scope is **only a source-staging deduplication**. It is **not** campus physical geolocation certification, current attendance-zone verification, a complete seven-group percentage claim, or a new TEA 2026 STAAR audit. The six district candidates must not be mistaken for new coverage beyond the 2,282 source-connected campuses.

Run `node --test tests/tea-legacy-district-pr-dedupe.test.cjs` and the pinned source comparison in the read-only GitHub Actions workflow. No paid services, private home addresses, student PII, or deployment changes are required.
