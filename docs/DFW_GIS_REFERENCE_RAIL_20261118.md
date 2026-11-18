# Address-scoped GIS reference school rail — 2026-11-18

## Delivered behavior

With a residential address selected and trusted 2026–27 publisher GIS references available (McKinney ISD, Frisco ISD and Prosper ISD), the school list to the left of the map now displays **only** in-memory, uniquely linked GIS *reference* campuses, alongside the existing reference map pins and grade badges.

Previously the top address panel showed these candidates while the school-list rail was empty, making the interface look like the address had no schools. No ZIP-bounded schools are added by this feature.

- School records must be identical to a loaded district/campus directory object and have finite mapped coordinates. Duplicate or orphan candidate identities are excluded.
- The list is **not** the legal address-assignment list: `addressSchoolView().schools` stays empty, `home.assignment` remains guarded, and `ConditionalSchoolRelease` is unchanged.
- Every row displays “GIS 참고 후보 · 배정 미인증”; school list notice explicitly warns these are *not* certified enrollments.
- Reference pins stay in their independently styled layer, never the certified home-assignment layer. A reference row focuses the actual *campus building location*, not a residential polygon.
- No third-party request is added, no address stored or logged, and no user home/ZIP data is added to Git.
- Clearing/switching a residence resets the reference view. If no valid records are linked, the list displays a clear explanation rather than fabricated schools.

## Verification

`node --test tests/address-school-focus.test.cjs tests/mckinney-finder-crosscheck.test.cjs`
`node scripts/test-mckinney-finder-crosscheck-browser.cjs` — synthetic 390px and 1366px.
`node scripts/verify-main-data.mjs` and `node --test tests/externalized-main-bootstrap.test.cjs` verify v14 pin and source.
Required PR CI, Pages deployment and live school-map smoke before release.

## Explicit remaining boundary

The publisher's ArcGIS Web AppBuilder `find` address search does **not** provide a documented, approved cross-origin JSON residence→E/M/H assignment result. The reference list is a genuine display of source-backed GIS/TEA candidates, **not** a claim that the official address-specific school locator was independently queried. For legal enrollment, transfer/grandfather, feeder and apartment exceptions, use the district's official address finder. This PR does not change the approval gate.
