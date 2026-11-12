# CFB 2025–26 official rezoning source conflicts — UI reference disclosure

Checked: 2026-11-12, 2026–27 is the currently relevant school-year inquiry.

## Why this matters

Two *CFBISD official published pages* disagree or use materially different area terminology. A publicly published approved 2025–26 rezoning overview should **not** be interpreted as proof of the 2026–27 school assigned to a particular residence. An individual's correct school must be selected by their exact address and grade in the [current CFBISD School Search](https://www.cfbisd.edu/students/school-maps-locator-system), or confirmed with the district.

| Reference case | Approved district overview | Separate official campus-plan page | Resolution |
| --- | --- | --- | --- |
| McCoy closure: Parks of Carrollton, Jackson Place, Bluffview and similar subdivisions | The [district's approved consolidated rezoning table](https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning) says **Blanton Elementary** in its McCoy row | The [McCoy Approved Plan](https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/proposed-plan-for-mccoy-elementary) says **Good Elementary** for the named subdivisions | **Unresolved published conflict**. Neither result is automatically presented as a verified home-school assignment. |
| Furneaux closure: Frankford Road subdivision | The district's [consolidated approved rezoning table](https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning) refers to **Woodlake** | The [Furneaux Approved Plan](https://www.cfbisd.edu/about-us/facility-planning-advisory-group/proposed-plan-for-furneaux-elementary) refers to **Woodland**, both associated with Thompson Elementary | **Geographic label conflict**, not evidence of two different receiving schools. Exact neighborhood identity/parcels remain unverified. |

This audit differentiates the types of conflict: McCoy conflicts on the named **destination campus**; Furneaux conflicts on **subdivision name/extent**. The latter does **not** mean Thompson is wrong; it means the published wording is insufficient for polygon certification.

## Change scope

- Reuses already-reviewed `data/cfb-ag03-official-narrative-evidence-2025.json` discrepancy entries; **no new inferred school score, street address, map vertex or candidate home assignment**.
- In the **existing opt-in, collapsed CFB approved map atlas**, a compact visible note directs users to current official School Search. A collapsed disclosure exposes the two differences with side-by-side official source links. The selected Woodlake area is marked as disputed rather than an unqualified 'approved assignment'.
- Strict validation of source district/code/year, 2 exact discrepancy IDs, HTTPS CFB official host and source status. If source data is missing/altered, the UI cannot claim successful certification and falls back to official Finder guidance.
- No new external third-party fetch; both the atlas and evidence load from same-origin local JSON only on opt-in. Original official image maps remain click-to-load; no georeferencing.
- 390px and 1366px Chromium regressions and negative source spoof tests required; preserve Allen markers, CFB manual TEA lookup, CSP, current school map.

## Still blocked

**2026–27 CFB campus boundary GIS: zero certified polygons**. 2025–26 narrative descriptions, legacy approximate rasters, 2020 polygons or school markers do not authorize residence-based school assignment. Current district geospatial source/reuse rights and independent E/M/H Finder holdouts are necessary before changing `APPROVED_AUTO_DISTRICTS`; it stays empty. See [GIS certification issue #216](https://github.com/kevinim/kevinim.github.io/issues/216).

This is an **accuracy warning and reference quality improvement**, not a claim that the two published-source disagreements have been adjudicated by the school district.
