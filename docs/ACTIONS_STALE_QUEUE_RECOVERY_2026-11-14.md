# GitHub Actions orphaned queue recovery — 2026-11-14 (read-only until separately authorized)

Repository: kevinim/kevinim.github.io. Current protected main baseline: 96ca916014a83a0226631551b01042ec648a1f4d.

## Verified, non-sensitive queue evidence

- Exactly **624** runs were reported as \`status=queued\` at assessment time.
- All creation timestamps fall between **2026-11-11 20:17:39Z and 20:55:28Z**.
- Event split: **617 pull_request**, **7 push**.
- Current open PR count was **0**; newer protected-main CI/Pages deployments completed successfully.
- Sample run IDs \`43098840916\`, \`43095910381\`, \`43097002711\`, \`43095228814\`, \`43098840746\`: each reports queued with **zero jobs**, and no updated timestamp since creation.
- Repeated commit bursts occurred during multi-agent TEA data QA. 403 queue entries share the Allen/McKinney QA branch name, across multiple commit SHAs.
- No runner capacity, billing failure, or current operational blockage is established by these facts. Similar November 11 zero-job/HTTP 409 anomalies are reported in GitHub Community, but this does **not** prove the exact underlying fault for this repository.

Reference example: https://github.com/kevinim/kevinim.github.io/actions/runs/43098840916

## What the helper does, and does not do

\`scripts/actions-stale-queue-recovery.cjs\` is a **read-only audit by default**. It lists all queued runs, verifies the present main SHA and open PR heads, isolates only PR events created during the precisely observed incident window, excludes updated/restarted runs and commits still in an open PR, and samples at most five candidate jobs for zero-job status. It never reads private address records or prints tokens.

There is **no automated cancellation workflow or broad new Actions write permission**. The assistant's connected GitHub tools can read Actions state and create review PRs, but expose no cancel-run action; an operator with Actions:write must explicitly authorize cancellation.

Optional bounded *normal cancellation* uses GitHub Actions REST API. It only affects up to 25 candidates per invocation (default 5), and performs a fresh run-state and zero-job recheck before each POST. A 409 response stops the batch; it **never** tries force-cancel or deletes run history. A 202 response is merely an accepted cancellation request, not proof the execution was removed; re-audit afterward.

Commands on a trusted local computer with Node.js 22+:

\`\`\`sh
# Safe read-only report. For greater GitHub API allowance, set GH_TOKEN
# in the terminal environment; never put tokens in files, PRs or chats.
node scripts/actions-stale-queue-recovery.cjs

# Optional, AFTER reviewing the report and obtaining an Actions:write-scoped token:
# GH_TOKEN must already be set in your local shell environment.
node scripts/actions-stale-queue-recovery.cjs --apply --confirm-stale-20261111 --limit=5
\`\`\`

No token is required for audit-only mode. **Do not enable bulk cancellation by guessing token values.** Since 7 incident-era queued \`push\` runs are deliberately excluded, they require separate manual review and are not automatically cancelled.

If the first normal cancellation returns 409:
1. Stop. Do not force-cancel hundreds of items.
2. Record the example run ID, creation timestamp, zero jobs and the HTTP 409 result.
3. Contact GitHub Support or file a GitHub Community issue referencing the supportable sample and the exact GitHub status/event window.
4. Re-check the queue after GitHub fixes the incident-era run records.
5. Keep required \`verify\`, public privacy/security checks, current main history, Pages deployment, and active PR runs untouched.

Official API: https://docs.github.com/en/rest/actions/workflow-runs#cancel-a-workflow-run
Community context: https://github.com/orgs/community/discussions/212818

## CI efficiency improvements already released

- #305: scoped 9 audits to relevant source paths, added per-PR stale-run cancellation across PR workflows, kept required \`verify\` and security gating, moved full-history Gitleaks off each PR (still main pushes/weekly/manual).
- #306: preserved real GitHub Pages \`deployment_status\` rather than an ineffective dynamic workflow_run link.
- #309: consolidated CFB browser live checks into one postdeployment Track B Chromium job.
- Current 101 workflow YAML files are a maintainability concern; they are **not** 101 jobs on every PR.

Illustrative, **not like-for-like** PR check-run counts from GitHub's latest head:
- Before #305: #303 provider resilience 81 check runs, #304 UI/footnotes 74 check runs.
- After #305: #307 school-grade UAT 14 check runs, #308 GIS/school fix 13 check runs, #309 workflow-only 8 check runs.
- Different changed files activate different path filters, so counts cannot be treated as a rigorous percentage improvement.

## Recommended future measurement, without changing production

For the next 3 representative PRs, record (a) paths changed, (b) runs/jobs generated, (c) queued duration, (d) runner seconds, and (e) required verify/security verdict. Measure comparable PR file scopes and do not optimize by disabling correctness-critical school/GIS/privacy gates. Preserve family no-login GitHub Pages and all protective branch settings.
