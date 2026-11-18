# McKinney live GIS address re-query — 2026-11-17

On deliberate address selection inside a verified McKinney ISD boundary, this module re-fetches the official district-linked MetroStudy PUBLIC ArcGIS WebMap. It never sends the searched address, coordinates, or ZIP to this publisher URL. E/M/H matches are calculated locally and compared to the previously loaded official GIS.

**This is not the official Finder address-result API**. Matching two reads of the same publisher does not independently certify residential school assignment. Source conflicts must hide candidates; network errors must be disclosed; automatic enrollment promotion, markers, and boundary highlighting stay disabled. No paid service, credential, address log, or new external host is added.

Outstanding: officially supported address-result API/UI interface, licensing, independently checked residential holdouts across two ZIPs, middle/high school year validation, apartment and transfer exceptions, and independent QA release grant. Synthetic tests cover source schema, year, wrong district, mismatch, cancellation and request privacy.
