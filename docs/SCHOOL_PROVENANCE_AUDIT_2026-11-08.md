# TX school source-provenance independent audit

**Review date:** 2026-11-08 (ET)  
**Role:** Read-only quality gate for existing school evidence; **NOT live enrollment certification**  
**Concurrent work:** Claude security PR #72, legacy audit PR #71. No runtime/code overlaps.

## Source-confidence inventory (current committed files)

| District | Provenance state | What may be claimed |
| --- | --- | --- |
| Frisco (FISD) | 2026–27 current-source | District-origin current-year polygons; verify individual addresses/exceptions in official Finder |
| Prosper (PROSPER) | 2026–27 current-source | Current-year district polygons and recorded 43 public source lookups; enrollment still needs district confirmation |
| Plano (PISD) | official-finder-connected | Official live Finder points to a service labeled 2025–26; do **not** call its polygons independently certified 2026–27 |
| Lewisville (LISD) | official-finder-connected | Live district School Locator linked, but source vintage mixed/uncertain and apartment exceptions remain |
| Allen (AISD) | historical-reference | Historic 2019/2023 attendance polygons; current published address table lacks a confirmed 2026–27 GIS year |
| CFB | lookup-only | Official GuideK12 address Finder only; no verified school-specific vector polygons |
| McKinney (043907) | live-finder-year-gated | Current 2026–27 locator has a runtime elementary-year field gate plus grade-level campus count checks. The district approved new zones on 2025-12-15; middle/high year and actual residence assignments are **not independently verified** |

After the 2026-11-08 evidence addendum, the **combined audit inventory** documents seven of seven district registry entries: **six in the unchanged runtime manifest** and **one McKinney sidecar** in data/mckinney-2026-27-provenance.json. Two districts (Frisco/Prosper) meet the separate independently year-verified source claim; McKinney is **operationally live and gated against a non-2026–27 elementary year**, but independent address and all-level source verification are pending. This distinction is not proof of a map defect or an exact household assignment.

## New isolated checks in this PR

- Verify documented statuses match the centralized district registry's permitted currency/assignment behavior.
- For current-source claims, verify exact active school-year provenance and an auditable source reference.
- Require HTTPS official Finder URLs in provenance.
- Compare counts of **locally committed GeoJSON** with documented feature counts.
- Prohibit lookup-only districts being silently upgraded to automatic polygon address assignment.
- Require McKinney's **live-only** mode, current-year elementary source field, district approval evidence and a fail-closed safety guard. Reject any future registry district that has no provenance record.
- Run a deterministic Node test suite + a weekly read-only GitHub Actions QA check.

The audit does **not** fetch official live school data, choose an address, change school assignments, update GeoJSON, infer school locations from ZIPs, or bypass vendor protections. Local pass + warnings is not a current-year source certification.

## Next evidence-only tasks

1. McKinney's 2026–27 approval and linked Finder metadata are now documented. **Still pending:** independently verify middle/high layer vintages and official address-to-campus results; do not infer enrollment from source-year labels alone.
2. Request written confirmation of whether Plano's 2025–26-labelled source is unchanged for 2026–27, and Lewisville's published school polygons match its 2026–27 app.
3. Obtain Allen's district-origin 2026–27 campus-zone vector export or explicit continuation notice; preserve apartment/unit-specific exceptions.
4. Seek the CFB district/GuideK12 authorized campus-zone export; do not derive address-level polygons from a screenshot or district outline.
5. Confirm loaded-map real-user flows in the deployed site after Claude's active runtime work, especially nonzero Allen campus markers and selected-area zoom.

## Operational and collaboration constraints

- Files added only: scripts/audit-school-provenance.cjs, tests/audit-school-provenance.test.cjs, .github/workflows/audit-school-provenance.yml, this document, and data/mckinney-2026-27-provenance.json. The existing top-level school-data-provenance.json remains unchanged so unrelated main dashboard QA continues to pass.
- No edits to index.html, map layers, district-registry.js, school-data-provenance.json, existing workflows, Claude PR #72, or public runtime configuration.
- Keep this PR draft until CI reports are checked. No merge, Pages deploy, or public launch authorization.
