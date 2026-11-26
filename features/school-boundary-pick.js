'use strict';
// UX-02 follow-up: opt-in, read-only GIS polygon selection. No home assignment
// status is ever inferred from a selected campus or attendance-zone polygon.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.TXSchoolBoundaryPick=api;
})(typeof window==='undefined'?null:window,function(){
 const SOURCES=Object.freeze([
  {key:'FISD',district:'FISD'},{key:'PISD_LOOKUP',district:'PISD'},
  {key:'AISD',district:'AISD'},{key:'LISD',district:'LISD'},
  {key:'043907',district:'043907'},{key:'PROSPER',district:'PROSPER'}
 ]);
 const LEVELS=Object.freeze(['elementary','middle','high']);
 const levelOf=value=>value==='senior'?'high':value;
 function schoolKey(name){
  return String(name||'').toLowerCase()
   .replace(/\bh\.?\s*s\.?\b/g,'high').replace(/\bm\.?\s*s\.?\b/g,'middle')
   .replace(/\bsr\.?\b/g,'senior').replace(/\b(?:elem|el)\b/g,'elementary')
   .replace(/\bk\s*[-–]?\s*[0-9]\b/g,'')
   .replace(/\b(dr|doctor|elementary|middle|senior|sr|high|school|campus)\b/g,'')
   .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 }
 // Strictly one school record in the SAME district and school level. A foreign
 // campus ID or a repeated catalog identity is ambiguous, never a first hit.
 function resolve(feature,district,schools,rating){
  const p=feature?.properties||{};
  if(!['Polygon','MultiPolygon'].includes(feature?.geometry?.type)
   ||!LEVELS.includes(levelOf(p.gradeLevel))||!p.school||!district
   ||(p.sourceDistrict&&p.sourceDistrict!==district&&
      !(district==='PISD'&&p.sourceDistrict==='PISD_LOOKUP')))
   return {status:'invalid',school:null};
  const matches=(Array.isArray(schools)?schools:[]).filter(s=>
   s?.district===district&&s.type===levelOf(p.gradeLevel));
  const id=p.campusId===null||p.campusId===undefined?'':String(p.campusId).trim();
  let candidates=[];
  if(id){
   if(!/^\d{9}$/.test(id))return {status:'invalid',school:null};
   candidates=matches.filter(s=>{
    const catalogId=String(s.id||'');
    const ratedId=typeof rating==='function'?String(rating(s)?.id||''):'';
    return catalogId===id||ratedId===id;
   });
  }else{
   const name=schoolKey(p.school);
   if(!name)return {status:'invalid',school:null};
   candidates=matches.filter(s=>schoolKey(s.name)===name);
   // Allen city GIS contains only some honorees' surnames. Require an exactly
   // unique match within Allen + the same grade to avoid global fuzzy joins.
   if(!candidates.length&&district==='AISD'&&name.length>=4){
    candidates=matches.filter(s=>schoolKey(s.name).split(' ').at(-1)===name);
   }
  }
  if(candidates.length!==1)return {status:candidates.length?'ambiguous':'unlinked',school:null};
  return {status:'matched',school:candidates[0]};
 }
 function insideBounds(geometry,bounds){
  if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type)||!Array.isArray(geometry.coordinates))return false;
  const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  // Conservative bounding-box intersection. An actual click uses exact
  // point-in-polygon including holes; no ZIP approximation ever selects.
  let south=Infinity,north=-Infinity,west=Infinity,east=-Infinity;
  for(const polygon of polys)for(const ring of polygon)for(const point of ring){
   const x=point?.[0],y=point?.[1];
   if(!Number.isFinite(x)||!Number.isFinite(y))return false;
   west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);
  }
  return west<=bounds.east&&east>=bounds.west&&south<=bounds.north&&north>=bounds.south;
 }
 function uniqueAtPoint(rows,point,contains){
  if(!Array.isArray(point)||point.length!==2||typeof contains!=='function')return {status:'unavailable',school:null};
  const items=new Set();
  for(const row of rows||[])if(contains(point,row.feature.geometry))items.add(row.school);
  return {status:items.size===1?'matched':items.size?'overlap':'outside',
   school:items.size===1?[...items][0]:null};
 }
 // Exact-source census across all six configured polygon datasets; this
 // reports identity quality, not address-assignment verification or GIS coverage.
 function auditSources(zones,schools,rating){
  const totals={sourceFeatures:0,matched:0,unlinked:0,ambiguous:0,invalid:0};
  const byDistrict={};
  for(const {key,district} of SOURCES){
   const features=Array.isArray(zones?.[key])?zones[key]:[];
   const stats={sourceFeatures:features.length,matched:0,unlinked:0,ambiguous:0,invalid:0};
   for(const f of features){
    const result=resolve(f,district,schools,rating);
    stats[result.status]++;
   }
   byDistrict[district]=stats;
   for(const key of Object.keys(totals))totals[key]+=stats[key];
  }
  return {totals,byDistrict};
 }
 function install(){
  let attempts=0;
  function start(){
   let mapRef=null,stateRef=null;
   try{
    if(typeof map!=='undefined'&&map?.getContainer&&typeof state!=='undefined'&&Array.isArray(state?.schools)){
     mapRef=map;stateRef=state;
    }
   }catch(_){}
   if(!mapRef||!stateRef){
    if(++attempts<120)setTimeout(start,250);
    return;
   }
   if(document.getElementById('schoolBoundaryPickToggle'))return;
   const box=mapRef.getContainer().closest('.mapbox');
   if(!box||!window.L)return;
   const toolbar=document.createElement('div');
   toolbar.className='hazard-chips';
   toolbar.setAttribute('role','group');
   toolbar.setAttribute('aria-label','GIS 학교 경계 선택');
   const button=document.createElement('button');
   button.id='schoolBoundaryPickToggle';button.type='button';
   button.className='mini-btn';button.setAttribute('aria-pressed','false');
   button.textContent='GIS 경계 클릭 선택: 끔';
   const label=document.createElement('label');label.textContent='학교급 ';
   const select=document.createElement('select');
   select.id='schoolBoundaryPickLevel';
   select.setAttribute('aria-label','GIS 경계 선택 학교급');
   for(const [value,name] of [['elementary','초등'],['middle','중등'],['high','고등']]){
    const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);
   }
   if(LEVELS.includes(stateRef.level))select.value=stateRef.level;
   label.append(select);
   const status=document.createElement('span');status.id='schoolBoundaryPickStatus';
   status.className='source';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   status.textContent='경계 탐색은 기본적으로 꺼져 있습니다. 활성화해도 집 주소 배정은 인증되지 않습니다.';
   toolbar.append(button,label,status);
   box.insertBefore(toolbar,mapRef.getContainer());
   let enabled=false,rows=[],refreshing=false;
   const pane=mapRef.getPane('txSchoolPickPane')||mapRef.createPane('txSchoolPickPane');
   pane.style.zIndex='415';pane.style.pointerEvents='none';
   // The dashboard uses preferCanvas for thousands of campus markers. This
   // opt-in keyboard-accessible layer requires actual SVG paths instead.
   const renderer=L.svg({pane:'txSchoolPickPane'});
   const overlay=L.featureGroup().addTo(mapRef);
   function allowedSet(){
    const set=new Set();
    for(const button of document.querySelectorAll('#schoolList button.school[data-sid]')){
     const idx=Number(button.dataset.sid);
     if(Number.isInteger(idx)&&stateRef.schools[idx])set.add(stateRef.schools[idx]);
    }
    return set;
   }
   function activate(row,point){
    if(!enabled||!row)return;
    // Current school-list filters and address-first candidate scope are strict:
    // a polygon outside the list never silently becomes an assigned school.
    if(!allowedSet().has(row.school)){
     status.textContent='이 학교는 현재 주소·학교 목록 필터 밖입니다. 필터를 변경하여 다시 선택하세요.';
     return;
    }
    if(point){
     const lookup=uniqueAtPoint(rows,point,typeof geometryContains==='function'?geometryContains:null);
     if(lookup.status!=='matched'||lookup.school!==row.school){
      status.textContent=lookup.status==='overlap'
       ?'같은 학교급에서 서로 다른 경계가 겹칩니다. 학교를 자동 선택하지 않았습니다. 공식 Finder에서 확인하세요.'
       :'경계 내부 확인에 실패했습니다. 학교를 선택하지 않았습니다.';
      return;
     }
    }
    if(typeof schoolClicked!=='function')return;
    schoolClicked(row.school,false);
    status.textContent=row.school.name+' · GIS '+String(row.feature.properties.sourceVintage||'연도 미표기')
     +' 참고 경계를 선택했습니다. 학교 위치·경계는 거주지 공식 배정 인증이 아닙니다.';
   }
   function redraw(){
    if(!enabled||refreshing)return;
    refreshing=true;
    try{
     overlay.clearLayers();rows=[];
     const level=select.value;
     const bounds=mapRef.getBounds();
     const ext={north:bounds.getNorth(),south:bounds.getSouth(),east:bounds.getEast(),west:bounds.getWest()};
     const allowed=allowedSet();
     let invalid=0,unlinked=0,ambiguous=0,offline=0;
     for(const source of SOURCES){
      const key=source.key,district=source.district;
      if(stateRef.zoneLoadErrors?.[key]){offline++;continue;}
      if(stateRef.sourceStatus?.[key]?.polygon==='loading')continue;
      for(const feature of stateRef.zoneData[key]||[]){
       if(levelOf(feature?.properties?.gradeLevel)!==level||!insideBounds(feature.geometry,ext))continue;
       const match=resolve(feature,district,stateRef.schools,s=>
        typeof scoreRecord==='function'?scoreRecord(s.name,s.district):null);
       if(match.status==='invalid'){invalid++;continue;}
       if(match.status==='ambiguous'){ambiguous++;continue;}
       if(match.status!=='matched'){unlinked++;continue;}
       if(!allowed.has(match.school))continue;
       rows.push({feature,school:match.school});
      }
     }
     for(const row of rows){
      const mode=typeof schoolDisplayMode==='function'?schoolDisplayMode(row.school):'historical';
      const current=mode==='official',finder=mode==='finder';
      const color=current?'#087f69':finder?'#285ac0':'#c66a1b';
      const shape=L.geoJSON(row.feature,{
       pane:'txSchoolPickPane',renderer,
       interactive:true,
       style:{color,weight:2,dashArray:current||finder?null:'6 5',fillColor:color,fillOpacity:.06},
      });
      shape.on('click',event=>{
       event.originalEvent?.stopPropagation?.();
       activate(row,event.latlng?[event.latlng.lng,event.latlng.lat]:null);
      });
      overlay.addLayer(shape);
      shape.eachLayer(path=>{
       const node=path.getElement?.();
       if(!node)return;
       node.setAttribute('tabindex','0');
       node.setAttribute('role','button');
       node.setAttribute('aria-label',row.school.name+' GIS 학교 경계 선택 · 거주지 배정 미인증');
       node.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        event.preventDefault();event.stopPropagation();
        activate(row,null);
       });
      });
     }
     status.textContent=rows.length+'개 경계 조각을 '+(level==='elementary'?'초등':level==='middle'?'중등':'고등')+
      ' 학교 목록과 연결했습니다. 원본 미연결 '+unlinked+' · 중복 후보 '+ambiguous+' · 무효 '+invalid+
      ' · 로딩 오류 학군 '+offline+'. 참고 GIS이며 실제 주소 배정은 공식 Finder로 확인하세요.';
    }finally{refreshing=false;}
   }
   button.addEventListener('click',()=>{
    enabled=!enabled;
    pane.style.pointerEvents=enabled?'auto':'none';
    button.setAttribute('aria-pressed',String(enabled));
    button.textContent='GIS 경계 클릭 선택: '+(enabled?'켬':'끔');
    if(enabled)redraw();
    else{overlay.clearLayers();rows=[];status.textContent='경계 선택 모드를 껐습니다. 기존 학교 마커와 배정 지도는 유지됩니다.';}
   });
   select.addEventListener('change',()=>{if(enabled)redraw();});
   mapRef.on('moveend',()=>{if(enabled)redraw();});
   window.addEventListener('schoolsourcechange',()=>{if(enabled)redraw();});
   for(const id of ['schoolScope','schoolSearch','ratingFilter','zipSelect','homeClear']){
    document.getElementById(id)?.addEventListener('change',()=>{if(enabled)queueMicrotask(redraw)});
   }
   // Delayed list rendering (school search uses a 140ms debounce) must not
   // leave an old polygon connected to a now-filtered school.
   const schoolList=document.getElementById('schoolList');
   if(schoolList&&window.MutationObserver)new MutationObserver(()=>{
    if(enabled)queueMicrotask(redraw);
   }).observe(schoolList,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
 }
 if(typeof window!=='undefined'&&typeof document!=='undefined')install();
 return Object.freeze({SOURCES,LEVELS,schoolKey,resolve,insideBounds,uniqueAtPoint,auditSources});
});