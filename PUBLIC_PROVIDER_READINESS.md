# TX Dashboard — public-service provider and privacy readiness

**Status: BLOCKED for external promotion; draft-only.** This is an operator checklist, not evidence of a provider license grant.

## Verified source usage (Nov 8, 2026)

| Provider or category | Browser usage | Key exposure | Public rollout action |
| --- | --- | --- | --- |
| Esri World Geocoding / Suggest | Search text, address suggestions and geocoding; user address goes to a third party | No dedicated key detected in main checked assets | Confirm authorization, expected volume, attribution, privacy terms, and pricing. `forStorage=false` must be respected |
| OpenStreetMap tiles (`tile.openstreetmap.org`) | Base map tiles and browser referer | No key | Respect attribution and caching. No prefetch or bulk tile download. Do not suppress browser Referer. Use a hosted paid/provider tile plan for sustained traffic |
| OSRM demo routing (`router.project-osrm.org`) | Coordinates sent for route and table calculations | No key | Demo server is best effort with no volume guarantees; confirm current terms and migrate to licensed routing or controlled self-hosting for broad public use. Client-side per-visitor throttling does NOT enforce a sitewide quota |
| Nominatim (`nominatim.openstreetmap.org`) | Used in family `main` destination geocoding | No key | Public preview builder replaces this call with the already integrated Esri lookup. Original family version is unchanged; demo is not a scalable general-public geocoder |
| Esri ArcGIS school / county GIS and state/federal datasets | School and hazard boundaries, map overlays | Provider-specific | Validate the applicable licenses, retention and attribution for EVERY dataset; distinguish static snapshots from live official sources |
| Rating datasets | School ratings and provenance | No key detected in inspected files | Confirm ratings can legally be displayed or redistributed, and show vintage and district official Finder links |

Policy reference links (must recheck on launch day):

- GitHub Pages public/private source eligibility: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- OSMF Tile Usage Policy: https://operations.osmfoundation.org/policies/tiles/
- OSMF Nominatim Usage Policy: https://operations.osmfoundation.org/policies/nominatim/
- OSRM demo service policy overview: https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
- Esri World Geocoding Service: https://developers.arcgis.com/rest/geocode/api-reference/overview-world-geocoding-service.htm
- Esri geocoding storage restrictions: https://developers.arcgis.com/rest/geocode/find-address-candidates/

## Private source vs public URL

**Option A (works with GitHub Free):** Keep `kevinim.github.io` as a public *deployment-only* repository containing only a curated, reviewed static build; move complete development source and full history to a NEW private source repository. Only an approved CI pipeline can push a public bundle to the deployment repository. Do not put GitHub credentials into browser JS; use a fine-scoped, rotating deployment credential stored in GitHub secrets. This requires creating the new private repository, migrating CI and preserving the Pages settings. Do not initiate without separate approval.

**Option B (paid GitHub plan if eligible):** Keep development repository private and use Pages with a supported private-repository plan and approved publishing workflow. The published HTML, JS and static data still remain browser-visible. Plan capability and continued URL availability must be checked before switching. Never assume private GitHub repository alone protects visitor-delivered code.

Do not try to rewrite or erase the history of the current public repo without a separate archival and key-rotation plan: others may already have fetched it.

## Public preview produced by CI

- `scripts/build-public-preview.cjs` creates a sanitized preview only under the gitignored `dist/public-preview` path.
- It omits private-purpose precomputed commute datasets, default destination, historical route overlays, development docs, test code and Git metadata. A neutralized neighborhood JSON dataset retains public demographics without precomputed office travel times.
- It adds a visible Korean address-processing and school/data-accuracy notice and keeps user-entered destination workflows.
- It replaces the Nominatim destination request with the existing Esri search helper in this preview only.
- `scripts/verify-public-preview.cjs` verifies no sensitive default identifiers, essential school/map hooks, zero secrets and zero disallowed files. It *expects* the strict release check to stay BLOCKED.
- The preview has **not** been deployed or manually browser QA tested. All source changes are on a draft PR and do not affect the family dashboard.

## Mandatory signoffs before release

- [ ] Separate private full source and public curated artifact; confirm URL and GitHub plan.
- [ ] Validate Esri, OSRM, OSM, external GIS licenses and quantitative traffic limits.
- [ ] Validate redistribution rights for every supplied school/rating and risk dataset.
- [ ] Full public-preview browser QA on desktop and mobile, including Allen markers, school bounds, nearby houses, target commute, address suggestions, provider failures, and accessible disclosures.
- [ ] Owner makes explicit GO decision only after reviewing redacted audit and security findings.

`PUBLIC_SOURCE_SEPARATED`, `PUBLIC_PROVIDER_TERMS_CONFIRMED`, `PUBLIC_DATA_LICENSES_CONFIRMED`, `PUBLIC_BROWSER_QA_CONFIRMED`, and `PUBLIC_OWNER_GO` are **manual release attestation gates**; each requires `confirmed` to advance the dry-run checker. These environment variables are not an authorization system. Enforce a separate GitHub Environment approval policy and required branch status checks before any actual deployment pipeline exists.
