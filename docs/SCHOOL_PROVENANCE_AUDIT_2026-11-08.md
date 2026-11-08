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
| McKinney (043907) | **missing from top-level school-data-provenance.json** | District registry contains a live-Finder entry, but this provenance inventory does not describe its independent source/year/method. **Do not infer data absent, or automatically classify it current** |

The existing provenance document lists **six** districts, whereas the dashboard district registry has **seven** district entries. Two of the six documented districts make a separately current-year geometry claim. This is an evidence-coverage gap, not proof of a map defect or wrong assignment.

## New isolated checks in this PR

- Verify documented statuses match the centralized district registry's permitted currency/assignment behavior.
- For current-source claims, verify exact active school-year provenance and an auditable source reference.
- Require HTTPS official Finder URLs in provenance.
- Compare counts of **locally committed GeoJSON** with documented feature counts.
- Prohibit lookup-only districts being silently upgraded to automatic polygon address assignment.
- Make the existing missing McKinney provenance visible as a **follow-up warning**; fail on any additional untracked district. The McKinney exception should be removed after source evidence is documented.
- Run a deterministic Node test suite + a weekly read-only GitHub Actions QA check.

The audit does **not** fetch official live school data, choose an address, change school assignments, update GeoJSON, infer school locations from ZIPs, or bypass vendor protections. Local pass + warnings is not a current-year source certification.

## Next evidence-only tasks

1. Research the current McKinney official school Finder service's school-year/source provenance, document source identity, and add a reviewed entry to school-data-provenance.json **only in a separate source-data PR**.
2. Request written confirmation of whether Plano's 2025–26-labelled source is unchanged for 2026–27, and Lewisville's published school polygons match its 2026–27 app.
3. Obtain Allen's district-origin 2026–27 campus-zone vector export or explicit continuation notice; preserve apartment/unit-specific exceptions.
4. Seek the CFB district/GuideK12 authorized campus-zone export; do not derive address-level polygons from a screenshot or district outline.
5. Confirm loaded-map real-user flows in the deployed site after Claude's active runtime work, especially nonzero Allen campus markers and selected-area zoom.

## Operational and collaboration constraints

- Files added only: scripts/audit-school-provenance.cjs, tests/audit-school-provenance.test.cjs, .github/workflows/audit-school-provenance.yml, this document.
- No edits to index.html, map layers, district-registry.js, school-data-provenance.json, existing workflows, Claude PR #72, or public runtime configuration.
- Keep this PR draft until CI reports are checked. No merge, Pages deploy, or public launch authorization.
