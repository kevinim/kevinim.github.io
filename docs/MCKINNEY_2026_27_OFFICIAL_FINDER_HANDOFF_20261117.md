# McKinney 2026–27 official address lookup — browser-audited handoff

## Confirmed links and capabilities
- **McKinney ISD Attendance Zones & Maps:** https://www.mckinneyisd.net/page/attendance-zones-maps
- **26-27 School Locator:** https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125
- **Verified by real Chromium browser (no residences):** the district page itself labels that exact link “26-27 School Locator”; the public ArcGIS app item configuration returned HTTP 200 and includes an enabled Search widget. GitHub Actions run 44234266718 recorded the public-only observation.
- **Documented platform feature:** Web AppBuilder's `find=` query parameter searches a location or address if the Search widget is enabled. Reference: https://doc.arcgis.com/en/web-appbuilder/latest/manage-apps/app-url-parameters.htm .
- **District-adopted official zone maps dated Dec 15, 2025:** E/M/H school-name inventories are in `data/mckinney-2026-27-adopted-map-names.json` (17 zoned elementary, 5 middle, 3 high); name agreement is checked in `scripts/check-mckinney-official-source-live.mjs`.

## Shipped behavior
After a deliberately selected, usable Texas address and explicit McKinney ISD option, the user can click **선택 주소로 공식 검색 열기**. Only that click constructs the exact official URL with URL-encoded `find=<selected-address>` and opens it with `noopener,noreferrer`. Normal GIS preview and current school cards remain in-page, but the browser never fetches or stores the official Finder address result on behalf of the dashboard.

The UI discloses that an address is sent to a third-party publisher on click. The normal “공식 검색기 열기” link is still available, and school year/grade/unit/transfer exceptions must be checked inside the official app. Wrong ISD, unconfirmed geocode or a non-official destination prevents the prefilled deep link. No credential, new API host, key, address logging, or paid integration was added.

## Still NOT an authorized or independent residence-result API
A public ArcGIS Search widget can zoom to an address; it does not expose to the dashboard a documented independent address→E/M/H result contract. Cross-origin access, arbitrary iframe DOM reads and bypassing CORS/authentication are not authorized. District PDF names validate **name sets**, not exact 2026–27 GIS polygon topology. MetroStudy middle/high feature-level `SCHL_YEAR` still missing. Maintain `ConditionalSchoolRelease` at zero grants. Independent residential holdouts and documented results API/source use rights remain P0 acceptance gates.

## CI / rollback
Run source provenance check, McKinney source browser audit, synthetic unit/browser privacy/marker/feedback QA and GitHub Pages UAT smoke. If link `find=` behavior stops working, retain the plain district/Finder link and hide the prefill button; no assignment claims or underlying school GIS should change.
