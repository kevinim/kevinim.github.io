# Public exposure audit — TX Relocation Dashboard

**Date:** 2026-11-08 (ET)
**Scope:** Public GitHub Pages repository, current tracked tree / code review
**Status:** Initial read-only review + preventive checker; **NOT a complete security clearance**
**Change safety:** This track changes no existing dashboard HTML, school data, map logic, or release files. PR #70 is independently owned by Claude.

## Verified observations

1. **The site and source are public.** Sharing only the deployed URL does not hide the public repository or its current and previous committed sources. Do not treat static JavaScript, HTML, GeoJSON, documentation, or fetched JSON as confidential.
2. **Personalized commute context is embedded in public code/data.** The current index.html includes a named work-destination address and predefined employer destinations. Public commute datasets with employer-specific naming also exist, including jpm-road-times-2026-11-04.json, jpm-outside-dfw.json, and jpm-60min-isochrone-2026-11-04.geojson. These may be intentional public examples, but an owner decision is required before advertising the site broadly. This report deliberately does **not** reproduce addresses or coordinates.
3. **Third-party address processing is disclosed in the UI.** The home-search notice names address/point transfers to external services (Esri, OSRM, Collin CAD conditionally, and Google Maps when linked). Routing code also uses other public geocoding/routing services. Assess provider terms, privacy disclosures, rate limits, and privacy expectations before public promotion.
4. **Sample credential-pattern review:** The ten targeted current files reviewed on this date (primary page, reviewed page, address lookup, commute layer, two commute JSON files, and four project documentation/implementation files) contained **no matches** for a narrow set of well-known secret signatures. This does **not** establish that the entire working tree, Git history, or all vendor credentials are safe. Official district contact emails in source-acquisition documentation are not, by themselves, leaked credentials.

## Preventive guardrail proposed in this draft PR

- scripts/audit-public-exposure.mjs enumerates **tracked files** and scans UTF-8 text using high-confidence private-key / GitHub / AWS / Google / Slack / Stripe / Telegram-token signatures.
- Logs contain **filename, line number and rule only**, never matched key content.
- Fails CI on signature hits; reports skipped binary / over-10MiB files instead of silently treating them as scanned.
- tests/audit-public-exposure.test.mjs exercises detection, false-positive samples and redaction.
- .github/workflows/audit-public-exposure.yml runs independently on PRs and pushes to main, with read-only repository permissions and no npm packages.

**Important:** The scanner is preventive, not exhaustive. It does not detect arbitrary credentials, personal information, Git history leaks, browser runtime data exfiltration, unsafe HTML/JS injection, vendor credential restrictions, or confidential details inferred from otherwise public code. A passing run is **not** a release authorization.

## Remaining review gates before broad public sharing

| Gate | Priority | Check / owner decision |
| --- | --- | --- |
| Work-destination personalization | P0 | Decide whether to replace personalized destinations and employer-labeled datasets with generic examples or a local-only user setting. Preserve household-specific defaults only outside public committed source. |
| Full Git history secret scan | P0 | Run a redacted history scan (e.g., Gitleaks) and GitHub security alerts; rotate any confirmed secrets, including secrets removed from present files. |
| Personal context review | P0 | Manually review all published source/data/docs/PR descriptions and Git history for household addresses, sensitive plans, credentials, and identifying coordinates. Do not add real examples to public issues or CI fixtures. |
| API/provider restrictions | P1 | Validate API usage terms, allowed browser origins, quotas, fallback behavior, and whether a backend proxy is required for private paid keys. |
| Privacy and usage notice | P1 | Verify service-by-service address transmission, data retention claims, and scope before sharing with others. Avoid promising that third parties never retain request data. |
| Injection and dependency review | P1 | Independently audit dynamic HTML, links, URL parameters, external scripts/styles, dependency integrity, and security headers/CSP without changing Claude's active runtime files. |
| Protection/process | P1 | Confirm main branch protection or rulesets, review requirements, CI enforcement, and production smoke coverage before an audited PR is merged. |

## Collaboration and verification

- Active overlapping work at audit start: **PR #70** (winter/crime map toggle and remote school-zone timeout). Its changed files are explicitly excluded from this branch.
- This audit adds only **new scanner, test, workflow, and documentation files**.
- Do **not** merge or deploy this draft automatically. Review the CI result and the manual gates above; share relevant summary with Claude through PR #70 comments.
- The findings above describe the initial review only. When CI runs, separately record the exact green/red run and any skips. Do not call unverified checks passed.
