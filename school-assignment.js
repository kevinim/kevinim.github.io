'use strict';
function resolveAssignment({frisco=[],lewisville=[],allen=null,ready=true,failed=false}) {
 const found=[];
 if(frisco.length) found.push({district:'FISD',status:'current',features:frisco});
 if(allen) found.push({district:'AISD',status:'unverified-year',allen});
 if(lewisville.length) found.push({district:'LISD',status:'reference',features:lewisville});
 if(found.length>1)return {status:'conflict',matches:found};
 if(found.length)return found[0];
 if(!ready)return {status:'loading'};
 if(failed)return {status:'error'};
 return {status:'unavailable'};
}
if(typeof module!=='undefined')module.exports={resolveAssignment};
