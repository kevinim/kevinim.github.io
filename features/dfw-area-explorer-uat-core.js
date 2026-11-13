/* ZIP-based area discovery; no school attendance or travel-time inference. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DfwAreaExplorerCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const ZIP=/^\d{5}$/;
  const MAX_LIST=18;
  const DIRECTIONS=/^(?:North|South|East|West|NW|NE|SW|SE)\s+(.+)$/i;
  function canonicalCity(record,places){
    const provided=places&&places[record.z];
    if(typeof provided==='string'&&provided.trim())return provided.trim();
    let name=String(record.name||'').trim();
    const pref=name.match(DIRECTIONS);
    if(pref)name=pref[1];
    const suff=name.match(/^(.+?)\s+(?:North|South|East|West)$/i);
    return suff?suff[1]:name;
  }
  function valid(record){
    return record&&ZIP.test(String(record.z))&&Array.isArray(record.ll)&&
      record.ll.length===2&&record.ll.every(Number.isFinite);
  }
  function visible(record,bounds){
    if(!bounds)return true;
    const [lat,lng]=record.ll;
    return lat>=bounds.south&&lat<=bounds.north&&lng>=bounds.west&&lng<=bounds.east;
  }
  function distance(a,b){
    if(!b)return 0;
    const lat=a[0]-b[0],lng=(a[1]-b[1])*Math.cos(a[0]*Math.PI/180);
    return lat*lat+lng*lng;
  }
  function candidates(records,places,options){
    const opts=options||{},query=String(opts.query||'').trim().slice(0,100).toLocaleLowerCase('en-US');
    const selected=String(opts.selectedZip||'');
    const center=Array.isArray(opts.center)?opts.center:null;
    const max=Math.max(1,Math.min(25,Number(opts.limit)||MAX_LIST));
    let rows=(Array.isArray(records)?records:[]).filter(valid).map(row=>{
      const city=canonicalCity(row,places);
      return {kind:'zip',zip:row.z,city,place:String(row.name||city),ll:row.ll,
        selected:row.z===selected,score:distance(row.ll,center)};
    });
    if(query){
      rows=rows.filter(row=>(row.zip+' '+row.city+' '+row.place).toLocaleLowerCase('en-US').includes(query));
      return rows.sort((a,b)=>Number(b.zip===query)-Number(a.zip===query)
        ||Number(b.selected)-Number(a.selected)||a.city.localeCompare(b.city)||a.zip.localeCompare(b.zip)).slice(0,max);
    }
    rows=rows.filter(row=>visible(row,opts.bounds));
    if((opts.zoom||10)<=10){
      const groups=new Map();
      for(const row of rows){
        if(!row.city)continue;
        const key=row.city.toLowerCase();
        let group=groups.get(key);
        if(!group){
          group={kind:'city',city:row.city,count:0,sumLat:0,sumLng:0,zips:[],selected:false};
          groups.set(key,group);
        }
        group.count++;group.sumLat+=row.ll[0];group.sumLng+=row.ll[1];
        group.zips.push(row.zip);
        group.selected||=row.selected;
      }
      return [...groups.values()].map(g=>({
        kind:'city',city:g.city,count:g.count,zips:g.zips,
        ll:[g.sumLat/g.count,g.sumLng/g.count],selected:g.selected,
        score:distance([g.sumLat/g.count,g.sumLng/g.count],center)
      })).sort((a,b)=>Number(b.selected)-Number(a.selected)||a.score-b.score||a.city.localeCompare(b.city)).slice(0,max);
    }
    return rows.sort((a,b)=>Number(b.selected)-Number(a.selected)||a.score-b.score||a.city.localeCompare(b.city)||a.zip.localeCompare(b.zip)).slice(0,max);
  }
  function inRing(point,ring){
    if(!Array.isArray(ring)||ring.length<4)return false;
    const [x,y]=point;let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if(!Array.isArray(a)||!Array.isArray(b))return false;
      const [xi,yi]=a,[xj,yj]=b;
      if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
    }
    return inside;
  }
  function inPolygon(point,rings){
    if(!Array.isArray(rings)||!inRing(point,rings[0]))return false;
    return !rings.slice(1).some(ring=>inRing(point,ring));
  }
  function containsGeoJSON(geometry,lat,lng){
    if(!geometry||!Number.isFinite(lat)||!Number.isFinite(lng))return false;
    if(geometry.type==='Feature')return containsGeoJSON(geometry.geometry,lat,lng);
    if(geometry.type==='FeatureCollection')return (geometry.features||[]).some(f=>containsGeoJSON(f,lat,lng));
    if(geometry.type==='GeometryCollection')return (geometry.geometries||[]).some(g=>containsGeoJSON(g,lat,lng));
    const point=[lng,lat];
    if(geometry.type==='Polygon')return inPolygon(point,geometry.coordinates);
    if(geometry.type==='MultiPolygon')return (geometry.coordinates||[]).some(poly=>inPolygon(point,poly));
    return false;
  }
  return {candidates,canonicalCity,containsGeoJSON,visible};
});
