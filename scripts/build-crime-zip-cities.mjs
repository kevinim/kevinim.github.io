#!/usr/bin/env node
// For each dashboard ZIP, which city police jurisdictions it overlaps and by
// what share of its area (grid sampling inside the ZIP polygon). Crime counts
// stay at city level: a ZIP shows the trends of the cities it lies in, it is
// never assigned a share of a city's crimes.
// Input:  data/dfw-crime-city-2023-2025.geojson, dfw-zcta-boundaries.geojson,
//         dfw-outside-public.json (outside-area ZIP shapes)
// Output: data/dfw-crime-zip-cities-2023-2025.json
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const crime=read('data/dfw-crime-city-2023-2025.geojson');
const zips=[...read('dfw-zcta-boundaries.geojson').features,...read('dfw-outside-public.json').shapes.features];

const polys=g=>g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
function ringHas(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if(((yi>p[1])!==(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi))inside=!inside}return inside}
const contains=(g,p)=>polys(g).some(poly=>poly.length&&ringHas(p,poly[0])&&!poly.slice(1).some(r=>ringHas(p,r)));
function bbox(g){let a=[Infinity,Infinity,-Infinity,-Infinity];for(const poly of polys(g))for(const [x,y] of poly[0]||[]){a=[Math.min(a[0],x),Math.min(a[1],y),Math.max(a[2],x),Math.max(a[3],y)]}return a}
const cities=crime.features.map(f=>({f,b:bbox(f.geometry)}));

const N=40; // 40x40 grid over the ZIP bounding box
const out={};
for(const z of zips){
 const code=z.properties.ZCTA5||z.properties.ZCTA5CE20,b=bbox(z.geometry);
 const counts=new Map();let inside=0;
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  const p=[b[0]+(i+.5)*(b[2]-b[0])/N,b[1]+(j+.5)*(b[3]-b[1])/N];
  if(!contains(z.geometry,p))continue;inside++;
  const hit=cities.find(c=>p[0]>=c.b[0]&&p[0]<=c.b[2]&&p[1]>=c.b[1]&&p[1]<=c.b[3]&&contains(c.f.geometry,p));
  const key=hit?hit.f.properties.ori:'';counts.set(key,(counts.get(key)||0)+1);
 }
 if(!inside)continue;
 const list=[...counts].filter(([ori])=>ori).map(([ori,n])=>({ori,share:Math.round(n/inside*100)/100})).filter(c=>c.share>=0.05).sort((a,b)=>b.share-a.share);
 out[code]={cities:list,outsideCityShare:Math.round((counts.get('')||0)/inside*100)/100};
}
const used=new Set(Object.values(out).flatMap(z=>z.cities.map(c=>c.ori)));
const cityData=Object.fromEntries(crime.features.filter(f=>used.has(f.properties.ori)).map(f=>[f.properties.ori,{city:f.properties.city,agency:f.properties.agency,years:f.properties.years}]));
writeFileSync('data/dfw-crime-zip-cities-2023-2025.json',JSON.stringify({metadata:{...crime.metadata,unmatchedAgencies:undefined,
 zipMethod:'share of a 40x40 grid of points inside each ZCTA that fall within each city limit; cities under 5% omitted; outsideCityShare = county/unincorporated area'},zips:out,cities:cityData})+'\n');
const noCity=Object.entries(out).filter(([,z])=>!z.cities.length).map(([k])=>k);
console.log('zips',Object.keys(out).length,'cities used',used.size,'zips with no city >=5%',noCity.length,noCity.slice(0,10).join(','));
