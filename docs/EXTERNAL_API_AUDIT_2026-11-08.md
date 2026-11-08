# External address/routing API review — DFW dashboard

Review date: 2026-11-08 (ET)
Status: **SOURCE-ONLY AUDIT; not a public-traffic compliance certification**
Linked issue: https://github.com/kevinim/kevinim.github.io/issues/74

## Observed browser data flows

| Entry point | User action | Browser-to-provider data |
| --- | --- | --- |
| Main index.html | Office route search | Destination text to Nominatim; route coordinates to OSRM demo |
| Main texas-address-suggest.js | Type a partial house address | Partial address to Esri suggestion service (320ms per-client debounce, not global quota) |
| Main home-lookup-v2.js | Submit a house address | Full address to Esri GeocodeServer with forStorage=false |
| Main home routing | Request directions | Home/office coordinates to OSRM public demo |
| Optional Collin parcel lookup | Explicit user action | Home pin coordinates to Collin CAD ArcGIS; fields OBJECTID, situsConcat, propYear only |
| Google Maps links | Click external directions link | Origin/destination passed to Google |
| Alternate reviewed.html | Destination search and routing | Destination text to Nominatim, coordinates to OSRM; verify privacy notice or retire this entrypoint |
| Basemap | Display/move map | Map tile requests, HTTP metadata to OSM or Esri |

## Official usage-policy checks

**Nominatim public API**: maximum **1 request/sec across the application**, identifiable HTTP Referer/User-Agent, attribution, no client-side autocomplete/bulk systematic queries, no confidential data. Current Nominatim calls are submit-triggered destination search, not house autocomplete. Source: https://operations.osmfoundation.org/policies/nominatim/

**OSRM public demo**: reasonable **noncommercial** use, not over 1 request/sec, no SLA or guaranteed availability/updates. Source: https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server

**OSM tiles**: HTTPS endpoint, attribution visible on all viewports, suitable Referer and caching, no bulk/offline prefetch. Source: https://operations.osmfoundation.org/policies/tiles/

**Esri geocoding**: current house search sends forStorage=false; confirm correct tier, billing, authentication, license, result retention and use cases before broad public exposure. Source: https://developers.arcgis.com/rest/geocode/find-address-candidates/

## QA in this draft PR

- Offline, no-vendor-request source contract checker and unit tests.
- Confirm known provider markers and the current home-address disclosure remain present.
- Reject Nominatim as home autocomplete, insecure OSM tile protocol, unexpected Esri storage setting, removed main privacy notice, or expanded Collin parcel field allowlist.
- Warn about unresolved reviewed.html notice, third-party obligations and missing cross-user rate limiting.
- **Limitation:** static markers cannot measure real HTTP traffic, prove vendor licensing, inspect all dynamic URLs or certify privacy.

## Follow-ups required for external promotion

1. Decide on a licensed, production-suitable geocoding/routing provider or maintained proxy with global quotas, caching, abuse limits and documented data handling. Public demo services cannot guarantee reliability at scale.
2. Review and improve disclosure for each address/office/parcel flow, including alternate reviewed.html; do not promise providers delete submitted coordinates or text.
3. Test provider 429/503/timeout and graceful fallback in a separate runtime PR coordinated with Claude. Preserve all school markers and map controls.
4. Request actual provider quotes/capacity before calculating cost. Do not invent pricing or hidden usage entitlements.
5. Run mobile/desktop attribution and browser network verification before any GO to public marketing.

## Change boundaries

New files only: scripts/audit-external-api-contract.cjs, tests/audit-external-api-contract.test.cjs, .github/workflows/audit-external-api-contract.yml, and this report.
No edits to existing UI/maps/schools, Claude security PR #72, Pages configuration or default branch. Keep PR draft/unmerged.
