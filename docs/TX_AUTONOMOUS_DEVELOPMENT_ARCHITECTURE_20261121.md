# TX Relocation — Autonomous Development Operating Design

**Status:** DESIGN ONLY, draft PR; not enabled, not deployed, no new credentials or services.  
**Scope:** `kevinim/kevinim.github.io` **only**. Never modify CareerQ or other repositories.  
**Prepared:** 2026-11-21 America/New_York.  
**Reference main when drafted:** `7695ce1ac5f04a6650dba0c04bcf0fd1747d36a3`. Recheck live HEAD at execution.  
**Owners:** human owner controls production release/security/financial permissions; ChatGPT audits/plans; Codex changes code in an isolated workspace; GitHub Actions enforces CI.

## 1. Objective and realistic autonomy

Stop asking the owner to manually choose the next issue every day. At each scheduled iteration the system should select one high-value feasible item from the current, **evidence-based** backlog, perform work within existing permissions, open one isolated draft PR where development access is available, verify the exact PR commit, update work evidence and queue the next safe item. User interruption is reserved for risk/approvals/blockers. An autonomous iteration may end with an explicit **BLOCKED**, **NO_CHANGE** or **RESEARCH_ONLY**; never fabricate delivery.

This is **periodic autonomous work**, not an always-running process. The existing ChatGPT Scheduled Task `6b01fbee8e3c81919e36536883001100` is active daily 08:00 America/New_York; it is not a Codex development schedule. Codex Automations must be separately configured in the Codex app / eligible cloud setup and its execution/access verified. Do not claim that GitHub connectivity inside ChatGPT automatically provisions Codex or GitHub write permissions in Codex. Use plan-included/free-first tooling and existing GitHub Free/Pages; do not silently provision a paid OpenAI API runner or external service.

### Single-writer rule

**Codex is the only scheduled code writer** after the Codex automation is successfully tested. **ChatGPT is the independent read-first coordinator/auditor** (may write issue status/comments, not code or PR branches while Codex owns an issue). Until that cutover is confirmed, the existing ChatGPT task retains its present limited safe-work behavior; amend it at cutover to prevent two autonomous writers. Manual Claude/Codex runs must claim a distinct work item; active overlapping path sets stop both runs and require reconciliation.

## 2. Components and authority

| Component | Role | Can do autonomously | Cannot do without specific owner GO |
| --- | --- | --- | --- |
| Existing Scheduled Task (daily 08:00 ET) | Read newest repo state; reconcile issue #378 and workstream ledgers; prioritize one claimable item; audit latest PR/CI; record evidence | Read repo / issue metadata, public-source research, status/comments as permissions permit | Claim an unverified deploy or overwrite active Codex work |
| Codex separate scheduled automation (proposal: once daily, offset from 08:00 task; configure only when cloud/environment available) | One issue → isolated worktree → code/test → draft PR → evidence | Low-risk documented source checks, bugfixes, regression tests, independently reversible improvements, draft PR | Merge to `main`, force-push/rewrite history, relax security gates, directly change live Pages, change access/credentials/privacy policy |
| GitHub Issues + `docs/TX_RELOCATION_WORK_LEDGER.md` | Durable source of truth for scope/status/acceptance evidence | Append progress and next actions with exact references | Treat informal chat claims, old queue counts, or green CI alone as DONE |
| GitHub Actions (already installed) | Verify exact commit: source, TEA, geometry, school, mobile, CSP/XSS, public-preview + deployment smoke after authorized merge | Required checks on PR and post-merge live checks | Automatically bypass failing or pending checks |
| Owner | Permission, licensing and public-release decisions | Review PR and evidence | Delegation of irreversible/security approvals by implication |

**No new GitHub Actions schedules at stage 1.** Reuse existing checks, avoid previous duplicate/stale Actions queues. If implementing a workflow later: read-only by default with explicit job-level minimal `permissions`, narrow event filters, `concurrency` grouping, no `pull_request_target` execution of untrusted code, versioned dependencies, no broad write token on PR jobs.

## 3. Durable work-item contract

Use **Issue #378** as cross-workstream index and closure/status report, **#125** (DFW GIS), **#376** (accuracy), **#375** (P3), **#139/#370–#374** (security) as detailed tracking. The ledger in the repo is a human-readable release snapshot, not a second independently editable truth; issue evidence + actual GitHub API status control final promotion. Avoid hundreds of new issues; create a dedicated issue only when work cannot be represented as a unique subtask of an existing issue.

A claimable work unit requires these fields (stored as a structured subsection in its owning Issue or a future machine-readable *derived* non-sensitive index):

```yaml
task_id: "TX-P1-02/CFB-reference-qa"
parent_issue: 125
priority: P1                    # P0 > P1 > P2 > P3
risk_tier: LOW                 # LOW / MEDIUM / HIGH
status: READY                  # see lifecycle below
executor: codex                # codex / chatgpt / human
scope_paths:
  - "tests/..."
  - "docs/..."
baseline_main_sha: "<rechecked at task start>"
duplicate_search: "task_id + source URL + expected paths + open PR"
source_evidence: "official URL, effective year, rights, TEA campus ID"
acceptance:
  - "source / vintage matches authoritative publisher"
  - "existing school map, mobile and security gates remain green"
approval_required: false
pr_url: null
latest_pr_head_sha: null
required_checks: []
pages_smoke_url: null
block_reason: null
next_action: "one explicit smallest follow-up"
```

**Never put residential addresses, unit numbers, provider secrets, personal email allowlists, or private logs in public issues or the derived index.** Only use safe synthetic/public facility addresses for QA.

### Lifecycle

```
DISCOVERED → TRIAGED → READY → CLAIMED → IMPLEMENTING → PR_DRAFT
                                                       ↓
                             CI_FAILED ← CI_PENDING → VERIFIED
                                 ↓                     ↓
                              FIXING               REVIEW_REQUIRED
                                                       ↓ owner approves
                                                   MERGED → PAGES_PENDING
                                                                ↓
                                                            LIVE_VERIFIED → DONE
```

Side states: `BLOCKED` (with verified root cause and safe alternative), `RESEARCH_ONLY` (a source-link inventory is not a polygon import), `SUPERSEDED` (cite replacement PR), `NO_CHANGE`. Never translate `CI_SUCCESS` to `LIVE_VERIFIED` or `source found` to `official address certification`.

### Deduplication/claiming

1. At each run read issue + exact `main` HEAD, open PRs and prior task comments, source years and status. Detect already-merged equivalents and old pending branches.
2. Rank by P0/P1/P2/P3 and then impact, source quality, feasibility, uncertainty and conflict overlap.
3. **Only one scheduled Codex work item at a time.** Record task ID, selected paths, start time and automation run/branch in issue before editing. If another agent already claims overlapping files, skip to next independent task. An expired claim is not automatically stolen; first inspect open branches/PRs and last write.
4. Use branch `agent/tx-<task-id>-<YYYYMMDD>` based on freshly fetched main; never edit `main`. A new run with the same task must resume its existing branch/PR, not create duplicates.
5. If base changed, compare PR diff and changed files against current main and rerun exact-head checks. Never automatically force-push, overwrite others' diffs, or touch the shared security PRs.
6. On inability to prove current state or permissions: **fail closed** with specific BLOCKED reason, rather than mint another issue/PR.

## 4. First backlog and feasible work selection

| Track | Current evidence (2026-11-21) | Safe autonomous next step | Completion boundary |
| --- | --- | --- | --- |
| P0 address → E/M/H | #363 and #368 reference UI; #389 warning regression fix; independent official residence certifications: 0 | Public-source finder/grade/year exception QA; synthetic apartment/9th/senior/boundary cases; source-specific mismatch tests | No certified residence assignment without lawful current official street+unit+grade+year result and independent holdouts |
| P1 existing geometry | #382 Allen 20 historic polygons recovered; Prosper 31 publisher zones matched | Independently classify Prosper cross-grade gaps/nonresidential risk; verify Frisco/McKinney/Lewisville/Plano vintage conflicts | Historic polygon is reference only; no inferred legal school enrollment |
| P1 new district geometry | 108 ISDs audited; 6 base, 2 opt-in, 100 not rendered; #366/#387 source cards, 0 new campus polygons | CFB/Denton rights/vintage/TEA mapping then Mesquite/Wylie/Rockwall/Richardson; import actual geometry only when provenance and redistribution rights permit | Research links ≠ polygons; PDF availability ≠ licensed browser copy |
| P2 TEA | 2,282/2,282 and 15,974/15,974 source-snapshot checks merged #365/#369 | Monitor only for new publisher version/drift; do not repeat full snapshot work | New ingestion gets distinct publisher-parity and QA gate |
| P2 public security | 11 controls 0 DONE, separate owner review PR #377/#381/#385 | Read-only source/privacy/rights inventory and documentation; no automatic merge/launch | Owner approval and new origin/headers/access/license proof |
| P3 area | Six-card base UI live; P41–P43 source limits | P41 CMS/DSHS reconciliation then P42 utility sourcing, P43 crime normalization, P40 route-provider feasibility | No fake ED driving ETA, local outage, automated toll price, or public safety score |
| UI / Redfin | Liberty/map-first split #318 merged | Regression tests/bug fixes only after P0/P1 work | Rental economics remains last |

**Escalation condition:** blocked P0 due lack of authorized district API is not an instruction to retry forbidden CORS scraping forever. Preserve reference-only truth, document provider limit once, work on the next district/available evidence.

## 5. PR and release gates

Each Codex run:
1. Load `AGENTS.md`, `HANDOFF.md`, `BOUNDARIES.md`, `docs/TX_RELOCATION_WORK_LEDGER.md`, active issue and exact latest main/PRs. Verify correct repo and clean isolated worktree.
2. First reproduce one failure or establish a missing-data test, and freeze acceptance criteria. Stop if not reproducible and unable to show beneficial safe change.
3. Change only a narrow file set. No bulk rewrite, no private data, no API abuse, no unlicensed map rehosting, no new paid dependencies.
4. Run affected unit tests plus *existing* required school address/GIS, TEA where applicable, CSP/XSS, responsive/mobile and public-preview checks. Record exact command and output summary; tests on a prior SHA do not count.
5. Open/update **one Draft PR** citing task ID, before/after, source URL/year/rights, negative tests, changed files, base/head SHA, CI link, residual limits. PR creation must not imply merge authorization.
6. Inspect real checks on the latest PR HEAD and conflicts. For `failure` inspect logs, fix same branch, rerun. For `pending`, report pending, do not merge. For unverified privacy/license/assignment rights, retain NO-GO.
7. Update issue status; hand back to ChatGPT daily audit to crosscheck independent evidence. Only an explicitly approved owner-controlled release path can merge. **Existing GitHub Pages auto-deploys main**, so merging is itself a deployment decision.
8. After an authorized merge check the actual merge SHA, Pages deployment and served HTML/JS plus 390px/desktop school markers/address/source-year warnings; only then mark DONE.

Risk tiers:
- **LOW / autonomous draft:** tests, sources, read-only audits, documentation, reversible bugfix isolated in a PR.
- **MEDIUM / human review before merge:** GIS geometry import, school selection logic, dependence on public APIs, public UI changes, permissions/attribution that may affect users.
- **HIGH / explicit owner action before any live change:** public production, Git history rewrite, repo visibility, auth/identity, DNS, secrets, payment, privacy-sensitive integration, unlicensed data, security PR #377/#381/#385, bypassing checks.

Failure policy: 2 attempts at same deterministic root cause per run; then classify BLOCKED, attach non-sensitive log evidence and next workaround, and select next independent READY task in a subsequent run. Avoid one bug saturating the daily queue.

## 6. Proposed schedule and lifecycle rollout

**Already active:** ChatGPT recurring task `TX 대시보드 지속 점검` at approximately 08:00 ET; ID `6b01fbee8e3c81919e36536883001100`. Verify it reads actual GitHub and produces a meaningful update; a green schedule does not guarantee write access or a coding environment.

**Not yet provisioned:** one Codex automation, configured from the eligible Codex surface with this repository's cloud environment or local worktree access; proposed daily run *after* the morning audit, when configured. Verify ability to inspect files, run Node tests, create a branch and draft PR. No new OpenAI API-key-based scheduled GitHub Actions workflow because a separate paid invocation, permissions and duplicate job cost are not pre-approved.

Rollout:
- **Stage A — design (this PR):** document roles, gates, no code/runtime changes.
- **Stage B — read-only pilot:** 1 scheduled ChatGPT audit + 1 manually invoked Codex task; confirm repository and GitHub credential permissions, read AGENTS/HANDOFF, task selection and issue evidence. No merge.
- **Stage C — draft-PR pilot:** 3 independent LOW-risk items; require one branch/one draft PR per item, exact-head CI, no duplicate/conflicting open PR, source-vintage and PII safety, cost audit. No merges.
- **Stage D — scheduled Codex:** only after Stage C success, configure separate recurring Codex automation, switch ChatGPT task to audit-only, track run IDs/results against #378. Limit concurrently active Codex issue to one. If cloud schedule unsupported, operate it manually from Codex; no claim of unattended code delivery.
- **Stage E — release automation option:** future, separately approved low-risk allowlist only after repeated reliable runs, live rollback and verified owner approvals. Existing public Pages policy remains owner-controlled until then.

## 7. Acceptance tests for the orchestration itself

| Test | Expected |
| --- | --- |
| Existing open PR covers same task/files | Resume or skip; 0 duplicate PRs |
| Codex scheduled and manual Claude overlap | One writer only; overlap blocked |
| CI `verify` pending/failing or stale commit | No merge/no DONE |
| New `main` merged after branch creation | Reconcile diff, rerun required checks |
| API CORS/rights unavailable | Reference-only, BLOCKED evidence; no unauthorized proxy |
| School marker unexpectedly 0 or warning hidden | Block release; 390px + desktop regressions |
| User address or unit appears in diff/log/PR | Abort, contain exposure, owner notification |
| GitHub/tool/provider disconnected or rate-limited | Record reason; no fabricated deployment |
| Security permission/paid service required | Escalate to owner; no configuration change |
| Prior source dataset frozen / TEA publisher unchanged | Skip redundant QA instead of wasting resources |
| Official source vintage changed | Flag data drift; request independent parity before new release |
| Three consecutive safe pilots | Eligible to propose scheduling Codex, not unconditional auto-merge |

Success metrics: number of **genuine** merged + live-verified tasks, distinct school polygons linked with rights/vintage, mismatch detection rate, escaped regressions, duplicate PR count (target 0), failed CI bypass count (target 0), user approvals per finished low-risk task, per-run budget/time and evidence completeness. Raw PR count is not a success metric.

## 8. Copy-ready Codex task prompt (for separate Codex automation setup)

```text
Operate only kevinim/kevinim.github.io for TX relocation. This is a single-iteration autonomous development run, not a standing authorization to merge or deploy.

Read AGENTS.md, HANDOFF.md, BOUNDARIES.md, docs/TX_RELOCATION_WORK_LEDGER.md and docs/TX_AUTONOMOUS_DEVELOPMENT_ARCHITECTURE_20261121.md. Inspect current main SHA, GitHub issues #378/#125/#376/#375, open PRs, latest exact-head required CI and public Pages state. Never use CareerQ context.

Select exactly one highest-priority, LOW-risk, ready and unclaimed piece of real work. Prioritize P0 address E/M/H integrity and P1 official school GIS geometry; do not repeat finished source investigations. Check for an existing PR and overlapping paths. If blocked by official API CORS or redistribution rights, record the blocker and proceed with safe reference-only QA; never invent an official assignment or proxy around a vendor restriction.

Use a clean isolated worktree, a single issue/task ID and agent/tx-... branch; reproduce the failure or write a failing test first. Make minimal reviewed changes and run all affected unit/browser/security and required existing workflows. Never change main directly, disable tests, create paid API infrastructure, rehost unapproved GIS, or store addresses. Open/update ONE draft PR with current SHA, sources/vintage/rights, CI evidence and residual risks. Do not auto-merge any PR or change live Pages, auth, DNS, secrets, Git history, licensing or production security.

Post exact progress and blocker evidence to #378 and the owning issue if permitted. Report new work done, checks, draft PR link, whether code reached main/Pages (normally NO), uncompleted scope and next task. If repository/auth/CI environment unavailable, fail closed with the specific reason and do not claim completion.
```

## 9. Owner setup handoff

1. Keep the current ChatGPT daily audit enabled (already true); verify its first real result.
2. In Codex Cloud or the Codex app, create/publish a TX-only environment with access to this GitHub repository and existing Node test tooling. Confirm available plan/permissions; do not guess. Only connect approved repositories. No billed API bootstrap.
3. Paste the prompt in §8 into **one** Codex task to prove it can inspect repo and run tests. For Codex Automations, configure an eligible separate recurring job once Stage C proves reliable.
4. Do not enable parallel writers or auto-merge. After Codex schedule is confirmed, update the ChatGPT task to read/audit/comment only and avoid conflict.
5. Owner reviews the draft PR evidence and decides if/when to merge each scope; Public Production security remains NO-GO.

**This document is a design proposal, not an executed Codex schedule, a created Codex environment, a deployment, or security approval.** Keep it in a Draft PR until reviewed; no change to main or current Pages behavior.
