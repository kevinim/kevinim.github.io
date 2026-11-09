'use strict';
// Outbound links generated from district / rating / GIS records.
// These are exact hostname grants, never suffix matches or a generic HTTPS grant.
// Not a URL shortener / redirect destination verifier.
(function(root) {
 const APPROVED_HOSTS=Object.freeze([
  'www.friscoisd.org','sf1.friscoisd.org','www.prosper-isd.net',
  'www.allenisd.org','www.lisd.net','www.pisd.edu',
  'www.cfbisd.edu','earlycollege.cfbisd.edu','www.mckinneyisd.net',
  'portal.metrostudygis.com','txschools.gov','tea.texas.gov',
  'experience.arcgis.com','app.guidek12.com',
  'apps.myplanware.com','www.kellerisd.net','www.nisdtx.org',
  'www.gcisd.net','www.southlakecarroll.edu','www.westlakeacademy.org',
  "enrollment.fwisd.org","www.aisd.net","www.mansfieldisd.org","www.gpisd.org","www.emsisd.com","www.birdvilleschools.net","www.crowleyisdtx.org","www.burlesonisd.net",
  "www.wylieisd.net","www.melissaisd.org","www.celinaisd.com","www.littleelmisd.net","www.dentonisd.org","www.coppellisd.com","web.risd.org","www.princetonisd.net","www.annaisd.org","www.argyleisd.com","www.garlandisd.net","www.hebisd.edu","www.rockwallisd.com","mesquiteisd.org","www.irvingisd.net","www.forneyisd.net","www.dallasisd.org","www.communityisd.org","www.wisd.org","www.duncanvilleisd.org","www.midlothianisd.org","www.c-isd.com","www.aledoisd.org","www.weatherfordisd.com","www.azleisd.net","enroll.chisd.net","www.desotoisd.org","www.lancasterisd.org","www.redoakisd.org","www.crandall-isd.net"
 ]);
 const hosts=new Set(APPROVED_HOSTS);
 function official(raw) {
  if(typeof raw!=='string'||!raw||raw.length>2048||!/^https:\/\//.test(raw))return null;
  // URL() normalizes some malicious whitespace and backslashes; reject before parsing.
  if(/[\u0000-\u0020\u007f\\]/.test(raw)||/%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(raw))return null;
  // Explicit ports, even :443, are not required by any approved district link.
  const authority=raw.slice(8).split(/[/?#]/)[0];
  if(authority.includes(':'))return null;
  try{
   const url=new URL(raw);
   if(url.protocol!=='https:'||url.username||url.password||url.port||!hosts.has(url.hostname))return null;
   return url.href;
  }catch{return null}
 }
 function withFallback(raw,fallback) {return official(raw)||official(fallback)}
 function setOfficialAnchor(anchor,raw) {
  const url=official(raw);
  if(!anchor||typeof anchor.setAttribute!=='function')return false;
  if(!url){
   anchor.removeAttribute('href');
   anchor.removeAttribute('target');
   anchor.setAttribute('aria-disabled','true');
   return false;
  }
  anchor.setAttribute('href',url);
  anchor.setAttribute('target','_blank');
  anchor.setAttribute('rel','noopener noreferrer');
  anchor.removeAttribute('aria-disabled');
  return true;
 }
 const api=Object.freeze({APPROVED_HOSTS,official,withFallback,setOfficialAnchor});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.TrustedLinkPolicy=api;
})(typeof window!=='undefined'?window:null);
