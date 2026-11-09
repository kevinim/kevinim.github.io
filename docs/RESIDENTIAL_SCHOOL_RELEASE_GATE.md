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

## Operation
Run `node scripts/verify-residential-school-release.cjs` in release CI. It fails when independently approved evidence is absent, stale, incomplete, or has any failed required step. No release workflow may ignore the exit code. The workflow does not deploy. **GitHub branch protection / ruleset must separately require the job**; adding a YAML job alone does not configure repository rulesets. An owner must explicitly approve any changed scope or exception. PR #141 is independently managed and untouched.
