'use strict';
// Exercise the actual public crime map/ZIP renderer with synthetic malicious
// metadata. No external fetch, real address, map service, or deployment.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../crime-city-map.js'),'utf8');
const PROBE='<img src=x onerror="window.__mapXssProbe=1">';
const YEAR='2025'+PROBE;
function dataset(){
  const props={
    ori:'TEST',city:'City '+PROBE,agency:'Agency '+PROBE,
    years:{[YEAR]:{violentRate:123,violent:33,violentMonths:12,
      propertyRate:456,property:60,propertyMonths:12,population:12000}}
  };
  return {
    type:'FeatureCollection',
    metadata:{source:'FBI Crime Data Explorer synthetic fixture',years:[YEAR],
      reference:{[YEAR]:{violent:{texas:150},property:{texas:300}}}},
    features:Array.from({length:100},()=>({type:'Feature',geometry:{type:'Point',coordinates:[-96.8,33.1]},properties:props})),
    zips:{'75024':{cities:[{ori:'TEST',share:1}],outsideCityShare:0}},
    cities:{TEST:{city:'City '+PROBE,years:props.years}}
  };
}
function element(){
 return {style:{},dataset:{},setAttribute(){},addEventListener(){},
  replaceChildren(){},appendChild(){},dispatchEvent(){},textContent:'',hidden:false};
}
function loadRenderer(script=source){
 const featureLayers=[];
 const L={
   geoJSON(geo,opts){
     for(const feature of geo.features){
       const layer={
         feature,on(type,fn){if(type==='click')this.trigger=fn;return this;},
         bindPopup(html){this.html=html;return this;},
         openPopup(){return this;},
         getPopup(){return this.html||null;},
         setPopupContent(html){this.html=html;return this;}
       };
       opts.onEachFeature(feature,layer);
       featureLayers.push(layer);
     }
     return {setStyle(){},eachLayer(fn){featureLayers.forEach(fn);},addTo(){return this;}};
   }
 };
 const controls={crimeMapToggle:element(),crimeLegend:element(),crimeStatus:element()};
 const doc={
   getElementById(id){return controls[id]||null;},
   createElement(){return element();},createTextNode(t){return {textContent:t};},
   addEventListener(){}
 };
 const map={
   pane:null,getPane(){return this.pane;},
   createPane(){this.pane={style:{}};},
   hasLayer(){return false;},removeLayer(){}
 };
 const data=dataset();
 const context={
   L,document:doc,module:{exports:{}},
   fetch:async()=>({ok:true,json:async()=>data}),
   console:{error(){}}
 };
 vm.runInNewContext(script+'\n;globalThis.__crimeMap=createCrimeCityMap;',context,{timeout:1000});
 return {renderer:context.__crimeMap,api:context.module.exports,doc,map,data,featureLayers};
}
function assertEscaped(markup) {
 assert.ok(markup.includes('&lt;img'), 'malicious-looking metadata must be escaped as text');
 assert.doesNotMatch(markup,/<img\b|<svg\b|<script\b|<iframe\b/i);
 assert.ok(!markup.includes(PROBE),'no raw HTML-looking metadata may remain');
}
test('untrusted city and year metadata cannot create HTML in the actual crime popup', async()=>{
 const m=loadRenderer(),controller=m.renderer(m.map,m.doc);
 assert.ok(controller);
 await controller.setOn(true);
 assert.equal(controller.getLoadedFeatureCount(),100);
 const layer=m.featureLayers[0];
 layer.trigger();
 assertEscaped(layer.html);
 assert.ok(layer.html.includes('Agency &lt;img'));
});
test('untrusted crime-year data is escaped in ZIP detail HTML',()=>{
 const m=loadRenderer();
 const html=m.api.crimeZipHtml('75024',m.data);
 assertEscaped(html);
 assert.ok(html.includes('City &lt;img'));
});
test('adversarial test detects a raw year interpolation regression',async()=>{
 const vulnerable=source.replace("esc(c.label)+' '+esc(y)+': '","esc(c.label)+' '+y+': '");
 assert.notEqual(vulnerable,source,'test must target the known interpolated-year boundary');
 const m=loadRenderer(vulnerable);
 await m.renderer(m.map,m.doc).setOn(true);
 m.featureLayers[0].trigger();
 assert.ok(m.featureLayers[0].html.includes(PROBE),'regression fixture must expose the injection');
});
