# TX Dashboard — Address-first school results and commute de-prioritization

Date: 2026-11-17  
Repository: `kevinim/kevinim.github.io`  
Branch: `feat/address-assigned-schools-first-20261117`

## Decision and user intent

- After a residence address is selected, the **address-assigned schools** are the only campus entities shown in the main school list and general school-marker layer.
- A school building in the same ZIP does **not** mean it serves the residential address. Do not display it just because of ZIP, distance, rating or a historical reference polygon.
- School information moves immediately below address search. Commute controls move to the bottom of the dashboard (before footer), without removing commute functionality.
- School grades and filters remain available for general ZIP browsing when the address is cleared, but cannot exclude an actual assigned school from the address result.

## Source-of-truth / NO-GO

`features/conditional-school-release.js` currently has an **empty approved residential-district registry**. This is intentional. Therefore the production dashboard must not fabricate official address-level assignments using historical GIS polygons, ZIP campus locations, schools that are nearby, or tentative district guesses.

After address search:
- With a certified official 2026–27 residential grant and campus match (none currently): show only those approved campus records as `공식 검증 배정학교`.
- Without a grant and no manually selected official Finder result: show **배정 미확인**, no generic ZIP school list/markers, and a prominent path to the official district Finder and user-selection tool.
- If the user **directly enters a school name seen in the district Finder**, show only explicitly selected campuses. Label this `사용자 선택 · 검증 전` and `배정 미인증` — never represent it as independently verified.
- On a new address or clearing an address: invalidate previous manual selections and selected map highlight. No residential address is saved to GitHub, local storage or a server.

## Implementation

- `index.html` contains `#homeAssignmentPriority`, immediately below the address form, and `#schoolAddressNotice` in the school results.
- `features/map-first-split.css`: separate responsive presentation; makes `.controls-grid` display:contents to preserve DOM parentage, listeners and ID lookup; the commute card uses a late CSS order. Retains mobile map-first ordering.
- `dashboard-main.js`: `addressSchoolView` is the sole shared evidence filter for school list, map markers and high-priority card. Certified grants use the unchanged `ConditionalSchoolRelease.decide` authorization; otherwise only manual schools chosen through `HomeSchoolManualBridge.selectedSchools(currentHome)` are allowed. Ignore ZIP/school-type/grade filters while a residential address is active. Card text uses textContent.
- `home-lookup-v2.js`: rendering updates priority panel, clears old ZIP-selected campus focus and scrolls to school assignment status, not map/commute.
- `features/home-school-manual-bridge.js`: exposes an in-memory, current-home-scoped list only after deliberate official Finder selection and Apply. Clears on new home/district; not automatic certification. Removes the misleading option to display all ZIP schools in address mode.

## QA / rollback

Run all required school, official Finder, conditional release, CSP/XSS, browser/viewport, map/markers and public-preview tests. New tests include `tests/address-school-focus.test.cjs` and a synthetic-only address/manual-selection scenario in `scripts/test-externalized-main-browser.cjs` at phone and desktop widths.

Critical checks:
- Search an address → empty unverified assignment (not a fabricated school); ZIP list and generic school markers disappear.
- Manual official Finder selection → only selected school(s) appear in both map/list and high-priority card, with visible independent-verification disclaimer.
- Change schoolScope to all → **cannot** bypass address lock.
- Clear address → old ZIP browsing and markers return.
- Before any address, general map/TEA filters unchanged; map boundary provenance and warning labels retained.
- Desktop commute below school/map/results; mobile no horizontal overflow.

If live QA fails, revert the single PR commit or restore the previous asset links without modifying TEA/GIS data or the protected conditional-school-release registry.
