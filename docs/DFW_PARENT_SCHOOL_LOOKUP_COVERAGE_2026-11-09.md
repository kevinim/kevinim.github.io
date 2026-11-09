# Parent school assignment guidance — DFW district expansion

> **Standing roadmap decision (2026-11-09):** All DFW districts in the dashboard's full geographic and school search scope—not just the original six—must be measured and prioritized by *official assignment guidance coverage, independently matched school-specific map boundaries and explicit missing reasons*, using the full in-scope district denominator. The current 29 registered ISDs are **not** the DFW universe. See [issue #125](https://github.com/kevinim/kevinim.github.io/issues/125) and the priority rules in [HANDOFF.md](../HANDOFF.md).


Reviewed: **2026-11-09**. Existing GitHub Pages site; no separate UAT or Production host.

## What a resident must check

1. Verify the school DISTRICT for the exact residential parcel. City/ZIP/campus proximity are not assignment proof.
2. Use the district's official address locator with the right school year and grade, including apartment/unit exceptions.
3. Distinguish standard zoned schools from magnet, charter, transfer, grade-only campus, grandfathering and school-choice.
4. Confirm with registrar before buying or leasing if the address is near a boundary or public source is outdated.

TEA collects district boundaries, NOT school-by-school attendance zones. Source: https://tea.texas.gov/families-and-students/school-district-locator/school-district-locator-faq

## Newly linked neighboring 18 districts

The TEA 2026 campus rating file has **674 records** in these districts, not an official current-zoned school total.

- Collin: Wylie, Melissa, Celina, Princeton, Anna, Community
- Denton: Little Elm, Denton, Argyle
- Dallas and northwest: Coppell, Richardson, Garland, Irving, Mesquite, Dallas
- East/south: Forney, Rockwall
- Northeast Tarrant: Hurst-Euless-Bedford

Full district IDs, official URLs, year evidence and cautions: data/dfw-neighbor-official-school-links-2026.json.

## Link and GIS honesty

- **Official parent lookup guidance:** links to approved district registration/School Finder pages; a linked page is not necessarily the actual search form.
- **Official map:** approved map link, not an address-school determination on this site.
- **Inquiry:** district map plus official request for confirmation, especially near zone boundaries.
- **School choice:** Garland families rank campuses and receive a placement; do not pretend proximity or ZIP assigns one campus.
- **Unverified:** keep explicit missing-boundary status; never replace campus polygons with district outline, city border, ZIP, or historic school zone.

Special source-year flags: Melissa instructions still mention 2025–26; Anna/Princeton offer distinct 2026–27; Celina/Forney also show proposed 2027–28 plans; HEB's dedicated address lookup reported an outage in July 2026. Verify current grades and year with the official ISD.

## Remaining independent work

The 18 newly registered districts are **parent-facing navigation only**. No new district has gained verified school-campus GeoJSON. Previous 11 existing district entries remain and total registered coverage now reaches 29. Polygon completeness and individual student assignments are distinct from links. Future source discovery should use TEA LEA IDs plus geography, not a fixed six-district shortlist; prioritize Lovejoy, Aubrey, Lake Dallas, Birdville, Eagle Mountain–Saginaw, Mansfield, and additional Collin/Denton/Tarrant fringe ISDs.

## QA

Source and TEA code audit: tests/dfw-neighbor-finders.test.cjs.
Actual browser click and no-invented-polygon verification: scripts/test-dfw-neighbor-finders-browser.cjs, on desktop 1366px and mobile 390px, two schools in each added district. Existing Allen, school boundary, CSP, XSS and public-preview regressions remain release gates. New official-domain links cannot automatically send any home address.
