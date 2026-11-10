# Residential school assignment — mandatory release gate

**Status: NO-GO.** This gate is deliberately strict and does not certify any district yet.

## What is required before public/family release sign-off
For each of Frisco, Plano, Allen, Lewisville, Prosper, CFB and McKinney, obtain at least three independently checked **residential** address cases across at least two ZIP codes (where a district actually spans two ZIP codes). Confirm official district Finder assignment for elementary, middle and high; dashboard address resolution; exact campus match; click each school in Chromium; confirm actual visible Leaflet polygon and its current-year authority. Do not use ZIP centroid or nearest-school inference. Keep personal addresses **out of git and CI artifacts**: use synthetic/publicly listed residential samples only where reuse is permitted; save only redacted case identifiers and pass/fail evidence. Review school choice/special campuses separately.

## Known blockers
- **CFB:** 0/30 loaded school entries have dashboard polygons; official resident Finder exists, but no campus GIS source. Do not invent boundaries. Verify legal/public GIS availability; otherwise show Finder-only, label map polygons unavailable, and keep this strict release gate NO-GO until a reviewed alternative acceptance policy is approved.
- **Allen:** 21/22 polygon links refer to historical 2019–2023 source; not current enrollment. Locate current official GIS or use Finder-only with explicit age warning.
- **Plano / Lewisville:** linked polygons exist but year is not independently certified. Resolve source vintages and exceptions.
- **Prosper:** prior public facility samples matched; live official Infofinder requests timed out in latest run. Retry transient transport failures, never suppress a persistent failure.
- **Frisco:** 2 public-facility examples matched; no independent residential sampling. 73/73 directory polygon links are not enrollment verification.
- **McKinney:** 25/30 directory links, five special/nonstandard entries; residential comparison pending.

## Testability and approval scope

The seven currently required districts are checked for at least two distinct 5-digit ZIPs per district. Any one-ZIP geography exception requires a separately reviewed explicit policy change; supplying a flag inside an evidence file cannot waive validation. The synthetic positive unit test verifies that the gate is **technically passable**, but is not evidence of any real school assignment. The real gate remains NO-GO until independent residential evidence for all seven districts exists. This current-branch security/maintenance PR must not be treated as a family-UAT or public-launch approval.

## Operation
Run `node scripts/verify-residential-school-release.cjs` in release CI. It fails when independently approved evidence is absent, stale, incomplete, or has any failed required step. No release workflow may ignore the exit code. The workflow does not deploy. **GitHub branch protection / ruleset must separately require the job**; adding a YAML job alone does not configure repository rulesets. An owner must explicitly approve any changed scope or exception. PR #141 is independently managed and untouched.

## Conditional GO and CI job separation (2026-11-10)

The previous pull-request workflow always executed the strict release gate against missing evidence and failed every policy-only PR. That failed check did not imply a code bug; it blocked safe Track B documentation/UX from normal review.

The PR job now verifies policy syntax, synthetic tests, and that absent residential evidence remains **NO_GO**. A separate manual full-residential-authorization job still executes the **strict seven-district evidence gate**. A green policy-integrity check is **not** school enrollment certification or permission for Track C. Current immutable ConditionalSchoolRelease grants remain empty, with no approved address-based auto-assignments.

Before Track C publication, invoke the strict gate in the actual production release workflow, gather current source-specific non-private residential evidence and independent owner review, and independently verify branch protection (Issue #135). The policy check alone cannot substitute for any of these steps.
