# Prosper 2027–28 source and official address API disposition

Reviewed Nov 20, 2026. Owner explicitly directed: do not wait for district replies, use public sources, label gaps and proceed.

## Evidence states kept separate

| Evidence | 2026–27 | 2027–28 |
|---|---|---|
| Board-approved zones | Official district-published boundaries | Middle/high boundaries approved Nov 16, 2026 |
| Public GIS usable by dashboard | Existing 31-zone official source, 20 E/7 M/4 H | No independent downloadable school-level vector source verified |
| Official public evidence | prosper-attendance-2026.geojson, Infofinder group | Prosper homepage publishes approved middle/high boundary cards; Watkins Middle planned opening Fall 2027 |
| Elementary-year continuity | 2026–27 polygons in production | Change/unchanged status not independently confirmed |
| GIS reference by home point | Enabled as informational only | Not implemented; no fabricated future geometry |
| Official address API available inside GitHub Pages | No; direct browser SearchAddress blocked by CORS | No verified 2027–28 provider address interface |

Official 2027–28 announcement: https://www.prosper-isd.net/ ; agenda with items 8.G / 10.C: https://meetings.boardbook.org/Public/Agenda/2084?meeting=775974 . Official boundary document directory: https://www.prosper-isd.net/documents/about-us/attendance-boundaries/16505278 ; attendance boundaries: https://www.prosper-isd.net/page/attendance-boundaries/ .

No usable future-year polygon set, direct downloadable future-year map/PDF URL, redistribution permission or verified 2027–28 Infofinder source group was independently obtained. Do not infer zone geometry from general reports or treat the November board vote as source/API authorization.

## Official address API

Infofinder public parent search https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1 is user-accessible. See docs/PROSPER_OFFICIAL_ADDRESS_CERTIFICATION_GATE_20261118.md: the public headquarters SearchAddress result was read on the provider site, but direct browser fetch from https://kevinim.github.io/ failed with TypeError: Failed to fetch; provider CORS prevents result reception even when CSP permits the host.

Fallback: disclose the exact limitation in a collapsed source panel and provide outbound official Finder link, without sending, logging or persisting a typed home address in a URL. No third-party proxy, paid service, false auto-lookup success or fake enrollment certification.

## Changes

- features/prosper-boundary-years.js: frozen separately typed source/year/API status; accessible DOM-only disclosure; links to official publisher; no fetch or user address handling.
- dashboard-main.js: render source status only for addresses associated with Prosper's GIS evidence. Existing 2026–27 reference grade cards stay unchanged.
- index.html: new self-hosted module loaded before dashboard main and v21 cache key.
- tests/prosper-boundary-years.test.cjs: model, source URLs, DOM link safety and certification status; included in existing address-school-focus CI to avoid workflow duplication.
- tests/externalized-main-bootstrap.test.cjs: subtract exact newly reviewed module tag for existing historical integrity check.

2027–28 is a separate future school year; cannot use the 2026–27 GIS to claim address assignment for that year. Issue #342 remains open specifically for authentic official address integration and future geometry, not as a blocker on reference disclosures.
