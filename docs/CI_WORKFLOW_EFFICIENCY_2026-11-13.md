# TX dashboard CI workflow efficiency review — 2026-11-13

## Baseline and cause
- 100 GitHub Actions YAML workflows were present on main before this review. Many were already scoped with pull_request.paths, but nine source/security/area audits still ran on unrelated PRs and nearly every PR workflow lacked concurrency cancellation.
- Recent index.html pull requests legitimately triggered about 42–49 independent workflows due to the shared single-page UI. **This change does not claim that all those checks disappear when index.html changes.**
- Both live smoke workflows subscribed to Pages workflow_run AND deployment_status events. Historical completed Pages deployments on this repository launched the successful smoke jobs via deployment_status, not workflow_run; status events for non-success states produced harmless skipped jobs.
- The public-release gate reran a full Git history secret scan on every PR despite separately scanning each PR change and already scanning main, weekly, and manual runs.

## Guardrails
- Keep the existing branch-protected, always-running main PR job named **verify** with no pull_request.paths filter and no job name change.
- Keep the full public-release security workflow running for every PR; its PR-diff Gitleaks check, privacy regression, and independent public preview Chromium QA remain active.
- Run the full-history Gitleaks job on every **main push**, weekly schedule, and manual dispatch; skip only its redundant PR invocation.
- Eight independent source/security/West DFW/school release workflows and the Denton GIS audit run on related PR paths, and stay manually executable. Main push school-source preflight remains unconditional.
- Per-PR concurrency uses workflow name + event type + PR number. Only **pull_request** executions automatically cancel old revisions. Main pushes, scheduled audits, manual dispatch, and completed-release browser audits are never canceled by PR churn.
- Use a single deployment_status event source for each live smoke workflow, with a job-level state == success guard; remove the ineffective workflow_run route. Keep manual/scheduled triggers, and run only one real Chromium job per successful deployment.
- No alteration to school data, app HTML/JS, frontend, deployment settings, provider policy, action pinning, GitHub credentials or branch rules.

## Limitations / follow-up
- Path filters are file-level, not aware of changed DOM sections. Index.html changes continue triggering several relevant school/GIS/UI browser suites.
- Workflow YAML changes themselves activate workflow-focused CI on this one PR; do not treat this one-time initial run count as steady-state.
- Manual or main push workflows cannot be canceled for speed without risk; no administrative settings are modified.
- Action queue delay still depends on GitHub-hosted runner scheduling. Compare future PR runs (changed paths, number of runs, stale-run cancellation, runner minutes) rather than asserting an unsupported fixed percentage.

## Retired historical 16-PR dry-merge gate
The November 9 queue of sixteen historical integration branches is no longer an open PR release queue. The previous automatic `tx-open-pr-compatibility-preflight.yml` dry-merge task could fail on already-integrated branches. It now checks current main-integrated school source matrices, privacy, and residential school NO-GO for relevant changes. It performs no fetch of abandoned branches, Git push, or deployment.

## Verified Pages event correction
The successful operational smoke runs associated with merged commits `88fc839`, `25fadbf`, and `b3e4ebf` were triggered by `deployment_status` (confirmed from GitHub Actions run metadata). The `pages build and deployment` workflow is a GitHub Pages dynamic workflow and did not produce a corresponding live smoke after the #305 workflow_run-only change. This patch restores the empirically supported event while retaining stale-PR cancellation and a success-only guard.
