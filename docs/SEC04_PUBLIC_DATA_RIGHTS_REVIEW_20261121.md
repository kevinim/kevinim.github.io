# SEC-04 — Public data rights inventory (2026-11-21)

**State: implemented in isolated review branch; Public Production remains NO-GO.**  
Source main baseline: `44b9fe94c1ebb489fff486bd0148746a28d04a53`.  
Canonical tracking: [Issue #371](https://github.com/kevinim/kevinim.github.io/issues/371) and [Security Tracker PR #377](https://github.com/kevinim/kevinim.github.io/pull/377).

## Why a new control is needed

The existing `scripts/build-public-preview.cjs` selects static assets with `gate.isPublishable` and copies many JSON/GeoJSON files. It sanitizes known private commute markers, but **privacy scanning and a public source URL do not prove permission to redistribute every dataset**. The current release gate intentionally requires manual data-license signoff; the actual separate Production host and source migration have not been provisioned.

## Implemented

- `deploy/public-data-rights.json`: strict data-rights registry with **zero presumed approvals**. Missing entries default to `pending`. An explicit `approved` record must include nonempty publisher, license scope, attribution, reviewer, reviewed date and HTTPS source-of-terms URL. This records human-review evidence fields; syntax validity does not independently verify legal rights.
- `scripts/audit-public-data-rights.cjs`: enumerates data/media assets in the exact built `dist/public-preview` artifact (JSON, GeoJSON, CSV and image/GIS media formats). Symlinks and suspicious paths are rejected. A copied item not individually approved is **BLOCKED_RIGHTS_REVIEW_REQUIRED**. Restricted or excluded items cannot be present in the public bundle. Stale registry entries also block. It does not inspect private source history or change any site.
- `tests/audit-public-data-rights.test.cjs`: synthetic tests for pending-by-default, approved-but-never-deployed, restricted/excluded files, missing evidence, stale registry, unsafe paths and symlink protection.
- `.github/workflows/audit-public-data-rights.yml`: read-only, path-scoped/manual Actions workflow. Builds the sanitized preview without deployment, audits actual data/media files, explicitly expects NO-GO while rights are unknown, uploads aggregate counts only. **Itemized file paths are local-only and gitignored** under `artifacts/`.

## Run without publishing

```sh
node --test tests/audit-public-data-rights.test.cjs
node scripts/verify-public-preview.cjs
node scripts/audit-public-data-rights.cjs
```

To assert future readiness (strict failure on unknown/restricted items):

```sh
node scripts/audit-public-data-rights.cjs dist/public-preview deploy/public-data-rights.json --assert-ready
```

Do not set `PUBLIC_DATA_LICENSES_CONFIRMED=confirmed` merely to produce a green build. Every file in the **exact shipped distribution** requires a reviewed license/permission decision or exclusion, along with independent provider quotas/terms, privacy disclosure, browser QA, source separation and owner publication approval.

## What remains (not performed)

1. Review actual rights/terms **per shipped file**; `pending` or publisher unknown is a blocker, not automatically public domain. TEA, school GIS, reconstructed school zones, parcel information, external maps, hazard sources, Redfin references and ratings require their respective official source conditions. Mark `approved` only with evidence of permitted use **for this site and specific redistribution**; remove unapproved assets or link to the original provider.
2. Review browser-fetched data and third-party API use separately. The inventory only scans distributed data/media files, not embedded data in JS/HTML/CSS, live requests, external image URLs, or vendor terms.
3. SEC-01 source separation/private repo and future public-only hosting are still pending; this tool does not migrate or authorize a new repository, Pages/Cloudflare project, DNS, login, billable service or Git history rewrite.
4. After the future licensed manifest is reviewed, attach exact-build CI evidence and rerun strict rights audit, privacy/secret CSP/XSS/desktop/mobile checks, and real rollback in the **separate** Public Production release gate.

**Release decision stays PUBLIC PRODUCTION NO-GO.** CI success for a deliberately blocked rights inventory proves the guard executes, not the site is licensed to be published.