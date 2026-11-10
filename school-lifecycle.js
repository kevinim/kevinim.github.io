'use strict';
// Official closures: do not interpret archived TEA ratings or 2024-25 NCES points as active campuses.
const RETIRED_CAMPUSES_2026=[
  {"district":"061901","id":"061901120","name":"PALOMA CREEK EL","aliases":["Paloma Creek Elementary"],"retiredFrom":"2026-27","source":"https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification-26-27","reason":"reassigned-2026-27"},
  {"district":"220906","id":"220906103","name":"DOVE EL","aliases":["Dove Elementary"],"retiredFrom":"2026-27","source":"https://www.gcisd.net/article/2594779","reason":"consolidated-2026-27"},
  {"district":"220906","id":"220906108","name":"BRANSFORD EL","aliases":["Bransford Elementary"],"retiredFrom":"2026-27","source":"https://www.gcisd.net/article/2594779","reason":"consolidated-2026-27"},
  {
    "district": "FISD",
    "id": "043905041",
    "name": "Staley Middle",
    "retiredFrom": "2026-27",
    "source": "https://schools.friscoisd.org/article/2660210"
  },
  {
    "district": "PISD",
    "id": null,
    "name": "Davis Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.pisd.edu/about-our-district/long-range-facility-plan/background"
  },
  {
    "district": "PISD",
    "id": null,
    "name": "Forman Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.pisd.edu/about-our-district/long-range-facility-plan/background"
  },
  {
    "district": "PISD",
    "id": null,
    "name": "Armstrong Middle",
    "retiredFrom": "2025-26",
    "source": "https://www.pisd.edu/about-our-district/long-range-facility-plan/background"
  },
  {
    "district": "PISD",
    "id": null,
    "name": "Carpenter Middle",
    "retiredFrom": "2025-26",
    "source": "https://www.pisd.edu/about-our-district/long-range-facility-plan/background"
  },
  {
    "district": "LISD",
    "id": null,
    "name": "B.B. Owen Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.lisd.net/news/~board/all-district-news/post/district-update-dec-24"
  },
  {
    "district": "LISD",
    "id": null,
    "name": "Creekside Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.lisd.net/news/~board/all-district-news/post/district-update-dec-24"
  },
  {
    "district": "LISD",
    "id": null,
    "name": "Garden Ridge Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.lisd.net/news/~board/all-district-news/post/district-update-dec-24"
  },
  {
    "district": "LISD",
    "id": null,
    "name": "Highland Village Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.lisd.net/news/~board/all-district-news/post/district-update-dec-24"
  },
  {
    "district": "LISD",
    "id": null,
    "name": "Polser Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.lisd.net/news/~board/all-district-news/post/district-update-dec-24"
  },
  {
    "district": "CFB",
    "id": null,
    "name": "Central Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group"
  },
  {
    "district": "CFB",
    "id": null,
    "name": "Furneaux Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group"
  },
  {
    "district": "CFB",
    "id": null,
    "name": "McCoy Elementary",
    "retiredFrom": "2025-26",
    "source": "https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group"
  },
  {
    "district": "CFB",
    "id": null,
    "name": "Long Middle",
    "retiredFrom": "2025-26",
    "source": "https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group"
  }
];
function lifecycleNameKey(n){return String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\b(elementary|middle|high|school|academy|stem)\b/g,'').trim().replace(/\s+/g,' ')}
function isRetiredCampus(s){if(!s?.district)return false;return RETIRED_CAMPUSES_2026.some(r=>r.district===s.district&&((r.id&&s.id===r.id)||[r.name,...(r.aliases||[])].some(name=>lifecycleNameKey(name)===lifecycleNameKey(s.name))))}
if(typeof module!=='undefined')module.exports={isRetiredCampus,lifecycleNameKey,RETIRED_CAMPUSES_2026};
