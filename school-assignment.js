'use strict';
// Plano has distinct grades 9-10 high and 11-12 senior-high zones, while
// the campus list groups both types as high schools.
function schoolLevelMatchesAssignment(s,level){
 return s?.type===level||(s?.district==='PISD'&&s?.type==='high'&&level==='senior');
}
function resolveAssignment({frisco=[],prosper=[],lewisville=[],plano=[],allen=null,planoFinderLive=false,lewisvilleFinderLive=false,ready=true,failed=false}) {
 const found=[];
 if(frisco.length) found.push({district:'FISD',status:'current',features:frisco});
 if(prosper.length) found.push({district:'PROSPER',status:'current',features:prosper});
 if(allen) found.push({district:'AISD',status:'unverified-year',allen});
 if(lewisville.length) found.push({district:'LISD',status:lewisvilleFinderLive?'finder-current':'reference',features:lewisville});
 if(plano.length) found.push({district:'PISD',status:planoFinderLive?'finder-current':'reference',features:plano});
 if(found.length>1)return {status:'conflict',matches:found};
 if(found.length)return found[0];
 if(!ready)return {status:'loading'};
 if(failed)return {status:'error'};
 return {status:'unavailable'};
}
if(typeof module!=='undefined')module.exports={resolveAssignment,schoolLevelMatchesAssignment};
