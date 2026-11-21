# Address → official residential school crosscheck: implementation and limits

Date: 2026-11-21. Target: `kevinim/kevinim.github.io` GitHub Pages. Free-only, no residential PII persisted, no external proxy, and no request to ISDs or waiting for replies.

## Existing architecture and root cause

- Address geocoding and geospatial reference school zone matching were implemented. Existing `ConditionalSchoolRelease.apply()` deliberately reduces all districts to `conditional-finder-only` without independent street-address enrollment proof.
- The existing `official-school-review.js` manual comparer handled **one grade at a time** and was tucked inside `homeAdvancedSchoolTools`. It did not present an address-first multi-grade workflow or a normalized all-grade result.
- The public official Plano 2026–27 SchoolFinder connects to source layers still labeled **2526** (`ELEM2526`, `MID2526`, `HIGH2526`, `SR2526`). Direct live GIS point-in-polygon checks are **not independent official residential lookup**. The interactive SchoolFinder's exact street-address result is not accessible as a published, permitted API in the reviewed implementation.
- The Lewisville 2026–27 School Locator is interactive with a separate **Find an Apartment** workflow; linked elementary/middle vector year is uncertain, high metadata says 2025–26, and the public apartment table and polygons disagree at the Budget Suites 5289 Highway 121 property on four grade levels.
- Prosper's cross-origin Infofinder address/point API is restricted by CORS in GitHub Pages; no proxy is permitted or introduced. A visible Finder link remains the supported official route.

## Delivered in this change

- `official-school-review.js`: pure `makeResidentialSchoolModel()` and `compareResidentialSchoolReport()`, with a DOM-only `HomeResidentialSchoolCheck.mount()` component. A same-origin, browser-only comparison against official source names **typed by the user after viewing the district Finder**. Links are exact allowlisted `TrustedLinkPolicy.official()` URLs without appending the address.
- `home-lookup-v2.js`: after `renderAddressSchoolPriority()`, insert the new review directly beneath the address-selected school panel. Clear it on `clearHome()` and replace review state on a new home object. Preserve in-memory draft on same-address redraw; invalidate earlier comparison on any edit or GIS candidate drift.
- Grade-specific labels and candidate source years. **Plano** grades E, M, High 9–10, Senior High 11–12; **Lewisville** E, M, 9th, High; generic districts E, M, High; Allen 9th feeder. Compare all available grades at once; show missing, ambiguous and mismatched cases without silently picking a source.
- Reviewer must affirm they opened the official Finder for the **same address, unit and academic year**. A recorded match is always labeled `user-reported-match`, **never `certified` or an independent official result**. Missing year, poor geocode, mixed candidates, or an LISD apartment hold results back. Review text is not a school assignment grant.
- All fields are transient in the `home` object only. New code performs no `fetch`, `XMLHttpRequest`, storage or beacon calls, never logs typed addresses or names, and cannot set `home.assignment`.
- Mobile 390px and desktop 1366px synthetic test in existing `scripts/test-home-assignment-map-browser.cjs`; pure positive/negative/identity and no-auth assertions appended to the existing conditional-school release test suite. Exact script cache versions `official-school-review.js?v=2`, `home-lookup-v2.js?v=28`, no extra workflow.

## Explicitly not completed

- **Unattended exact-residence official API lookup across Plano/Lewisville/Prosper.** The official sites publish interactive district search UIs, but no reviewed, permitted browser-readable result endpoint for complete address + year + unit + grade is currently integrated. A source-linked GIS point query or pasted text cannot be promoted to `independentOfficialAddressVerified:true`.
- **Districtwide automated E/M/H enrollment certification:** still zero production districts approved. The existing empty `APPROVED_AUTO_DISTRICTS` registry is intentionally unchanged. This work is an immediate operational improvement, not full automation.

## Product acceptance criteria and next technical route

1. For a precise, searched address, the address-first E/M/H (+ senior/9th) review shows the GIS candidate and its **source year**, the exact official district Finder link, entry boxes for user-transcribed official school names, and an unambiguous verdict per grade.
2. Wrong year, unchecked exact-address confirmation, ambiguous GIS, missing school grade, and Lewisville multi-unit residence cannot be marked as verified.
3. After user edits any input, stale green/consistent badges vanish; a new address clears the previous comparison; even complete agreement cannot alter the protected school assignment.
4. If future browser-readable, officially permitted lookup appears, implement **separate** district adapter with explicit vendor/public terms, strict address/unit/year/grade and campus ID checks, an actual independent response captured from the official endpoint, and CI holdouts before any certification grant. Do not use third-party geocode + the same GIS source as a circular independent proof.

Official links: https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder ; https://www.lisd.net/resources/families/school-locator ; https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1 .
