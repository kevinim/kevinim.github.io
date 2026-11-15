# TX review execution ledger

Plan: TX_Dashboard_Code_Review_Plan_2026-11-15.md, main baseline c4c3d0a085525e5d7abd77dcbe94d36f22042238.

## T01: implementation and local checks complete; full CI pending

- Both the current dashboard and reviewed.html's legacy bootstrap now invalidate superseded commute calculations on input/ZIP/mode changes.
- A shared in-memory operation controller lives in the already loaded provider-requests module. Every geocoder/table/route completion must own the current generation before updating state, status, layers or cost distance.
- Home routing shares cancellation ownership with ZIP routing; current home routes still draw and report distance. Automatic distance fields are cleared on programmatic selection changes; manually entered miles are preserved.
- Duplicate submissions while the same ZIP calculation is pending do not send duplicate lookups. The existing destination marker remains when moving to a different ZIP for the same destination.
- New regression tests deliberately ignore AbortSignal in mocked providers to verify stale-write protection independently of cancellation support.
- RED: six stale-response/duplicate-submit scenarios failed in each original entry point. Two home route scenarios also failed against the original home source.
- GREEN: 52 local tests passed (17 new commute lifecycle cases, provider guard, table repaint, area assessment, region comparison, area explorer, script order). Changed JS syntax checks passed.
- Full repository data/history/browser checks require GitHub CI: local Git network access and managed worktree creation failed. The local isolated snapshot contains only selected files and must not be mistaken for the full repository or its history.
- No merge or deployment performed.

## Rulings

- Reuse the existing provider script for operation ownership instead of adding a new script tag. This preserves the audited loader inventory/CSP and avoids dependency-order drift; behavioral coverage remains required.
- Source inspection found reviewed.html actually references features/reviewed-bootstrap.js. The earlier review's dormant-code observation was incomplete, so T01 covers that real entry point too.
- Preserve existing mixed line endings outside narrow edits. Extend the existing exact-byte JS allowlist with one exact T01 blob digest; historical baselines and security assertions remain enforced.
- CI exposed a pre-existing stale McNeil click assertion after #313 removed three repurposed campuses from active choices. Keep the active Finch polygon test and explicitly assert McNeil/Eddins/Wolford are absent; do not restore retired schools or skip browser QA.

## Remaining

T02 bounded data/Esri loading; T03 GIS provenance/viewport/opt-in; T04 grade data states; T05 keyboard/IME; T06 CI permissions/privacy routing; T07 measured performance; T08 integrated browser and release preparation.

T01 changes do not authorize automatic school assignment, change data provenance, add paid services, store home addresses, or relax public-promotion gates.
