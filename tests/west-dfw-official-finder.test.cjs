'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const finder=require('../features/west-dfw/official-finder.js');
const config=require('../district-registry.js');
const FIELDS={
 '220919':['apps.myplanware.com','schoolsearch/carroll','address-search'],
 '220907':['www.kellerisd.net','schoollocator','address-search'],
 '061911':['apps.myplanware.com','schoolsearch/northwest','address-search'],
 '220906':['www.gcisd.net','attendance-area-maps','official-map']
};
test('only four official western LEAs have configured direct search/map destinations',()=>{
 assert.deepEqual(new Set(finder.CODES),new Set(Object.keys(FIELDS)));
 for(const [code,[host,path,kind]] of Object.entries(FIELDS)){
  const x=finder.lookup(code);
  assert.ok(x,'missing '+code);
  assert.equal(x.kind,kind);
  assert.equal(new URL(x.url).hostname,host);
  assert.ok(new URL(x.url).pathname.includes(path));
  assert.equal(finder.isSafe(x),true);
  assert.equal(config.DISTRICT_REGISTRY[code].zoneKey,null);
  assert.equal(config.DISTRICT_REGISTRY[code].address,null);
 }
});
test('Northwest and Carroll links are address searches from the official district guidance',()=>{
 assert.equal(finder.lookup('220919').url,'https://apps.myplanware.com/schoolsearch/carroll');
 assert.equal(finder.lookup('061911').url,'https://apps.myplanware.com/schoolsearch/northwest');
 assert.match(finder.lookup('061911').guidance,/2026–27/);
 assert.match(finder.lookup('220919').guidance,/Southlake/);
});
test('GCISD printable boundary maps are not misrepresented as automatic address search',()=>{
 const x=finder.lookup('220906');
 assert.equal(x.kind,'official-map');
 assert.match(x.guidance,/주소별 검색 기능은 확인되지 않았으므로/);
});
test('No house address, location or campus identifiers are transmitted in URL',()=>{
 for(const code of finder.CODES){
  const x=finder.lookup(code),u=new URL(x.url);
  assert.equal(u.search,'');
  assert.equal(u.hash,'');
  assert.equal(u.username,'');
  assert.equal(u.password,'');
  assert.ok(!x.url.includes('{'));
  assert.ok(!x.url.includes('query='));
 }
});
test('unrecognized LEA IDs fall back without guessing a Southlake city-to-ISD assignment',()=>{
 assert.equal(finder.lookup('CFB'),null);
 assert.equal(finder.lookup('Southlake'),null);
 assert.equal(finder.lookup(''),null);
 assert.equal(finder.lookup('__proto__'),null);
 assert.equal(finder.lookup(null),null);
});
test('URL substitution and off-domain redirects are not treated as official sources',()=>{
 for(const value of [
  {...finder.lookup('220919'),url:'http://apps.myplanware.com/schoolsearch/carroll'},
  {...finder.lookup('220919'),url:'https://apps.myplanware.com.evil.test/schoolsearch/carroll'},
  {...finder.lookup('220919'),url:'https://x@apps.myplanware.com/schoolsearch/carroll'},
  {...finder.lookup('220907'),url:'javascript:alert(1)'},
  {...finder.lookup('061911'),url:'https://apps.myplanware.com/schoolsearch/northwest?address=private'},
 ]){
  assert.equal(finder.isSafe(value),false);
 }
});
test('school note creates an external safe link, not automatic household assignment',()=>{
 // Minimal no-DOM dependency test double for createAnchor and append content.
 function node(tag){
  return {tag,children:[],attrs:{},className:'',dataset:{},
   appendChild(el){this.children.push(el)},
   querySelector(sel){return this.children.find(x=>x.className.includes('west-dfw-direct-lookup'))||null;}
  };
 }
 const doc={createElement:node};
 const box=node('section');
 assert.equal(finder.addToMissingBoundaryNote(doc,box,'220919'),true);
 assert.equal(box.children.length,2);
 assert.match(box.children[0].textContent,/거주지 주소/);
 assert.equal(box.children[1].href,finder.lookup('220919').url);
 assert.equal(box.children[1].target,'_blank');
 assert.match(box.children[1].rel,/noopener noreferrer/);
 assert.equal(finder.addToMissingBoundaryNote(doc,box,'220919'),false);
 assert.equal(box.children.length,2);
});
