'use strict';
// Esri Suggest is a convenience, NOT a school assignment or precise rooftop geocode.
// Rectangle is a bias; explicit TX-state filtering is mandatory because bounding boxes
// can include Oklahoma, Arkansas, Louisiana, Mexico or New Mexico.
const TEXAS_SUGGEST_ENDPOINT='https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest';
const TEXAS_SUGGEST_EXTENT='-106.65,25.8,-93.5,36.5';
const TEXAS_SUGGEST_LOCATION='-96.8,33.1';
function buildTexasSuggestUrl(query) {
 const value=String(query||'').trim();
 if(value.length<4||value.length>250)throw Error('Address prefix should be 4–250 characters');
 const params=new URLSearchParams({
  text:value,f:'json',countryCode:'USA',sourceCountry:'USA',
  searchExtent:TEXAS_SUGGEST_EXTENT,location:TEXAS_SUGGEST_LOCATION,
  maxSuggestions:'15',returnCollections:'false'
 });
 return TEXAS_SUGGEST_ENDPOINT+'?'+params.toString();
}
function isTexasStreetSuggestion(s) {
 const txt=String(s?.text||'');
 return !s?.isCollection&&typeof s?.magicKey==='string'&&s.magicKey.length>0
  &&/^\s*\d+[a-z]?\s+\S/i.test(txt)
  &&/,\s*(?:TX|Texas)\s*,\s*\d{5}(?:-\d{4})?\s*(?:,\s*USA)?\s*$/i.test(txt);
}
function filterTexasStreetSuggestions(raw,max=5) {
 if(!Array.isArray(raw))return [];
 const seen=new Set();
 return raw.filter(s=>{
  if(!isTexasStreetSuggestion(s))return false;
  const key=s.text.toLowerCase().replace(/\s+/g,' ').trim();
  if(seen.has(key))return false;
  seen.add(key);
  return true;
 }).slice(0,max).map(s=>({text:s.text,magicKey:s.magicKey}));
}
// The address field is the only element controlling the ARIA listbox.
// The user's typed prefix is transmitted to Esri only after a 320ms debounce.
function attachTexasAddressSuggestions(input,list,onSelect) {
 let timer=null,controller=null,sequence=0,items=[],active=-1,selected=null;
 const clearItems=()=>{
  items=[];active=-1;list.replaceChildren();list.hidden=true;
  input.setAttribute('aria-expanded','false');
  input.removeAttribute('aria-activedescendant');
 };
 const stop=()=>{
  sequence++;if(timer!==null)clearTimeout(timer);timer=null;
  controller?.abort();controller=null;
 };
 const dismiss=()=>{stop();clearItems()};
 const syncActive=()=>{
  for(let i=0;i<list.children.length;i++){
   const selectedOption=i===active;
   list.children[i].classList.toggle('active',selectedOption);
   list.children[i].setAttribute('aria-selected',String(selectedOption));
  }
  if(active>=0)input.setAttribute('aria-activedescendant','homeSuggestion-'+active);
  else input.removeAttribute('aria-activedescendant');
 };
 const choose=i=>{
  const item=items[i];if(!item)return;
  stop();selected={text:item.text,magicKey:item.magicKey};
  input.value=item.text;clearItems();
  onSelect({...selected});
 };
 const show=matches=>{
  items=matches;active=-1;list.replaceChildren();
  for(let i=0;i<items.length;i++){
   const item=items[i],button=document.createElement('button');
   button.id='homeSuggestion-'+i;button.type='button';button.className='home-suggestion-item';
   button.setAttribute('role','option');button.setAttribute('aria-selected','false');
   button.textContent=item.text;button.addEventListener('pointerdown',e=>e.preventDefault());
   button.addEventListener('click',()=>choose(i));list.appendChild(button);
  }
  list.hidden=items.length===0;input.setAttribute('aria-expanded',String(items.length>0));
 };
 const onInput=()=>{
  selected=null;stop();clearItems();
  const value=input.value.trim();
  if(value.length<4||!/[0-9]/.test(value))return;
  const current=sequence;
  timer=setTimeout(async()=>{
   timer=null;const ctrl=new AbortController();controller=ctrl;
   try{
    const r=await fetch(buildTexasSuggestUrl(value),{signal:ctrl.signal,cache:'no-store'});
    if(!r.ok)throw Error('Esri Suggest HTTP '+r.status);
    const result=await r.json();
    if(result.error)throw Error('Esri Suggest error');
    if(current!==sequence||input.value.trim()!==value||document.activeElement!==input)return;
    show(filterTexasStreetSuggestions(result.suggestions));
   }catch(err){
    if(err.name!=='AbortError'&&current===sequence)clearItems();
   }finally{if(controller===ctrl)controller=null}
  },320);
 };
 const onKey=e=>{
  if(e.key==='Escape'){if(!list.hidden){e.preventDefault();dismiss()}return}
  if(e.key==='Tab'){dismiss();return}
  if(list.hidden||!items.length)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();
   active=e.key==='ArrowDown'?(active+1)%items.length:(active<0?items.length-1:(active+items.length-1)%items.length);
   syncActive();
  }else if(e.key==='Enter'&&active>=0){e.preventDefault();choose(active)}
 };
 const onOutside=e=>{if(!list.contains(e.target)&&e.target!==input)dismiss()};
 input.addEventListener('input',onInput);
 input.addEventListener('keydown',onKey);
 document.addEventListener('pointerdown',onOutside);
 return {dismiss,dispose(){dismiss();input.removeEventListener('input',onInput);input.removeEventListener('keydown',onKey);document.removeEventListener('pointerdown',onOutside)}};
}
if(typeof module!=='undefined')module.exports={buildTexasSuggestUrl,isTexasStreetSuggestion,filterTexasStreetSuggestions,TEXAS_SUGGEST_EXTENT};
