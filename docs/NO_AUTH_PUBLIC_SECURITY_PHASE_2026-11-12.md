# TX Dashboard — non-disruptive security phase (2026-11-12)

**Scope: AUDIT-ONLY.** Keep the existing family URL and experience untouched. No login, email OTP, private UAT, change to Pages settings, DNS, GitHub visibility, production build or main merge. This PR adds only a read-only test script, tests, workflow and this note.

## Existing coverage

- The public-release-security workflow already scans PR changes and Git history with Gitleaks, checks the tracked source, and tests a sanitized local preview. Passing does not authorize public launch.
- The live-public-privacy workflow checks retired personalized commute asset URLs for 404/410.
- Both HTML entrypoints have source-level CSP. Source meta CSP cannot enforce header-only frame-ancestors or reveal HTTP response security headers.

## Added coverage

- Request only the fixed publicly visible homepage (GET, no login, input addresses or cookies supplied).
- Report HTTP status, HTML content type, CSP presence/script baseline, HTTP CSP, anti-framing, nosniff, HSTS, referrer and permissions headers.
- Warnings are non-blocking on the current GitHub Pages family site; true CSP/status regressions fail the audit.
- Print categories only: never leak header values, HTML, address, tokens or user information.
- Read-only PR/weekly/manual Actions job with contents: read, no uploads, no deploy steps.
- Unit tests cover missing header warnings, stricter header pass, weak CSP failure, unexpected status, oversized response and fixed-origin requests.

## Outstanding — no access wall until a later separately authorized phase

1. Independently review all current and historical source, PR artifacts and any actual exposed credentials. Current green Gitleaks is scoped evidence, not full privacy certification.
2. Complete source-to-sink manual XSS review and vendor dependency advisories; review OSM/Esri/OSRM usage policy and school/GIS/rating/Redfin redistribution rights before promoting an unrestricted public product.
3. Verify GitHub legacy Branch Protection, actual required checks and reviewers from repository settings. An empty rulesets list does not establish no branch protection.
4. At an eventual distinct public hosting environment, enforce HTTP CSP with frame-ancestors, Referrer-Policy, X-Content-Type-Options, HSTS and browser regression tests. This PR does not change any live headers.
5. Defer private-source migration, Family UAT Access/email verification, new public-production domain and cutover until explicit owner approval.

**A hidden or unadvertised public URL is still publicly accessible.** This audit intentionally does not add friction to the current family workflow, and it is not a general-public launch GO decision.
