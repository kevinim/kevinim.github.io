# Agent 06 — Independent security and release quality review
Date: 2026-11-09
Repository: kevinim/kevinim.github.io
Main baseline at inspection: 0a0e81b4495e7e1e306bcc8dd714eb15008f167e
Release decision: NO-GO for broad public promotion. This is not permission to merge or deploy.

## Evidence and scope
- Open/Draft #161, #172, #173 inspected before changes. All 35 PR #173 Actions workflows completed successfully at e5bcae64b154abf4d2ff36bb2599780f5a82b38b.
- The PR #173 public-release-security run 42661625988 contains four successful jobs: PR secret scan, full-history Gitleaks, source privacy regression, and offline preview Chromium.
- Main branch is protected, but the branch protection response showed only the required status context named verify. Confirm additional security checks/rulesets before relying on this as sufficient mandatory release approval.
- Existing independent work: #138 neutral builders and live retired-asset checks, #140 address-provider notices, #142 SHA pinning across existing workflows. Those PRs were open and not incorporated into main at inspection.
- This branch adds an isolated, read-only guard of first-party entrypoint asset paths and address handler persistence/logging, plus an offline synthetic browser test. It does not modify any GIS, attendance mapping, map implementation, or existing workflow.

## Severity-ranked results
| Level | Area | Evidence and action |
| --- | --- | --- |
| HIGH release blocker | Public source and historical artifacts | The current repository is public. A private source/public curated artifact strategy is described in PUBLIC_PROVIDER_READINESS.md but not implemented. The existing public Pages URL does not make historical source private. #138 addresses a portion of retired asset verification. No repository migration or history rewrite authorized. |
| HIGH release blocker | Address-to-school correctness | #148 mandatory independently confirmed residential address/Finder/current-year polygon gate remains NO-GO. Green UI/CI is not school assignment certification. |
| MEDIUM | Third-party data transmission | Main address suggest sends typed prefix to Esri, full geocode sends full address to Esri, route calculation sends coordinates to OSRM. Another destination flow uses Nominatim. External providers may retain their own logs. Disclosures remain in #140; user consent, legal terms and rate-limit readiness must be independently settled. |
| MEDIUM | Workflow supply chain | Main workflows have floating official action version tags; #142 pins 36 workflows. Two additional overlapping workflows are excluded by #142 for coordination. Do not merge the audit branch as a substitute for #142. |
| MEDIUM | Legacy alternate entrypoint | reviewed.html is a separate public HTML route with distinct legacy client code. #140 adds disclosure. Publication and third-party request scope need sign-off or deliberate retirement. |
| MEDIUM | Dependency and external uptime | Leaflet 1.9.4 is loaded via unpkg with SRI; Playwright 1.65.0 is installed ad hoc in CI. Provider/map tile outages can interrupt external services. Browser source has fallbacks and timeout handlers, but live-provider capacity and terms remain unverified. |
| MEDIUM | Production asset/cache behavior | Local first-party script/CSS references were present in main. Actual retired public asset 404/410 and cache-busted behavior is separately handled by #138 and must be checked against Pages after authorized deployment. |
| LOW, scoped | Credentials | Full-history and change Gitleaks jobs in PR #173 passed. This means no detections under those scanners and runs, not a guarantee that no secret has ever existed. Do not print credential strings. |
| LOW, scoped | Address retention | Reviewed address modules did not use localStorage, sessionStorage, IndexedDB, document.cookie or sendBeacon. Theme preference alone uses localStorage with a static key. Source inspection cannot prove absence of browser/vendor telemetry. New synthetic browser CI checks runtime storage, URL, console and clear behavior. |
| LOW, scoped | XSS and browser script policy | The public entrypoints use a restrictive script CSP and an SRI-pinned external Leaflet script. Existing hostile-input and strict CSP regression suites passed on #173. This is defense in depth, not a full penetration test. |
| REVIEW | GitHub Pages HTTP headers | Existing meta CSP does not by itself prove HTTP header enforcement (such as frame-ancestors). Confirm deployed response headers through a dedicated live HTTP check and document GitHub Pages platform limitations before release. |

## Ten-item audit coverage
1. Secrets: successful Git history/PR Gitleaks evidence; do not infer zero historical risk.
2. Frontend sensitive content: public-source and curated-artifact migration remain gated.
3. Address history and location: targeted non-persistence check; provider-side retention not measurable.
4. XSS: existing CSP/SRI/hostile-input CI; targeted address sink regression.
5. External API: Esri/OSRM/Nominatim/OSM usage inventoried; privacy and terms not signed off.
6. Dependencies: CDN/SRI and unpinned transitive CI installation risk noted; no package-based frontend dependency lock found in main root.
7. GitHub Actions: review of read-only security jobs; immutable action updates pending #142; check required status contexts.
8. Pages and headers: source-level CSP verified; live HTTP policy verification remains outside this branch.
9. Missing assets/cache: source references verified, new CI guard; retired published assets require #138 HTTP proof.
10. Provider outage: existing zone timeout and fallback logic reviewed; new browser test blocks all external providers and tests that map shell and address clearing still function.

## CI policy of this Draft PR
- Run node-only unit negative tests, source asset-path audit, existing CSP/XSS/provider tests.
- Build an isolated public preview; run Chromium at 390px and 1366px with only synthetic non-address text. All third-party geocode, routing and map tile requests are intercepted and blocked; no private residential input is sent or recorded.
- Check no address persistence in local/session storage, IndexedDB, cookies, URL query/hash, and no raw search echo in console; verify clear button and map shell continuity.
- Store only minimal summary flags and counts in artifacts, not screenshots, raw network URLs, addresses or geolocation.
- Workflow permissions: contents read; pinned checkout/setup-node/upload-artifact commits; no deployment and no changes to main.

## Required before release GO
- Obtain green Agent 06 jobs at the final commit and preserve their links.
- Integrate #138/#140/#142 safely and rerun full CI at the actual combined SHA.
- Independently verify all required security checks are enforced by the main branch ruleset.
- Recheck actual public HTTP headers, retired asset cache responses, third-party terms and license/attribution obligations.
- Retain #148 residential school assignment NO-GO until its independent official Finder/current-year GIS evidence passes.
- Owner reviews and explicitly approves the ordered merge/deployment. No auto-merge, push to main or production Pages changes are performed by this review.

## Known limits
This audit has no access to provider-side request logs, actual user browser state, historical forks, hidden GitHub secrets, or the full deployment/CDN infrastructure. Green CI on an isolated branch is necessary but not sufficient for Production release.
