'use strict';
// Official Allen ISD split-apartment addresses. A street geocode cannot determine
// the unit's ISD, even when it falls inside an apparently current Frisco polygon.
const ALLEN_SPLIT_APARTMENTS=Object.freeze([
 {key:'4450 S Ridge Rd',pattern:/^4450\s+(?:S|SOUTH)\s+RIDGE\s+(?:RD|ROAD)\b/,note:'4450 S. Ridge Road: Allen ISD states some Building 8 units including 8302 and 8202 attend Allen, while units ending 01, 03 and 04 in Building 8 attend Frisco ISD. Confirm the exact building and apartment number.'},
 {key:'4700 S Ridge Rd',pattern:/^4700\s+(?:S|SOUTH)\s+RIDGE\s+(?:RD|ROAD)\b/,note:'4700 S. Ridge Road: Buildings 1, 2, 3, 4, 8, 9 and 10 attend Allen ISD; Buildings 5, 6 and 7 do not. Verify the exact building and student eligibility.'},
 {key:'6551 McKinney Ranch Pkwy',pattern:/^6551\s+MCKINNEY\s+RANCH\s+(?:PKWY|PARKWAY)\b/,note:'6551 McKinney Ranch Parkway: Allen ISD lists only apartment units ending in 1 or 2 within Buildings 6 and 7 as Allen ISD. Confirm the building and apartment number.'},
 {key:'7830 Van Tuyl Pkwy',pattern:/^7830\s+VAN\s+TUYL\s+(?:PKWY|PARKWAY)\b/,note:'7830 Van Tuyl Parkway: Allen ISD lists apartment numbers 116–138, 213–238, 313–338 and 413–438 within Allen ISD. Other units require independent confirmation.'}
]);
function allenSplitApartmentException(address){
 const first=String(address||'').split(',')[0].toUpperCase().replace(/[.]/g,' ').replace(/\s+/g,' ').trim();
 const match=ALLEN_SPLIT_APARTMENTS.find(r=>r.pattern.test(first));
 return match?{key:match.key,note:match.note,source:'https://www.allenisd.org/page/findaschool',status:'unit-specific-district-boundary'}:null;
}
if(typeof module!=='undefined')module.exports={allenSplitApartmentException,ALLEN_SPLIT_APARTMENTS};
