'use strict';
function addVerifiedAliases(index,schools,ratings,keyFor){
 const byId=new Map(); for(const r of ratings){const items=byId.get(r.id)||[];items.push(r);byId.set(r.id,items)}
 for(const s of schools){if(!s.id)continue;const hits=byId.get(s.id);if(hits?.length!==1||hits[0].district!==s.district)continue;const key=keyFor(s.name,s.district),existing=index.get(key)||[];if(!existing.some(r=>r.id===s.id))index.set(key,[...existing,hits[0]])}
}
if(typeof module!=='undefined')module.exports={addVerifiedAliases};
