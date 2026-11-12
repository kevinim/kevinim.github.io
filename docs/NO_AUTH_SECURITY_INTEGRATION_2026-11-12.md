# No-auth security integration QA — 2026-11-12

Base main commit: 4cd38e64f20480397e0590cc13e5ec1cca4ea7f5

## Input PRs
- #279 — live HTTP response header checks and regression tests
- #280 — canonical OpenStreetMap legacy tile endpoint and provider negative tests
- #281 — browser-saved workplace HTML/XSS negative tests
- #282 — GitHub Actions nested write-scope audit

These are 13 distinct changed paths, with **zero path overlap** at their original tested heads. The aggregate candidate is built from the exact file content of each PR head, without merging any existing production branch.

## Constraints
- Read-only tests; no login, Cloudflare Access, user authentication, emails or cookies
- Existing family homepage and interactive runtime stay unchanged, except the legacy map tile endpoint after an eventual approved merge
- Do not rewrite Git history, change repo visibility or cut over hosting
- No automatic GitHub Pages deployment, approval or merge
- Existing public-production launch gate stays intentionally blocked pending provider/data licenses, separate curated source and explicit owner release authorization

## Acceptance
1. Combined Node security regression suites, source privacy gate, and sanctioned preview builder all pass on this **combined** SHA.
2. Chromium visitor XSS, school locator/GIS, and existing workflow protections pass on the combined PR.
3. Live HTTP header warnings are documented as warnings, not interpreted as proof of secure HTTP headers.
4. Existing current-site HTTP 200 and old personalized data retirement checks continue to pass.
5. Any true security regression or school UI regression blocks integration.
6. Owner explicitly approves main merge/deployment separately.

This integration is a review candidate, not a production deployment.
