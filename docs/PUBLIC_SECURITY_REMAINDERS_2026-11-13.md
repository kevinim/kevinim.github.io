# TX relocation dashboard — outstanding public security gates
Review date: 2026-11-13. Audience: family UAT maintainer. No secret/address values or credential logs here.

## Work performed on this candidate branch
- Shared Nominatim/OSRM client used by the homepage, home route and alternate reviewed entry point. Validate fixed origin/path, fail closed when service responses are 429/502/503/504/bad JSON/network errors, and apply a 12 s timeout instead of indefinite loading.
- Best-effort **per-browser-tab** pacing (at least 1100 ms between calls to each provider) and no automatic rate-limit retries. No address or route result caching; input is not printed in errors.
- Tests use fake provider responses and offline delays only; no vendor load testing. Source contract verifies both public entry points and previously existing disclosure.
- This is a *resilience improvement*, **not** proof of satisfying 1 req/sec across all visitors. A static Pages site cannot coordinate application-wide budgets between different users.

## Public (unrestricted) launch remains NO-GO
1. **Third-party provider capacity**: Public Nominatim and OSRM demo services require <=1 req/sec **application-wide**. Introduce a compliant licensed provider or a supported proxy with global quotas and abuse protection **before** wider promotion. Do not hardcode secret API keys into browser/Pages sources. Free services are not automatically production-scale entitlements.
2. **Historical personal information**: Issue #139 documents three retired personalized commute objects in earlier public Git history. Live current asset URLs returned 404 and current code does not include those objects, but old commits/PR refs/clones can retain data. Full-history Gitleaks scans detect credentials, not all PII. Do not describe this as remediated or erase history without separate owner authorization. First inventory branch/PR/fork exposure; consider a new clean public-production repository/build, with private source only if owner approves.
3. **HTTP security response headers**: GitHub Pages current public home includes meta CSP but previous actual response audit found missing HTTP CSP/frame-ancestors and other headers. No GitHub Pages code patch can arbitrarily add those headers to its hosted domain. For the *separate* future production origin, configure HTTP CSP including frame-ancestors, nosniff, HSTS, Permissions-Policy and Referrer-Policy. **OSM tiles need a valid browser Referer**; do not blindly use Referrer-Policy: no-referrer, prefer a policy that preserves origins for cross-origin tiles.
4. **Data/GIS rights**: Continue independent school GIS/year/attendance boundary evidence and redistribution/license checks; current release gate does not authorize inferring official school assignment from reference polygons.
5. **Owner release controls**: Branch protection, PR-only merge, required verify, no bypass/force-push/deletion, Actions default read-only and github-pages main-only environment were verified by the owner via screenshots 2026-11-13. Detailed provider contracts, public release architecture, and authority for rehoming historical data **remain separate decisions**.

## Official provider policies
- Nominatim: https://operations.osmfoundation.org/policies/nominatim/
- OSRM demo: https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
- OSM raster tiles: https://operations.osmfoundation.org/policies/tiles/
- GitHub sensitive history removal: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- Existing API evidence: docs/EXTERNAL_API_AUDIT_2026-11-08.md

## Scope / rollout
- No cost, DNS, repository visibility or login changes.
- No main merge, public Production launch or destructive history rewrite from this PR.
- Run all required Node and real-browser QA on this exact head and check normal address→school/map/commute behavior; owner approves merge to live family Pages separately.
- Public-production gate stays disabled in deploy/environment-plan.json.
