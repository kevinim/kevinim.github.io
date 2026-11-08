# TX Dashboard — Family UAT / Public Production migration (NO CUTOVER)

**Status: design and offline validation only.** The current GitHub Pages URL, its repository visibility, Pages settings, and `main` are unchanged. This document does not authorize any publication or repository migration.

## Agreed target topology

| Surface | Purpose | Authentication | Source |
| --- | --- | --- | --- |
| `https://kevinim.github.io/` | Family-only *entry page* | A public static page may show a neutral login link, **but cannot itself enforce family-only access** | Public GitHub Pages, **only** minimal portal files after cutover |
| Family UAT | Full dashboard, private settings, Claude/Codex testing | Cloudflare Access (or equivalent upstream auth) with explicitly allowed family identities, MFA or email OTP, fail-closed | Private development repository -> private deployment target |
| Public Production | Separate URL, sanitized dashboard | Public, no user account required | Reviewed, sanitized release artifact from CI, separate deployment target |

**Important:** `kevinim.github.io` is under GitHub's DNS control. Cloudflare Access cannot be installed as an access-control proxy on that exact hostname. An unauthenticated visitor can always load the minimal portal at that URL. To truly make the *entry page itself* private, use a custom domain under your control, protected by Access, and stop serving the existing Pages hostname.

## Required private-source handling

1. Create a new **private** source repository with appropriate user permissions and audit logging. Avoid copying historical credential files or personal datasets without a separate review. Historical material already committed publicly remains potentially accessible via clones, forks or cached copies.
2. Host Family UAT behind an authenticated origin. Cloudflare Access policies must be applied to the production and preview hostnames (including branch previews); ensure no alternative `*.pages.dev`, GitHub Pages, public object storage or direct-origin route bypasses Access. Check that denial is returned **before** any HTML, JS, map JSON, source maps or other private asset bytes are served.
3. Do not embed authentication tokens or static passwords in browser JS. Use short-lived identity-based authorization at the edge. Configure per-family allowlists, emergency revocation and log retention.
4. Never assume `robots.txt`, `noindex`, a JavaScript password prompt, obscured URLs, or a private repository alone protects a public site.
5. Separate development deploy permissions from production promotion permissions. Restrict production deploy credentials to the public artifact target only; use a GitHub Environment with required approval where supported.
6. Retain the current public site unchanged while UAT is independently deployed and verified.

## Promotion contract

```text
Private source (feature branches)
  -> automated tests, school-boundary and Allen marker regression checks
  -> Family UAT (authenticated host; family review)
  -> approval + secret/history scan + provider terms + redistribution licenses
  -> sanitized public build (no personalized destinations, credentials or development docs)
  -> immutable versioned Public Production artifact (new public URL)
  -> browser QA + canary verification + release approval
```

A production release is **not** simply copying the entire UAT directory. All client-delivered files must be audited because browser JavaScript and public JSON can be downloaded by any visitor.

## Safe transition phases

**Phase 0 — Inventory (read-only):** record current Pages source, domain/DNS, workflows, deployment actor, public assets, and baseline SHA. Record open PRs #72, #73 and #76. Snapshot rollback reference. Do not alter `main`.

**Phase 1 — Family UAT:** create private source and authenticated deployment, configure Cloudflare Access allowlist, test logged-out denial for HTML, JS, JSON and preview URLs. Test with approved family identity on desktop/mobile, and a non-approved identity. Keep `kevinim.github.io` untouched.

**Phase 2 — Public Production:** create separate public URL (e.g. a distinct Cloudflare Pages project domain or a custom domain the owner controls). Deploy *only* the sanitized build from security PR #72 or successor, after provider/license signoffs. Test school marker/boundary data, address search, map layers, mobile responsiveness and traffic quotas. Keep Family UAT untouched.

**Phase 3 — Portal cutover:** only after both environments pass, replace GitHub Pages publication contents with a **minimal, neutral portal**. It may link to the protected UAT and, optionally, the public Production site. It must contain **no** dashboard HTML, JS, school/commute JSON, backups, personal configuration, old asset directories or alternate entry pages. Review Pages build caches, old paths, custom domains and CDN propagation. A redirect is **not** access control. Test anonymous GET requests to previously public asset paths and require 404/410 (or no sensitive bytes). Any historical copies outside the host remain outside this cutover's control.

**Phase 4 — Operationalization:** set required checks, branch protection/rulesets (subject to plan), rollback release tags, deploy access control, dependency monitoring and monthly access review. Never allow a failed UAT or audit to publish automatically.

## Mandatory cutover gate (all must pass)

- [ ] Private source repo created and permissions audited
- [ ] Family UAT host active and authenticated (positive + negative identity tests)
- [ ] Alternate UAT preview/origin URLs cannot bypass authentication
- [ ] Family UAT browser QA: school markers, Allen boundary, address, commute, risk layers, mobile
- [ ] Separate Production URL live with sanitized assets and provider/license approvals
- [ ] Public Production smoke + release rollback tested
- [ ] Minimal portal artifact independently scanned for leaks, unexpected files and old asset references
- [ ] Old `kevinim.github.io` direct asset paths tested anonymous after switch
- [ ] Owner approves exact cutover window and rollback plan

## Rollback

Before changing GitHub Pages, record the last known good deployment SHA and publishing configuration. Keep a tested, private archive. If portal cutover fails, restore a **safe, non-personal** static holding page rather than automatically republishing potentially sensitive family content. Production releases roll back to a previous approved public artifact; Family UAT rolls back independently. Record a release manifest and SHA for each environment.

## Current operational limitation

A GitHub PR cannot provision the user's Cloudflare account, authorize family emails, or guarantee that an authentication policy applies to a new domain. Those actions require owner-controlled credentials and provider setup. **Do not change the existing Pages publishing mode or delete existing files as a shortcut.**
