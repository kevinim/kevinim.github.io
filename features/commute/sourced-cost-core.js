'use strict';
/* P1 sourced commute inputs. Pure functions only. Cost is NEVER asserted when
 * a route's toll schedule, dynamic price or separate no-tolls route is unknown. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.CommuteEvidenceCore=api;
})(typeof window!=='undefined'?window:null,function(){
 const METRO_FOR_COUNTY=Object.freeze({
  '48113':'Dallas','48085':'Dallas','48121':'Dallas',
  '48439':'Fort Worth-Arlington','48367':'Fort Worth-Arlington','48251':'Fort Worth-Arlington'
 });
 const API='https://www.fueleconomy.gov/ws/rest/vehicle/';
 const VALID_GRADES=['regular','midgrade','premium','diesel'];
 function metroForZip(zip,counties){
  const code=counties?.zipCounty?.[String(zip||'')];
  return METRO_FOR_COUNTY[code]||null;
 }
 function dateAgeDays(date,now){
  const a=new Date(date+'T12:00:00Z'),b=new Date(now||new Date());
  return Number.isFinite(a.getTime())&&Number.isFinite(b.getTime())?(b.getTime()-a.getTime())/86400000:NaN;
 }
 function getLocalFuel({snapshot,counties,zip,grade='regular',now=new Date()}={}){
  if(!VALID_GRADES.includes(grade))return {status:'unsupported-grade',price:null};
  if(!snapshot?.metadata?.priceDate||!snapshot?.metro)return {status:'missing-snapshot',price:null};
  const age=dateAgeDays(snapshot.metadata.priceDate,now);
  if(!Number.isFinite(age)||age<-1||age>30)return {status:'stale',price:null,priceDate:snapshot.metadata.priceDate};
  const metro=metroForZip(zip,counties);
  if(!metro)return {status:'outside-covered-metro',price:null,priceDate:snapshot.metadata.priceDate};
  const price=snapshot.metro[metro]?.[grade];
  if(typeof price!=='number'||!Number.isFinite(price)||price<=0||price>=20)
   return {status:'invalid-price',price:null,priceDate:snapshot.metadata.priceDate,metro};
  return {status:age>7?'dated':'available',price,grade,metro,priceDate:snapshot.metadata.priceDate};
 }
 function fuelGrade(record){
  const text=String(record?.fuelType1||record?.fuelType||'').toLowerCase();
  if(text.includes('electricity')||text.includes('natural gas')||text.includes('hydrogen'))return null;
  if(text.includes('diesel'))return 'diesel';
  if(text.includes('premium'))return 'premium';
  if(text.includes('midgrade'))return 'midgrade';
  if(text.includes('gasoline')||text.includes('gas'))return 'regular';
  return null;
 }
 function vehicleInfo(record){
  if(!record||typeof record!=='object')return {status:'unknown',mpg:null};
  const grade=fuelGrade(record),mpg=Number(record.comb08);
  if(!grade||!Number.isFinite(mpg)||mpg<=0||mpg>300)
   return {status:'unsupported',mpg:null,grade,reason:'전기차·복합연료 또는 해당 연비자료는 별도 계산이 필요합니다'};
  const year=Number(record.year);
  return {status:'available',mpg,grade,year:Number.isInteger(year)?year:null,
    make:String(record.make||''),model:String(record.model||''),fuelType:String(record.fuelType1||'')};
 }
 function normalizeMenu(payload){
  const items=payload?.menuItem===undefined?payload?.menuItems:payload.menuItem;
  if(!items)return [];
  const seq=Array.isArray(items)?items:[items];
  return seq.filter(x=>x&&typeof x.text==='string'&&(typeof x.value==='string'||typeof x.value==='number'))
    .map(x=>({text:x.text.trim(),value:String(x.value)})).filter(x=>x.text&&x.value).slice(0,350);
 }
 function apiMenuUrl(kind,{year,make,model}={}){
  if(!['year','make','model','options'].includes(kind))throw new RangeError('Unsupported vehicle menu');
  const params=new URLSearchParams();
  if(kind!=='year'){
   if(!Number.isInteger(Number(year))||Number(year)<1984||Number(year)>2100)throw Error('Year required');
   params.set('year',String(year));
  }
  if(kind==='model'||kind==='options'){
   if(!make||String(make).length>100)throw Error('Make required');
   params.set('make',String(make));
  }
  if(kind==='options'){
   if(!model||String(model).length>150)throw Error('Model required');
   params.set('model',String(model));
  }
  return API+'menu/'+kind+(params.size?'?'+params.toString():'');
 }
 function vehicleUrl(id){
  if(!/^[1-9]\d{0,7}$/.test(String(id||'')))throw Error('Valid EPA vehicle ID required');
  return API+id;
 }
 function directionsLink(origin,destination,{avoidTolls=false,reverse=false}={}){
  function point(value){
   if(Array.isArray(value)&&value.length===2&&value.every(n=>Number.isFinite(n)))
     return value.map(n=>n.toFixed(6)).join(',');
   if(typeof value==='string'&&value.trim()&&value.length<=200)return value.trim();
   return null;
  }
  const from=point(reverse?destination:origin),to=point(reverse?origin:destination);
  if(!from||!to)return null;
  const url=new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api','1');url.searchParams.set('origin',from);
  url.searchParams.set('destination',to);url.searchParams.set('travelmode','driving');
  if(avoidTolls)url.searchParams.set('avoid','tolls');
  return url.href;
 }
 function estimateKnownFuel({outboundMiles,returnMiles,mpg,gasPrice,days,oneWayMinutes=null}={}){
  const values=[outboundMiles,returnMiles,mpg,gasPrice,days];
  if(values.some(n=>typeof n!=='number'||!Number.isFinite(n))||
     outboundMiles<0||returnMiles<0||mpg<=0||gasPrice<=0||
     !Number.isInteger(days)||days<0||days>31)return {status:'incomplete',monthlyFuelUsd:null,minutes:oneWayMinutes};
  const monthlyFuelUsd=Math.round(((outboundMiles+returnMiles)*days/mpg)*gasPrice*100)/100;
  return {status:'partial',monthlyFuelUsd,oneWayMinutes:Number.isFinite(oneWayMinutes)&&oneWayMinutes>=0?
    Math.round(oneWayMinutes):null,tollUsd:null,totalUsd:null,
    caution:'OSRM unpriced route is not a verified toll/traffic-aware fastest route. Actual daily toll and return duration are unknown.'};
 }
 function paymentPolicy(mode){
  const policies={
   tolltag:{label:'NTTA TollTag',nttaFactor:1,expressFactor:null},
   zipcash:{label:'NTTA ZipCash',nttaFactor:2,expressFactor:null},
   zipcash_autopay:{label:'NTTA ZipCash AutoPay',nttaFactor:1.5,expressFactor:null}
  };
  return policies[mode]||null;
 }
 function renderScenarios({fuel=null,hasTollFreeRoute=false}={}){
  const fast={label:'톨 허용 경로',fuelUsd:fuel?.monthlyFuelUsd??null,
   minutes:fuel?.oneWayMinutes??null,tollUsd:null,totalUsd:null,status:'needs-route-toll'};
  const avoid={label:'톨 회피 선호 경로',fuelUsd:null,minutes:null,tollUsd:null,totalUsd:null,
   status:hasTollFreeRoute?'needs-toll-check':'needs-verified-route'};
  return {fast,avoid,comparisonReady:false};
 }
 return Object.freeze({metroForZip,dateAgeDays,getLocalFuel,fuelGrade,vehicleInfo,normalizeMenu,
  apiMenuUrl,vehicleUrl,directionsLink,estimateKnownFuel,paymentPolicy,renderScenarios,VALID_GRADES});
});
