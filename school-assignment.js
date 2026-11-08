'use strict';
// Plano has distinct grades 9-10 high and 11-12 senior-high zones, while
// the campus list groups both types as high schools.
function schoolLevelMatchesAssignment(s,level){
 return s?.type===level||(s?.district==='PISD'&&s?.type==='high'&&level==='senior');
}
function resolveAssignment({frisco=[],prosper=[],lewisville=[],plano=[],mckinney=[],allen=null,planoFinderLive=false,lewisvilleFinderLive=false,mckinneyFinderLive=false,ready=true,failed=false}) {
 const found=[];
 if(frisco.length) found.push({district:'FISD',status:'current',features:frisco});
 if(prosper.length) found.push({district:'PROSPER',status:'current',features:prosper});
 if(allen) found.push({district:'AISD',status:'unverified-year',allen});
 if(lewisville.length) found.push({district:'LISD',status:lewisvilleFinderLive?'finder-current':'reference',features:lewisville});
 if(plano.length) found.push({district:'PISD',status:planoFinderLive?'finder-current':'reference',features:plano});
 if(mckinney.length&&mckinneyFinderLive) found.push({district:'043907',status:'finder-current',features:mckinney});
 if(found.length>1)return {status:'conflict',matches:found};
 if(found.length)return found[0];
 if(!ready)return {status:'loading'};
 if(failed)return {status:'error'};
 return {status:'unavailable'};
}
// Allen's official address table returns short campus names per level:
// [street, range, elementary K-6, middle 7-8, freshman 9, high 10-12].
// A school is a candidate only if it is the single AISD campus of that level
// whose canonical name contains every word of the table name.
function allenRowMatchesSchool(s,row,schools,canonical){
 if(!s||s.district!=='AISD'||!Array.isArray(row))return false;
 const freshman=/freshman/i.test(s.name);
 const slot=s.type==='elementary'?2:s.type==='middle'?3:s.type==='high'?(freshman?4:5):-1;
 const target=row[slot];if(slot<0||!target)return false;
 const words=n=>canonical(n).split(' ').filter(Boolean);
 const fits=x=>x.district==='AISD'&&x.type===s.type&&/freshman/i.test(x.name)===freshman&&words(target).every(w=>words(x.name).includes(w));
 const hits=(schools||[]).filter(fits);
 return hits.length===1&&hits[0]===s;
}
if(typeof module!=='undefined')module.exports={resolveAssignment,schoolLevelMatchesAssignment,allenRowMatchesSchool};
