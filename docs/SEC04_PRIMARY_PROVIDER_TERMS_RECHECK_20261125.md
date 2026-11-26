# SEC-04 — Primary-source Public Production provider rights recheck (2026-11-25 ET)

**Scope:** Independent documentation of provider-level terms for the *future* curated public bundle, plus a tighter synthetic rights-approval gate. **No Public Production launch, license grant, pricing commitment or change to existing family Pages.**

## Verified primary sources (read 2026-11-25)

| Family | Official current source | Observation | Decision for general-public deployment |
| --- | --- | --- | --- |
| TEA website content | https://tea.texas.gov/about-tea/welcome-and-overview/site-policies | TEA restricts copying and alteration of website content; exceptions include Texas residents' *personal* copies and district/charter/ESC educational use. The website-wide terms do not grant a site operator blanket rehosting rights. | **Pending** individual dataset terms; do not infer a right to rehost rating, PEIMS, STAAR or downloaded reports from a public link. |
| OSM Foundation standard tiles | https://operations.osmfoundation.org/policies/tiles/ | Required visible attribution, valid browser Referer, cache compliance, exact HTTPS endpoint; disallows bulk/preloading. OSM *data* licensing differs from donated tile-server service use. | **Conditional / public-traffic readiness not verified.** No approval to sustain uncontrolled volume. |
| OSRM demo routing | https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server | Documented as reasonable non-commercial use, maximum 1 request/sec and no availability/latency/update guarantees. A browser-local throttle cannot prove a sitewide request rate. | **Blocked for general-public scaling until a compliant provider strategy exists.** |
| Esri web/ArcGIS third-party layers | https://www.esri.com/en-us/legal/terms/web-site-service | Third-party data rights do not automatically transfer with public ArcGIS availability; additional item-specific licenses and restrictions may apply. | **Pending** per layer/publisher evidence, not presumed public domain. |

These observations concern **provider categories**, not exact asset-by-asset approvals. A dataset's separately published license may differ from site-wide general terms; inspect its authoritative terms, original version and transformations before any disposition.

## Implemented gate change in this PR

`scripts/audit-public-data-rights.cjs` now rejects a registry record marked `approved` unless it includes all of the preexisting approval fields **plus**:

- Original HTTPS `sourceUrl`, `retrievedAt`, `dataVintage` and `geographicScope`.
- Explicit `permissionBasis`: `publisher-license`, `written-authorization` or `public-domain-verified`.
- Individually declared boolean `permissions`: `publicDisplay`, `redistribution`, `browserCaching` and `modification`. Approval requires the first three `true`, and requires a deliberate boolean decision for modification.

These are **evidence-completeness checks, not legal authentication**. A human reviewer must independently inspect the linked authoritative source and rights. An untouched source pin, successful GitHub test, or a `true` field cannot grant permission by itself.

`tests/audit-public-data-rights.test.cjs` includes synthetic positive validation and negative cases for each missing field, disabled public rights, malformed type, unsupported permission basis and insecure source URL.

## Explicitly still open

1. Existing `deploy/public-data-rights.json` remains **default pending**, with `assets={}`; no real file is promoted to approved in this change.
2. Prior exact-build baseline after PR #405 was **276 bundled data/media candidates, 0 approved**. This PR does not modify the public-preview builder or claim new exact-build counts.
3. Static JSON/media scanner does **not** certify JS/HTML/CSS embedded data, browser-fetched third-party content, provider quotas, full historical PII remediation, HTTP response headers or live deployment.
4. Public source separation, exact host headers, end-to-end browser privacy and owner GO must remain independent release gates.
5. External links and provider terms can change; verify again immediately before any owner-approved Public Production promotion.

**Decision: PUBLIC PRODUCTION NO-GO.** Existing GitHub Pages and all school assignment/zone claims remain unchanged.
