# SEC-02 — Historical public Git privacy exposure, read-only inventory

**Date:** 2026-11-21 (America/New_York)  
**Status:** Audit implementation proposed on an isolated branch; no historical remediation, public release, or data deletion approved.  
**Source main baseline:** `51737f712796bcaa4553877398944fc114d6ec2b`.  
**Canonical issue:** [#139](https://github.com/kevinim/kevinim.github.io/issues/139).  
**Tracker:** [PR #377](https://github.com/kevinim/kevinim.github.io/pull/377) proposes `docs/PRODUCTION_SECURITY_TRACKER.md`.

## Why this is needed

The previous clean-up removed three known personalized commute files from the *current* web assets, with earlier live 404 checks. Current Git tree and browser behavior do not prove that old Git commits, branch/PR references, forks, clones or caches cannot still reveal the removed information. Gitleaks checks patterns for credentials, **not** a comprehensive audit of historical personally identifying data.

## New safe inventory

- `scripts/audit-historical-public-privacy.cjs` uses local Git plumbing to count reachable refs, ref tips containing known retired dataset file-name patterns, and historical Git objects associated with those paths. It **does not inspect file contents** or emit file paths, ref names, commit IDs, blob IDs, addresses, personal identifiers, URL parameters or matched text.
- `tests/audit-historical-public-privacy.test.cjs` uses fictional, isolated Git repos. It demonstrates that deleting a file from the latest tree leaves older reachable Git object evidence intact and that a surviving branch tip can retain the earlier file.
- `.github/workflows/audit-historical-public-privacy.yml` runs on this audit's PR paths or a manual workflow dispatch only, with read-only permissions, full local clone history, no deployment and a counts-only artifact. It intentionally **does not** trigger on every `main` push or add a weekly schedule.
- Run locally from an approved, full Git checkout: `node --test tests/audit-historical-public-privacy.test.cjs && node scripts/audit-historical-public-privacy.cjs`. The ignored file `artifacts/security/sec02-history-summary.json` is counts-only; it is not a private archive or historical deletion.
- A **green audit job means the measurement completed**, not that its result is clean or that Public Production is approved. Known historical filename matches are an expected **risk finding**, not a reason to relax the scanner or automatically rewrite Git history.

## Deliberate limits and next steps

1. A full Git checkout containing only branches and tags does **not necessarily contain closed PR refs**. The report includes the number of locally available PR refs; do not claim exhaustive PR review from a zero.
2. Forks, clones, GitHub caches and unreachable objects are outside the scanner's scope. GitHub fork enumeration may require separate owner-side/API access; mark **not verified** rather than "zero forks."
3. Historical values embedded in older JS/HTML under generic filenames will not be found by this filename-only control. Any deeper privacy review must avoid exporting or printing actual resident, employer or credential values to public CI artifacts.
4. Credential discoveries, if any, require separate account-owner validation/revocation or rotation. A Gitleaks passing result alone cannot resolve historical PII.
5. A destructive Git rewrite or visibility/hosting cutover needs explicit new owner approval and a private backup/rollback plan. For public Production, a **new clean deployment-only artifact** reduces future exposure but does not erase copies of existing public history.
6. After the exact-PR test and redacted inventory run, attach only totals and scope restrictions to Issue #139 and update SEC-02's **partial progress** in the tracker. Remain `PUBLIC PRODUCTION NO-GO`.

## Safety boundary

No `main` merge, force push, repository visibility setting, GitHub Pages configuration, UAT login, DNS, external API, payment, or production deploy is part of this change. The existing family dashboard is unaffected.
