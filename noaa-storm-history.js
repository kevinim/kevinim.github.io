'use strict';
// NOAA NCEI historical, county-coded reported incidents.
// Never conflate occurrence count with tract risk, ZIP risk or parcel risk.
const NOAA_STORM_DATA_URL='./data/noaa-storm-events-dfw-2024-2025.json';
const NOAA_STORM_CATEGORY_LABELS={
 wind:'강풍·열대성 잔재 바람',tornado:'토네이도',hail:'우박',
 flood:'홍수·급류',lightning:'낙뢰',wildfire:'산불 발생 기록'
};
const NOAA_STORM_MONTHS=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
function validateNoaaStormSnapshot(data){
 const meta=data?.metadata,records=data?.summary;
 if(!meta||!Array.isArray(records)||!Array.isArray(meta?.counties)||meta.counties.length!==12)return false;
 if(!Array.isArray(meta.sourceFiles)||meta.sourceFiles.length!==2||meta.sourceFiles.some(x=>!/^[a-f0-9]{64}$/.test(x.sha256||'')))return false;
 if(!Array.isArray(meta.analyzedYears)||meta.analyzedYears.join(',')!=='2024,2025')return false;
 if(!Number.isInteger(meta.selectedEvents)||meta.selectedEvents<=0)return false;
 const counties=new Set(meta.counties);
 let count=0;
 for(const r of records){
  if(!counties.has(r.county)||!meta.analyzedYears.includes(r.year)||!NOAA_STORM_CATEGORY_LABELS[r.category])return false;
  if(!Number.isInteger(r.count)||r.count<0||!Array.isArray(r.monthly)||r.monthly.length!==12||
    r.monthly.some(v=>!Number.isInteger(v)||v<0))return false;
  if(r.monthly.reduce((a,b)=>a+b,0)!==r.count)return false;
  count+=r.count;
 }
 return count===meta.selectedEvents&&records.length===meta.aggregatedRows&&
  meta.sourceFiles.reduce((n,s)=>n+s.selectedCountyRows,0)===count;
}
function summarizeNoaaStormSnapshot(data,year,county,category){
 if(!validateNoaaStormSnapshot(data))throw Error('NOAA historical source integrity failure');
 const rows=data.summary.filter(r=>r.year===year&&(county==='ALL'||r.county===county)&&
  (category==='ALL'||r.category===category));
 const monthly=Array(12).fill(0),byCounty={};
 for(const r of rows){
  byCounty[r.county]=(byCounty[r.county]||0)+r.count;
  for(let i=0;i<12;i++)monthly[i]+=r.monthly[i];
 }
 return {total:monthly.reduce((a,b)=>a+b,0),monthly,
  byCounty:Object.entries(byCounty).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),
  includedCounties:county==='ALL'?data.metadata.counties.length:1,
  sourceYears:data.metadata.analyzedYears};
}
function createNoaaStormHistory(doc){
 const d=doc||document;
 const panel=d.getElementById('noaaStormHistoryPanel');
 const status=d.getElementById('noaaStormStatus');
 const year=d.getElementById('noaaStormYear');
 const county=d.getElementById('noaaStormCounty');
 const category=d.getElementById('noaaStormCategory');
 const total=d.getElementById('noaaStormTotal');
 const chart=d.getElementById('noaaStormMonthly');
 const table=d.getElementById('noaaStormCountyCounts');
 const source=d.getElementById('noaaStormSourceDetails');
 if(!panel||!status||!year||!county||!category||!total||!chart||!table||!source)return null;
 let data=null,loading=null;
 const setStatus=(message,warning=false)=>{status.textContent=message;status.dataset.state=warning?'warning':'ready'};
 function render(){
  if(!data)return;
  const summary=summarizeNoaaStormSnapshot(data,Number(year.value),county.value,category.value);
  total.textContent=summary.total.toLocaleString('en-US')+'건';
  chart.replaceChildren();
  const max=Math.max(1,...summary.monthly);
  summary.monthly.forEach((value,i)=>{
   const line=d.createElement('div');line.className='brow';
   const heading=d.createElement('div');heading.className='btop';
   const left=d.createElement('span');left.textContent=NOAA_STORM_MONTHS[i];
   const right=d.createElement('span');right.textContent=value.toLocaleString('en-US')+'건';
   heading.append(left,right);
   const track=d.createElement('div');track.className='track';
   const fill=d.createElement('div');fill.className='fill';
   fill.style.width=(value/max*100).toFixed(2)+'%';fill.style.background='#ce5151';
   track.append(fill);line.append(heading,track);chart.appendChild(line);
  });
  table.replaceChildren();
  const header=d.createElement('div');header.className='source';
  header.textContent=county.value==='ALL'?'카운티별 신고 기록 수 (동일 사건의 여러 신고 중복 가능)':'선택한 카운티 보고 기록';
  table.appendChild(header);
  for(const [name,n] of summary.byCounty){
   const line=d.createElement('div');line.className='statrow';
   const left=d.createElement('span');left.textContent=name;
   const right=d.createElement('strong');right.textContent=n.toLocaleString('en-US')+'건';
   line.append(left,right);table.appendChild(line);
  }
  if(summary.total===0){
   const note=d.createElement('small');note.className='source';
   note.textContent='이 필터에 보고된 카운티형 사건이 없거나 수집 범위에 포함되지 않았습니다. 실제 피해·위험이 0이라는 뜻은 아닙니다.';
   table.appendChild(note);
  }
  const filenames=data.metadata.sourceFiles.map(x=>x.year+'년 원본 개정 '+x.revision+' · SHA-256 '+x.sha256.slice(0,12)+'…').join(' / ');
  source.textContent=filenames+' · NOAA county-coded(C)만 집계 · 총 '+data.metadata.selectedEvents.toLocaleString('en-US')+'개 기록 재검산 완료';
  setStatus('NOAA NCEI '+year.value+'년 공식 보고기록 · '+(county.value==='ALL'?'DFW 12개 카운티':county.value)+' · 미래 위험도/발생 일수 아님');
 }
 async function load(){
  if(data){render();return}
  if(loading)return loading;
  setStatus('NOAA 공식 과거 발생 기록을 불러오는 중…');
  loading=(async()=>{
   const res=await fetch(NOAA_STORM_DATA_URL);
   if(!res.ok)throw Error('NOAA snapshot HTTP '+res.status);
   const fetched=await res.json();
   if(!validateNoaaStormSnapshot(fetched))throw Error('NOAA dataset checksum/count verification failed');
   data=fetched;
   for(const name of data.metadata.counties){
    const option=d.createElement('option');option.value=name;option.textContent=name;
    county.appendChild(option);
   }
   render();
  })().catch(error=>{
   console.warn('NOAA historical dashboard source unavailable:',error);
   setStatus('NOAA 과거 발생 기록을 검증하거나 불러오지 못했습니다. 공식 NCEI에서 직접 확인하세요.',true);
  }).finally(()=>{loading=null});
  return loading;
 }
 for(const input of [year,county,category])input.addEventListener('change',render);
 panel.addEventListener('toggle',()=>{if(panel.open)load()});
 setStatus('패널을 열면 NOAA 2024–25 원본 집계를 불러옵니다. (기본 지도 로딩에 영향 없음)');
 return {load,render,getLoadedRecordCount:()=>data?.metadata.selectedEvents||0};
}
if(typeof module!=='undefined')module.exports={NOAA_STORM_DATA_URL,NOAA_STORM_CATEGORY_LABELS,validateNoaaStormSnapshot,summarizeNoaaStormSnapshot};
if(typeof window!=='undefined')window.createNoaaStormHistory=createNoaaStormHistory;
