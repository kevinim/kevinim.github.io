# TX school UX and McKinney live GIS integration — 2026-11-17

## What this release contains
This branch integrates PR #323's six-section address-first layout, large TEA grade badges, and clearly labeled GIS *reference* campus markers on top of the existing deployed PR #324 McKinney source consistency read. The dashboard retains address -> district/source candidate status -> school filter and Liberty map -> Redfin -> comparison -> statistics, without changing any stored addresses, existing district publisher datasets or required CSP permissions.

## Merge conflict decisions
- The newer deployed `home-lookup-v2.js` and `features/mckinney-live-address-lookup.js` remain byte-identical to `main`. GIS publisher re-query uses the fixed public WebMap URL with no address/ZIP/coordinates.
- The combined `dashboard-main.js` keeps `mckinneyLiveCheck` source-conflict fail-closed guards and status messages while rendering user-requested grade badges and visually dashed, non-certified campus location pins.
- The combined `index.html` retains both McKinney source scripts and adds only the presentation CSS, navigation and six-section hosts. Asset ordering and historical immutable HTML normalizations are tested.
- The previously outdated offline browser expectation has been changed from mobile map-first to the requested filter-first mobile hierarchy; real 390/1366 px browser checks remain mandatory.

## Safety and scope
These are *reference* school-campus point coordinates and official GIS boundary candidates, **not** certified residence-specific attendance assignments. GIS source mismatch suppresses reference markers as well as cards. No official Finder address-result endpoint is claimed; residential holdouts and current-year middle/high validation remain unresolved. Never grant enrollment eligibility or promote source-only candidates to `home.assignment`. No new external host or paid service.

## Deployment
PR #324 already passed CI and deployed independently. Do not merge this UI integration until all new head checks, source-integrity, marker regression, mobile and safety workflows pass. After merge verify GitHub Pages build and live school-map smoke. If a data or map regression is observed, roll back this integration while retaining #324.
