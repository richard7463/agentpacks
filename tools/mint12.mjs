/* 卡灵战争 · 12 条真网表铸造器
   用 TapeForge 合成 NAND 网表 → 穷举全输入对照语义参照 → 输出 TapeOut 字节 */
import * as F from './forge.bundle.mjs';
import * as NL from './netlist.bundle.mjs';
import * as TP from './tapeout.bundle.mjs';

/* ── 12 种规则 spec（运行时输入；配置 mult 由调用方打包进输入字）── */
const SPECS = [
  { t:0, n:'止损', in:[['amount',3],['left',3],['human',1]],
    out:['allow','ask'],
    ref:(a,l,h)=>[ (a<=l)||h ?1:0, (a>l&&!h)?1:0 ],
    rules:[{if:'amount <= left || human',then:{allow:1}},{if:'amount > left && !human',then:{ask:1}}], other:{allow:0,ask:0} },
  { t:1, n:'梭哈', in:[['amount',3],['cap',3]],
    out:['allow','ask'],
    ref:(a,c)=>[ a<=c?1:0, 0 ],
    rules:[{if:'amount <= cap',then:{allow:1}}], other:{allow:0,ask:0} },
  { t:2, n:'白名单', in:[['payee',1]],
    out:['allow','ask'],
    ref:(p)=>[ p?1:0, 0 ],
    rules:[{if:'payee',then:{allow:1}}], other:{allow:0,ask:0} },
  { t:3, n:'加仓', in:[['amount',4],['grown',3],['human',1]],
    out:['allow','ask'],
    ref:(a,g,h)=>[ (a<=g)||h?1:0, (a>g&&!h)?1:0 ],
    rules:[{if:'amount <= grown || human',then:{allow:1}},{if:'amount > grown && !human',then:{ask:1}}], other:{allow:0,ask:0} },
  { t:4, n:'清仓', in:[['paid',3],['limit',3]],
    out:['allow','ask'],
    ref:(c,l)=>[ c<l?1:0, 0 ],
    rules:[{if:'paid < limit',then:{allow:1}}], other:{allow:0,ask:0} },
  { t:5, n:'抄底', in:[['amount',2],['micro',2],['human',1]],
    out:['allow','ask'],
    ref:(a,m,h)=>[ (a<=m)||h?1:0, (a>m&&!h)?1:0 ],
    rules:[{if:'amount <= micro || human',then:{allow:1}},{if:'amount > micro && !human',then:{ask:1}}], other:{allow:0,ask:0} },
  { t:6, n:'杠杆', in:[['amount',3],['half',3],['cap',3],['human',1]],
    out:['allow','ask'],
    ref:(a,hf,c,h)=>[ (a<=c&&(a<=hf||h))?1:0, (a<=c&&a>hf&&!h)?1:0 ],
    rules:[{if:'amount <= cap && (amount <= half || human)',then:{allow:1}},
           {if:'amount <= cap && amount > half && !human',then:{ask:1}}], other:{allow:0,ask:0} },
  { t:7, n:'钻石手', in:[['elapsed',4],['cool',4]],
    out:['allow','ask'],
    ref:(e,c)=>[ e>=c?1:0, 0 ],
    rules:[{if:'elapsed >= cool',then:{allow:1}}], other:{allow:0,ask:0} },
  { t:8, n:'封控', in:[['tripped',1],['elapsed',2],['lock',2]],
    out:['allow','ask'],
    ref:(tr,e,l)=>[ (!tr||e>=l)?1:0, 0 ],
    rules:[{if:'!tripped || elapsed >= lock',then:{allow:1}}], other:{allow:0,ask:0} },
  { t:9, n:'双签', in:[['amount',4],['half',4],['cap',4],['appr',1]],
    out:['allow','ask'],
    ref:(a,hf,c,p)=>[ (a<=hf||(a<=c&&p))?1:0, (a<=c&&a>hf&&!p)?1:0 ],
    rules:[{if:'amount <= half',then:{allow:1}},
           {if:'amount <= cap && appr',then:{allow:1}},
           {if:'amount <= cap && amount > half && !appr',then:{ask:1}}], other:{allow:0,ask:0} },
  { t:10,n:'会签', in:[['amount',4],['cap',4],['appr',2],['need',2]],
    out:['allow','ask'],
    ref:(a,c,p,n)=>[ (a<=c||p>=n)?1:0, (a>c&&p<n)?1:0 ],
    rules:[{if:'amount <= cap || appr >= need',then:{allow:1}},
           {if:'amount > cap && appr < need',then:{ask:1}}], other:{allow:0,ask:0} },
  { t:11,n:'委托', in:[['window',1],['payee',1]],
    out:['allow','ask'],
    ref:(w,p)=>[ (w&&p)?1:0, 0 ],
    rules:[{if:'window && payee',then:{allow:1}}], other:{allow:0,ask:0} },
];

/* ── 铸造 + 穷举验证 ── */
const bits=v=>v.toString(2).length;
let allOK=true;
const result=[];
for(const sp of SPECS){
  const spec={ name:sp.n,
    inputs: sp.in.map(([nm,b])=>({name:nm,bits:b,about:''})),
    outputs: sp.out.map(nm=>({name:nm,bits:1,about:''})),
    rules: sp.rules, otherwise: sp.other };
  const forged=F.forge(spec,'gates');
  const nl=forged.netlist;
  const nIn=spec.inputs.reduce((s,f)=>s+f.bits,0), nOut=2;
  // 穷举
  let bad=0, total=1<<nIn;
  for(let w=0;w<total;w++){
    // 按 spec 字段顺序拆包输入
    let off=0; const args=[];
    for(const [,b] of sp.in){ args.push((w>>>off)&((1<<b)-1)); off+=b; }
    const expect=sp.ref(...args);
    const out=NL.evalWord(nl,w);
    const got=[out&1,(out>>1)&1];
    if(got[0]!==expect[0]||got[1]!==expect[1]){ bad++; if(bad<2)console.log(`  ✗ t${sp.t} word=${w} got=${got} want=${expect}`); }
  }
  const bytes=TP.netlistBytes(nl);
  const depth=NL.gateDepth(nl).depth.reduce((m,d)=>Math.max(m,d),0);
  const ok=bad===0; if(!ok)allOK=false;
  console.log(`t${String(sp.t).padStart(2)} ${sp.n}  ${String(nl.gates.length).padStart(3)} 门 · 深度 ${String(depth).padStart(2)} · ${nIn}b 进 · 穷举 ${total} ✓${ok?'':' ✗ FAIL'}`);
  result.push({t:sp.t,name:sp.n,gates:nl.gates.length,depth,nIn,nOut:2,ok,bytes});
}
if(allOK){
  const fs=await import('node:fs');
  fs.writeFileSync('netlists12.json',JSON.stringify(result,null,1));
  console.log('\nALL 12 VERIFIED → netlists12.json');
}else{ console.log('\n有失败'); process.exit(1); }
