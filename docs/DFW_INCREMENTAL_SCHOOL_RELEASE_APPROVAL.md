# DFW school dashboard — district-by-district staged approval policy

**Date:** 2026-11-09. **Scope:** QA/review workflow only. **Production:** NO-GO until security, official data permissions, integrated head and owner approval are independently completed.

This child change is stacked on the existing **Draft PR #148** and **does not replace** `scripts/verify-residential-school-release.cjs` or its fail-closed production validation. There is no silent merge to `main`, no GitHub Pages deployment, no private residence data, and no paid service.

## Problem and separation

The existing release gate requires, for **all seven priority ISDs**, 3 independently reviewed public residential cases across 2 ZIP codes (where practical), exact E/M/H school outcomes, a clicked school and an official current-year polygon. That gate correctly blocks a false claim of a **complete** school+zone system but cannot represent a verified school assignment when the district has not supplied rehostable GIS.

The new `scripts/evaluate-dfw-incremental-school-approval.cjs` emits an **independent, per-district capability JSON** from `data/dfw-incremental-school-approval-evidence-2026.json`. It covers the seven existing focus districts plus opt-in Irving. The strict original 7-district gate still applies to any assertion of **all-feature Production GO**.

| Level | District's public-user capability once evidence is independently certified | Automatic presentation requirements |
|---|---|---|
| 1 — Current assignment and official GIS | Show E/M/H assigned campus markers and current school-specific polygons | Official Finder observed for 2026–27, 3 independent public residential cases and grade/campus-ID comparisons, current official GIS authority, successful campus-click visible polygon and reuse-rights review |
| 2 — Verified assignment only | Show E/M/H assigned campus markers **without** an asserted district boundary | All Level 2 independent Finder/address/grade evidence; polygon remains explicitly unavailable/unverified |
| 3 — Verified operational official Finder | Display the district's official Finder navigation only; **do not invent school names** | Actual district Finder operation/year observed and dated, trusted exact official HTTPS source; HTTP 200 alone insufficient |
| 4 — Unverified | No automatic school assignment nor official GIS claim | Missing or incomplete evidence; original official district contact may be offered as **unverified inquiry guidance**, not as a working Finder |

**Important:** These are candidate capabilities, *not automatic Production deployment permissions*. Every output district includes `productionAuthorized:false`. Even a synthetic Level 1 fixture keeps global Production `NO_GO`. A required owner-approved integration/release decision is separate.

## Real evidence gate (never infer from current PR success)

For Level 2, at least 3 independently reviewed **public residential** samples spanning 2 ZIPs must include: direct official Finder grade results, exact TEA 9-digit E/M/H campus IDs matching dashboard IDs, school markers visible, public residence source (kept privately or as appropriately redacted provenance), reviewed choice/transfer/split rules, unique redacted evidence SHA256, review within 90 days, named separate collector and independent reviewer. Do not store house address, apartment unit, search-history URL, coordinates or contact information in Git or Actions.

For Level 1, the same cases must have year-current, official school-specific GIS authority and E/M/H visible polygons on actual school click, with exact per-grade campus match and a separate source/reuse permission review. Historic Irving titles (2024–25/2025–26), Allen historical zones, or a guessed approximate Finder-derived polygon **cannot** satisfy this requirement. Where the official current Finder provides only navigation, start at Level 3; without a live Finder observation, remain Level 4.

**Apartment unit policy:** A published complex/base street address can be used to determine the *default* zone where the district Finder accepts it; do not demand a unit universally. Where an official district documents building/unit or other split-address exceptions, that exception must be reviewed and respected. A leasing-office geocode alone does not establish a tenant's assigned school.

## Initial truth-preserving baseline (no fabricated approvals)

| District | Existing technical evidence | Missing independent approval |
|---|---|---|
| Prosper | PR #172 live 5 public residential GIS/Infofinder code correlation; #175 browser integration | Independent human/auditable official Finder E/M/H match and boundary visual proof |
| Irving | PR #177 official Locator GIS overlay + 3 campus-point technical samples | Real residential Finder and district confirmation that older-named GIS layers are current 2026–27 |
| Plano / Lewisville / McKinney | PR #178 live address browser QA; official Finder UI probes | Independent year/grade campus outputs; exceptions; year-authoritative geometry |
| Allen | PR #170 historical ranges; #179 marker regression | Year-current GIS and independently reviewed home address Finder results |
| Frisco | PR #165 property QA and GIS candidate | Independent 3-home current-year grade results |
| CFB | PR #155 candidate method and official GuideK12 route | Licensed current boundary / independent home results; Level 2 can become possible first |

**As of 2026-11-09:** None of these reviews has independently attested and sealed Level 2 or Level 1 in this branch. The initial evidence JSON uses `false`, `null`, and empty case arrays. The evaluator must report Level 4 for all eight (even if a related PR's geocoding/browser CI passed), pending actual independent evidence.

## Execution and integration

```bash
node --test tests/dfw-incremental-school-approval.test.cjs tests/residential-school-release-gate.test.cjs
node scripts/evaluate-dfw-incremental-school-approval.cjs
# Output: artifacts/dfw-per-district-capability-review.json
# Existing full Production gate still fails closed:
node scripts/verify-residential-school-release.cjs
```

Read-only pinned GitHub Actions workflow `.github/workflows/dfw-incremental-school-approval-qa.yml` produces the evidence artifact (7-day retention) and ensures the output never approves Production. A separate integration PR should consume this JSON to gate the visible school/campus/GIS UI; Agent 03 and Agent 05 own address/map implementation, so this QA PR deliberately does **not** edit `home-lookup-v2.js`, GIS polygons, map layers, or PR #162. Agent 07 must link source PR merge order, security PR #182 and protected release job with feature-specific acceptance. **Do not merge QA-only PR #173.**

## Current operational blockers, correctly scoped

1. Independent Prosper official Finder visual 2026–27 E/M/H residential outcomes and appropriate source provenance — **missing**.
2. Other districts' three public residential sample reviews — **missing**.
3. School-year GIS authority/permission (Irving/Allen/CFB especially) — **missing or restricted**.
4. Owner-approved integration of branches and exact Production SHA — **not performed**.
5. Required GitHub branch-protection policy that invokes actual Production evidence check — **not certified**.

The purpose of this change is to make partial functionality **eligible for review** without converting an unverified address lookup into a school enrollment recommendation. It does not itself remove the overall Production NO-GO.

## Integration and freshness audit — 2026-11-10

The evaluator's default review date is now derived from the current UTC calendar day, not the original 2026-11-09 development date. CI fixtures deliberately supply an explicit fixed clock to remain reproducible. Live review must reject Finder and independent reviewer evidence older than 90 days. The branch has been synchronized with the latest #148 policy-only CI / separate manual strict Track C gate. A passing code-integrity check does not authorize real residential assignments. All eight current real-evidence entries remain HOLD until independent district/grade/Finder and publisher geometry evidence is supplied and reviewed; no private addresses are committed.

## Main branch release note — 2026-11-10

PR #148's policy-integrity and manually invoked strict full-residential certification workflows are already merged to main. This QA-only tier-report PR now targets main directly. The eight per-district example/evidence entries remain **HOLD** until independent source checks and publisher rights approvals are available; the tier evaluator never authorizes production or residential automatic school assignment. A passing required `verify` check attests only to repository quality controls, not to current-year enrollment correctness. Owner has authorized merging review-ready noncertifying code, but this does not override independent real-source evidence requirements.
