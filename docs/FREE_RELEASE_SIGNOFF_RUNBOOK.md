# Zero-additional-cost PR review and release sign-off

**Status: process documentation only — no hosting, branch-protection, auto-merge, or deployment settings changed.**  
Owner decision: use GitHub Free/public-repository features; never incur paid services automatically.

## Two different meanings of "Production"

1. **Current live GitHub Pages** `https://kevinim.github.io/` is publicly reachable. Updates to its publishing source can go live automatically. A merge into `main` must be treated as a live-site release unless the owner verifies that Pages publishing settings say otherwise.
2. **Future family UAT and separate Public Production** are **not deployed**. As of `deploy/environment-plan.json` (2026-11-08), `deploymentMode=planning`, both deployment switches are false, and `release.ownerApproved=false`. Never interpret a merge to `main` as public launch authorization for either new environment. The public release gate remains BLOCKED by design.

## Solo-owner free release procedure for the current Pages site

1. Work on a feature branch; open a **Draft PR**. Do not push to `main`.
2. Run applicable PR checks; preserve the required `verify` check from `.github/workflows/verify-main-dashboard.yml`. The check name must remain unique, and all other relevant mandatory/quality/security checks must be reviewed; `verify` passing alone does **not** certify security or school-data quality.
3. Investigate failed tests and outstanding P0 issues. In particular verify the live Allen school-marker count is nonzero, selected-area zoom, map/school-layer independence, official Finder provenance, mobile UI and dark-theme contrast where affected. Mark NO-GO until blockers are resolved. Do not bypass red checks.
4. Mark **Ready for Review** only after change-specific tests and evidence are documented. The owner checks the diff, the checks, rollback commit SHA, and the release checklist.
5. The owner's **manual `Merge pull request`** in GitHub (mobile app if it supports the action; otherwise GitHub web) is the one-person **GO/sign-off** for updating the existing Pages site. **Never enable auto-merge or have an assistant/bot merge without an explicit new owner instruction for that specific PR.**
6. After GitHub Pages finishes, verify the live URL, review the `production-browser-smoke.yml` result, and check the affected use cases manually. If verification fails, open a revert PR (or use an existing tested rollback strategy); do not silently redeploy.

**Important:** GitHub does not permit authors to approve their own PR using the PR Review > Approve action. We therefore use **owner-controlled Merge**, not a self-review approval. If a genuine second-person approval is desired, add an independent reviewer and configure a required approving review, at no added GitHub subscription cost for this public repository.

## GitHub Mobile checklist

- Open the repository > Pull requests > the intended PR.
- Verify it is not Draft, compare **Files changed**, and check that **Checks** have completed.
- Read the release checklist and evidence; if GO, use **Merge pull request** (or the mobile browser equivalent). Do not use the app's **Approve** button on a PR created by your own account.
- GitHub mobile notifications/watch settings can help you discover updates, but an automatic "approval request to myself" notification is **not guaranteed**. Verify notification behavior before relying on it.
- Record the PR number, merge commit, deployment run, and post-deployment evidence.

## Free protection settings to verify manually in repository Settings

The observed GitHub API (2026-11-09) reports `main.protected=true` and a required status check `verify` from GitHub Actions. **The connected GitHub App cannot read the full branch-protection configuration (403)**, so the following are still **UNVERIFIED**:

- Pull request required before merging to `main`.
- Direct pushes, force-pushes, deletions and administrator bypass are appropriately blocked.
- Required checks apply to the latest PR commit, and the status source is pinned to GitHub Actions.
- Required PR approving-review count is **0 for solo-owner operation**; requiring 1 independent review would block the author from self-approving.

Review these in **Settings > Branches > main rule** (or applicable repository ruleset UI). Do not assume compliance merely because `protected=true`. The app connection cannot change these admin controls. Until confirmed, the owner-only Merge practice is a **process rule, not a hard security guarantee**.

## Cost boundary and future expansion

- GitHub Free supports GitHub Pages for public repositories and protected branches for public repositories; standard GitHub-hosted Actions runners are free for public repositories, subject to GitHub's terms. Avoid paid runner types, marketplaces and external paid plans.
- Keep the current repository public unless a separate, verified free hosting/source migration plan is accepted. **Private source and public hosting are not identical:** the public browser bundle can always be inspected. Do not commit secrets or personalized defaults to the public artifact.
- Future family-email UAT (including 30-day sessions) and separate Public Production require independent security, privacy, provider quota, access-control, recovery and rollout checks. No Cloudflare/other deployment, account configuration, or payment configuration is authorized by this document.
- For future Public Production, create a **separate release-signoff PR/record** with explicit owner GO/NO-GO, audited sanitized artifact and tested rollback; this current-Pages merge procedure is *not* that authorization.

## Required change-specific release evidence

Record in each PR: change scope, before/after screenshots when UI changes, affected districts and source freshness (when data changes), automatic test links, manual tests (desktop/mobile), release blockers, rollback commit/plan, and explicit decision **GO / NO-GO**. A checked Markdown box is evidence of human review, not a substitute for passing CI or enforced branch policy.

### Current-state references

- `deploy/environment-plan.json` — three-environment plan, no cutover/deploy enabled.
- `PUBLIC_RELEASE_SECURITY.md` — public launch remains BLOCKED.
- `.github/workflows/verify-main-dashboard.yml` — existing required `verify` check.
- `.github/workflows/production-browser-smoke.yml` — post-Pages smoke testing.
- `AGENTS.md`, `BOUNDARIES.md` — school/map regression safeguards.
