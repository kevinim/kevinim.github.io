# Redfin link-to-Area Intelligence UAT — November 12, 2026

## Release boundary
- PR feature branch only; no production deployment.
- Dedicated HTML entry: redfin-uat.html. The production index.html remains byte-for-byte unchanged and never loads UAT assets. The feature initializes only on that UAT filename.
- This is a user-curated shortlist of no more than 3 links. It is NOT a Redfin listing feed, embedded Redfin site, live rental search, scraping integration, official address verification or partnership.
- Existing ZIP, school, GIS and commute engines are not modified.

## Steps to test
1. Open an individual Redfin TX property page, then paste its HTTPS URL. A synthetic example (not a claimed active listing) is: https://www.redfin.com/TX/Plano/4652-Phillip-Dr-75024/home/123456
2. Some links provide a street number + street name + ZIP slug. This is only an unverified address hint; confirm it against the Redfin page and correct it in the required address field. Apartment-name URLs often require manually entering the full street address.
3. Enter monthly rent manually, if desired. We do not retrieve price, photos, availability, bedrooms or listing metadata. Open the original Redfin link in a new tab to view photographs and updated terms.
4. Add 1–3 candidates. Choose “지도에 핀 추가” to geocode manually via Esri. This adds a reference pin on the SAME map; it does not change map center or zoom. "Rental Listings" shows pins; "Area Intelligence" hides only those pins. All other map layers and school markers remain intact.
5. Choose “학교·통근 분석” to transfer the confirmed address to existing house lookup. This intentionally initiates an existing geocode and may move the map to the selected address. Official assigned schools require district verification; do not treat school locations or ZIP as proof of enrollment.
6. Test remove, duplicate link, invalid domains and URLs, missing/invalid addresses, rent validation, non-DFW coordinates, reload clearing, 390px mobile, desktop, keyboard operation, dark mode, Allen school marker counts, map zoom unchanged on layer toggle, CSP and console.

## Privacy and security
- HTTPS redfin.com / www.redfin.com exact host only; URL username/password, spoofed domains, non-TX paths and encoded separators rejected.
- URL query strings and fragments are discarded before outbound link display to avoid carrying referral parameters.
- Pasted URLs, addresses and manually entered rents are held in JavaScript memory only; no localStorage, sessionStorage, server writes or cookies.
- Only deliberate map-pin action sends the saved address to Esri. Existing house lookup retains its own third-party geocode and routing disclosures.
- All dynamic user values are inserted with textContent. Outbound Redfin links have noopener noreferrer; no iframe, Redfin fetch, API key or scraping.

## Tests and release policy
- node --test tests/redfin-uat.test.cjs
- Required existing dashboard, privacy, CSP/XSS, school, GIS, Allen marker, mobile and smoke checks must succeed on the exact PR head.
- Separate user UAT review before production merge.
- No authenticated UAT host or branch preview is provisioned today; an open PR is **not** a live hosted preview.
