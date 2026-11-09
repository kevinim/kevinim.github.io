# Prosper 2026–27 — public residential two-ZIP source audit and independent Finder UI

**Date:** 2026-11-09. **Branch:** child of #175/#172/#162. **Scope:** evidence-only, no Production, no `main` merge, no private addresses/coordinates in artifacts, free GitHub Actions + Playwright.

## Verified source layers

- Official attendance boundaries and district-linked Infofinder: https://www.prosper-isd.net/page/attendance-boundaries/ and https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1
- Prior #172 75078 publicly advertised properties: **4/5 precise point-address ↔ 2026–27 geometry ↔ district-linked school code agreement**; 1 incorrect geocoder postal candidate quarantined rather than forced into a matched school; **8/8 desktop/mobile map checks**. These are same-vendor/source-linked corroborations, **not** independent visual Finder assignments.
- Newly added `75035` published-home candidates: **2/2** precise Esri addresses match three district-linked Infofinder point school codes and the official 2026–27 GIS source. Public advertisement source references are in `tests/prosper-second-zip-public-candidates-2026.json`; third-party listing school labels are **not** authority.
- Exactly 2 ZIPs with supporting technical crosschecks: **75078 and 75035**; six distinct public property IDs with correlated technical evidence. `scripts/audit-prosper-two-zip-staged-evidence.cjs` crosswalks the three code groups to explicit 9-digit TEA campus IDs and emits **redacted** source readiness/hold state.

## Independent browser transport and actual search

The browser now navigates the district-linked public Infofinder and recognizes verified controls `#input-street`, `#input-zip`, and the `Search` button. The first read-only public addresses from each ZIP triggered a real `/ifi/ws/SearchRequest.asmx/SearchAddress` response (HTTP 200). This does **not** itself show a verified E/M/H assignment. The script captures only response schema, exact-match flags, public school names, and per-grade UI observation indicators; it never stores searched street addresses, geocodes, coordinates, bus trips or private student records.

If visible school results cannot be confirmed, mark `FINDER_LOOKUP_INCONCLUSIVE`; do **not** assert that a successful HTTP request or GIS point-code agreement is an independent user-visible Finder result.

## Approval and ownership

| Milestone | Evidence available | Gate |
|---|---|---|
| Public-source identity and explicit TEA campus GIS codes | 6/7 candidate properties in 2 ZIPs corroborated by official vendor + GIS | **PASS technical source only** |
| Browser actual address query and redacted response | Official `SearchAddress` request observed | **Technical browser transport PASS; assignment still inconclusive** |
| Independent reviewed 2026–27 elementary, middle, high for 3 houses in 2 ZIPs | Human-signed, uncorrelated official UI name/code captures absent | **Level 2 NO-GO** |
| Official current-year polygon for those exact homes, school click and GIS rights review | Some #172/#175 correlated map QA; independent official-year/rights review outstanding | **Level 1 NO-GO** |
| Full seven-district and security-merged production revision | Not in this QA branch | **Production NO-GO** |

**Next action for Agent 03:** Review actual official Finder visual results from three eligible public residences across 75078 and 75035. Verify 2026–27, elementary/middle/high, district special-program, street/ZIP match and exact TEA campus IDs using an independently reviewed crosswalk. If UI requires a separate option selection, implement strictly matched public-address choice rather than a nearest-address fallback. Store only a SHA-256 digest and public case ID in the future PR #184 evidence; no full address in GitHub artifacts.

**Next action for Agent 05:** For precisely those independent-verified cases, click E/M/H school controls at 390px and 1366px, inspect visible official year-specific Leaflet child features and clear/reset behavior. Do not count wrapped GeoJSON group as individual polygons.

**Next action for Agent 07:** Integrate the evidence contract with per-district Level 2/Level 1 display (never automatic) and owner-controlled full release checks. Source branches #172/#175/#188 remain separate draft QA-only changes.

**Future academic-year caution:** Prosper's October 19, 2026 board discussion started proposing **2027–28** boundaries for Watkins Middle School, with a future approval calendar; these changes are **not** automatically valid for the audited **2026–27** school year. Official notice: https://www.prosper-isd.net/article/3206562
