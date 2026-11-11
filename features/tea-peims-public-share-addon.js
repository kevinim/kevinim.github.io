'use strict';
/*
 * UAT-only add-on to the selected-school TEA detail panel.
 * Denominator = sum of status=published race-group counts, NOT whole-campus PEIMS enrollment
 * when any of the seven groups is masked or not listed.
 * Reuses previously validated/lazy-loaded public aggregates from the existing school insight
 * API; no new fetch, PII, address inference, or changes to GIS and core school components.
 */
(function(root){
  const GROUPS=Object.freeze([
    ['black','흑인','#6997d8'],['hispanic','히스패닉','#eab308'],
    ['white','백인','#a78bfa'],['native','아메리카 원주민','#14b8a6'],
    ['asian','아시아계','#22c55e'],['pacific','태평양 제도계','#e879f9'],
    ['multi','복수 인종','#f472b6']
  ]);
  function computePublishedShare(rows){
    if(!Array.isArray(rows)||rows.length!==GROUPS.length)return null;
    const groupKeys=new Set(GROUPS.map(x=>x[0]));
    const observed=new Set();let subtotal=0,published=0,suppressed=0,unlisted=0;
    const result=[];
    for(const item of rows){
      if(!item||typeof item!=='object'||typeof item.key!=='string'||!groupKeys.has(item.key)||observed.has(item.key))return null;
      observed.add(item.key);
      const src=GROUPS.find(x=>x[0]===item.key);
      const line={key:item.key,label:src[1],color:src[2],status:item.status,count:null,percent:null};
      if(item.status==='published'){
        if(!Number.isSafeInteger(item.count)||item.count<0||item.count>10000000)return null;
        subtotal+=item.count;
        if(!Number.isSafeInteger(subtotal))return null;
        published++;line.count=item.count;
      }else if(item.status==='suppressed'){
        if(item.count!==null&&item.count!==undefined)return null;
        suppressed++;
      }else if(item.status==='not-listed'){
        if(item.count!==null&&item.count!==undefined)return null;
        unlisted++;
      }else return null;
      result.push(line);
    }
    if(observed.size!==7)return null;
    const canChart=published>=2&&subtotal>0;
    if(canChart)for(const line of result){
      if(line.status==='published')line.percent=Math.round(1000*line.count/subtotal)/10;
    }
    return {rows:result,subtotal,published,suppressed,unlisted,canChart,
      hasHidden:!!(suppressed+unlisted),denominator:'published-only',wholeCampusPercentage:false};
  }
  function textNode(tag,cls,text){
    const el=document.createElement(tag);if(cls)el.className=cls;
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function buildView(id,stat){
    const region=textNode('section','tea-public-share-addon');
    region.dataset.campus=id;
    region.setAttribute('aria-label','2025–26 공개된 인원 기준 상대 비율');
    region.appendChild(textNode('h5','tea-public-share-title','공개된 인원 기준 비율 · 2025–26'));
    if(stat.canChart){
      const n=stat.subtotal.toLocaleString('en-US');
      region.appendChild(textNode('p','tea-public-share-summary','공개 집단 '+stat.published+'/7 · 공개 인원 합계 '+n+'명'));
      region.appendChild(textNode('p','tea-public-share-warning',
        '이 비율은 공개된 인원 중 비중입니다. 비공개·미표시 집단은 분모에서 제외되므로 학교 전체 인종 구성 비율과 다릅니다.'));
      const stack=textNode('div','tea-public-share-stack');
      stack.setAttribute('role','img');
      stack.setAttribute('aria-label','공개된 인원 기준 비율, 학교 전체 학생 비율 아님: '+stat.rows
        .filter(r=>r.percent!==null).map(r=>r.label+' '+r.percent.toFixed(1)+'%').join(', '));
      for(const row of stat.rows){
        if(row.percent===null||row.count===0)continue;
        const segment=textNode('span','tea-public-share-segment');
        segment.style.width=(100*row.count/stat.subtotal)+'%';
        segment.style.backgroundColor=row.color;
        segment.title=row.label+' · 공개 인원 중 '+row.percent.toFixed(1)+'%';
        stack.appendChild(segment);
      }
      region.appendChild(stack);
    }else{
      region.appendChild(textNode('p','tea-public-share-warning',
        '공개된 집단이 2개 미만이거나 공개 인원 합계가 0명이므로 비율 차트를 표시하지 않습니다.'));
    }
    const legend=textNode('ul','tea-public-share-legend');
    for(const row of stat.rows){
      const li=textNode('li','');
      const dot=textNode('span','tea-public-share-dot');dot.style.backgroundColor=row.color;dot.setAttribute('aria-hidden','true');
      li.appendChild(dot);
      li.appendChild(document.createTextNode(row.label+' · '+
        (row.percent!==null?'공개 인원 중 '+row.percent.toFixed(1)+'%':
          row.status==='suppressed'?'비공개 (비율 없음)':
          row.status==='not-listed'?'원본 미표시 (비율 없음)':'공개 '+row.count+'명 (비율 없음)')));
      legend.appendChild(li);
    }
    region.appendChild(legend);
    region.appendChild(textNode('p','tea-public-share-footnote',
      '비공개 인원을 0으로 보거나 역산하지 않습니다. 소수 첫째 자리 반올림으로 합계가 정확히 100.0%가 아닐 수 있습니다.'));
    return region;
  }
  function mount(){
    if(!root||typeof document==='undefined')return;
    const insights=root.CarrolltonSchoolInsights;
    if(!insights||typeof insights.getPublishedCountRows!=='function')return;
    const host=document.getElementById('detailContent');
    if(!host)return;
    for(const panel of host.querySelectorAll('.tea-insights-panel[data-campus]')){
      const id=panel.dataset.campus;
      if(!/^\d{9}$/.test(id)||panel.querySelector('.tea-public-share-addon'))continue;
      const peims=panel.querySelector('.tea-peims-counts');
      if(!peims)continue;
      const sourceRows=insights.getPublishedCountRows(id);
      const stats=computePublishedShare(sourceRows);
      if(!stats||!stats.hasHidden)continue; // Original seven-group and audited denominator behavior remains unchanged.
      if(typeof insights.auditedPeimsTotal==='function'&&insights.auditedPeimsTotal(id,sourceRows)!==null)continue;
      // Keep existing .tea-peims-counts li query contracts unchanged for #247/#249.\n      peims.insertAdjacentElement('afterend',buildView(id,stats));
    }
  }
  function boot(){
    const host=document.getElementById('detailContent');
    if(!host||typeof MutationObserver==='undefined')return;
    let queued=false;
    const obs=new MutationObserver(function(){
      if(queued)return;
      queued=true;
      Promise.resolve().then(function(){queued=false;mount();});
    });
    obs.observe(host,{childList:true,subtree:true});
    mount();
  }
  const api={computePublishedShare:computePublishedShare};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root&&typeof document!=='undefined'){
    root.TEAPeimsPublishedShare=api;
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
})(typeof window!=='undefined'?window:null);
