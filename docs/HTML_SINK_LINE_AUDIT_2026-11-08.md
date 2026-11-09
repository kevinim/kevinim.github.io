# HTML insertion path inventory — 2026-11-08

**Read-only review, main at `d5c799b23c4c91c0ec63a61c2573ded6825b5065`.** File line numbers reference this commit and may shift. Exactly **30** assignment occurrences in the five monitored files. This is *not* a list of 30 exploitable weaknesses.

**Legend:**
- **Fixed/template** = no evident untrusted value at the individual HTML sink; check later if logic changes.
- **Escaped/typed** = observed escape, numeric conversion, or `textContent`; trust depends on upstream validation.
- **Composed / follow-up** = assembled HTML or URLs cross module boundaries; requires contextual review and additional tests.
- **Browser tested** = a narrow inert payload probe passed; not a general security clearance.

| Source and line | Count | Render / upstream origin | Review classification and required follow-up |
| --- | ---: | --- | --- |
| `index.html:247` | 2 | Heat legend, metric labels/range | One fixed template, one labels escaped / numeric; review helper return types |
| `index.html:268` | 1 | Leaflet-unavailable fallback message | Fixed/template |
| `index.html:384` | 1 | ZIP insights combining racial details, MENA helper and crime HTML | **Composed / follow-up**: trace `menaHtml` and `crimeZipHtml` input-to-output escaping |
| `index.html:386` | 1 | Selected school detail and official/TEA/Google outbound links | **Composed / follow-up**: names escaped; inspect every constructed URL attribute and host |
| `index.html:388` | 1 | Demographic percentages and labels | Escaped/typed except numeric helper assumptions |
| `index.html:391` | 1 | ZIP comparison table | Escape display names; validate ZIP and numeric-only columns |
| `index.html:414` | 1 | Number of ZIP boundaries | Fixed text + Set.size number |
| `index.html:512` | 1 | School legend | Fixed/template |
| `index.html:547` | 1 | School-list groups, grades, ratings, data-index | Names escaped; numbers/types upstream; existing source-poisoning browser test covers some cases |
| `index.html:653` | 1 | School zone load status messages | `results.map(escape)`, escaped/typed |
| `index.html:757` | 1 | School-zone vintage/grade notices | Conditioned templates; dynamic year text escaped |
| `index.html:793` | 1 | Commute route message and Google link | **Composed / follow-up**: build URL from HTTPS prefix and encoded query, check anchor protocols |
| `reviewed.html:69` | 1 | Leaflet fallback | Fixed/template |
| `reviewed.html:72` | 1 | Legacy school detail and external links | **Composed / follow-up**: escaped school names, links from fixed constants, legacy page still published |
| `reviewed.html:74` | 1 | Legacy demographic details | Escaped/typed/numeric |
| `reviewed.html:76` | 1 | Legacy ZIP table | Escaped name; numeric formatting |
| `reviewed.html:98` | 1 | Legacy ZIP load status | Fixed/template |
| `reviewed.html:134` | 1 | Legacy school list | Escaped school names and district; source records loaded from JSON |
| `reviewed.html:136` | 2 | Allen GIS source years and uploaded GeoJSON count | Year label escaped; count numeric; **browser tested in #82**. Uploaded shape/size bounds remain open **#83** |
| `reviewed.html:141` | 2 | Legacy route fallback and route results | **Composed / follow-up**: generated Google links and numeric route summaries |
| `home-lookup-v2.js:129` | 1 | Resolved house address, school assignment, manual review, parcel | **Composed / follow-up**: house address escaped; `assignmentHtml` and review-panel markup need field-by-field tracing |
| `home-lookup-v2.js:132` | 1 | Route action buttons + generated Google URLs | Google base fixed; encoded origin/destination; check URL sinks |
| `candidate-compare.js:14` | 1 | Empty comparison card | Fixed/template |
| `candidate-compare.js:17` | 1 | Candidate address, school assignment summary, ZIP metrics | **Composed / follow-up**: address escaped, tested in #81; assignment comes from cross-module helper |
| `features/dashboard-extras.js:15` | 1 | Toll calculation static HTML | Fixed/template (user values subsequently inserted as text/number) |
| `features/dashboard-extras.js:41` | 1 | CMS hospital panel static HTML | Fixed/template (facility data later shown by `textContent`) |
| `features/dashboard-extras.js:54` | 1 | EIA/winter panel static HTML | Fixed/template (EIA values later shown by `textContent`) |

**Coverage distinction:** This inventory accounts for the **30 assignments**, but Leaflet `bindPopup`, `bindTooltip`, icon HTML, DOM attributes, and external links are additional sinks outside this count. Issue #77 remains open for those paths.

## Most important next implementation actions

1. **Composed data-to-HTML:** test and where possible refactor `assignmentHtml`, `officialReviewPanelHtml`, ZIP insights/crime HTML and the legacy route HTML. Require escape/validated types at their final output boundary, not just input.
2. **URLs:** forbid executable schemes for dynamically assigned `href` and verify exact trusted-host allowlists at the runtime boundary; the checks in PR #82 are currently audit-only.
3. **CSP:** current meta CSP allows `'unsafe-inline'`. Incrementally replace inline script and event handlers without breaking map/school UI, then remove it in a tested UAT build. Strict CSP must not be enabled until the replacement handlers have run through full browser QA.
4. **Legacy uploader:** impose bounded file/geometry processing in a separate runtime PR or exclude the older reviewed.html from the curated future public artifact; see #83.

References: `scripts/audit-visitor-xss-sinks.cjs` (growth guard); `scripts/audit-csp-readiness.cjs` (CSP baseline); `scripts/test-csp-isolation-browser.cjs` (current-versus-strict behavior); PR #81; #82; Issue #77.
