# Prosper ISD 2026–27 — official address-result certification gate
Checked: 2026-11-18 (America/New_York)
Repository: `kevinim/kevinim.github.io`

## Grounded source behavior

- Official parent Finder: https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1
- The JavaScript distributed by Infofinder at `/ifi/script/Search.js` uses `ws/SearchRequest.asmx/SearchAddress` with anonymous GET query keys `clientId`, `streetAddress`, `zipCode`, `schoolId=-1`, `gradeId=-1`. This is a **different API from the previously validated `SearchLocation`** (coordinate pin search).
- The response uses `resultCode=200`, `exactAddressMatch`, `addresses[].addressExact/addressStreet/addressZip`, and `schools[].schoolCode/schoolName`. The provider sometimes returns a JSON *string*, rather than an already parsed object.
- Browser-verified *public institutional address only*: Prosper ISD headquarters, 605 E 7th St, ZIP 75078. Exact-match=true, one exact address row and three official school results: Rucker Elementary (102), Reynolds Middle (042), Prosper High (001). This is **not** a residential enrollment holdout, even though it exercises the address search API. The provider also returns a Reynolds transportation ineligible stop, which must **not** be interpreted as an ineligible school or an alternative campus.
- 2026–27 district GIS remains 31 verified zones (20 E, 7 M, 4 H). A code join to that source is independent of the client-side coordinate projection, but it is **not** independent adjudication of a property's school enrollment.

## Browser integration blocker, observed on actual deployed Pages

A fetch to the official `SearchAddress` endpoint made from `https://kevinim.github.io/` failed with browser `TypeError: Failed to fetch`; a `no-cors` request is opaque (its body cannot be inspected). GitHub Pages CSP already lists `https://www.infofinderi.com` as a connect-source. This cannot be repaired by simply adding a CSP hostname. **Do not use a third-party CORS proxy, URL-rewriting workaround, fake server-side success or raw HTML scraping of a student's address.**

A provider/ISD-authorized cross-origin API, a vendor-approved server integration with clear privacy controls, or an official distributable address-to-school source is needed for reliable unattended browser use. Confirm rights and rate limits in writing before deployment.

## Implemented, intentionally NOT auto-authorized

`features/prosper-official-address-response.js` performs a fail-closed check over a real `SearchAddress` payload:

1. The search parameters encode a complete street and five-digit ZIP (no ZIP inference).
2. Provider claims an exact match and returns exactly one exact matching street+ZIP row; ambiguous, near-match, apartment-unit disagreement, missing data and errors fail.
3. GeoJSON source explicitly identifies Prosper's official 2026–27 31-zone source, consistent unique campus IDs and school codes.
4. All three official school codes resolve to a unique elementary/middle/high campus, with no extra or duplicate program.
5. Output is explicitly **official address source evidence**, with `enrollmentCertified:false`. It is not a release grant. The helper performs no network request itself and does not store addresses.

`tests/prosper-official-address-response.test.cjs` uses only the published district headquarters public address fixture. Negative cases include wrong street/ZIP, multiple exact matches, unit mismatch, stale/ambiguous source, missing/duplicate/unknown campus codes and malformed output.

## Final residential certification gate — NOT PASSED

These requirements are still outstanding:

- A legally usable, reliable **browser-readable address-level official interface** or ISD-approved source with explicit redistribution terms.
- Independently confirmed **residential** holdouts, including address+unit, across E/M/H and both sides of district/school boundaries, linked to the current academic year, with recorded test counts and reasons for every mismatch.
- Evidence for residency/grade/program/transfer exceptions and the distinction between Finder *zoned school* and the student's actual enrollment decision.
- Independent reviewer sign-off for source rights, identity/grade mapping, browser/mobile tests, privacy and production monitoring.

`features/conditional-school-release.js` keeps `APPROVED_AUTO_DISTRICTS={}`; the UAT public site remains reference-only for residential automatic school assignments. **Do not label this work complete or change the grant merely because the public headquarters test and offline unit tests pass.**

## Requested external verification

Ask Prosper ISD Transportation / Infofinder administrators whether they can authorize anonymous address lookup from the project's domain (CORS allowlisting), share 2026–27 per-campus attendance boundary/address assignment data for noncommercial attribution, identify split-unit/choice/transfer exceptions, and document the official scope of Finder results versus Skyward registration. District source/contact: https://www.prosper-isd.net/article/3048455 and https://www.prosper-isd.net/o/pisd/page/new-student-enrollment-26-27.
