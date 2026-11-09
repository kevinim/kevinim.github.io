# Southlake / West DFW direct official school assignment lookup — no authentication or deployment

## Root cause

Southlake and Westlake are city/ZIP areas crossing district boundaries. TEA/NCES school points are linked to individual campus districts, but no confirmed, licensed, current-year school-specific attendance GIS polygons have been loaded for the four western districts. Thus their school marker click has no on-map zone to render. The existing West DFW explorer feature remains an **unmerged Draft** rather than an automatic production update.

## Safe solution

The school detail panel and the missing-zone footnote now include an external official Finder link chosen by the **school's TEA district code**, not by assuming a ZIP or city maps to a single ISD. No residential address is auto-filled or transmitted by this dashboard. The user types it into the official district tool.

| TEA district | Verified official destination | Direct tool capability |
|---|---|---|
| Carroll `220919` | https://apps.myplanware.com/schoolsearch/carroll | Official address-based SchoolSearch, linked from district FAQ |
| Keller `220907` | https://www.kellerisd.net/schoollocator | Official district School Locator; redirects to district-published ArcGIS/MetroStudy application |
| Northwest `061911` | https://apps.myplanware.com/schoolsearch/northwest | Official year-selectable SchoolSearch, choose **2026–27**, not proposed 2027–28 |
| Grapevine-Colleyville `220906` | https://www.gcisd.net/page/attendance-area-maps/ | Official attendance zone maps; **not** represented as a verified address search |

### What this change deliberately does NOT do

- The link does not execute the district Finder, read its results, scrape an API, prefill a house address, or assert the selected school is assigned to any particular home.
- City/ZIP boundaries remain separate from district borders; Southlake and Westlake may be served by more than one ISD. Enrollment/charter, transfer and special campus exceptions continue to apply.
- No unsupported GIS polygon is loaded, not even the 2018–19 Keller city polygons or 2022–23 Northwest ArcGIS dataset.
- URLs are exact, reviewed HTTPS district-authorized destinations, no arbitrary query strings or user-controlled redirects. Links open in a new tab with `noopener noreferrer`.
- No new accounts, passwords, Cloudflare settings, live service, merge or deployment.

## QA

Run `node --test tests/west-dfw-official-finder.test.cjs` for seven negative/positive link safety checks.
Run `node scripts/test-west-dfw-browser.cjs` via dedicated CI for real selections from all four campus district codes, safe official direct links in both detail and missing-zone footnote, 76092 ZIP markers and responsive screens (390/1280 px). Validate pinned source audit via `node scripts/audit-west-dfw-zone-sources.cjs` and `node scripts/school-data-release-preflight.cjs`.

## Merge policy

Draft PR based on West DFW source-audit PR #99, which depends on PR #90. Do NOT retarget, merge or deploy until the parent branches are reconciled with current protected `main`, privacy/build security checks are rerun, and the owner approves site changes. `main` remains unchanged by this PR.

## Additional follow-up, outside scope

If users want official Finder results **inside** the dashboard rather than opening a new official page, obtain approved documented APIs, licensing and privacy/retention terms from each district vendor. Client-side scraping of hidden Finder endpoints or sending private addresses automatically is not an adequate substitute.
