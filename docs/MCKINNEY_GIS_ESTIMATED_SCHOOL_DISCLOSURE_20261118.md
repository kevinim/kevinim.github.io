# McKinney address → GIS-estimated schools vs final enrollment confirmation

Date: 2026-11-18
Scope: McKinney ISD only; no campus polygon or geocoder changes.

## User-approved UX contract

A precise searched address with a valid McKinney 2026–27 district GIS crosscheck automatically shows elementary/middle/high **GIS-based estimated schools** in the address-priority cards, then in the map-linked school rail. No extra click is required to read the schools and their TEA grade badges. The optional detail button now reads **GIS 경계·출처 상세 보기**.

The top card explicitly labels this as **GIS 기준 예상 배정학교**. Official Finder enrollment/transfer/grandfathering confirmation stays a separate action and explanatory footnote rather than the primary error headline. School metadata, source year, missing grades, reference pins and official Finder link remain available. A missing level is disclosed, never filled from ZIP/nearest school.

## Safety boundary — unchanged

- `features/conditional-school-release.js` still has no approved residential auto-assignment grants. This user-interface improvement **does not certify eligibility or enrollment**.
- No GIS candidate is promoted to `home.assignment`, `addressSchoolView().schools`, the certified map layer, or a legally assigned-school assertion.
- Existing address geocode precision, boundary-conflict, school-year, wrong-district, duplicate/mismatched Campus ID, and source-availability failure rules remain in force.
- Existing 25 exact McKinney source-name → TEA Campus ID aliases, source-vintage warnings, reference-only school markers, and manual official Finder handoff are preserved.
- No residential address log, persistence, external API proxy, or paid service is added.

## Verification / release

- `tests/address-school-focus.test.cjs` checks new estimated-school UI language and retains checks that the `schools` assignment list stays empty for reference-only sources.
- `scripts/test-mckinney-finder-crosscheck-browser.cjs` expects the estimated-school card status while checking E/M/H card/marker coverage, mobile/desktop and 0 certified matches.
- Existing strict bootstrap/CSP/data/source/privacy and public-preview tests remain required.
- Version bumps: `dashboard-main.js?v=18`, `home-lookup-v2.js?v=26`, with synchronized source/version assertions.
- Merge only on exact-head required CI PASS. Confirm Pages deployment and production 390/1366 Chromium smoke on the merged SHA. If live results differ from the PR, stop and investigate.

## Separate future work

Direct official Finder address-result API retrieval, independent residential holdout verification, source-rights approval, and a separate reviewed enrollment grant remain distinct. They are **not prerequisites to showing correctly qualified GIS estimates**.
