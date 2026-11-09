# West DFW safe integration into protected strict-CSP main

Reviewed: 2026-11-09 UTC. The deployment scope is the **public school / local area discovery feature only**, not a public-family Cloudflare cutover, private authorization system, or school district GIS redistribution.

## Five open Draft PRs reviewed

| Draft PR | Status | Decision |
| --- | --- | --- |
| #90 West DFW locations/ZIP/official ISD cards | clean against obsolete parent #86, not latest main | Recreate isolated runtime assets on current main |
| #99 West Keller historical GIS audit | clean against #90 | Bring source evidence/2018–19 warning and fail-closed tests only |
| #105 Official school Finder links | clean against #99 | Bring school-click direct official lookup (no residential-address transmission) |
| #88 externalize main inline bootstrap | **dirty against main** | **BLOCKED**; source code changes diverged; do not overwrite existing main script |
| #104 strict bootstrap + area assessment | **dirty against main**; PR documents privacy preview incompatibility | **BLOCKED** until curated public preview can include safely sanitized new script |

The #88/#104 code contains high-risk changes to a 70KB bootstrap with legacy data flows. The current main already includes regional area quick assessment and uses strict CSP with **one inline JavaScript SHA-256 token**. The integration deliberately **preserves that inline script byte-for-byte**, its CSP token and all existing area UI and school rendering code.

## Isolated compatibility method

Rather than merge stale `index.html` files:

1. Add only a `<details id="westDfwPanel">` block adjacent to the existing school scope; keep `schoolScope`, map and school details unchanged.
2. Add same-origin `features/west-dfw/panel.css`, `panel.js`, `official-finder.js` and `attach.js`; no new inline event handlers or script hash.
3. `attach.js` mounts once the existing ZIP selector contains seven West DFW ZIP entries. Uses existing public school array and `selectZip` without replacing it. Observes school directory updates only to refresh counts, and school details to upgrade the official link for the **selected campus district**.
4. Authorize only known official source hostnames in `trusted-link-policy.js`; no arbitrary HTTPS, query string prefill or browser address logging.
5. Incorporate #90, #99, #105 sources and negative tests; data/ISD registries explicitly keep `zoneKey:null`, `currency:null`, `address:null`.
6. The Keller city ArcGIS 2018–19 elementary/intermediate/middle/high polygons remain **not imported**, Northwest's documented current 2026–27 Finder remains external, and Carroll/GCISD have no demonstrated licensed current-year polygon exports.
7. Verify native CSP hash, source-vintage locks, all existing school GIS, Allen marker regression, sanitized public preview, 390px/1280px browser school navigation and no horizontal overflow.

## Privacy and external links

- The dashboard **does not send residential addresses** to district Finders; opening a URL is initiated by the user.
- Carroll `https://apps.myplanware.com/schoolsearch/carroll`; Keller `https://www.kellerisd.net/schoollocator`; Northwest `https://apps.myplanware.com/schoolsearch/northwest`. GCISD is an **official printed attendance map**, not an address search.
- Selecting Southlake ZIP `76092` only selects the ACS ZIP overlay and nearby campus points; it does NOT assert Carroll zoning, Westlake Academy admission, or residence eligibility.
- The publicly hosted GitHub Pages main deployment currently updates when main is merged. **This integration never changes GitHub Pages settings, Cloudflare configuration, visitor passwords, or UAT/Production separation.**
- The separate privacy-minimized public preview build must still fail its final **public launch attestation** until the owner independently separates family UAT and public Production. A successful preview smoke is not Production approval.

## Before merge to main

Verify PR integration CI + repo's existing source/security/browser workflows for the exact commit. If main has moved since the integration base, obtain a fresh mergeable comparison and re-test, not force-push. No change to #88/#104 without a separate conflict resolution and a reviewed safe public preview plan.

## Post-merge

Main deployment via existing GitHub Pages may occur automatically; verify its workflow result and live URL. Close the superseded West-only draft PRs #90/#99/#105 **only after** the integrated change is actually merged and the main deployment confirmed. Do not claim any GIS polygon was newly licensed or published.
