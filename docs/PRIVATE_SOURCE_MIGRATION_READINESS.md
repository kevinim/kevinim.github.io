# TX DFW — Private source repository migration preflight

**Scope: inventory and verification ONLY. No GitHub private repository created, no file transfer, no Cloudflare/DNS/Pages change, and no production release approval.**

The current `kevinim.github.io` GitHub source repository and history remain public. A new private repo would not make already published commit history private, nor would it prevent a visitor from reading static HTML/JS/data deployed to a future public website.

## New machine-checked separation plan

The read-only script `scripts/private-source-migration-preflight.cjs` obtains the **tracked file list** using `git ls-files -z` from the exact checked-out commit, validates paths/symlinks/sizes, and classifies every tracked file. These groups are recommendations, not permission to import anything automatically.

| Group | Treatment in future clean-source import |
| --- | --- |
| `source_code_candidate` | Potential source for a new private repo **after source review**; no automatic copying |
| `personalized_source_review` | JS/HTML with family or workplace commute markers; requires intentional private-only treatment and any required cleanup |
| `restricted_family_review` | Current family dashboard HTML, legacy review page, family/workplace-specific data files; **quarantine until approved** |
| `dataset_license_review` | School/demographic/risk `.json`, `.geojson` and related data; source age, licensing, privacy and redistribution review required |
| `documentation_review` | Agent instructions, handoff notes, migration and source-audit docs; manually review for internal or private context before re-import |
| `deployment_quarantine` | All `.github/**` workflows, `deploy/**` plans, `CNAME`, Wrangler, package deployment configs; **recreate appropriately** in the private repo, never blindly mirror live Pages actions |
| `FORBIDDEN` | `.git` objects/history, `.env*`, private keys, credentials, `dist/`, `node_modules/`, `artifacts/`, and suspicious tracked secret filenames; **hard failure** |

In the initial source import, **do not use `git clone --mirror` or push public repository history**. A later owner-approved private project should start from a reviewed clean snapshot and new initial commit. Keep the original public repo untouched until the owner independently approves cutover, and investigate/rotate any confirmed previously exposed credentials.

### Dependency and safety checks

- Inspect static local `<script src>`, `<link href>`, `<img src>`, and literal `fetch('./...')` references in `index.html`. A missing or escaping local reference blocks the preflight. Dynamic requests are **not** inferred; use existing school, GIS and browser QA.
- Require known entrypoints (main app, school registry, polygon matcher, main region features, family landing builder and public sanitized builder) to remain represented; unknown new files default to review, not implicit trust.
- Use the existing public-security scanner to report possible token formats by **category only**, never matched values. A potential credential indicator blocks the inventory preflight pending investigation. This is separate from full-history Gitleaks, which still runs in the existing public security workflow.
- Abort on tracked secret-looking filenames, symlinks, unreadable files, path traversal or suspiciously large individual files. Do not copy anything.
- Produce only `artifacts/private-source-migration/summary.json` for public CI artifacts: counts, byte totals by classification, dependency counts and blocking categories. A more detailed path + SHA-256 inventory is generated **locally only** in `artifacts/private-source-migration/local-manifest.json` and is never uploaded by the workflow.

**Passing this preflight means only that a manual source review can begin.** The status is deliberately `PREPARED_MANUAL_SOURCE_REVIEW_REQUIRED`, not `MIGRATION_APPROVED` or `READY_FOR_PRODUCTION`.

## User-independent steps now completed

1. Read-only tracked-tree inventory and all-file category classifications.
2. Rules that prohibit copying `.git` history, sensitive filenames, live CI and public Pages deployment configuration.
3. Static HTML dependency baseline and fail-closed tests for missing required paths and suspicious references.
4. Isolated CI job that rechecks UAT is not provisioned and that a public sanitized-preview build **still fails its manual launch gates**.

## Future owner-dependent actions — not attempted

1. Choose and create a **new PRIVATE** development repository. No existing public repo visibility change or force-push.
2. Review quarantined family/workplace data and third-party licensing. Move only approved data and source with **clean first commit**. Build/verify full dashboard functionality after the reviewed files are added.
3. Recreate **nondeploying CI first**; do not import public Pages build/deploy workflows unchanged into a private repo. Explicitly decide which QA workflows should reference the new UAT host and which should continue verifying the existing public GitHub Pages.
4. Create UAT Cloudflare Pages holding project and configure Cloudflare Access for **primary hostname, branch/immutable previews, custom domains and static assets** before uploading family data.
5. Apply prior family UX decision: per-email allowlist, **email OTP and up to 30 days authentication session**, with separate sessions for laptops/phones/browser profiles. Test allowed and denied email logins, anonymous static-file denial, logout, revocation and mobile sessions.
6. Complete owner-controlled private backup and an actual rollback rehearsal (the previous synthetic 4-file dry run was **not a real backup**). Only use a safe no-data holding page for public gateway rollback, never republish private family files.
7. Build Public Production as a **separate Cloudflare Pages site** from the curated sanitized artifact. Confirm external provider terms, redistribution rights, privacy disclosures, real browser QA, rate limits and explicit owner release approval.
8. Only then consider converting `kevinim.github.io` into the simple public family-login landing page.

## How to rerun without an account

```bash
node --test tests/private-source-migration-preflight.test.cjs
node scripts/private-source-migration-preflight.cjs
node scripts/verify-public-preview.cjs
node scripts/validate-environment-plan.cjs deploy/environment-plan.json planning
node scripts/check-uat-anonymous-access.cjs --plan
```

Or run **GitHub → Actions → TX private-source migration inventory and dependency preflight (no migration) → Run workflow**. The CI workflow has `contents: read` only and does not publish any site.

**Coordination:** This change adds only new script/test/workflow/docs files. Existing UI, ZIP comparisons, school boundaries and ongoing strict-CSP/adjacent district PR branches are not modified.
