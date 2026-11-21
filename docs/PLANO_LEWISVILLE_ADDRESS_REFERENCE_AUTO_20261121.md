# Address-first Plano / Lewisville live-Finder GIS reference cards (2026-11-21)

## Scope and status

This is a user-requested increment toward residential address → E/M/H automatic display. It **does not** access official street-address assignment results or grant enrollment certification. The dashboard already geocodes a precise address and intersects the school-specific polygon layers served by district-linked Finders. Before this increment, the source-year restrictions suppressed the resulting Plano and Lewisville reference candidates from the prominent school rail.

- Plano: only the live 2026–27 district SchoolFinder's four polygon layers are eligible. Their original field names are `2526` (2025–26), and there is **no independent confirmation** that those shapes equal 2026–27 enrollment zones. Show Elementary, Middle, High (9–10) and Senior High (11–12) as reference cards, with explicit vintage and Jackson/Coit split feeder warning.
- Lewisville: only the currently fetched 2026–27 School Locator's elementary/middle/high polygon reference source is eligible. High source is labeled 2025–26, elementary/middle academic years unconfirmed. The official locator's **Find an Apartment** and 9th-grade pathway are separate checks; no apartment/unit enrollment is inferred from a point polygon. Display only source-present grade cards, never fabricate a fourth ninth-grade campus.
- No cached fallback, old reference source, near-boundary, conflicting ISD, imprecise geocode, split-apartment or feeder-inconsistent source is eligible for these reference cards.
- Reference school cards and linked campus pins are visibly marked *GIS reference / assignment unverified*. ZIP schools that do not match the address's source reference stay hidden. The user must use the official district address Finder for school year, exact residence/unit, grade and exception verification.
- `ConditionalSchoolRelease.APPROVED_AUTO_DISTRICTS` remains empty. No changes to `home.assignment`, no new external address requests or persistence, no proxy/vendor endpoint bypass, no licensed data redistribution.
- Source: `plano-finder-live.js` and district-linked Lewisville MetroStudy webmap, vetted previously in `docs/PLANO_LEWISVILLE_PUBLIC_GIS_YEAR_CLOSEOUT_20261120.md`.

## QA expectations

Run `node --test tests/school-reference-preview.test.cjs tests/address-school-focus.test.cjs` and the existing protected main JS/data, source/provenance, strict CSP/XSS, browser map/ZIP isolation, mobile 390px/desktop 1366px and GitHub Pages live smoke suites.

Negative tests: no current-year elevation; altered feature metadata, wrong district/campus, duplicate/invalid geometry, missing live Finder, historical fallback, near-edge and unrelated ZIP schools must fail closed. Live campus labels/locations are reference only.

## Next remaining work (not completed by this PR)

- Official independent street + unit + grade + academic-year result API integration requires a permitted, browser-readable provider contract and real independent residential holdouts. Plano, Lewisville and Prosper have no such validated integration as of 2026-11-21.
- Improve source-specific ninth-grade and split-feeder matching, apartment routing and external provider availability before considering any official result certification. Source-year confirmation and data rights are independent gates.
