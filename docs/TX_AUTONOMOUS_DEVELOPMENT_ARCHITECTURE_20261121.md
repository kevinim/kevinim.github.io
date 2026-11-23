# TX Relocation — ChatGPT-only Autonomous Development Operating Design

**Status:** Operating policy and staged implementation, NOT a public-production release.  
**Scope:** `kevinim/kevinim.github.io` only. Do not touch CareerQ or any other project.  
**Owner decision:** 2026-11-21 — **No Codex**. Use ChatGPT + connected GitHub + existing GitHub Actions/Pages only; do not require local Codex, Claude, a new paid API, or a new external scheduler.  
**Baseline at original draft:** main `7695ce1ac5f04a6650dba0c04bcf0fd1747d36a3` — always recheck current HEAD.  
**Scheduled Task:** `TX 대시보드 지속 점검` ID `6b01fbee8e3c81919e36536883001100`, daily 08:00 America/New_York; separate run environment is inherited, tools/permissions are **not** guaranteed until a real run succeeds.

## 1. Architecture: one ChatGPT agent, one GitHub work item, one PR

```text
GitHub main + Issues #378/#125/#376/#375 + repository work ledger
        |
        v
Existing ChatGPT Scheduled Task (one daily execution)
        |-- READ current main, open PRs, CI, Pages, prior execution log
        |-- TRIAGE priority P0/P1/P2/P3; select exactly one feasible item
        |-- RESEARCH official evidence, source year, license/permission
        |-- EDIT small code/data/test/doc files via connected GitHub on isolated branch
        |-- CREATE or RESUME one Draft PR (never push to main)
        |-- VERIFY GitHub Actions at exact PR HEAD; inspect failures
        |-- UPDATE owning Issue + #378 + ledger evidence, without false DONE
        v
Human-controlled review / merge decision (merging main triggers public Pages)
        |
        v
GitHub Pages deployment + browser/live smoke → DONE only after confirmation
```

**The daily ChatGPT run is periodic work, not a 24/7 autonomous coding daemon.** Each scheduled invocation may be limited by tool availability, run time, token budget, network restrictions, rate limits and GitHub permissions. If an end-to-end task exceeds the run, persist the specific status and next action. No background work promises beyond scheduled runs. No Codex automation is installed or needed.

### Supported paths and limitations

| Action | ChatGPT alone | Verification / limitation |
| --- | --- | --- |
| GitHub issue/PR/commit inspection, source research | YES when GitHub connection works | Verify exact current values, not previous chat's status |
| Write or edit code, tests, docs, JSON/GeoJSON | YES via GitHub create/update file on separate branch | File-level mutations, require current blob SHA; nontrivial large refactors may be impractical |
| Isolated branch and Draft PR | YES with GitHub permissions | No overwrite of uncommitted work or another writer's paths |
| Local Node/Playwright runs | Only where a runnable code environment and dependencies are available in that run | Do not claim local tests if not executed; use remote GitHub Actions checks where available |
| CI checks | Existing GitHub Actions after PR | Inspect required `verify`, latest head SHA, queued/running/failure, tests/browser as surfaced |
| Pages deployment | Existing main auto-publishes only after merge | No automatic main merge in initial phase; live smoke needed |
| Continuous unattended multi-hour coding | NO | Daily task does one bounded iteration; record RESUME point |
| Auth/hosting/licensing changes or paid tools | Explicit owner approval only | Preserve free-only, privacy, security and Public Production NO-GO |

## 2. Single-writer and conflict rules

- ChatGPT is the **only scheduled agent** for this repository. Do not create a separate Codex/Claude task, agent or custom GitHub schedule.
- Manual development can continue, but before each scheduled edit inspect open PRs, branches and file paths. If another agent changed the same task or files, **do not clobber**; skip to the next independent task or request reconciliation.
- One issue/subtask claim at a time and **at most one active Draft PR being authored by the scheduled agent**. Reuse existing branch/PR on the next run. Existing security PRs #377/#381/#385 are owner-review pending and are not an auto-merge target.
- Only update a file after fetching its actual branch-scoped blob SHA; stop if SHA mismatch. Never force push, rewrite history, bypass branch protection or discard another change.
- No new mass issue creation or duplicate Actions workflows.

## 3. Durable state, task schema and lifecycle

Keep `docs/TX_RELOCATION_WORK_LEDGER.md` as a consolidated status snapshot and GitHub Issue [#378](https://github.com/kevinim/kevinim.github.io/issues/378) as the execution log. Domain Issues [#125](https://github.com/kevinim/kevinim.github.io/issues/125) GIS, [#376](https://github.com/kevinim/kevinim.github.io/issues/376) geometry quality, [#375](https://github.com/kevinim/kevinim.github.io/issues/375) Area Intelligence and the separate security tracker remain authoritative for detailed acceptance criteria. A task is not DONE simply because a user once said complete, a link was found, a PR was merged or CI was green on another SHA.

Every run should record fields:
```yaml
task_id: TX-P0-01/school-apartment-negative-cases
owning_issue: 125
priority: P0
scope: [tests/..., features/...]
status: READY # READY | CLAIMED | RESEARCH_ONLY | BLOCKED | PR_DRAFT | CI_PENDING | CI_FAILED | VERIFIED | REVIEW_REQUIRED | MERGED | PAGES_PENDING | LIVE_VERIFIED | DONE | SUPERSEDED
baseline_main_sha: "<live GitHub HEAD>"
branch: "agent/tx-<task>-<date>"
draft_pr_url: null
latest_pr_head_sha: null
evidence_urls: []
source_publisher: null
source_year: null
redistribution_rights: "unknown"
ci_results: "not yet checked"
pages_smoke: "not applicable before approved merge"
blocker: null
next_action: "one concrete step"
```

Never publish a real home address, apartment unit, family detail, secrets, allowed email identities or personal commute profiles in issues, code, CI logs or documentation.

**State transitions:** READY → CLAIMED → IMPLEMENTING → PR_DRAFT → CI_PENDING → VERIFIED → REVIEW_REQUIRED → (owner GO) MERGED → PAGES_PENDING → LIVE_VERIFIED → DONE. `CI_FAILED`, `BLOCKED`, `RESEARCH_ONLY`, `NO_CHANGE`, and `SUPERSEDED` are honest alternative states.

## 4. Task selection: prioritize impact, not raw PR count

P0: Address → official E/M/H school lookup accuracy, apartment/split feeder/ninth-grade/senior/year, source ambiguity. Improve synthetic/public-address regression coverage; preserve reference-only vs certified residence distinction. **0 districts independently certified** for complete official street+unit+grade+year automatic enrollment. No proxy around vendor CORS or unauthorized Finder scraping.

P1: Existing geometry official-source verification, school identity and vintage, Allen/Prosper/Frisco/McKinney/Plano/Lewisville/CFB/Denton. Then acquire allowed current school-specific GIS across all **108 DFW ISDs**, starting with highest-impact gaps. Last audited: 6 default, 2 opt-in, 100 no rendered per-school GIS. Official source discovery and PDF links are not polygon import or school assignment.

P2: Keep completed TEA/PEIMS 2026-11-11 source snapshot parity frozen (2,282 campuses; 15,974 race cells); rerun full publisher parity on new versions only. Public-production security SEC-01–SEC-11 remains NO-GO, owner-controlled. Low-risk redacted read-only audits can advance, but #377/#381/#385 and security migration are not auto-merged.

P3: Medical P41 → power/winter P42 → crime source consistency P43 → commute/tolls P40, after P0/P1. No fabricated 15/30-min ER drive times, address-specific grid reliability, live toll quote, or neighborhood safety score. Redfin rental economics later.

Selection rule:
1. Re-read exact current main, existing PRs and ledger.
2. Exclude completed/duplicate tasks, unsupported vendor/API rights, expired evidence and active overlapping paths.
3. Choose highest-priority **small, independently testable, feasible** task. If P0 is blocked by unavailable authorized API, record once then move to P1 feasible work—not endless repeat failure.
4. Stop after one bounded task; update persistent work log so next day's task resumes accurately.

## 5. GitHub-only implementation and test protocol

1. Verify `AGENTS.md`, `HANDOFF.md`, `BOUNDARIES.md`, source manifests, Issue #378 and owning issue. Read all open PR titles/changed paths where relevant. Confirm the actual repository and current main SHA.
2. Identify one falsifiable bug/source mismatch or missing test. Define acceptance criteria and a documented negative case before changing anything.
3. Create/resume `agent/tx-<task-id>-<date>` branch from the **latest** main. Do not use default/main for write operations.
4. Change a small number of files with GitHub APIs, preserving existing file versions and idempotency. If a local test environment is available, execute appropriate Node tests; otherwise record local tests `NOT_RUN` and use the GitHub Actions PR checks. GitHub Actions success is not proof of a local test.
5. Create/update **one Draft PR**. Describe issue, source URL/year/rights, test plan, changed paths, new head SHA, CI link, and residual limits. Never auto-merge.
6. Check actual workflow runs at PR's latest head SHA, verify required CI and page/school/mobile/privacy gates. If pending, record pending. If failing, inspect logs and fix within the **same** PR, or BLOCKED after two tries at the same deterministic failure. Never bypass `verify` or silently alter expected integrity pins.
7. Write a dated evidence record to the owning issue and #378. Use the existing work ledger only through its own guarded PR to avoid conflicts, not a direct `main` edit.
8. After **explicit** owner authorization for an identified merge, confirm fresh head SHA and all required checks before merging. Main is live public Pages; safe coding authorization does **not** authorize merge. Following an authorized merge, verify Pages build + actual served assets / desktop 1366px and mobile 390px regression before labeling DONE.

## 6. Authorization boundaries

**Allowed with standing ChatGPT task:** publicly available source research, status reporting, file integrity checks, read-only tests, non-sensitive documentation, narrow reversible bugfix/testing in an isolated branch, Draft PRs and PR CI assessment.

**Must ask before live change:** merging PR into main/Pages, security or access changes, repository visibility, public production launch, private login, DNS/provider and billing, redistribution rights approval, privacy-risk Git history changes, public map derived from restricted GIS or crime/household safety scoring, changes to mandatory CI/security gates. No general authorization implicit in this architecture.

Preserve GitHub Free, no new paid API service, no storage of real residential addresses, proper TEA masking and campus life-cycle handling, exact school source dates and no inference of legal enrollment from GIS.

## 7. Daily automation prompt, schedule and pilot

**Existing task**: `TX 대시보드 지속 점검`, ID `6b01fbee8e3c81919e36536883001100`, scheduled daily at 08:00 America/New_York. This existing task should be updated for **ChatGPT-only** single-writer operation; do not create a duplicate automation.

A run should:
- read current GitHub main/PR/Issues, ledger and previous run evidence;
- select one ready, safe, independent issue;
- do as much research/code/QA as tool permissions and run limits allow;
- if code is changed, use branch + Draft PR + exact-head CI (no merge);
- record new completed scope vs still-open goal, CI status, blocker, next action and owner approval needed;
- skip untouched stable data and repeat completed work;
- refrain from promising unscheduled continuous work.

**Pilot acceptance:** first daily run must confirm GitHub write tools are available; at least one isolated code/test change is successfully proposed as a Draft PR; associated required GitHub Actions run is observable on exact commit; duplicate PR count 0; no main merge/live Pages change; a subsequent scheduled run correctly resumes pending work without spawning a duplicate. If scheduled tool access is unavailable, report this limitation and continue manual on-demand chat development; no claim that unattended coding is operational.

**If no connector actions are available in a scheduled run:** read-only audit/report if possible, otherwise report inability; this is a real system blocker, not something to work around by inventing success. No Codex fallback.

## 8. Acceptance & reporting checklist

| Scenario | Correct outcome |
| --- | --- |
| Previously merged code already exists | Mark verified existing scope, skip duplicate |
| Another PR changes same files | Hold conflicting write, select a different task |
| CI pending/failed or stale head | Remain pending/failed, no DONE/merge |
| Main advanced since branch base | Diff and retest; do not force push |
| Official API blocked by CORS or reuse terms | Reference-only with source/date notice |
| User address appears in file/PR/log | Stop and escalate privacy risk |
| Browser markers disappear or warnings hidden | Fail release gate |
| Historical Actions queue noisy | Ignore stale 300+/624 runs; inspect **new relevant** CI |
| Source email unanswered | Do not wait; seek public sources, mark missing and proceed |
| Permission/tool access fails | Record tool-level blocker and next feasible action |
| Production security/rights decision | Owner GO only |

Per run report:
**[run date ET] [main SHA] [selected task] [actual modification/PR] [tests/CI exact SHA] [merge/Pages: yes/no] [remaining blocker] [next task] [owner action]**.

## 9. Rollout status

- [x] GitHub Issue #378 and domain ledgers already exist.
- [x] ChatGPT daily automation exists and is enabled.
- [x] Architecture changed to ChatGPT-only; no Codex/Claude required.
- [ ] Real scheduled-run evidence for GitHub tool access / branch / Draft PR.
- [ ] First ChatGPT-only small-code PR and exact-head CI verified.
- [ ] Second scheduled run resumes it correctly without duplicating.
- [ ] Future automatic low-risk merging — **not approved and not part of current scope**.

This design documentation is staged in **Draft PR #392**, not merged into `main`. Current publicly accessible family Pages remains unchanged; separate Public Production remains NO-GO.

## 2026-11-23 review and current operating status

- This is an **operating design**, not proof that an automation can keep running indefinitely, deliver asynchronously, or merge changes without human authorization. The linked ChatGPT daily scheduled task is a separate existing service. The original task label in the 2026-11-21 baseline can differ from the present UI title; use the stable ID in this document and inspect its current settings when necessary.
- The owner explicitly authorized review and release of the currently open, CI-green PRs on 2026-11-23. This **one-time owner request** does not change the default scheduled-task policy: future automation runs still stage PRs for owner review unless separately authorized.
- Source audit tools merged through [#402](https://github.com/kevinim/kevinim.github.io/pull/402) and Plano High/Senior UI fix merged through [#400](https://github.com/kevinim/kevinim.github.io/pull/400). Previous references to #381/#385 being open are historical; both were closed unmerged after their audits were consolidated via #398/#397. Always restore live state before acting.
- Separate Cloudflare Pages/family authentication, a new public-production host, billed services, source-visibility changes and Git history rewrites remain **outside this design's execution authorization**; Public Production is still **NO-GO**.
