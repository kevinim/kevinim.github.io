# CFB official Finder in-dashboard pilot — November 10, 2026

## Intent
When a person is researching a Carrollton–Farmers Branch ISD property, allow them to operate the **official district GuideK12 SchoolSearch inside our dashboard**, rather than navigating away to an unrelated link and assuming nearby schools are their assigned schools.

The official CFBISD `School Search` page itself embeds `https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/` as an iframe. That demonstrates an officially operated iframe presentation, **not** unrestricted third-party embedding or a supported data API.

## Design / privacy / rights
- Explicit user action opens the wide panel, and a second explicit click creates the iframe.
- Original CFBISD SchoolSearch URL remains an immediate fallback if an iframe is blocked on the dashboard origin.
- No address is sent from Esri/dashboard to GuideK12 automatically; the user enters it in the vendor-managed iframe and chooses the vendor's native autocomplete result.
- No iframe DOM scraping, internal endpoint reverse engineering, background bulk lookup, data rehosting, source-derived polygons, new storage or billing.
- Content Security Policy change is limited to `frame-src https://app.guidek12.com`. The dashboard's `connect-src`, `script-src`, `form-action`, and `object-src` are unchanged. The iframe uses a sandbox and `no-referrer`.
- Close removes the frame and its on-screen session. We cannot control vendor cookies or access logs.
- Source provenance stays `official_live_finder_with_no_verified_dashboard_GIS`; CFB currently has **0/30 dashboard-linked campus polygons**. No residential school assignments are authorized by the dashboard's immutable Conditional School Release policy.

## What works if provider embedding is permitted
Use GuideK12's own address autocomplete, zoning result list and map directly inside the dedicated responsive dashboard panel. Results are the official vendor UI, not copied/re-rendered school cards or attendance-zone polygons in our Leaflet layer.

## What remains unimplemented / requires separate evidence
1. **Cross-origin bridge:** prefilling a dashboard-selected home address inside the iframe or reading its assigned school names requires provider-supported postMessage, embed parameters, permitted API, or district-supplied GIS and independent exact-address validation. We have not identified or enabled such a contract.
2. **Embedding rights:** district embedding does not establish permission to embed on github.io. Confirm `frame-ancestors`/X-Frame-Options and licensing, and validate on the actual deployment origin.
3. **Publisher qualification:** March 6, 2025 board-approved zone presentation is not independent proof of 2026–27 machine-readable polygon vintage.
4. **School-to-map:** real verified per-campus E/M/H geometries + current-year rights and residential holdouts remain a separate #148 NO_GO.
5. **Release:** #204 is draft only. No main merge or production deployment without user approval and browser/security verification.

## Reproducible verification
`node --test tests/cfb-official-inline-embed.test.cjs tests/cfb-official-rezoning-reference.test.cjs tests/csp-network-allowlist.test.cjs`
and the existing pinned `node --test tests/externalized-main-bootstrap.test.cjs` (Git repo with original baseline available).

GitHub Action `cfb-inline-official-finder-pilot-qa.yml` executes offline tests and a separate real Chromium local-origin test at 390px and 1366px. If the vendor refuses embedding or is unreachable, **record NO_GO**; do not bypass the vendor with a proxy, scraper, browser security override or fake results. A local-origin PASS still requires real GitHub Pages-origin QA.

## No conflict
No edits to `home-lookup-v2.js`, school assignment policies, school markers, CFB GIS sources, or the parallel address-zoom/QA branches. This code is a narrow optional official-source UI only.
