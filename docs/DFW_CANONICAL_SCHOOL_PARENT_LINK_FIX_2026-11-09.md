# DFW official parent link repairs — QA-only, 2026-11-09

**Parent:** PR #160 (`feature/dfw-parent-guidance-remaining22-20261109`). This child PR updates two navigation URLs only; it does **not** merge source registries to main, modify school GIS, or authorize Production.

## Two verified district-owned parent paths

| TEA district | Previous source issue | New official parent navigation URL | Verification limit |
| --- | --- | --- | --- |
| 070908 Midlothian ISD | An Agent04 HEAD probe returned 404 for prior school-boundaries alias. HEAD may be unreliable; content is not a residential result. | https://www.midlothianisd.org/enrollment/find-my-school | District's page documents home-address lookup; current-year school polygons and any particular address match are not independently certified. |
| 057904 Cedar Hill ISD | Enrollment endpoint returned HTTP 500 in Agent04 HEAD probe. | https://www.chisd.net/services/lacy-enrollment-center/k-12-new-student-registration | Official page instructs families to visit SchoolFinder before registration; the website is navigation only, not a verified returned campus. |

Official source hierarchy: district landing pages and K-12 enrollment instructions; no third-party guesses. Evidence: `data/dfw-canonical-parent-links-remediation-2026.json`. Host `www.chisd.net` is added to **both** exact-host security allowlists. No suffix wildcard or automatic address submission.

## What we do not change

- Public ISDs remain **108**, with **107** registered official guidance paths; Chico (249904) remains unverified. Registration may be confirmed through its district site/ESC Region 11, but an approved current-year parent attendance Finder path has not been verified. No false 108/108.
- TEA campus records remain **2,182** within the project proxy, including **1,941** public ISD rows. Grade/year and lifecycle rules are unchanged.
- No school-specific GIS, household address result, district assignments or map markers are updated.
- The 2026–27 actual residential school assignment / visible boundary gate **#148 remains NO_GO**, even when both new pages return HTTP 2xx.

## Execution

`node --test tests/dfw-source-route-canonical-repair.test.cjs tests/dfw-canonical-parent-link-probe.test.cjs`

`node scripts/build-dfw-school-coverage-matrix.cjs --check`

`node scripts/probe-canonical-dfw-parent-link-repairs.cjs --live`

Pinned GitHub Actions `dfw-official-source-link-repair-qa.yml` runs source integrity, all neighbor and batch7 tests, reference source audit, and safe HTTP GET against both URLs. External-site unavailability is recorded rather than mistaken for proof no schools or attendance GIS exist. CI test success is source-only approval, never Production sign-off.

**Integration dependencies:** source PRs #141→#144→#147→#150→#157→#159→#158→#160, then this child source correction. QA-only #173 must never be merged. Other Agent branches are not modified.
