import { PNG } from "pngjs"; import pixelmatch from "pixelmatch"; import { readFileSync } from "node:fs";
const flat = p => { const o = Buffer.alloc(p.data.length); for (let i=0;i<o.length;i+=4){const a=p.data[i+3]/255; for(let c=0;c<3;c++) o[i+c]=Math.round(p.data[i+c]*a+255*(1-a)); o[i+3]=255;} return o; };
for (const n of process.argv.slice(2)) {
  const e = PNG.sync.read(readFileSync(`public/__figma__/${n}.png`)), a = PNG.sync.read(readFileSync(`test-results/visual/f01/${n}-actual.png`)); const v = JSON.parse(readFileSync("public/__figma__/specs/F01-variants.json","utf8")).find(x=>x.file===n); for (const m of v?.mask??[]) for(let y=m.y;y<m.y+m.h;y++) for(let x=m.x;x<m.x+m.w;x++){const i=(y*e.width+x)*4; e.data.copy(a.data,i,i,i+4);}
  const W=e.width,H=e.height,E=flat(e),A=flat(a),m=Buffer.alloc(W*H*4);
  pixelmatch(A,E,m,W,H,{threshold:0.1,includeAA:true,diffMask:true});
  const lum=(b,i)=>(b[i]*299+b[i+1]*587+b[i+2]*114)/1000; const pts=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4; if(!m[i+3]) continue; let edge=e.data[i+3]>0&&e.data[i+3]<255; for(let dy=-1;dy<=1&&!edge;dy++)for(let dx=-1;dx<=1&&!edge;dx++){const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H)continue; if(Math.abs(lum(E,i)-lum(E,(ny*W+nx)*4))>24) edge=true;} if(!edge) pts.push(`${x},${y} F${[...E.subarray(i,i+3)]} A${[...A.subarray(i,i+3)]}`);}
  console.log(n.replace('f01-',''), pts.length, pts.slice(0,8).join(" | "));
}
