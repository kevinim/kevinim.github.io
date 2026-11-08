/* Independent, source-aware TX relocation extras. No changes to school/map state.
   Requires existing CommuteCostModel and optional routing distance callback. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id);
 const place=(parent,tag,text,klass)=>{const x=document.createElement(tag);if(klass)x.className=klass;x.textContent=text;parent.appendChild(x);return x;};
 function init(){
  if(!$('destination')||!$('.nonexistent')&&false)return; // no-op keep init idempotent in multi-script pages
  if($('tollCostPanel'))return;
  const office=document.querySelector('.office-controls');
  const commuteGroup=document.querySelector('.filter-panel .commute-settings');
  if(!office||!commuteGroup)return;
  const toll=document.createElement('details');
  toll.id='tollCostPanel';toll.className='extra-feature extra-commute';
  toll.innerHTML=`
    <summary><span class="extra-glyph" aria-hidden="true">＄</span><span>통행료 · 월 출퇴근 비용<small>NTTA 요금과 주유비를 함께 계산</small></span></summary>
    <div class="extra-body">
      <p class="extra-disclosure">자동 통행료 조회는 아직 제공되지 않습니다. <a href="https://maps.ntta.org/tollcalculator/" target="_blank" rel="noopener noreferrer">NTTA 공식 요금 계산기</a>에서 출근·퇴근 경로를 각각 조회한 뒤 TollTag 요금을 입력하세요. TEXpress 변동요금은 별도로 입력합니다.</p>
      <div class="extra-checks"><label><input type="checkbox" id="tollNttaUsed" checked> NTTA 유료도로 이용</label><label><input type="checkbox" id="tollExpressUsed"> TEXpress 차선 이용</label></div>
      <div class="extra-input-grid">
        <label>월 출근일<input id="tollDays" type="number" min="0" max="31" step="1" value="12"></label>
        <label>NTTA 결제방식<select id="tollPaymentMode"><option value="tolltag">TollTag</option><option value="zipcash">ZipCash (2배)</option><option value="zipcash_autopay">ZipCash AutoPay (1.5배)</option></select></label>
        <label>출근 편도 TollTag ($)<input id="tollOut" type="number" min="0" step=".01" placeholder="공식 견적 입력"></label>
        <label>퇴근 편도 TollTag ($)<input id="tollBack" type="number" min="0" step=".01" placeholder="공식 견적 입력"></label>
        <label>TEXpress 출근 편도 ($)<input id="expressOut" type="number" min="0" step=".01" placeholder="이용 시 입력"></label>
        <label>TEXpress 퇴근 편도 ($)<input id="expressBack" type="number" min="0" step=".01" placeholder="이용 시 입력"></label>
        <label>출근 편도 거리 (mile)<input id="tollOutMiles" type="number" min="0" step=".1" placeholder="경로 계산 또는 직접 입력"></label>
        <label>퇴근 편도 거리 (mile)<input id="tollBackMiles" type="number" min="0" step=".1" placeholder="거리 입력"></label>
        <label>차량 연비 (MPG)<input id="tollMpg" type="number" min=".01" step=".1" value="28"></label>
        <label>유가 ($/gallon)<input id="tollFuel" type="number" min="0" step=".01" value="3.00"></label>
        <label>일 주차비 ($)<input id="tollParking" type="number" min="0" step=".01" value="0"></label>
      </div>
      <p id="tollDistanceStatus" class="extra-disclosure" role="status">거리를 직접 입력하거나 위의 자동차 출퇴근 시간 계산을 실행하세요. 귀가 거리는 출근 거리와 다를 수 있습니다.</p>
      <button id="tollCalculate" class="extra-action" type="button">월 예상 비용 계산</button>
      <div id="tollResults" class="extra-result" role="status" aria-live="polite">NTTA 요금과 출퇴근 거리를 입력하면 계산합니다.</div>
      <p class="extra-disclosure">기본 연비·유가는 예시 입력값으로 실제 차량·유가에 맞게 수정해야 합니다. 교통량, 주차 외 차량 유지비, TEXpress 실시간 요금은 자동 계산하지 않습니다.</p>
    </div>`;
  office.appendChild(toll);
  const health=document.createElement('details');
  health.id='healthcarePanel';health.className='extra-feature extra-health';
  health.innerHTML=`
    <summary><span class="extra-glyph" aria-hidden="true">✚</span><span>병원 · 응급실<small>공식 시설 목록과 경로 링크</small></span></summary>
    <div class="extra-body">
      <p class="extra-disclosure">CMS 병원 등록자료(2026년 자료). 응급서비스 표시 여부를 확인할 수 있지만 24시간 운영·외상센터 등급 또는 실제 운전시간을 보장하지 않습니다. 가까운 응급실 순서가 아니라 선택 도시의 시설 목록입니다.</p>
      <label>시설이 있는 도시<select id="hospitalCity"><option value="">도시를 선택하세요</option></select></label>
      <label class="extra-check"><input id="hospitalEdOnly" type="checkbox" checked> 응급서비스 표시 시설만</label>
      <div id="hospitalStatus" class="extra-disclosure" role="status">열면 공식 병원 목록을 불러옵니다.</div>
      <div id="hospitalList" class="extra-list" aria-live="polite"></div>
      <p class="extra-disclosure"><a href="https://data.cms.gov/provider-data/dataset/xubh-q36u" target="_blank" rel="noopener noreferrer">CMS 공식 자료</a> · 선택 주소에서의 실제 소요시간은 링크를 연 뒤 지도 서비스에서 확인하세요.</p>
    </div>`;
  commuteGroup.insertAdjacentElement('afterend',health);
  const grid=document.createElement('details');
  grid.id='gridResiliencePanel';grid.className='extra-feature extra-grid';
  grid.innerHTML=`
    <summary><span class="extra-glyph" aria-hidden="true">ϟ</span><span>겨울한파 · 전력 인프라<small>텍사스 전력망 자료와 데이터 범위</small></span></summary>
    <div class="extra-body">
      <p class="extra-disclosure">현재 확보한 통계는 텍사스 전체 평균입니다. <b>Allen·Plano·Frisco의 동네별 정전확률이나 2021년 실제 정전 시간을 나타내지 않습니다.</b></p>
      <div id="gridResilienceStatus" class="extra-disclosure" role="status">공식 EIA 통계를 불러오려면 이 항목을 펼치세요.</div>
      <div id="gridResilienceData" class="extra-list"></div>
      <p class="extra-disclosure">전력회사별 서비스 구역과 한파 노출도·과거 지역별 정전 기록은 미확보입니다. <a href="https://www.eia.gov/electricity/annual/table.php?t=epa_11_03.html" target="_blank" rel="noopener noreferrer">EIA 출처 보기</a></p>
    </div>`;
  health.insertAdjacentElement('afterend',grid);

  for(const id of ['tollOutMiles','tollBackMiles']){
    $(id).addEventListener('input',()=>{$(id).dataset.auto='no';$('tollDistanceStatus').textContent='직접 입력한 편도 거리입니다. 퇴근 경로는 다른 도로를 이용할 수 있습니다.';});
  }
  root.noteCommuteRouteDistance=function(meters,kind){
    if(!Number.isFinite(meters)||meters<0)return;
    const miles=Math.round(meters/1609.344*10)/10;
    const out=$('tollOutMiles'),back=$('tollBackMiles');
    if(!out||!back)return;
    if(!out.value || out.dataset.auto==='yes'){out.value=String(miles);out.dataset.auto='yes';}
    if(!back.value || back.dataset.auto==='yes'){back.value=String(miles);back.dataset.auto='yes';}
    $('tollDistanceStatus').textContent=(kind==='home'?'선택한 집':'선택 ZIP 대표점')+'에서 직장까지 OSRM 편도 '+miles.toFixed(1)+'mile을 적용했습니다. 퇴근도 같은 거리로 임시 가정했으며 실제 귀가 경로가 다르면 수정하세요.';
  };
  const money=n=>'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  $('tollCalculate').addEventListener('click',()=>{
    const res=$('tollResults');res.replaceChildren();
    try{
      const lib=root.CommuteCostModel;
      if(!lib)throw Error('통근비 계산 모듈을 불러오지 못했습니다.');
      const n=id=>$(id).value.trim(),value=id=>n(id)===''?null:n(id);
      const scenario={
        daysPerMonth:value('tollDays'),
        paymentMode:n('tollPaymentMode'),
        nttaRoadsUsed:$('tollNttaUsed').checked,
        expressLanesUsed:$('tollExpressUsed').checked,
        outboundNttaTollTagUsd:value('tollOut'),
        returnNttaTollTagUsd:value('tollBack'),
        outboundExpressUsd:value('expressOut'),
        returnExpressUsd:value('expressBack'),
        outboundMiles:value('tollOutMiles'),
        returnMiles:value('tollBackMiles'),
        milesPerGallon:value('tollMpg'),
        fuelPricePerGallon:value('tollFuel'),
        parkingPerDayUsd:value('tollParking')
      };
      const computed=lib.calculateMonthlyCommute(scenario);
      const c=computed.components;
      const cells=[['월 통행료',c.tollPerMonthUsd],['월 유류비',c.fuelPerMonthUsd],['월 주차비',c.parkingPerMonthUsd],['월 합계',c.totalPerMonthUsd],['연간 환산',c.totalPerYearUsd]];
      const wrap=place(res,'div','','extra-summary-grid');
      for(const [name,v] of cells){const cell=place(wrap,'div','','extra-stat');place(cell,'small',name);place(cell,'strong',v===null?'미확인':money(v));}
      if(computed.status==='INCOMPLETE_QUOTE')place(res,'p','통행료 견적이 누락되어 전체 합계는 계산하지 않았습니다. NTTA 또는 TEXpress 요금을 입력하세요.','extra-warning');
      else place(res,'p','입력한 가정값 기반 예상치입니다. 실제 통행료 고지서나 교통상황과 차이가 날 수 있습니다.','extra-disclosure');
    }catch(e){place(res,'p','입력값을 확인하세요: '+(e&&e.message?e.message:'유효하지 않은 값'),'extra-warning');}
  });
  let hospitalData=null,gridData=null;
  async function loadHospitals(){
    const status=$('hospitalStatus');status.textContent='공식 CMS 시설 목록을 불러오는 중…';
    try{
      const resp=await fetch('./data/healthcare/cms-dfw-hospitals-2026.json');
      if(!resp.ok)throw Error('HTTP '+resp.status);
      const data=await resp.json();
      if(!Array.isArray(data.records))throw Error('시설 데이터 형식 오류');
      hospitalData=data.records;
      const cities=[...new Set(hospitalData.map(r=>r.city).filter(Boolean))].sort();
      $('hospitalCity').replaceChildren(new Option('도시를 선택하세요',''),...cities.map(c=>new Option(c,c)));
      const desired=(typeof getZip==='function'?String(getZip().name||''):'').toUpperCase();
      const matched=cities.find(c=>desired.includes(c));
      if(matched)$('hospitalCity').value=matched;
      status.textContent='총 '+hospitalData.length+'개 CMS 등록 병원 자료. 도시와 응급서비스 여부로 필터링합니다.';
      renderHospitals();
    }catch(e){status.textContent='병원 목록을 불러오지 못했습니다: '+e.message;}
  }
  function renderHospitals(){
    if(!hospitalData)return;
    const dest=$('hospitalCity').value,edOnly=$('hospitalEdOnly').checked,box=$('hospitalList');
    box.replaceChildren();
    if(!dest){place(box,'p','시설이 있는 도시를 선택하세요.');return;}
    const arr=hospitalData.filter(r=>r.city===dest&&(!edOnly||r.emergencyServices===true)).sort((a,b)=>a.name.localeCompare(b.name));
    place(box,'p',dest+' · '+arr.length+'개 CMS 등록 시설','extra-caption');
    if(!arr.length){place(box,'p','현재 CMS 자료에서 조건에 맞는 시설이 없습니다. 다른 응급시설이 없다는 의미는 아닙니다.');return;}
    for(const r of arr.slice(0,20)){
      const item=place(box,'div','','extra-hospital');
      place(item,'strong',r.name);
      place(item,'small',[r.address,r.city,r.state,r.zip].filter(Boolean).join(', '));
      place(item,'small','CMS 응급서비스: '+(r.emergencyServices===true?'Yes':r.emergencyServices===false?'No':'미확인'));
      const link=place(item,'a','Google Maps에서 위치·경로 확인');
      link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([r.name,r.address,r.city,r.state,r.zip].filter(Boolean).join(', '));
      link.target='_blank';link.rel='noopener noreferrer';
    }
    if(arr.length>20)place(box,'p','추가 '+(arr.length-20)+'개 시설이 있습니다. 검색 범위를 좁혀 주세요.','extra-disclosure');
  }
  health.addEventListener('toggle',()=>{if(health.open&&!hospitalData)loadHospitals();});
  $('hospitalCity').addEventListener('change',renderHospitals);
  $('hospitalEdOnly').addEventListener('change',renderHospitals);
  async function loadGrid(){
    const status=$('gridResilienceStatus');status.textContent='EIA 텍사스 통계를 불러오는 중…';
    try{
      const response=await fetch('./data/resilience/eia-texas-grid-reliability-2024-2025.json');
      if(!response.ok)throw Error('HTTP '+response.status);
      const obj=await response.json();
      if(obj.metadata?.geography!=='TX_STATE_ONLY'||!Array.isArray(obj.records))throw Error('자료 범위가 확인되지 않았습니다');
      gridData=obj.records;
      const box=$('gridResilienceData');box.replaceChildren();
      for(const r of gridData){
        const item=place(box,'div','','extra-hospital');
        place(item,'strong',r.year+'년 · 텍사스 전체 평균');
        place(item,'small','주요 사건 포함: 연간 평균 정전 '+r.allEvents.saidi+'분/고객 · '+r.allEvents.saifi+'회/고객');
        place(item,'small','주요 사건 제외: 연간 평균 정전 '+r.excludingMajorEvents.saidi+'분/고객 · '+r.excludingMajorEvents.saifi+'회/고객');
      }
      status.textContent='EIA SAIDI(평균 정전시간)와 SAIFI(평균 빈도) — 광역 참고용이며 특정 주소의 위험도와 다릅니다.';
    }catch(e){status.textContent='EIA 통계를 불러오지 못했습니다: '+e.message;}
  }
  grid.addEventListener('toggle',()=>{if(grid.open&&!gridData)loadGrid();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
