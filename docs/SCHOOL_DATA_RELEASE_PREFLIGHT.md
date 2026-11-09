# TX school source snapshot lock + release preflight

**Status: read-only QA, Draft PR. No source data files, school markers, address assignments, or production services were changed.**

## Why this exists

The repository already has `school-data-provenance.json`, district registry, official Finder audit files and GIS/point sources. The new lock prevents a subsequent accidental or unreviewed source-file change from silently flowing into an approved release. It also catches basic JSON/coordinate/polygon integrity and rejects marking old or partial geography as official current-year evidence.

## Assets covered

- 16 pinned source snapshots. Their Git blob IDs and honest source-use labels live in `data/school-data-release-lock.json`.
- Official current-year pinned polygon source in this set: **Prosper 2026–27** only. This does **not** imply other current source data do not exist; Frisco official zones and district Finders may load dynamically.
- Historical local GIS sources: Allen reference and Plano 2019. They cannot claim `current:true`.
- Plano stored Finder geometry remains a **reference**; an official Finder service loading successfully does not prove its cached 2025–26 polygon layer is the 2026–27 assignment.
- Celina-sourced Prosper geometries are partial and school year unconfirmed. They are never promoted to official districtwide polygons.
- Official feeder tables describe school pathways, **not** parcel or residence assignments.
- School points, NCES and ratings are distinct from polygon zone coverage. The lock does not equate marker count with number of verified boundaries.

## Commands (Node.js, offline)

```bash
node scripts/school-data-release-preflight.cjs
node --test tests/school-data-release-preflight.test.cjs
```

Outputs `artifacts/school-data/school-data-preflight.json` with status, file-path labels, stable counts, hash verification, and known source limitations. The report **does not include entered addresses, school enrollment details, exact coordinates, or provider responses**. No network request is made.

`PASS_WITH_KNOWN_SOURCE_LIMITATIONS` means **the baseline files were unchanged and passed structural checks**. It does NOT mean districtwide current-year coverage, live source availability or a verified school assignment for any home. `BLOCKED` means the snapshot was changed without review, became unreadable, lost required provenance, or introduced a contradictory current/historical claim.

### On a planned dataset refresh

1. Record the exact official source URL, retrieved date, school year (or explicitly `unconfirmed`), applicable geographic scope and any source contradictions in existing provenance / PR description.
2. Update the intended JSON/GeoJSON files in a separate data PR; do not rewrite history or force push. Re-run existing school UI and official Finder audits.
3. Compute Git blob identity using `git hash-object <file>`, and update that asset's `gitBlobSha` in `data/school-data-release-lock.json` **only after reviewing** geometry, source permissions and vintage.
4. Update `observedAt` only when the external source was actually rechecked. Never stamp an inspection date on an unchanged historical snapshot to imply new geometry.
5. Review expected feature/row counts. An increased or decreased count must be explained; update `expectedCount` only after verification. Changing the lock hash alone does not make a flawed dataset valid.
6. Commit the dataset and manifest together in one PR. The gate then verifies the new baseline and uploads the address-free report.
7. Only a separately approved promotion into UAT/Production can use that audited snapshot; this tool cannot deploy.

## Observed baseline warning (2026-11-08)

- `plano-locator-reference.geojson`: `geometry_metadata_missing` — the cached GIS snapshot has no root-level metadata object. Existing provenance separately identifies the 2025–26 layer and does **not** certify it as the current 2026–27 residential boundary. This warning remains non-blocking for unrelated work; the snapshot hash is pinned and a future provenance refresh must not silently change its year classification.

## What is still NOT audited by this gate

- Full campus-to-polygon linking and per-district school percentages: this needs a complete districtwide school universe and boundary reference mapping, not merely GeoJSON feature counts. Report unverified instead of inferring a percentage.
- Runtime Frisco school boundary download, live Plano/Lewisville/McKinney Finder responses and Allen/CFB official address searches.
- Actual household address assignment, apartment-unit exceptions, school transfers, caps and special programs.
- Geometric topology (overlaps/gaps), precise GIS accuracy, state licensing, and eligibility rules. This check only validates basic coordinate/ring structure.
- Detection of intentionally coordinated changes to both a file and its manifest; mandatory human code review and protected branches remain necessary.

## Source limitations explicitly retained

| District/source | Classification | Release interpretation |
|---|---|---|
| Frisco | Live official 2026–27 feed | Not locked as a local GIS snapshot |
| Prosper | 2026–27 confirmed source | File shape/source metadata checked |
| Plano | Cached Finder / 2019 historical | Not equivalent to current residential assignment |
| Allen | Historical GIS; official street range Finder separately checked | Do not mark historical polygons current |
| Lewisville | Live official Finder | Static lock cannot verify runtime availability |
| CFB | Official resident Finder, current-year districtwide GIS unverified | Link-only for exact assignment |
| McKinney | Current district Finder depends on live service | Cannot certify offline |

## Developer / CI coordination

This PR stacks on backend PR #79 (which itself stacks on #78 and #72), but touches **only** `data/school-data-release-lock.json`, `scripts/school-data-release-preflight.cjs`, `tests/school-data-release-preflight.test.cjs`, this document, and its own workflow. It does not overlap school-source PR #73 or external-provider PR #76. No settings, Cloudflare environment, credentials or Pages deployment changed.

Workflow `.github/workflows/school-data-preflight.yml` runs on PRs and future main pushes **only after merger**; scheduled network refresh is intentionally absent. Reported current-year classifications derive from pinned file metadata, not live facts.
