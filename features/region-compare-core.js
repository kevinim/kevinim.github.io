'use strict';
// Pure ZIP-level comparison. A city report or county count is never an address risk.
const RegionCompareCore=(()=>{
 const validZip=z=>typeof z==='string'&&/^\d{5}$/.test(z);
 const nonnegative=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const count=v=>nonnegative(v)?Math.round(v).toLocaleString('en-US'):'자료 없음';
 const pct=v=>nonnegative(v)&&v<=100?v.toFixed(1)+'%':'자료 없음';
 const dollars=v=>nonnegative(v)?'$'+Math.round(v).toLocaleString('en-US'):'자료 없음';
 const DEFAULT_ZIPS=['75013','75034','75093'],slots=['A','B','C'];
 function uniqueCandidates(values,available){
  const allowed=new Set(available),out=[];
  for(const z of values||[])if(validZip(z)&&allowed.has(z)&&!out.includes(z)&&out.length<3)out.push(z);
  for(const z of DEFAULT_ZIPS.concat(available))if(validZip(z)&&allowed.has(z)&&!out.includes(z)&&out.length<2)out.push(z);
  return out;
 }
 function weatherFact(noaa,counties,zip,assessment){
  if(!noaa||!counties)return {status:'unknown',message:'자료 확인 중'};
  const name=counties.counties?.[counties.zipCounty?.[zip]]?.name;
  if(!name)return {status:'unknown',message:'대표 카운티 확인 필요'};
  const fact=assessment?.summarizeNoaa?.(noaa.summary,name);
  return fact?{...fact,countyName:name}:{status:'unknown',message:'자료 확인 필요'};
 }
 function buildColumn(d,{school=null,crime=null,noaa=null,county=null,commute=null,hasDestination=false,assessment=null}={}){
  if(!d||!validZip(d.z))return null;
  const police=crime&&assessment?.summarizeCrime?assessment.summarizeCrime(crime,d.z):{status:'unknown',message:'자료 확인 중'};
  const weather=weatherFact(noaa,county,d.z,assessment);
  const schoolValid=school?.status==='available',crimeValid=police?.status==='available',weatherValid=weather?.status==='available';
  const travel=assessment?.summarizeCommute?.(commute,hasDestination)||{status:'unknown'};
  return {zip:d.z,name:d.name||d.z,rows:{
   population:{value:count(d.pop),note:'ACS 2024 · ZIP/ZCTA 추정'},
   kids:{value:pct(d.kids),note:'ACS 2024 · 18세 미만 비율'},
   childHH:{value:pct(d.childHH),note:'ACS 2024 · 미성년자 동거 가구'},
   income:{value:dollars(d.income),note:'ACS 2024 · 가구 중위 소득'},
   asian:{value:[['한국계',d.korean],['인도계',d.indian],['중국계',d.chinese]].map(([k,v])=>k+' '+pct(v)).join(' · '),
    note:'ACS 2024 · ZIP/ZCTA 인구 비율'},
   school:{value:schoolValid?'A/B '+school.ab+'곳 · 소재 '+school.count+'곳':school?.status==='empty'?'소재 학교 0곳 · 배정 없음 아님':'확인 필요',
    note:'TEA 2026 예비 · ZIP 내 위치 · 등급 연결 '+(schoolValid?school.rated+'곳':'미확인')},
   violent:{value:crimeValid?count(police.violent)+'건 / 10만 명':'확인 필요',
    note:crimeValid?'FBI 2025 · '+police.city+' 시 전체':'FBI 2025 · '+(police?.message||'관할 검증 필요')},
   property:{value:crimeValid?count(police.property)+'건 / 10만 명':'확인 필요',
    note:crimeValid?'FBI 2025 · '+police.city+' 시 전체':'FBI 2025 · '+(police?.message||'관할 검증 필요')},
   weather:{value:weatherValid?'우박 '+count(weather.hail)+'건 · 홍수 '+count(weather.flood)+'건':'확인 필요',
    note:weatherValid?'NOAA 2024–25 · '+weather.countyName+' (ZIP 위험도 아님)':'NOAA 2024–25 · '+(weather?.message||'카운티 확인 필요')},
   commute:{value:travel.status==='available'?travel.minutes+'분':'직접 계산 필요',
    note:'선택 목적지 도로망 · ZIP 대표점 · 교통량 미반영'}
  }};
 }
 const ROWS=Object.freeze([
  {group:'인구통계',key:'population',label:'전체 인구'},
  {group:'인구통계',key:'kids',label:'18세 미만'},
  {group:'인구통계',key:'childHH',label:'자녀 동거 가구'},
  {group:'인구통계',key:'income',label:'가구 중위 소득'},
  {group:'인구통계',key:'asian',label:'한국계 · 인도계 · 중국계'},
  {group:'학교',key:'school',label:'TEA A/B 소재 학교'},
  {group:'안전 관련 자료',key:'violent',label:'폭력 범죄 신고율'},
  {group:'안전 관련 자료',key:'property',label:'재산 범죄 신고율'},
  {group:'과거 기상',key:'weather',label:'우박 · 홍수 신고 건수'},
  {group:'교통',key:'commute',label:'통근 소요 시간'}
 ]);
 return {ROWS,DEFAULT_ZIPS,slots,uniqueCandidates,buildColumn,pct,dollars,validZip};
})();
if(typeof window!=='undefined')window.RegionCompareCore=RegionCompareCore;
if(typeof module!=='undefined'&&module.exports)module.exports=RegionCompareCore;
