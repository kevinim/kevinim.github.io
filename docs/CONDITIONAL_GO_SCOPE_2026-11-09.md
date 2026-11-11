# TX Dashboard Conditional GO — information-only scope

Date: 2026-11-09
Status: **IMPLEMENTED IN ISOLATED DRAFT BRANCH — NOT DEPLOYED**
Upstream security prerequisite: PR #182 (draft); residential automatic school release gate #148 remains NO-GO.

## What this conditional scope permits
The existing DFW city/ZIP demographics, campus location points, official district Finder outbound links,
hazard reference layers, and other non-enrollment informational screens may be considered for their
own safety and quality review. This is **not** public publishing authorization and does not certify
any underlying data-source license, traffic quota or current school enrollment.

## What this scope categorically prohibits
- Residential address → "assigned school" automatic claims unless district, school year and
  elementary/middle/high grades have a separate independently reviewed PASS evidence grant.
- Automatic home-matched school highlights or residence-specific visible polygons based only on
  map geometry, geocoding, campus proximity, ZIP, or old GIS.
- Promoting Allen's historic 2019/2023 map or mixed vintage Plano/Lewisville sources to verified
  current-year boundaries, even if an offline unit test passes.
- Calling Finder links equivalent to automated official enrollment verification.
- Falsely treating manually entered Finder comparison as an independent verified lookup.
- Removing existing #148 full residential-school NO-GO, bypassing licensing, or marking a
  standalone public Production as GO.

## Implemented runtime behavior
- `features/conditional-school-release.js` contains a **zero-entry** production
  approved-residential-district registry; every district is currently Finder-only for
  address-derived school suggestions.
- `home-lookup-v2.js` applies that release policy **after** GIS candidate calculation and
  **before** the UI, school-highlight matching, and any home-based school labels are rendered.
- A missing policy script fails closed to `conditional-finder-only`, instead of falling
  back to a raw current/finder GIS candidate.
- The in-page `homeSchoolInfo` card displays a clear school assignment uncertified warning.
  The independently registered official district Finder links remain available.
- Existing apartment split, ambiguity, data failure and boundary review warnings are not
  incorrectly converted into official matches.
- Campus points, per-school clicked reference geometry, district demographic and hazard layers
  remain separate informational features, not residential assignment evidence.
- A future school-level promotion requires separate review, explicit rights and independent
  official Finder/current-year school-click polygon evidence, as well as updated test fixtures.

## Evidence required before owner authorizes current Pages merge
1. Independent Chromium at **390 and 1366 px** verifying synthetic current-GIS candidates
   never appear as assigned schools and that registered district Finder links remain visible;
   also inspect regression results from the main school/map and security agents.
2. Green security and preview scanners on **the final merge/integration commit**. Use #182 as
   a dependent security candidate, not a proxy for approval.
3. Verify privacy terms, outside provider rate limits, dataset redistribution rights and
   live Pages/retired-asset behavior for the *chosen informational scope*.
4. Ensure the release candidate contains only reviewed paths; complete rollback rehearsal.
5. Explicit owner GO for the scoped release; a Draft PR or green CI is not sign-off.

## Separate automatic school assignment certification
The #148 seven-district residential evidence gate remains **NO-GO** until its own
independently reviewed official Finder/current-year polygon cases pass. The new scope
does not alter, disable or fake the strict gate. A district granted later must be
reviewed with elementary/middle/high, actual residential holdouts, source rights,
source vintage, independently verified Finder and map-click evidence. Only reviewed
grants go into the immutable production registry; user input and query params are
never approval sources.

## Test and privacy limits
The Playwright browser test uses a deliberately synthetic coordinate and fake campus
name, blocks third-party requests, and emits only boolean/count flags. It does not
test real residential addresses, external provider terms, source licensing or
authentication, and **does not deploy**. For the source-repository/public-artifact
separation requirements of a future separate Public Production, this change alone
is insufficient.


## Narrow opt-in school-name reference extension — 2026-11-10

**Decision category: CONDITIONAL INFORMATIONAL GO on the existing GitHub Pages site; NOT a
residential-school assignment or license certification.** The owner requested prompt release of
tested informational UI changes and previously chose an explicit-warning Track B approach.
This extension permits only the following **user-triggered, text-only** research view:

1. After the user selects a geocoded Texas address, **no GIS school name appears automatically**.
   The visitor may explicitly select **GIS 참고 후보 직접 보기 · 실제 배정 미인증**.
2. The text-only candidate view may show school names and grade levels derived from the
   **already published in-site**, individually vetted 2026–27 Frisco or Prosper campus
   zones, or McKinney's live current-year official Finder source. No new polygon, raster,
   vendor feed, parcel coordinates, per-address records or data asset is introduced by
   this extension. Existing source use and unverified derivative rights remain separate
   governance questions; this paragraph does **not** confer rights to redistribute any GIS.
3. The name list is **never** treated as assigned schools, enrollment eligibility,
   property/parcel survey, automatically selected map highlights or a permission to display
   address-selected school polygons. Displayed warnings, academic year and district's
   official Finder link are mandatory. Returning students, transfer/capacity and split
   apartment exceptions must be surfaced or blocked.
4. Reject historical Allen, current-year-uncertain Plano/Lewisville, CFB campus GIS
   without certified polygons, stale feature vintages, boundary-proximity, ambiguous
   feeder paths, district conflicts and weak geocode input. If the reference policy or
   official link is unavailable, show official Finder-only guidance.
5. Maintain the untouched, immutable `APPROVED_AUTO_DISTRICTS={}` grant policy and the
   independent 2026–27 E/M/H residence-Finder-geometric release gate. Opt-in is **not**
   a release-grant source. The existing school source attribution and provider privacy
   notices remain visible.

**Review evidence for this narrow UI scope:** PR #218 provides exact-head
Node/CSP/XSS, 390/1366 synthetic Chromium address-click/clear, source-vintage/grade,
CFB/Allen map, privacy, and disabled home-assignment checks. Actual school enrollment
and publisher GIS redistribution rights remain outside the positive test claim.
Any *new* polygon output or formal address-to-school assignment must be separately
authorized and cannot piggyback on this informational extension.
