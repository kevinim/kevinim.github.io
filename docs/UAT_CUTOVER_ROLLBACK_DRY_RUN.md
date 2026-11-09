# Family UAT Cutover / Rollback — synthetic dry-run

**Status: PREPARATION ONLY. No UAT / Cloudflare Pages / GitHub Pages deploy, no DNS update, no private repository created.** The current `https://kevinim.github.io/` remains a publicly accessible dashboard.

## Why the dry-run is intentionally synthetic

The current GitHub Pages source repository and Git history are public. Reproducing actual family or workplace defaults as a downloadable CI backup would create another copy of sensitive data. **This drill never archives the real dashboard**. Instead, it checks the tested code paths with four deliberately fictional fixture files in an automatically created OS temp directory, and publishes only a redacted pass/fail report.

`scripts/uat-cutover-rollback-dry-run.cjs` accepts **only** `--dry-run`. Its code contains no remote deployment, Cloudflare, login, GitHub write, UAT host provisioning, force-push or production rollback operation.

## Tested disaster sequence

1. Record the SHA-256 hashes of the real repository `index.html` and `deploy/environment-plan.json` for **immutability checks only**. Do not copy their contents to CI artifacts.
2. Create synthetic serving directory with fictional `index.html`, `schools.json`, `robots.txt` and `assets/demo.js`.
3. Copy synthetic files into an independent temporary **private** archive and compare the exact content hashes and file list.
4. Validate actual `deploy/environment-plan.json` in planning mode. Current default is `NO-GO`: UAT hostname unconfigured, Access not verified, source not migrated, owner not signed off.
5. Replace *only the synthetic serving directory* with a **two-file** family entry candidate that links to an obviously fictional `.pages.dev` UAT address. This candidate is **not** the gated real cutover builder and does **not** certify a real login.
6. Simulate UAT failure. Replace the fixture candidate with a **two-file, no-login-link neutral holding page**. Confirm no app JS, school JSON, hidden dashboards or stale assets remain publicly served.
7. Recover the archived fictional dashboard into a **non-served quarantine directory** and recheck each SHA-256. **Do not restore an old family dashboard to a public origin just to recover availability.**
8. Assert the actual repository's `index.html` and environment plan remain byte-identical. Delete the synthetic test directory. Upload the minimal JSON report only.

Negative tests explicitly check corrupted backups, missing JSON, additional files, malicious symbolic links, duplicate restore destinations, failure after simulated cutover and unsupported `--deploy`/`--restore` commands.

## Manual execution

```bash
node --test tests/uat-cutover-rollback-dry-run.test.cjs
node scripts/uat-cutover-rollback-dry-run.cjs --dry-run
```

Or use **GitHub → Actions → TX family UAT cutover/rollback DRY RUN (no deployment) → Run workflow**. CI also reruns existing family gateway, environment-plan and unauthenticated UAT checks, and verifies the sanitized Public Production candidate remains blocked pending approvals.

Machine-readable status: `artifacts/uat-cutover-dry-run/report.json`:

- `SYNTHETIC_ROLLBACK_PASS` confirms the fictional cutover and safe recovery logic was exercised.
- `networkRequests: 0`, `deploymentActions: 0`: no hosting action or live Access test is performed by this code.
- `releaseDecision: NO_GO_OWNERSHIP_ACCESS_AND_MANUAL_APPROVAL_UNVERIFIED`: **never** means ready for public release.

## Separate owner-controlled real-world preparation — STILL REQUIRED

| Real action | Present status |
| --- | --- |
| Secure source archive and verified backup in an **owner-controlled private** location | Not performed; this script is fixture-only |
| Create a **private GitHub source repository**, migrate curated files with a clean commit, audit old public history | Not performed |
| Create a Cloudflare Pages UAT project initially serving **only a blank holding page** | Not performed |
| Protect primary UAT `.pages.dev`, branch and immutable preview aliases and custom domains with Cloudflare Access | Not performed |
| Configure exact **family email allowlist**, email OTP and maximum 30-day authentication sessions across app/global/policy settings | Design decision only; not configured |
| Verify allowed and denied family emails; laptop and phone browsers each establish separate sessions; 30-day persistence, explicit logout and revocation | Not performed |
| Perform **real** off-site backup/restore and Cloudflare/API/DNS rollback with approved private artifact | Not performed |
| Publish a separate sanitized Public Production site with licensing approvals | Not performed |
| After all checks and explicit owner GO, replace the existing public GitHub Pages dashboard with a two-file **public login-link-only gateway** | Not performed |

**Important distinction:** The safe emergency rollback for a newly private family UAT architecture should be a no-family-data holding page, **not** republishing a formerly public full dashboard. Any actual traffic change, cutover, restored hosting, domain switch, permissions or credential operations require their own explicitly authorized production workflow and verified owner backup.

This rehearsal intentionally avoids every open product/UI/GIS PR. All code changes are new test/docs/workflow files; the current site, school data, ZIP/UI controls and Pages deployment configuration are untouched.

Related planning docs: `deploy/MIGRATION_RUNBOOK.md`, `deploy/UAT_ACCESS_READINESS.md`, `docs/FINAL_INDEPENDENT_QA_2026-11-09.md`.
