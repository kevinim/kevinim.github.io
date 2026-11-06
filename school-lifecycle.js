'use strict';
// Official closures: do not interpret archived TEA ratings or 2024-25 NCES points as active campuses.
const RETIRED_CAMPUSES_2026=[
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
function isRetiredCampus(s){if(!s?.district)return false;return RETIRED_CAMPUSES_2026.some(r=>r.district===s.district&&((r.id&&s.id===r.id)||lifecycleNameKey(r.name)===lifecycleNameKey(s.name)))}
if(typeof module!=='undefined')module.exports={isRetiredCampus,lifecycleNameKey,RETIRED_CAMPUSES_2026};
