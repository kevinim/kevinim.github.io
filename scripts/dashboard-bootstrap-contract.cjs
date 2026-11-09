'use strict';
// One canonical, versioned, external main app bootstrap. The cache-busting
// integer may advance, but missing, duplicate or non-canonical tags fail closed.
function assertVersionedMainBootstrap(html) {
 if(typeof html!=='string')throw Error('Main bootstrap HTML missing');
 const candidates=[...html.matchAll(/<script\b[^>]*\bsrc=(["'])([^"']*dashboard-main\.js[^"']*)\1[^>]*>[\s\S]*?<\/script>/gi)];
 if(candidates.length!==1)throw Error('Main bootstrap tag missing or duplicated');
 const tag=candidates[0][0];
 const match=/^<script src="\.\/dashboard-main\.js\?v=([1-9]\d*)"><\/script>$/.exec(tag);
 if(!match)throw Error('Main bootstrap tag must be canonical, external and versioned');
 const version=Number(match[1]);
 if(!Number.isSafeInteger(version))throw Error('Main bootstrap cache version invalid');
 return {version,tag};
}
module.exports={assertVersionedMainBootstrap};
