# Agent 03 — Multi-district public-address browser QA (2026-11-09)

## No-overlap scope

Child of Draft #162 only. Existing #172/#175 already cover Prosper publicly listed houses; #165 covers Frisco leasing-address browser behavior; #170 separately covers Allen and CFB; #164 covers Dallas publisher GIS. This change touches NO GIS source, school coordinates, production JavaScript or parallel-PR files.

## Six public leasing-office base addresses, NOT unit-level enrollment proofs

| Candidate ISD (NOT independently address-verified) | Public leasing office | Publisher |
| --- | --- | --- |
| McKinney | 2401 McKinney Ranch Pkwy, McKinney, TX 75070 | https://www.mckinneypointe.com/contactus |
| McKinney | 201 McKinney Village Pkwy, McKinney, TX 75069 | https://www.mckinneyvillageapts.com/contact-us/ |
| Plano | 1550 W Plano Pkwy, Plano, TX 75075 | https://www.thebridgeplano.com/contact-us |
| Plano | 6201 Windhaven Pkwy, Plano, TX 75093 | https://www.windhavenparkapthome.com/Contact.aspx |
| Lewisville | 650 Leora Ln, Lewisville, TX 75056 | https://www.bella-madera.com/contactus |
| Lewisville | 3600 Windhaven Pkwy, Lewisville, TX 75056 | https://www.discoveryattherealm.com/scheduletour |

A city/address is not proof of a district assignment. These are complex leasing-office street addresses, not a specific apartment, building, student or family record. Esri geocode precision is not equivalent to eligibility. The test intentionally does NOT pre-fill expected schools or score a grade match without a separately evidenced official district Finder result.

## Official year-specific verification still required

- **McKinney:** https://www.mckinneyisd.net/page/attendance-zones-maps/ has a 2026-27 School Locator. Review elementary, middle and high for a precise address and transfers/grandfathering exceptions. City name alone is not ISD membership.
- **Plano:** https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder points to 2026-27 Finder. Confirm elementary, middle, high/9-10 and senior-high/11-12 feeder results; don't silently flatten grades or ignore campus reconfigurations.
- **Lewisville:** https://www.lisd.net/resources/families/school-locator points to 2026-27 locator and instructs apartment residents to use **Find an Apartment**, not an arbitrary map coordinate. Confirm apartment-level school assignment and grade/9th-campus placement independently.

No independent Finder UI review, school-specific screenshot, unit-specific enrollment or reviewer sign-off is committed as of this PR creation. All 6/6 remain **NO-GO for assignment certification**. Any live map/zone congruence is only technical GIS corroboration. Zero matches and zero mismatches have been independently established; this is **six UNVERIFIED**, not six failures or six passes.

## What the new automated real-browser test checks

- Desktop 1366x930 and mobile 390x850; 6 public base addresses per viewport.
- Real Esri Suggest and geocoder, real dashboard initialization, real remote GIS data. No fabricated home object, page.route, mocked shapes or preseeded school results.
- Search autocomplete and Escape dismissal; candidate selection requires exact street/number, never silently accept an unrelated approximate geocode.
- School markers, selected home marker, Leaflet child polygon count, provenance mode, elementary/middle/high features and actual school button click whenever current/finder source legitimately permits a map.
- Unverified source, missing geometries, conflicting districts or imprecise geocodes MUST NOT paint a positive assignment polygon.
- Re-search clears old results immediately; clear wipes home marker, polygons, input and candidates; cancelling an in-flight geocoding request must not restore a stale result.
- Every sample gets a mobile/desktop screenshot, machine-readable status and errors in a short-retention GitHub Actions artifact.

The CI result may say **PASS_TECHNICAL_QA_ONLY**, never enrollment pass. The JSON artifact includes source-year, observed candidate school names and school geometry counts **without** comparing them to unreviewed official Finder expectations. An absent Esri Suggest result is reported as not observed, not fabricated.

## Required later evidence before production

For each of the seven ISDs in #148, independently check at least three genuine residential addresses with two ZIPs per ISD, current official Finder exact school/grade result, screenshot/timestamp/source year, dashboard map marker and actual visible current-year school polygon, transfer/special-program/building/unit exceptions and independent reviewer on the final integration commit. CFB, Allen and other Agents remain separate. **NO_GO** until #148 and all CI/release controls are approved.

This is read-only GitHub Actions using free public-repository resources. It does not merge to main, deploy, or add a paid service.


## 2026-11-09 follow-up: apartment standard corrected

**Important correction:** A publicly listed residential apartment complex address and name can be sufficient for a normal zone lookup. Do not require a unit number as blanket evidence. Only a specific exception documented by the official district, e.g. an apartment complex divided by building or unit, escalates to building/unit verification. This is separate from final residency/enrollment eligibility; the latter is not needed to show a default assigned school candidate.

- Lewisville official 2026–27 locator instructions: click **Find an Apartment**, choose the complex name, then Apply. Official source: https://www.lisd.net/resources/families/school-locator. A complex-level result is acceptable for the base attendance zone.
- McKinney official 2026–27 zones and School Locator: https://www.mckinneyisd.net/page/attendance-zones-maps/. By default street address is enough unless the official finder explicitly identifies an exception.
- Plano official **2026–27 SchoolFinder**: https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder. Default street address is enough, but compare secondary high and senior-high separately.
- Documented exception outside the scope of this PR: Allen ISD publishes four split-apartment addresses with building/unit allocation (https://www.allenisd.org/page/findaschool). Agent #170 owns the Allen reconciliation; Agent 03 does not overwrite that work.

New pure policy module: scripts/dfw-official-finder-evidence-policy.cjs, with unit tests, checks the specific apartment complex, district, and official https source before escalating to building/unit. Missing official Finder results remain **UNVERIFIED**, not 'failed because unit is absent'.

The live dashboard test now records one of:
- SOURCE_CURRENT_YEAR_LABEL_ONLY — source is labeled current but independently confirmed enrollment is still outstanding
- PRIOR_YEAR_LAYER_REQUIRES_CURRENT_FINDER_COMPARISON — older GIS source must not become 2026–27 proof
- SOURCE_YEAR_UNVERIFIED — no trustworthy school-year declaration
- UNVERIFIED_OFFICIAL_FINDER — no independent school name/grade result captured

The new read-only Chromium script scripts/probe-dfw-official-finder-ui-browser.cjs opens district-owned 2026–27 Finder landing links, follows publisher-labeled locator links where available, checks the Lewisville apartment selector, and exports screenshots plus a structured UI inventory to the same QA artifact. **A working locator page is not a positive address-specific school match**; official Finder exact school names must still be extracted and compared. This script never guesses school names, scrapes GIS layers, stores private houses, or declares production approval.

CI statuses from distinct event types must be distinguished. A green push run on the exact HEAD certifies test execution only; no-job failed PR events and any upstream #162 integration failures remain separate blockers. Parent gate #148 is unchanged pending authorized release review.
