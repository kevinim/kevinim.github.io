'use strict';
// Standalone, explicitly fictional SVG review preview. Not loaded by the website.
const fs=require('node:fs');
const path=require('node:path');
const input=process.argv[2],dest=process.argv[3];
if(!input||!dest){console.error('usage: node render-finder-derived-demo-svg.cjs INPUT.json artifacts/finder-derived/preview.svg');process.exit(2);}
try{
 const root=process.cwd(),output=path.resolve(root,dest);
 if(!output.startsWith(path.join(root,'artifacts','finder-derived')+path.sep)||!output.endsWith('.svg'))
  throw Error('output_must_be_artifacts_svg');
 const data=JSON.parse(fs.readFileSync(path.resolve(root,input),'utf8'));
 if(data.metadata?.demoOnly!==true||data.metadata?.publicationApproved!==false||
  !Array.isArray(data.features)||data.features.some(f=>f.properties?.reviewed||f.properties?.publishable))
  throw Error('demo_only_preview_refuses_real_or_approved_geometry');
 const escape=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 const LEVELS=['elementary','middle','high'];
 const labels=['초등학교','중학교','고등학교'];
 const all=data.features.flatMap(f=>f.geometry.coordinates[0]);
 if(!all.length)throw Error('no_demo_features');
 const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const scaleX=210/Math.max(0.00001,maxX-minX),scaleY=130/Math.max(0.00001,maxY-minY);
 const x=v=>18+(v-minX)*scaleX,y=v=>200-(v-minY)*scaleY;
 const svg=['<svg xmlns="http://www.w3.org/2000/svg" width="960" height="360" viewBox="0 0 960 360" role="img" aria-label="Synthetic demonstration of estimated school polygons, not real assignments">',
  '<rect width="960" height="360" rx="16" fill="#0b1220"/>',
  '<text x="26" y="35" fill="#f8fafc" font-family="sans-serif" font-size="20" font-weight="700">Finder-derived boundary engine — SYNTHETIC DEMO</text>',
  '<text x="26" y="58" fill="#fbbf24" font-family="sans-serif" font-size="13">실제 CFB 학군 지도가 아닙니다. 모든 학교와 경계는 합성 시험 자료입니다.</text>'];
 LEVELS.forEach((level,index)=>{
  const offsetX=26+index*313;
  svg.push('<g transform="translate('+offsetX+' 81)">');
  svg.push('<rect width="286" height="236" rx="12" fill="#172338" stroke="#42526b"/>');
  svg.push('<text x="17" y="31" font-size="18" font-weight="700" font-family="sans-serif" fill="#f8fafc">'+labels[index]+'</text>');
  data.features.filter(f=>f.properties.gradeLevel===level).forEach((f,j)=>{
   const c=f.geometry.coordinates[0],pts=c.map(p=>x(p[0])+','+y(p[1])).join(' ');
   const color=f.properties.campusId.endsWith('_A')?'#2dd4bf':'#fbbf24';
   svg.push('<polygon points="'+pts+'" fill="'+color+'" fill-opacity="0.55" stroke="'+color+'" stroke-width="2"/>');
   svg.push('<text x="'+(j?167:21)+'" y="218" font-size="12" font-family="sans-serif" fill="'+color+'">'+escape(f.properties.school)+'</text>');
  });
  svg.push('</g>');
 });
 svg.push('<text x="26" y="345" font-size="12" font-family="sans-serif" fill="#cbd5e1">Not official GIS · Not a residential assignment · Incomplete coverage · Not publishable</text>','</svg>');
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,svg.join('\n')+'\n',{mode:0o600});
 console.log('SYNTHETIC_REVIEW_SVG '+JSON.stringify({panels:3,features:data.features.length,publicMap:false}));
}catch(e){console.error('DEMO_PREVIEW_BLOCKED '+e.message);process.exitCode=1;}
