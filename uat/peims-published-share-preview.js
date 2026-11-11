'use strict';
/* UAT only: proportions among publicly reported PEIMS group counts.
 * Not a representation of the entire student body when any group is masked/omitted.
 * Reads public campus aggregates; no user addresses, identifiers or API keys.
 */
(function (root) {
  const GROUPS=[
    ['black','흑인','#6997d8'],
    ['hispanic','히스패닉','#eab308'],
    ['white','백인','#a78bfa'],
    ['native','아메리카 원주민','#14b8a6'],
    ['asian','아시아계','#22c55e'],
    ['pacific','태평양 제도계','#e879f9'],
    ['multi','복수 인종','#f472b6']
  ];
  function calculate(entry) {
    if(!entry || !entry.counts || typeof entry.counts!=='object')return null;
    const got=Object.keys(entry.counts);
    if(got.length!==7 || GROUPS.some(function(g){return !Object.hasOwn(entry.counts,g[0]);}))return null;
    let subtotal=0,published=0,suppressed=0,unlisted=0;
    const rows=[];
    for(const group of GROUPS){
      const cell=entry.counts[group[0]];
      if(!cell || typeof cell!=='object')return null;
      const row={key:group[0],label:group[1],color:group[2],status:cell.status,count:null,mask:null,percent:null};
      if(cell.status==='published'){
        if(!Number.isSafeInteger(cell.count)||cell.count<0||cell.count>10000000||cell.publishedMask!==undefined)return null;
        subtotal+=cell.count;
        if(!Number.isSafeInteger(subtotal))return null;
        row.count=cell.count;published++;
      }else if(cell.status==='suppressed'){
        if(cell.count!==undefined||typeof cell.publishedMask!=='string'||!/^(?:<\d+|-999|N\/A)$/.test(cell.publishedMask))return null;
        row.mask=cell.publishedMask;suppressed++;
      }else if(cell.status==='not-listed'){
        if(cell.count!==undefined||cell.publishedMask!==undefined)return null;
        unlisted++;
      }else return null;
      rows.push(row);
    }
    // A single published category should not be presented as "100% of students".
    const canShow=published>=2&&subtotal>0;
    if(canShow)for(const row of rows){
      if(row.status==='published')row.percent=Math.round(1000*row.count/subtotal)/10;
    }
    return {rows,subtotal,published,suppressed,unlisted,canShow,
      allSevenPublic:published===7,
      basis:'published-count-subtotal',
      schoolTotalKnown:false};
  }
  function element(tag,className,text) {
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=String(text);
    return node;
  }
  function outputReport(host,id,entry,source) {
    host.replaceChildren();
    const a=calculate(entry);
    if(!a){host.appendChild(element('p','warning','데이터 형식 검증 실패. 비율을 표시하지 않습니다.'));return;}
    host.appendChild(element('h2','',entry.name+' · '+id));
    host.appendChild(element('p','eyebrow','TEA PEIMS 2025–26 · 공개된 집단만 기준'));
    if(a.canShow){
      host.appendChild(element('p','summary','공개 인원 합계 '+a.subtotal.toLocaleString('en-US')+'명 · 공개 집단 '+a.published+'/7'));
      host.appendChild(element('p','warning','주의: 이 비율은 공개된 인원 중 비중입니다. 비공개/미표시 학생은 분모에서 제외되며, 학교 전체 인종 구성 비율과 다릅니다.'));
      const bar=element('div','stack');
      bar.setAttribute('role','img');
      bar.setAttribute('aria-label','공개된 집단의 구성만 표시, 전체 학생 구성 아님. '+a.rows.filter(r=>r.percent!==null).map(r=>r.label+' '+r.percent.toFixed(1)+'%').join(', '));
      for(const row of a.rows){
        if(row.percent===null||row.percent<=0)continue;
        const seg=element('span','segment');
        seg.style.width=(row.count*100/a.subtotal)+'%';
        seg.style.backgroundColor=row.color;
        seg.title=row.label+' · '+row.percent.toFixed(1)+'% (공개 인원 중)';
        bar.appendChild(seg);
      }
      host.appendChild(bar);
    }else{
      host.appendChild(element('p','warning','공개된 집단이 2개 미만이거나 공개 인원 합계가 0명입니다. 왜곡을 피하기 위해 비율 차트 없이 공개 인원만 표시합니다.'));
    }
    const list=element('ul','legend');
    for(const row of a.rows){
      const li=element('li','');
      const dot=element('span','dot');dot.style.backgroundColor=row.color;
      dot.setAttribute('aria-hidden','true');li.appendChild(dot);
      const description=row.status==='published'?
        row.label+' · '+row.count.toLocaleString('en-US')+'명'+(a.canShow?' · 공개 인원 중 '+row.percent.toFixed(1)+'%':''):
        row.status==='suppressed'?row.label+' · 비공개 ('+row.mask+')':row.label+' · 원본 미표시';
      li.appendChild(document.createTextNode(description));list.appendChild(li);
    }
    host.appendChild(list);
    host.appendChild(element('p','footnote','마스킹 인원은 0명이 아니며 역산하지 않습니다. 나열되지 않은 집단도 0명으로 간주하지 않습니다. 소수점 반올림으로 공개 비율의 합계가 정확히 100.0%가 아닐 수 있습니다.'));
    if(source && /^https:\/\/rptsvr1\.tea\.texas\.gov\/cgi\/sas\/broker\?/.test(source)){
      const official=element('a','','TEA 2025–26 원본 공개 집계 확인');
      official.href=source;official.target='_blank';official.rel='noopener noreferrer';
      host.appendChild(official);
    }
  }
  async function init(){
    const input=document.getElementById('campus'),options=document.getElementById('campus-options'),result=document.getElementById('result');
    if(!input||!options||!result)return;
    let file;
    try{
      const response=await fetch('../data/tea-ethnicity-2025-26-priority.json',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)throw Error('Source file '+response.status);
      file=await response.json();
      if(file.schemaVersion!==1||file.schoolYear!=='2025-26'||!file.campuses)throw Error('Wrong schema/year');
    }catch{
      result.replaceChildren(element('p','warning','동일 출처의 2025–26 PEIMS 집계 파일을 불러오지 못했습니다. 이 미리보기는 관련 데이터 PR과 함께 테스트해야 합니다.'));return;
    }
    const ids=Object.keys(file.campuses).sort();
    for(const id of ids){
      const entry=file.campuses[id];
      if(!calculate(entry))continue;
      const opt=element('option','');opt.value=entry.name+' ('+id+')';options.appendChild(opt);
    }
    const show=function(){
      const match=input.value.match(/(?:^|\()(\d{9})(?:\)|$)/);
      const id=match?match[1]:input.value.trim();
      const entry=file.campuses[id];
      if(!entry){result.replaceChildren(element('p','warning','학교 이름 자동완성에서 선택하거나 9자리 Campus ID를 입력하세요.'));return;}
      outputReport(result,id,entry,file.sources?.[entry.district]);
    };
    document.getElementById('view').addEventListener('click',show);
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();show();}});
    input.value='STEM ACADEMY AT HEBRON VALLEY EL (061902118)';
    show();
  }
  if(typeof module!=='undefined' && module.exports)module.exports={calculate,GROUPS};
  if(root && typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
  }
})(typeof window!=='undefined'?window:null);
