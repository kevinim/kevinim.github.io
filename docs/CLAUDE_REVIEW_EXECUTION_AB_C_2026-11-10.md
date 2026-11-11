# Claude review A/B/C — implementation boundary and baseline (2026-11-10)

## Source and interpretation
User-supplied 291-line Claude development plan ends with a current review against main `e9c5738`.
The older sections (2026-11-03 onward) are **historical journals**, not unstarted instructions.
The current requested implementation order is A (address-school UX), B (first screen), C (assets/CI).

## Confirmed main baseline
- `features/conditional-school-release.js` deliberately has `APPROVED_AUTO_DISTRICTS={}`.
- `home-lookup-v2.js` computes raw GIS candidates but passes them through the immutable gate before display or school matching. The current address-result state is `conditional-finder-only`.
- `docs/CONDITIONAL_GO_SCOPE_2026-11-09.md` prohibits auto home-matched schools / polygons from unapproved geometry, even if visually plausible. **A cannot be implemented merely by bypassing this gate.** Scope change requires separately reviewed owner authorization and non-certifying design with explicit source/year/grade and independently checked constraints. Production continues to use official Finder.
- Draft CFB PRs #208–#213 are independent school GIS/source/UI tracks; do not edit or merge their branches from this work.

## Track B underway separately
- Draft #214, `feature/claude-review-mobile-first-fold-20261110`, isolates first-fold changes: mobile home-search → map ordering, privacy-details disclosure and explicit search-to-map scroll. Does not modify school assignment authorization.
- Browser QA on final PR head and dark-mode/mobile visual review required before release.

## Track C — this PR (baseline, not bundling)
- `node scripts/audit-first-load-assets.cjs --json` reports static HTML referenced scripts/styles, missing files, duplicate underlying URLs, referenced byte totals, largest local files and workflow YAML count.
- `node scripts/audit-first-load-assets.cjs --check` is a **zero-network QA check**. Integrated into the existing required `verify` job rather than adding another workflow.
- Unit tests exercise link order, remote URL classification, path traversal, missing files, duplicates, and deterministic counts.
- On the inspected main snapshot, source parsing found **51 script tags, 12 linked stylesheets, 62 local targets and 1 external target, 0 duplicate local paths, 0 missing local paths**. This is source-file accounting, not Chrome network requests; the full 121 requests / ~2.7 MB / 1.8–3.4s figures in Claude's note are **historical browser observations, not independently re-measured by this audit**.

## Future C plan (requires separate implementation PR)
1. Capture controlled Chromium HAR on 390px and 1366px (cold/warm, dark mode, external map tiles, cache, request totals, load/interaction marks).
2. Group scripts only after dependency/order and CSP hash/source audit. Avoid bundling dynamic integrations and external datasets blindly; preserve source maps and source data provenance.
3. Pilot one independent feature bundle (not the school address/gate files), measure real request and byte deltas, gate against the complete browser regression suite.
4. Deduplicate GitHub Actions triggers/jobs after comparing actual required job names and branch rules. **Do not remove a security or residential release check simply to reduce the count.**
5. Release only after independent CI, production smoke, and explicit owner approval. Draft commits are not production changes.

## No-go/conditional release boundaries
- No API keys, personal addresses, private TomTom cache or paid services involved.
- No `main` merge or GitHub Pages deployment in this PR.
- A remains blocked by release-policy conflict until reviewed separately; B is conditional UI-only; C here is measured inventory + regression test, **not yet optimized production performance**.
