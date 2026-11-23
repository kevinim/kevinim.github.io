# TX DFW — Production Security Tracker

> **Canonical security release ledger after PR #377 merge.** Older dated tables are historical snapshots; use the latest appended review and live GitHub evidence.  
> Last audited: **2026-11-21 (America/New_York)**. Baseline `main`: `7775b89fcd42eeb38c224894e3a9b4594263e76e`.  
> **Release decision: PUBLIC PRODUCTION NO-GO.** Creating this tracker, an Issue, a green CI run, or a Draft PR **never** authorizes deployment, visibility changes, history rewrites, paid services, or a public launch.

## 0. How to resume work (ChatGPT / Codex / Claude / new conversation)

1. Read this tracker, `AGENTS.md`, `HANDOFF.md`, `PUBLIC_RELEASE_SECURITY.md`, `PUBLIC_PROVIDER_READINESS.md`, and the **latest** `deploy/environment-plan.json`.
2. Fetch **live** GitHub `main` SHA, all open PRs, referenced Issues, actual Actions checks, and current hosted result; the dates and statuses below are a snapshot, not proof of today's release.
3. Choose the highest-priority unfinished unblocked SEC item. Reuse linked Issues and existing scripts rather than creating a duplicate action queue. Record the exact target, current baseline, and one testable next action.
4. Work on a separate branch/PR; keep school, map, boundary and production behavior unchanged unless that specific change is separately authorized. Avoid direct pushes/force pushes to `main`.
5. After each step, record **implementation status vs verified/deployed status**, evidence URLs, blockers, next action, current main SHA, and the checked date in the Issue. Update this tracker in the same reviewed PR or a small documentation PR.
6. Report **done / unfinished / blocked / next step** at the end of every work session; never imply ongoing asynchronous work. Reconcile conflicts if other agents have changed a file or PR. **Do not claim an update to this canonical tracker is live until its PR is merged.**

### Standing trigger — “남은 건 뭐죠?” / “남은 작업 진행해주세요”

When the owner asks these or similar questions **about Production security**, treat the request as a **status check plus permission to continue the highest-priority safe, already-approved work during the current session** — not as a request for a static list only.

1. Re-check actual GitHub main/PR/Issue/CI/host evidence before quoting task counts. Label **implemented**, **tested**, **deployed**, and **owner-approved** separately, including genuine blockers.
2. Present a compact status snapshot, then **perform the highest-priority actionable unfinished task** (audit, code change, tests, documentation, isolated draft PR as appropriate) without waiting for a second “진행” request. Do not claim success until the tool confirms the result.
3. Re-run applicable checks; update the same GitHub Issue and this tracker with the exact SHA, PR, observed verification, status transition, next task, and remaining blocker. If no safe actionable task exists, record the root cause and concrete alternative rather than inventing completion.
4. Finish every session with **이번 완료 / 현재 미완료 / 차단 원인 / 다음 우선순위 / main 병합·배포 여부**. Explicitly say if work is staged only on a Draft PR.
5. Never silently change live production, login/auth policy, DNS, repository visibility, Git history, billing, or provider agreements. These require fresh specific owner authorization. No background or scheduled continuation is implied: work resumes on each user request.

For a **general TX project** “남은 건 뭐죠?” request, first reconcile separate workstreams (address→E/M/H, DFW GIS, school-map accuracy, TEA, security, regional features) against their own records; do **not** mark those as complete or copy them into this security ledger. Prioritize and work within the user's referenced scope, or if none specified, report cross-workstream status and perform a safe highest-priority action with appropriate evidence.

**Security ledger scope only:** address→school assignment, DFW GIS coverage and TEA data quality have separate product release gates; their pending rights and actual-residence correctness still affect public release, but this tracker is not a duplicate of those full product backlogs.

## 1. Environment boundaries

| Environment | Current verified state | Rule |
| --- | --- | --- |
| Existing family page — `https://kevinim.github.io/` | Publicly accessible GitHub Pages, live from current public repository; **not** authenticated | Preserve existing usability and publishing configuration. It is NOT evidence of private UAT access or authorization for broad promotion |
| Future family-only UAT | Not provisioned; host null, Access checks plan-only | Separate host; family allowlist, authenticated/denied/anonymous direct-asset tests required **before** family data is uploaded. No surprise login wall on current Pages |
| Future Public Production | Not provisioned; `publicProduction.deployEnabled=false` | Distinct public build/host, sanitized artifact, provider/data/PII/signoff and real rollback gates |
| Private development source | Migration preflight exists; actual new private repo not provisioned | Import reviewed **clean snapshot**, not existing public Git history; keep production artifact separate |

Source: `deploy/environment-plan.json`, `docs/PRIVATE_SOURCE_MIGRATION_READINESS.md`, `deploy/UAT_ACCESS_READINESS.md`, `docs/FREE_RELEASE_SIGNOFF_RUNBOOK.md`.

## 2. Status vocabulary and evidence rules

- **미착수 (NOT_STARTED):** target capability is not implemented or provisioned; a plan/test scaffold does not make it done.
- **일부 구현 (PARTIAL):** some targeted code/CI/docs exist, but the full acceptance criteria have not passed. Does not imply an agent is currently working.
- **진행 중 (IN_PROGRESS):** an active branch/PR or currently running, attributable work exists; link it.
- **차단됨 (BLOCKED):** known external permission, licensing, disclosure risk or explicit owner decision prevents closure; document the non-destructive next step.
- **검증 대기 (VERIFY_PENDING):** implementation exists but final exact-build, live host, rights or rollback evidence is missing.
- **완료 (DONE):** all acceptance conditions independently checked, exact artifact SHA/PR/CI/live evidence recorded, owner approval where required, no blocking regression. **No status can be DONE solely because a document was written, Issue closed or green offline test appeared.**
- **모니터링 (MONITOR):** ongoing recurrent control after a one-time implementation is DONE; recurrent misses reopen or create a linked Issue.

Scope note: the **11 SEC objectives below have 0 DONE** in this initial baseline. This does not contradict successful individual code/tests; it means broad Public Production acceptance is still pending.

## 3. Priority ledger — as of 2026-11-21

| ID | Priority | Work item | Status | Linked issue(s) | Verified partial evidence / remaining blocker |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | P0 | Private source → sanitized public artifact | **미착수** | [#370](https://github.com/kevinim/kevinim.github.io/issues/370) | Preview builder + migration inventory exist; no actual private source/curated production separation |
| SEC-02 | P0 | Historical personal exposure review / remediation | **차단됨** | [#139](https://github.com/kevinim/kevinim.github.io/issues/139) | Three retired live assets previously return 404; historical Git/refs/forks risk open; destructive cleanup requires separate owner authorization |
| SEC-03 | P0 | Public external API contracts, quotas, provider resilience | **차단됨** | [#74](https://github.com/kevinim/kevinim.github.io/issues/74) | Client retry/fail-closed handling and source audit exist; global Nominatim/OSRM limits and public provider entitlement not proven |
| SEC-04 | P0 | Dataset/public GIS/ratings/Redfin redistribution rights | **일부 구현** | [#371](https://github.com/kevinim/kevinim.github.io/issues/371), [#254](https://github.com/kevinim/kevinim.github.io/issues/254) | [PR #385](https://github.com/kevinim/kevinim.github.io/pull/385) audited 288 public-build data/media assets: approved 0, pending rights review 288; per-asset source and permission decisions unresolved |
| SEC-05 | P0 | Address/coordinate transfer/privacy notices | **일부 구현** | [#74](https://github.com/kevinim/kevinim.github.io/issues/74), [#77](https://github.com/kevinim/kevinim.github.io/issues/77) | Current notices and audit checks exist; all public entrypoints/providers/privacy-policy review required |
| SEC-06 | P1 | Enforced Production HTTP security headers | **일부 구현** | [#87](https://github.com/kevinim/kevinim.github.io/issues/87) | Meta CSP and live-header read-only audit exist; separate host with enforced HTTP CSP / frame-ancestors etc. absent |
| SEC-07 | P1 | XSS, third-party dependencies, hostile-data browser QA | **일부 구현** | [#87](https://github.com/kevinim/kevinim.github.io/issues/87), [#77](https://github.com/kevinim/kevinim.github.io/issues/77) | Automated guards exist; complete final-build source→sink/legacy entrypoint, vendor and browser review missing |
| SEC-08 | P1 | Public Production CI/CD / owner release gate | **미착수** | [#372](https://github.com/kevinim/kevinim.github.io/issues/372) | Existing Pages `main` protected and public-security CI non-deploying; separate production environment and promotion pipeline absent |
| SEC-09 | P1 | Authenticated family UAT / direct-asset protection | **미착수** | [#373](https://github.com/kevinim/kevinim.github.io/issues/373) | Access configuration templates/negative unit tests exist; no configured real Access host or live identity tests |
| SEC-10 | P1 | Real backup, cutover and rollback rehearsal | **미착수** | [#374](https://github.com/kevinim/kevinim.github.io/issues/374) | Synthetic four-file drill exists; real owner-controlled private backup/restore test absent |
| SEC-11 | P2 | Ongoing security monitoring and incident response | **일부 구현** | [#77](https://github.com/kevinim/kevinim.github.io/issues/77), [#311](https://github.com/kevinim/kevinim.github.io/issues/311) | Scheduled security/privacy checks exist; alert ownership, real incident/rollback playbook and Actions queue reliability require verification |

**Revalidated rollup (2026-11-21):** DONE **0** / 미착수 **4** / 일부 구현 **5** / 차단됨 **2** / 진행 중 **0** / 검증 대기 **0**. Earlier initial snapshot was 5/4/2; SEC-04 moved to partial after CI, not to completed. These counts describe whole-objective completion, **not** the number of implemented controls.

### Individual closure criteria (in addition to linked Issue checklists)

- **SEC-01:** reviewed clean private source and deploy-only artifact are **actually separated**, all published assets allowlisted and exact public-build smoke tests pass.
- **SEC-02:** historical public ref/fork/cache exposure inventoried with redacted evidence; any real exposed keys rotated; risk treated with owner-approved proportional remediation or explicit recorded residual-risk decision.
- **SEC-03:** public terms/quotas approved per geocoder/router/tiles and aggregate application-wide abuse controls tested; no reliance on uncontrolled demo traffic; provider failure UX verified.
- **SEC-04:** every published asset has evidence-backed redistribution classification, attribution, license/vintage and unknown/restricted material excluded.
- **SEC-05:** full inventory of sent address/coordinate fields, services, notices and retention limitations verified across *all* shipped entrypoints; no false claim that provider logging is absent.
- **SEC-06:** live Public Production origin enforces restrictive **HTTP** CSP with `frame-ancestors`, HSTS, nosniff, Referrer/Permissions policy and verified browser compatibility; GitHub Pages meta CSP alone is insufficient.
- **SEC-07:** hostile-input and untrusted source→sink checks pass on the **exact** built artifact; dependency provenance/advisories reviewed; desktop/mobile, markers and links show no regression.
- **SEC-08:** separate promotion is fail-closed, required checks and minimum deploy permissions verified, owner GO recorded, artifact SHA pinned, postdeploy smoke and rollback plan proven.
- **SEC-09:** separate live family UAT has exact-email allowlist, real allowed/denied user tests and anonymous denial of **HTML/JS/JSON on primary/preview/immutable/custom host aliases**; existing public Pages stays unchanged until approved.
- **SEC-10:** real reviewed artifact/private backup restored and rollback rehearsed; family data never restored to a publicly accessible holding page.
- **SEC-11:** named monitoring cadence/ownership, status escalation, incident disable/revoke/recovery playbook and routine checks documented with operational evidence.

## 4. Verified baseline links (do not generalize beyond their scope)

- [GitHub security workflow run 44877087324](https://github.com/kevinim/kevinim.github.io/actions/runs/44877087324): **four success jobs** (Gitleaks history, privacy/credential audit, PR scan, offline public-preview browser), on **earlier SHA `b65694a317871658945ae8a5625350c6dd218929`**. **This is not a security approval of the current `7775b89` HEAD or future Production artifact.**
- `.github/workflows/public-release-security.yml`: explicitly **no deployment**; sanitized preview intentionally must remain release-BLOCKED.
- `PUBLIC_RELEASE_SECURITY.md`, `PUBLIC_PROVIDER_READINESS.md`: required source separation, third-party terms, browser/owner attestations and explicit NO-GO.
- `docs/PUBLIC_SECURITY_REMAINDERS_2026-11-13.md`: outstanding history/headers/licensing/quotas; historic notes about owner-reviewed GitHub settings.
- `docs/FREE_RELEASE_SIGNOFF_RUNBOOK.md`: current Pages `main` merges can publish immediately; solo-owner manual merge and rollback policy.
- `docs/PRIVATE_SOURCE_MIGRATION_READINESS.md`: migration preparation **only**, not a real private repo or cutover.
- `docs/UAT_CUTOVER_ROLLBACK_DRY_RUN.md`: synthetic rollback pass **only**; cannot claim live backup restored.
- `backend/README.md`: local backend scaffold only, public API adapters deliberately 503 and no deployed Worker/production quota.
- GitHub `main.protected=true` was observed, but the connected GitHub App **cannot** read the full admin branch-protection settings (403); do not claim all required settings are independently reverified.
- [Issue #139](https://github.com/kevinim/kevinim.github.io/issues/139) is OPEN; credential-pattern success is not a historical PII audit.
- `deploy/environment-plan.json` is the explicit launch switch; it is **planning-only** with Public Production, Family UAT, and separate deploy disabled.

## 4A. Recorded continuation — 2026-11-21, SEC-02 history audit

- **Implementation and verification:** [PR #381](https://github.com/kevinim/kevinim.github.io/pull/381), exact head `1f1e34226a0c0920dcda3aedc2b8afcf6fd7d9dc`, is **Ready for review, NOT merged or deployed**. [SEC-02 Actions run 44929166663](https://github.com/kevinim/kevinim.github.io/actions/runs/44929166663) passed the synthetic tests, silent Git PR-head fetch, redacted history audit and unchanged-source check.
- **Observed:** locally reachable Git ref tips scanned **709** after adding PR HEAD ref coverage, up from **352** on the initial branch-only audit. **4 historical Git objects** still match known retired personalized dataset filename patterns. No historical values, paths or SHAs are output; no history mutation. No result is a complete PII or credential audit.
- **GitHub metadata checked:** the public repository API returned **361 pull refs** and `forks_count=0` at check time. These metadata counts are **not** evidence that no external clones, older forks, caches, PR merge refs or inaccessible historic material exist.
- **SEC-02 remains 차단됨 / BLOCKED for public promotion**: accessible Git history still includes known retired asset evidence. Generic older JS/HTML embedded values, credential owner checks, PR merge refs, copies and user-approved remediation strategy are still unresolved. No history rewrite is authorized.
- **Next safe action:** reconcile [SEC-01/#370](https://github.com/kevinim/kevinim.github.io/issues/370) clean private source + sanitized public distribution, document authorized incident/credential check and residual-risk decision in [Issue #139](https://github.com/kevinim/kevinim.github.io/issues/139).
- **Do not claim** four historical Git objects equal four unique sensitive files, people or current live URLs. Existing family Pages is unchanged; **Public Production NO-GO**.

## 4B. Recorded continuation — 2026-11-21, SEC-04 data redistribution audit

- Implementation: [PR #385](https://github.com/kevinim/kevinim.github.io/pull/385) on `main` baseline `44b9fe94c1ebb489fff486bd0148746a28d04a53` adds zero-presumed-approval rights registry, isolated read-only CI and synthetic negative tests. **Not merged or deployed.**
- Exact candidate verified by [CI run 44931349209](https://github.com/kevinim/kevinim.github.io/actions/runs/44931349209): `dist/public-preview` built; **288 data/media assets** reviewed by scanner, **0 explicitly approved**, **288 pending**, 0 restricted/excluded recorded. This is an **absence of documented licenses**, NOT an allegation 288 files are unlawful.
- **SEC-04 status PARTIAL:** automated audit gate is implemented and tested, but per-asset publisher rights, redistribution/license scope, attribution, embedded datasets, browser-fetched providers and final review are still missing. Exact public Production remains **NO-GO**.
- **Next:** use local itemized ignored audit report to reconcile these 288 files to official provenance, enter evidence-backed decisions per asset, remove or link-out assets without adequate permission, run strict `--assert-ready` and recheck source-separated artifact, legal terms, security and user GO. Do not forge approval flags.

## 5. Work dependencies and change policy

**Recommended order:** SEC-02 privacy inventory (non-destructive) + SEC-01 clean separation → SEC-03/SEC-04 provider/data entitlement → SEC-05 disclosures → SEC-06/SEC-07 exact-build browser security → SEC-09 private UAT authorization → SEC-10 real rollback → SEC-08 separate Public Production GO gate → SEC-11 steady-state operation. Independent low-risk read-only audits may proceed in parallel but MUST NOT be labeled external release authorization.

**Hard constraints:**
- Free-first. No paid provider, domain purchase, hidden deployment credential, arbitrary hosting changes or unsolicited new identity wall.
- Never expose credentials, personal residential addresses, full trace URLs, email allowlists or secret provider configs in public Issues/docs/artifacts.
- No bulk creation of hundreds of Issues/actions. Reuse the canonical SEC IDs; one Issue may support multiple closely coupled controls.
- Public source remains readable to visitors; private Git does not make shipped JS/data private. Past public Git history cannot be erased simply by deleting current files.
- Don't conflate school official Finder links, source-vintage polygon accuracy or TEA data QA with formal residence→E/M/H certification. Separate product release gates remain in force.
- New `main` PRs or deployments require the owner's separately documented approval. **Never flip `deploymentMode` or `deployEnabled` for the sake of passing CI.**
- A security monitoring CI run on an older SHA is not current-head verification. Prefer a concise redacted evidence record for each actual revision.

## 6. Required per-iteration status report

Use this format in the Issue and user-facing handoff:

| Field | Required content |
| --- | --- |
| Item | `SEC-XX` + exact Issue/PR |
| Previous → current | State transition and why it is justified |
| Implemented | Specific files/config/tests actually changed |
| Verified | Exact commit SHA, job/run links, manual/live evidence and scope |
| Not verified | Unknown permissions/terms/header/hosting/real-user checks explicitly stated |
| Blocked | Root cause and safe alternative; never silently mark Done |
| Next | One concrete priority action, responsible actor if applicable |
| Release | `CURRENT_PAGES_UNCHANGED`, `FAMILY_UAT_NO_GO`, `PUBLIC_PRODUCTION_NO_GO` or expressly approved new decision |
| Reviewed | Date and source revision |

Only append **factual completed work**. If an agent has not edited GitHub or run a test, record `not executed` rather than promising a result.

## 2026-11-23 release review — supersedes older PR-state snapshots

**Owner instruction:** Review and safely merge currently open PRs to existing GitHub Pages. This does **not** approve separate Public Production launch, Cloudflare Pages/family authentication, paid services, repository visibility changes, historical Git rewrite, license grants, or exposure of family data.

- **SEC-01 preview safety** PR #396, **SEC-04 fail-closed initial rights** PR #397, **SEC-02 redacted historical audit** PR #398 were merged and live-verified 2026-11-22. The known history pattern objects (**4**) and redistribution pending (**288**) are **not** remediated. See [Issue #378](https://github.com/kevinim/kevinim.github.io/issues/378) and [SEC-04 #371](https://github.com/kevinim/kevinim.github.io/issues/371).
- **SEC-04 consolidated provenance crosswalk** [PR #402](https://github.com/kevinim/kevinim.github.io/pull/402) replaces closed/unmerged #399 and #401. On exact PR SHA `32f7be11aaa5644ce9111b4b600eab6c956281c7` **5/5 GitHub CI workflows passed**: exact sanitized preview has **288 media/data files; 244 education/GIS filename candidates (200+44); 14 with SHA-pinned source evidence and 230 without; among 230 unpinned, 200 have source-shaped top-level key names, 30 have none**. This is structural triage only, not publisher/license clearance. **0/288 rights approvals**, Public Production NO-GO. Verify merge and actual Pages/smoke separately.
- **Security objective closure:** full SEC-01–SEC-11 remain **0/11 DONE**. Installed partial audits are not whole-objective closure. SEC-09 Cloudflare/family authentication is owner-deferred, not completed.
- **TX address/school P0 UI correction** [PR #400](https://github.com/kevinim/kevinim.github.io/pull/400) squash-merged as `b50d0de0eb8a0ca213c185cff3d7f4fb08a6da90` after 7/7 exact-branch CI. It distinguishes Plano High (9–10) vs Senior High (11–12) missing-coverage warnings; it does **not** certify enrollment or school assignment. Verify Pages and postdeploy live checks separately.
- **Autonomous design PR #392** is documentation, not evidence that a scheduled run can deploy.
- Older dated descriptions of #381/#385 as open/unmerged are historical: both were superseded and closed **unmerged** after #398/#397 respectively.
- Continue to record exact SHA, CI, Pages, source and rights decisions in Issues #371/#378. **Never interpret a security documentation or audit merge as Public Production GO.**
