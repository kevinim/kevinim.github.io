'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseOfficialZonePopup,distanceMeters,compareIndependentOfficialUI}
 = require('../scripts/dfw-finder-observation.cjs');
const mc='Attendance ZonesElementaryMCGOWENMiddleEVANSHighMCKINNEYAttachments:00abcZoom to';
const li='(1 of 3)Attendance ZonesElementaryMEMORIALMiddleGRIFFIN9th GradeTHE COLONYHIGH_NAMETHE COLONYAttachments:00abcZoom to';
test('extract official McKinney popup only when all three grade names are present',()=>{
 assert.deepEqual(parseOfficialZonePopup(mc,'043907'),{valid:true,schools:{elementary:'MCGOWEN',middle:'EVANS',high:'MCKINNEY'}});
 assert.equal(parseOfficialZonePopup('Attendance ZonesElementaryMCGOWEN','043907').valid,false);
});
test('extract Lewisville fourth 9th grade result without pretending it is a current-year independent polygon',()=>{
 assert.deepEqual(parseOfficialZonePopup(li,'LISD'),{valid:true,schools:{
  elementary:'MEMORIAL',middle:'GRIFFIN',grade9:'THE COLONY',high:'THE COLONY'}});
});
test('visible popup unrelated to selected home is never certified',()=>{
 const display={id:'test',map:{district:'043907',selectedHomePoint:{lat:33.159,lng:-96.651},
  grades:{elementary:[{school:'MCGOWEN',year:'2026–27'}],middle:[{school:'EVANS',year:'2026–27'}],
   high:[{school:'MCKINNEY',year:'2026–27'}]},renderedPolygonFeatures:3,matchedMarkers:3}};
 const popup={id:'test',district:'043907',officialAddressSelected:true,mapProbeWithin30pxOfSelectedCenter:true,zoneProbeStable:true,
  mapAfterChoice:{geoCenter:{lat:33.161,lng:-96.633}},visiblePopupText:[mc]};
 assert.ok(distanceMeters(display.map.selectedHomePoint,popup.mapAfterChoice.geoCenter)>75);
 assert.equal(compareIndependentOfficialUI(display,popup).status,'OFFICIAL_MAP_CENTER_NOT_ADDRESS_VALIDATED');
 popup.mapAfterChoice.geoCenter={lat:33.159,lng:-96.651};
 assert.equal(compareIndependentOfficialUI(display,popup).status,'OFFICIAL_UI_AND_DASHBOARD_CURRENT_GIS_CORROBORATED');
 display.map.grades.high[0].school='McKinney North';
 assert.equal(compareIndependentOfficialUI(display,popup).status,'OFFICIAL_FINDER_DASHBOARD_SCHOOL_MISMATCH');
});
test('old or unknown source polygon remains unapproved even if names match',()=>{
 const display={id:'LISD-test',map:{district:'LISD',selectedHomePoint:{lat:33.059,lng:-96.916},
  grades:{elementary:[{school:'MEMORIAL',year:'학년도 미확인'}],middle:[{school:'GRIFFIN',year:'학년도 미확인'}],
  high:[{school:'THE COLONY',year:'2025–26'}]},renderedPolygonFeatures:3,matchedMarkers:3}};
 const official={id:'LISD-test',district:'LISD',officialAddressSelected:true,mapProbeWithin30pxOfSelectedCenter:true,zoneProbeStable:true,
  mapAfterChoice:{geoCenter:{lat:33.059,lng:-96.916}},visiblePopupText:[li]};
 official.mapProbeWithin30pxOfSelectedCenter=false;
 assert.equal(compareIndependentOfficialUI(display,official).status,'OFFICIAL_NEAR_ADDRESS_ZONE_POPUP_UNSTABLE');
 official.mapProbeWithin30pxOfSelectedCenter=true;
 const res=compareIndependentOfficialUI(display,official);
 assert.equal(res.status,'SCHOOLS_MATCH_BUT_GIS_YEAR_NOT_CERTIFIED');
 assert.equal(res.grade9,'THE COLONY');
});
