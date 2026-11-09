'use strict';
// Lightweight, accessible light/dark preference. Runs in <head> to avoid bright flashes.
// No cookies, network requests or private location data.
(function(){
 const KEY='tx-dashboard-theme-v1';
 const root=document.documentElement;
 const valid=value=>value==='dark'?'dark':'light';
 function saved(){
  try{return valid(window.localStorage.getItem(KEY))}catch{return 'light'}
 }
 function apply(mode){
  const next=valid(mode);
  root.dataset.theme=next;
  root.style.colorScheme=next;
  const btn=document.getElementById('dashboardThemeToggle');
  if(btn){
   btn.setAttribute('aria-pressed',String(next==='dark'));
   btn.setAttribute('aria-label',next==='dark'?'일반 모드로 전환':'다크 모드로 전환');
   btn.querySelector('.theme-toggle-icon').textContent=next==='dark'?'☀':'☾';
   btn.querySelector('.theme-toggle-label').textContent=next==='dark'?'일반 모드':'다크 모드';
  }
 }
 apply(saved());
 function mount(){
  const host=document.querySelector('.top-in');
  if(!host||document.getElementById('dashboardThemeToggle'))return;
  const btn=document.createElement('button');
  btn.id='dashboardThemeToggle';btn.className='dashboard-theme-toggle';btn.type='button';
  btn.setAttribute('aria-pressed','false');
  const icon=document.createElement('span');icon.className='theme-toggle-icon';icon.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='theme-toggle-label';
  btn.append(icon,label);
  btn.addEventListener('click',()=>{
   const next=root.dataset.theme==='dark'?'light':'dark';
   apply(next);
   try{window.localStorage.setItem(KEY,next)}catch{/* Private mode: current tab still works. */}
  });
  host.append(btn);
  apply(root.dataset.theme);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.addEventListener('storage',event=>{
  if(event.key===KEY)apply(valid(event.newValue));
 });
})();
