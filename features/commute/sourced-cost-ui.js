'use strict';
/* No addresses are sent to EPA/AAA. Maps only receives route coordinates after a
 * person clicks a link. NTTA/TEXpress tolls are NEVER guessed from OSRM mileage. */
(function(root){
 const core=root.CommuteEvidenceCore;
 if(!core)return;
 const $=id=>document.getElementById(id);
 const n=(tag,cls,text)=>{const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=text;
  return el;
 };
 let fuel=null,counties=null,vehicle=null,activeFuel=null,initialized=false;
 let sourceLoaded=false,yearLoaded=false,renderPending=false;
 const menuIds=['smartVehicleYear','smartVehicleMake','smartVehicleModel','smartVehicleOption'];
 function announce(message){
  const el=$('smartSourceStatus');if(el)el.textContent=message;
 }
 function addLink(host,text,url){
  const a=n('a','',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';host.append(a);return a;
 }
 function labelSelect(host,id,text,initial){
  const label=n('label','smart-cost-select-wrap');
  const title=n('span','',text),sel=n('select','smart-cost-select');
  sel.id=id;sel.setAttribute('aria-label',text);
  if(initial){
   const o=n('option','',initial);o.value='';sel.append(o);
  }
  label.append(title,sel);host.append(label);return sel;
 }
 function resetAfter(index){
  for(let i=index;i<menuIds.length;i++){
   const el=$(menuIds[i]);if(!el)continue;
   el.replaceChildren();
   const option=n('option','','먼저 이전 항목 선택');option.value='';el.append(option);
   el.disabled=true;
  }
  vehicle=null;
  if($('smartVehicleStatus'))$('smartVehicleStatus').textContent='차량 사양 확인 전 · 공인 연비 미선택';
 }
 async function getEpa(url){
  const response=await fetch(url,{
   method:'GET',mode:'cors',cache:'force-cache',headers:{Accept:'application/json'}
  });
  if(!response.ok)throw new Error('EPA HTTP '+response.status);
  const data=await response.json();
  if(!data||typeof data!=='object')throw new Error('EPA 데이터 형식 확인 불가');
  return data;
 }
 async function loadMenu(kind,index,params){
  const select=$(menuIds[index]);
  if(!select)return;
  select.disabled=true;
  select.replaceChildren();
  let temp=n('option','','EPA 자료 확인 중…');temp.value='';select.append(temp);
  try{
   const data=await getEpa(core.apiMenuUrl(kind,params));
   const choices=core.normalizeMenu(data);
   if(!choices.length)throw new Error('EPA 선택 항목 없음');
   select.replaceChildren();
   temp=n('option','','선택하세요');temp.value='';select.append(temp);
   for(const item of choices){
    const o=n('option','',item.text);o.value=item.value;select.append(o);
   }
   select.disabled=false;
   announce('미국 FuelEconomy.gov 공인 차량 목록을 불러왔습니다.');
  }catch(error){
   select.replaceChildren();
   const fail=n('option','','공식 자료 연결 불가');fail.value='';select.append(fail);
   announce('EPA 차량 목록을 이 브라우저에서 자동 조회하지 못했습니다. 공식 차량 검색 링크 또는 아래 고급 MPG 입력을 이용할 수 있습니다.');
   console.warn('Official EPA vehicle menu unavailable:',String(error));
  }
 }
 async function chooseVehicle(){
  const id=$('smartVehicleOption')?.value;
  vehicle=null;
  if(!id)return;
  $('smartVehicleStatus').textContent='EPA 차량 연비를 확인 중…';
  try{
   const data=await getEpa(core.vehicleUrl(id));
   const record=core.vehicleInfo(data);
   if(record.status!=='available')throw new Error(record.reason||'MPG unavailable');
   vehicle=record;
   $('smartVehicleStatus').textContent='EPA 복합연비 '+record.mpg+' MPG · 연료 '+record.fuelType+' · 실제 정체·주행조건에 따라 달라집니다.';
   $('tollMpg').value=String(record.mpg);
   if(record.grade&&$('smartFuelGrade')){
    $('smartFuelGrade').value=record.grade;
    $('smartFuelGrade').dispatchEvent(new Event('change',{bubbles:true}));
   }
   scheduleRender();
  }catch(error){
   $('smartVehicleStatus').textContent='해당 차량의 공인 MPG를 확인할 수 없습니다. 전기차·플러그인 하이브리드는 별도의 비용 모델이 필요합니다.';
   console.warn('Official EPA model MPG unavailable:',String(error));
   scheduleRender();
  }
 }
 function effectiveZip(){
  try{
   const address=typeof home!=='undefined'&&home?.address?String(home.address):'';
   const matches=[...address.matchAll(/\b\d{5}(?:-\d{4})?\b/g)];
   const candidate=matches.at(-1)?.[0]?.slice(0,5);
   if(candidate&&counties?.zipCounty?.[candidate])return {zip:candidate,origin:'검색된 주택 주소'};
  }catch(e){}
  return {zip:String($('zipSelect')?.value||''),origin:'선택 ZIP 대표점'};
 }
 function rawMiles(){
  const from=$('tollOutMiles'),to=$('tollBackMiles');
  const a=Number(from?.value),b=Number(to?.value);
  if(!from?.value||!to?.value||!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0)return null;
  return {outboundMiles:a,returnMiles:b};
 }
 function routePoints(){
  let origin=null;
  try{
   if(typeof home!=='undefined'&&home?.ll?.length===2)origin=home.ll;
   else if(typeof getZip==='function')origin=getZip()?.ll;
  }catch(e){}
  let destination=null;
  try{if(typeof state!=='undefined'&&state?.dest?.ll?.length===2)destination=state.dest.ll;}catch(e){}
  if(!destination){
   const typed=$('destination')?.value?.trim();
   if(typed)destination=typed;
  }
  return {origin,destination};
 }
 function sourceStatus(){
  if(!fuel||!counties)return;
  const zipData=effectiveZip(),grade=$('smartFuelGrade')?.value||'regular';
  const price=core.getLocalFuel({snapshot:fuel,counties,zip:zipData.zip,grade});
  activeFuel=price;
  const text=$('smartGasStatus');
  if(!text)return;
  if(price.price===null){
   text.textContent=zipData.origin+' '+zipData.zip+' · 해당 지역 AAA 권역 평균이 없거나 저장본이 오래됐습니다. 임의 $/gal을 사용하지 않습니다.';
   $('tollFuel').value='';
   return;
  }
  const age=Math.ceil(core.dateAgeDays(price.priceDate));
  text.textContent=zipData.origin+' '+zipData.zip+' → AAA '+price.metro+' 평균 · '+price.priceDate+
   ' 기준 '+price.grade+' $'+price.price.toFixed(4)+'/gal'+(age>7?' (7일 이상 지난 자료)':'')+
   ' · 개별 주유소 가격 아님';
  $('tollFuel').value=String(price.price);
 }
 function mount(){
  const toll=$('tollCostPanel'),body=toll?.querySelector(':scope > .extra-body');
  if(!toll||!body||$('smartCommutePanel'))return;
  const existingSummary=toll.querySelector(':scope > summary small');
  if(existingSummary)existingSummary.textContent='차량 공인연비 · 지역 평균 유가 · 유료/무료 경로 비교';
  const content=n('div','smart-commute-panel');content.id='smartCommutePanel';
  content.append(n('p','smart-cost-lead',
    '자동 입력: AAA 권역별 유가, 차량별 EPA 공인 연비. NTTA 일반도로와 TEXpress 변동요금은 통과 구간을 확인하지 못하면 합계를 표시하지 않습니다.'));
  const info=n('p','smart-cost-source','');info.id='smartSourceStatus';
  info.setAttribute('role','status');info.setAttribute('aria-live','polite');content.append(info);
  const form=n('div','smart-cost-controls');
  const vehicleGroup=n('fieldset','smart-cost-vehicle');
  const legend=n('legend','','차량 선택 · EPA 공인 연비');vehicleGroup.append(legend);
  const selectors=n('div','smart-cost-vehicle-grid');
  labelSelect(selectors,'smartVehicleYear','연식','연식 선택');
  labelSelect(selectors,'smartVehicleMake','제조사','연식 먼저 선택');
  labelSelect(selectors,'smartVehicleModel','모델','제조사 먼저 선택');
  labelSelect(selectors,'smartVehicleOption','엔진 / 트림','모델 먼저 선택');
  vehicleGroup.append(selectors);
  const vStatus=n('p','extra-disclosure','차량을 선택하면 공식 복합연비를 자동 적용합니다.');
  vStatus.id='smartVehicleStatus';vStatus.setAttribute('role','status');vehicleGroup.append(vStatus);
  const vLinks=n('p','smart-cost-official-links');
  addLink(vLinks,'EPA 차량 검색 ↗','https://www.fueleconomy.gov/feg/findacar.shtml');
  vehicleGroup.append(vLinks);form.append(vehicleGroup);
  const gas=n('div','smart-cost-gas');
  const grade=labelSelect(gas,'smartFuelGrade','연료 종류');
  for(const [value,label] of [['regular','Regular'],['midgrade','Mid-Grade'],['premium','Premium'],['diesel','Diesel']]){
   const o=n('option','',label);o.value=value;grade.append(o);
  }
  const gasStatus=n('p','extra-disclosure','AAA 지역 평균을 불러오는 중…');
  gasStatus.id='smartGasStatus';gasStatus.setAttribute('role','status');gas.append(gasStatus);
  const linkRow=n('p','smart-cost-official-links');
  addLink(linkRow,'AAA 텍사스 지역 유가 ↗','https://gasprices.aaa.com/?state=TX');gas.append(linkRow);
  form.append(gas);content.append(form);
  const policy=n('p','smart-cost-policy',
   'TollTag/ZipCash는 거주 동네가 아니라 통행 지점·결제 유형에 따라 요금이 달라집니다. TEXpress는 운영사 혼잡도 요금이며 NTTA 일반도로 요율을 적용할 수 없습니다.');
  content.append(policy);
  const details=n('div','smart-cost-route-grid');
  const fast=n('article','smart-cost-route');fast.id='smartRouteAllowed';
  fast.append(n('h4','','① 톨 허용 경로 · 도로망 기준'));
  const fastResult=n('div','smart-route-result','기존 지도에서 출퇴근 경로를 먼저 계산하세요.');
  fastResult.id='smartFastResult';fast.append(fastResult);
  const allowed=n('a','smart-cost-route-link','톨 허용 경로 확인 ↗');
  allowed.id='smartFastLink';allowed.target='_blank';allowed.rel='noopener noreferrer';fast.append(allowed);
  details.append(fast);
  const cheap=n('article','smart-cost-route');cheap.id='smartRouteAvoid';
  cheap.append(n('h4','','② 통행료 회피 선호 경로'));
  const cheapResult=n('div','smart-route-result',
    '별도 우회 경로의 거리·시간·통행료 자동 계산은 아직 미연결입니다. $0로 단정하지 않습니다.');
  cheapResult.id='smartAvoidResult';cheap.append(cheapResult);
  const avoided=n('a','smart-cost-route-link','Google 지도에서 유료도로 회피 ↗');
  avoided.id='smartAvoidLink';avoided.target='_blank';avoided.rel='noopener noreferrer';cheap.append(avoided);
  details.append(cheap);content.append(details);
  const sourceLinks=n('p','smart-cost-official-links');
  addLink(sourceLinks,'NTTA 주소별 공식 Toll Calculator ↗','https://maps.ntta.org/tollcalculator/');
  addLink(sourceLinks,'TEXpress TxDOT 변동요금 안내 ↗',
   'https://www.txdot.gov/discover/toll-roads-managed-lanes/txdot-toll-roads/txdot-texpress-lanes-toll-rates.html');
  content.append(sourceLinks);
  content.append(n('p','extra-disclosure',
    '출근과 퇴근은 시간대에 따라 다른 도로를 추천받을 수 있습니다. 현재 OSRM 값은 교통량·톨요금을 반영하지 않습니다. Google 지도 링크는 선택해 열었을 때만 경로 정보가 외부로 전달됩니다. API 연동 전에는 월 총비용을 숫자로 확정하지 않습니다.'));
  const advanced=n('details','smart-cost-advanced');
  advanced.id='smartLegacyAdvanced';
  const advTitle=n('summary','','기존 수동 견적 계산 · 고급 설정');
  advanced.append(advTitle,body);
  toll.insertBefore(content,advanced);
  toll.append(advanced);
  // Do not enable expensive cross-origin requests for users who never open costs.
  toll.addEventListener('toggle',()=>{
   if(!toll.open||initialized)return;
   initialized=true;loadData();loadMenu('year',0,{});
  });
  $('smartVehicleYear').addEventListener('change',event=>{
   resetAfter(1);if(event.target.value)loadMenu('make',1,{year:event.target.value});scheduleRender();
  });
  $('smartVehicleMake').addEventListener('change',event=>{
   resetAfter(2);
   if(event.target.value)loadMenu('model',2,{year:$('smartVehicleYear').value,make:event.target.value});
   scheduleRender();
  });
  $('smartVehicleModel').addEventListener('change',event=>{
   resetAfter(3);
   if(event.target.value)loadMenu('options',3,{
    year:$('smartVehicleYear').value,make:$('smartVehicleMake').value,model:event.target.value});
   scheduleRender();
  });
  $('smartVehicleOption').addEventListener('change',chooseVehicle);
  $('smartFuelGrade').addEventListener('change',()=>{sourceStatus();scheduleRender()});
  for(const id of ['tollDays','tollOutMiles','tollBackMiles','destination','zipSelect']){
   $(id)?.addEventListener('change',scheduleRender);
  }
  $('destination')?.addEventListener('input',scheduleRender);
  const mark=$('tollDistanceStatus');
  if(mark)new MutationObserver(scheduleRender).observe(mark,{childList:true,subtree:true});
  for(const id of ['k-zip','routeStatus']){
   const el=$(id);
   if(el)new MutationObserver(scheduleRender).observe(el,{childList:true,characterData:true,subtree:true});
  }
 }
 function scheduleRender(){
  if(renderPending)return;
  renderPending=true;window.setTimeout(()=>{renderPending=false;render()},75);
 }
 async function loadData(){
  try{
   const responses=await Promise.all([
    fetch('./county-scopes.json',{cache:'force-cache'}),
    fetch('./data/aaa-dfw-fuel-prices.json',{cache:'no-store'})
   ]);
   if(responses.some(x=>!x.ok))throw new Error('Source HTTP status');
   const [c,f]=await Promise.all(responses.map(x=>x.json()));
   if(!c.zipCounty||!c.counties||!f.metadata||!f.metro)throw new Error('Malformed source');
   counties=c;fuel=f;
   announce('AAA '+f.metadata.priceDate+' 기준 권역 평균과 EPA 차량 검색을 이용합니다.');
  }catch(error){
   announce('AAA 공식 평균 유가 저장본을 확인할 수 없습니다. 예시 유가를 자동 계산에 사용하지 않습니다.');
   console.warn('AAA source unavailable:',String(error));
  }
  sourceStatus();render();
 }
 function render(){
  if(!$('smartCommutePanel'))return;
  sourceStatus();
  const zip=effectiveZip().zip,days=Number($('tollDays')?.value);
  const mpg=vehicle?.mpg,price=activeFuel?.price;
  const miles=rawMiles();
  let minutes=null;
  try{
   if(typeof state!=='undefined'&&Number.isFinite(state.times?.[zip]))minutes=state.times[zip];
  }catch(e){}
  const fuelCost=core.estimateKnownFuel({...miles,mpg,gasPrice:price,days,
   oneWayMinutes:minutes});
  const summary=core.renderScenarios({fuel:fuelCost});
  const value=summary.fast.fuelUsd;
  let message='유류비: '+(value===null?'차량/연비/거리 확인 필요':
     '$'+value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'/월');
  message+=' · 톨요금 미확인 · 월 전체비용 미산정';
  if(summary.fast.minutes!==null)message+=' · ZIP 대표점 편도 '+summary.fast.minutes+'분(OSRM·교통량 미반영)';
  $('smartFastResult').textContent=message;
  $('smartAvoidResult').textContent='유료도로를 피하도록 요청하는 별도 경로입니다. 우회 거리·실제 출퇴근 시간·통행료와 월 총비용은 아직 공식 API 미연결로 산정하지 않습니다.';
  const {origin,destination}=routePoints();
  for(const [id,avoid] of [['smartFastLink',false],['smartAvoidLink',true]]){
   const a=$(id),href=core.directionsLink(origin,destination,{avoidTolls:avoid});
   if(href){a.href=href;a.removeAttribute('aria-disabled');}
   else{a.removeAttribute('href');a.setAttribute('aria-disabled','true');}
  }
 }
 function init(){mount()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:globalThis);
