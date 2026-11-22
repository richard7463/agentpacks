/* ═══════════════════════════════════════════════════
   Agent Packs · Season 0
   ═══════════════════════════════════════════════════ */

/* ────────── 常量 ────────── */
const RAR=['C','UC','R','SR','SSR','UR','LR'];
const ODDS=[464,300,150,60,20,5,1];
const SELL=[1,2,4,10,30,120,600];
const RCOL=['#8E8AA8','#C9C6DC','#6FE3FF','#B49BFF','#FF7AD9','#F5C451','#FFE9A8'];
const HOUSE=[
  {n:'止损电路',s:'止损回血',d:'HP 低于 40% 时，每回合回复 8% 生命'},
  {n:'梭哈电路',s:'满血狂暴',d:'HP 高于 90% 时，攻击力 +60%'},
  {n:'风控电路',s:'伤害减免',d:'受到的伤害 -20%'},
  {n:'加仓电路',s:'复利成长',d:'每回合攻击 +15%（可叠加）'},
  {n:'清仓电路',s:'AOE 清算',d:'攻击全体目标（单体伤害 -40%）'},
  {n:'抄底电路',s:'低血斩杀',d:'对 HP 低于 25% 的敌人伤害 ×2'},
  {n:'杠杆电路',s:'高伤自损',d:'攻击 +80%，每次出手自损 6% 生命'},
  {n:'钻石手电路',s:'坚壁反弹',d:'受伤 -30%，并反弹 25% 伤害'},
];
const CHAPTERS=[
  {id:'c17',t:'ICO 狂潮',y:'2017',d:'人人都在发币，泡沫最高处',lvl:1},
  {id:'c18',t:'漫长的冬天',y:'2018',d:'九成归零，活下来的是钻石手',lvl:2},
  {id:'c22',t:'暴雷纪元',y:'2022',d:'连环巨雷，信任冰点',lvl:3},
  {id:'c24',t:'Meme 狂欢季',y:'2024',d:'猫狗起飞，理性清仓',lvl:4},
  {id:'c25',t:'大清算',y:'2025',d:'潮水退尽，真电路活到最后',lvl:5},
];
const DEMO_NAMES=['kestrel.ai','tiger.ai','nova.ai','orbit.ai','lumen.ai','harbor.ai','pixel.ai'];
const MS_DEF=[
  {k:'open5', n:'开 5 个包', g:5, rw:2, t:'包'},
  {k:'open15',n:'开 15 个包', g:15, rw:3, t:'包'},
  {k:'open50',n:'开 50 个包', g:50, rw:2, t:'包'},
  {k:'sr',    n:'抽到 SR 以上 ×3', g:3, rw:2, t:'包'},
  {k:'ssr',   n:'抽到 SSR 以上 ×1', g:1, rw:3, t:'包'},
  {k:'equip', n:'穿 1 张卡', g:1, rw:1, t:'包'},
  {k:'star',  n:'升星 1 次', g:1, rw:1, t:'包'},
  {k:'sell',  n:'卖卡 ×5', g:5, rw:10, t:'分'},
  {k:'join',  n:'认领 .ai 入池', g:1, rw:2, t:'包'},
  {k:'gate',  n:'守门 1 局', g:1, rw:2, t:'包'},
  {k:'battle',n:'打 1 局自走棋', g:1, rw:1, t:'包'},
  {k:'clear', n:'通关任意一章', g:1, rw:3, t:'包'},
  {k:'redeem',n:'兑换 1 次 SR', g:1, rw:1, t:'包'},
  {k:'streak',n:'连续登录（自动）', g:1, rw:1, t:'包'},
];

/* ────────── 存档 ────────── */
const SKEY='apacks_v5';
let S=null;
function fresh(){return{v:5,name:null,pts:0,packs:[],freeCap:12,lastRegen:Date.now(),
  cards:[],nextId:1,equipped:0,firstPack:false,sinceSR:0,
  pool:[],myInPool:false,sort:'r',w:0,l:0,team:[],chCleared:{},
  day:null,mis:{},claimed:{},streak:1,lastDay:Date.now(),followed:false};}
function save(){localStorage.setItem(SKEY,JSON.stringify(S))}
function load(){try{S=JSON.parse(localStorage.getItem(SKEY))}catch(e){}if(!S||S.v!==5)S=fresh()}
load();
const today=()=>new Date().toDateString();
if(S.day!==today()){
  const gap=S.lastDay?Math.floor((Date.now()-S.lastDay)/864e5):99;
  S.streak=(gap===1)?S.streak+1:1;S.lastDay=Date.now();
  S.day=today();S.mis={open5:0,open15:0,open50:0,sr:0,ssr:0,equip:0,star:0,sell:0,join:0,gate:0,battle:0,clear:0,redeem:0};
  S.mis.streak=1;S.claimed={};save();
}

/* ────────── 工具 ────────── */
const $=q=>document.querySelector(q), $$=q=>document.querySelectorAll(q);
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),1900)}
function fmtN(n){return n&&n.length>16?n.slice(0,15)+'…':(n||'')}
let AC=null;
function beep(f,d,t='square',g=.06){try{
  if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();
  const o=AC.createOscillator(),ga=AC.createGain();
  o.type=t;o.frequency.value=f;ga.gain.value=g;o.connect(ga);ga.connect(AC.destination);
  const now=AC.currentTime;ga.gain.setValueAtTime(g,now);
  ga.gain.exponentialRampToValueAtTime(.001,now+d);o.start(now);o.stop(now+d)}catch(e){}}
function fanfare(r){
  if(r>=5){[523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>beep(f,.3,'triangle',.1),i*110))}
  else if(r>=4){[440,554,659].forEach((f,i)=>setTimeout(()=>beep(f,.22,'triangle',.08),i*100))}
  else if(r>=2)beep(392,.16,'triangle',.06); else beep(300,.1,'square',.04)}
function seeded(id){let t=id+0x6D2B79F5;return function(){t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}

/* ────────── 概率阶梯 ────────── */
function oddsLadderHTML(){
  const strip=RAR.map((r,i)=>`<i class="r${i}" style="--g:${ODDS[i]}" title="${r} ${ODDS[i]}‰"></i>`).join('');
  const legend=RAR.map((r,i)=>{
    const every=Math.round(1000/ODDS[i]);
    return `<div class="r${i}"><b>${r}</b><span>${ODDS[i]}‰</span><em>${every<=1?'几乎每张':'约每 '+every+' 张 1 张'}</em></div>`;
  }).join('');
  return `<div class="odds-strip" role="img" aria-label="稀有度概率：${RAR.map((r,i)=>r+' '+ODDS[i]+'‰').join('，')}">${strip}</div><div class="odds-legend">${legend}</div>`;
}
$('#oddsLadder').innerHTML=oddsLadderHTML();
$('#oddsLadder2').innerHTML=oddsLadderHTML();

/* ────────── 卡面：程序化 SVG ────────── */
function statsOf(c){return{atk:Math.round(5+c.r*3.2+c.star*2),def:Math.round(4+c.r*2.4+c.star*2),rat:Math.min(99,Math.round(57+c.r*5.6+c.star*3.4))}}

/* ────────── 规则电路：与合约 ruleOf / checkPayment 同参数 ────────── */
const RULE_DEF=[
  {n:'止损电路', s:p=>`每日 ≤ $${usd(p)}`, l:p=>`每天最多支出 $${usd(p)}；超出需人工放行。`},
  {n:'梭哈电路', s:p=>`单笔 ≤ $${usd(p)}`, l:p=>`单笔支付不超过 $${usd(p)}，超过直接拒绝。`},
  {n:'风控电路', s:()=>'只付 Agent ID', l:()=>'只允许付给持有 Binance Agent ID 的地址，其余一律拒绝。'},
  {n:'加仓电路', s:p=>`$${usd(p)} 起 +2%/笔`, l:p=>`当日额度从 $${usd(p)} 起，每成功一笔上浮 2%，当日有效。`},
  {n:'清仓电路', s:p=>`每日 ≤ ${p} 笔`, l:p=>`每天最多 ${p} 笔支付，超出需等次日。`},
  {n:'抄底电路', s:p=>`≤ $${usd(p)} 免确认`, l:p=>`单笔不超过 $${usd(p)} 直接放行；更大金额需人工确认。`},
  {n:'杠杆电路', s:p=>`上限 $${usd(p)} · 半额需人工`, l:p=>`单笔上限 $${usd(p)}；超过一半额度时必须人工确认。`},
  {n:'钻石手电路', s:p=>`间隔 ≥ ${Math.round(p/60)} 分钟`, l:p=>`两笔支付之间至少间隔 ${Math.round(p/60)} 分钟，防止手滑连发。`},
  {n:'身份卡 · 指定收款方', s:()=>'只付给正主', l:p=>`只允许付给这张身份卡的正主（${p}），链上按地址校验。`},
];
function usd(cents){const v=cents/100;return Number.isInteger(v)?v.toFixed(0):v.toFixed(2)}
function ruleParams(c){
  if(c.kind===1){const p=S.pool[c.ref];return{t:8,p1:p?p.name:'—',p2:0}}
  const mult=100+c.r*40+c.star*20,t=c.ref%8;let p1=0,p2=0;
  if(t===0)p1=2000*mult/100;
  else if(t===1)p1=5000*mult/100;
  else if(t===3){p1=3000*mult/100;p2=2}
  else if(t===4)p1=3+Math.floor(c.r/2)+c.star;
  else if(t===5)p1=500*mult/100;
  else if(t===6)p1=10000*mult/100;
  else if(t===7){const cut=c.r*300+c.star*120;p1=cut<3600?3600-cut:300}
  return{t,p1,p2};
}
function ruleShort(c){const {t,p1}=ruleParams(c);return RULE_DEF[t].s(p1)}
function ruleLong(c){const {t,p1}=ruleParams(c);return RULE_DEF[t].l(p1)}
function ruleName(c){const {t}=ruleParams(c);return RULE_DEF[t].n}
function checkRule(c,amountCents,payeeHasId,spent,count,lastAt,approved){
  const {t,p1,p2}=ruleParams(c);
  if(t===0)return(spent+amountCents<=p1)?[1,'额度内']:approved?[1,'超额度 · 人工放行']:[0,'超出每日上限'];
  if(t===1)return amountCents<=p1?[1,'额度内']:[0,'单笔过大'];
  if(t===2)return payeeHasId?[1,'收款方有 Agent ID']:[0,'收款方没有 Agent ID'];
  if(t===3){const cap=p1*(100+count*p2)/100;return(spent+amountCents<=cap)?[1,'额度内']:approved?[1,'超额度 · 人工放行']:[0,'超出当日额度']}
  if(t===4)return count<p1?[1,'笔数内']:[0,'今日笔数已满'];
  if(t===5)return amountCents<=p1?[1,'小额免确认']:approved?[1,'人工放行']:[0,'需人工确认'];
  if(t===6)return amountCents>p1?[0,'超出上限']:(amountCents*2>p1&&!approved)?[0,'超过一半 · 需人工']:[1,'额度内'];
  if(t===7)return(lastAt===0||Date.now()/1000>=lastAt+p1)?[1,'冷却已满足']:[0,'冷却未到'];
  return[0,'身份卡需在链上按地址校验'];
}
function artSVG(c,w=200,h=286){
  const rnd=seeded(c.id*7919+c.r*13+c.ref*101+c.kind*3+7);
  const col=RCOL[c.r];
  const cx=w/2, cy=h*.40;
  const uid='ag'+c.id+'_'+c.r;
  let grid='';
  for(let i=1;i<8;i++){const x=w*i/8;grid+=`<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${h}" stroke="${col}" stroke-width=".5" opacity=".055"/>`}
  for(let i=1;i<11;i++){const y=h*i/11;grid+=`<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width=".5" opacity=".055"/>`}
  const R=Math.min(w,h)*.235;
  const sides=3+((c.ref*3+c.id)%5);
  const rot=(((c.id*37+c.ref*11)%360)-90)*Math.PI/180;
  let hex='';
  for(let i=0;i<sides;i++){const a=rot+i*2*Math.PI/sides;hex+=`${i?'L':'M'}${(cx+Math.cos(a)*R).toFixed(1)} ${(cy+Math.sin(a)*R).toFixed(1)}`}
  hex+='Z';
  let hex2='';
  for(let i=0;i<sides;i++){const a=rot+i*2*Math.PI/sides;hex2+=`${i?'L':'M'}${(cx+Math.cos(a)*R*.76).toFixed(1)} ${(cy+Math.sin(a)*R*.76).toFixed(1)}`}
  hex2+='Z';
  let traces='',nodes='',glows='';
  const seg=7+Math.floor(rnd()*4);
  for(let i=0;i<seg;i++){
    let ang=rnd()*Math.PI*2, rad=R*(.9+rnd()*.5);
    let x=cx+Math.cos(ang)*rad, y=cy+Math.sin(ang)*rad;
    let d=`M${x.toFixed(1)} ${y.toFixed(1)}`;
    const len=2+Math.floor(rnd()*4);
    for(let j=0;j<len;j++){
      const dir=rnd()<.55, step=12+rnd()*26;
      if(dir)x=Math.max(8,Math.min(w-8,x+(rnd()<.5?-step:step)));
      else y=Math.max(8,Math.min(h-8,y+(rnd()<.5?-step:step)));
      d+=` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    const op=.3+rnd()*.45;
    traces+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="1" opacity="${op.toFixed(2)}" stroke-linecap="round"/>`;
    nodes+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5+rnd()*1.3).toFixed(1)}" fill="${col}" opacity="${Math.min(1,op+.35).toFixed(2)}"/>`;
    if(rnd()<.45)glows+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${col}" opacity=".09"/>`;
  }
  const glyph=c.kind===1
    ? `<circle cx="${cx}" cy="${cy}" r="${R*.46}" fill="none" stroke="${col}" stroke-width="1" opacity=".75"/>
       <text x="${cx}" y="${cy+R*.11}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="${R*.42}" fill="${col}">.ai</text>`
    : `<path d="M${cx} ${cy-R*.34} L${cx+R*.34} ${cy} L${cx} ${cy+R*.34} L${cx-R*.34} ${cy} Z" fill="none" stroke="${col}" stroke-width="1.1" opacity=".7"/>
       <circle cx="${cx}" cy="${cy}" r="${R*.1}" fill="${col}" opacity=".55"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="${uid}" cx="50%" cy="38%" r="68%">
        <stop offset="0%" stop-color="${col}" stop-opacity=".56"/>
        <stop offset="42%" stop-color="${col}" stop-opacity=".12"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${uid}l" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".07"/>
        <stop offset="42%" stop-color="#ffffff" stop-opacity=".015"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${uid}b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0F0C24" stop-opacity="0"/>
        <stop offset="100%" stop-color="#0F0C24"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#120f2c"/>
    <rect width="${w}" height="${h}" fill="url(#${uid})"/>
    <rect width="${w}" height="${h}" fill="url(#${uid}l)"/>
    ${grid}
    <circle cx="${cx}" cy="${cy}" r="${R*1.62}" fill="none" stroke="${col}" stroke-width=".6" stroke-dasharray="2 7" opacity=".34"/>
    <circle cx="${cx}" cy="${cy}" r="${R*1.3}" fill="none" stroke="${col}" stroke-width=".5" opacity=".14"/>
    ${glows}${traces}${nodes}
    <path d="${hex}" fill="none" stroke="${col}" stroke-width="7" opacity=".09"/>
    <path d="${hex}" fill="none" stroke="${col}" stroke-width="1.3" opacity=".8"/>
    <path d="${hex2}" fill="none" stroke="#ffffff" stroke-width=".6" opacity=".16"/>
    ${glyph}
    <rect y="${h*.56}" width="${w}" height="${h*.44}" fill="url(#${uid}b)" opacity=".62"/>
  </svg>`;
}
function makeCard(r){
  let kind=0,ref=Math.floor(Math.random()*8);
  const act=S.pool.filter(p=>p.active);
  if(r>=3&&act.length&&Math.random()<0.6){const p=act[Math.floor(Math.random()*act.length)];
    kind=1;ref=S.pool.indexOf(p);p.pulls=(p.pulls||0)+1;}
  return{id:S.nextId++,r,star:0,kind,ref};
}
function cname(c){return c.kind===1?S.pool[c.ref].name:HOUSE[c.ref].n}
function cskill(c){return HOUSE[c.kind===1?(c.ref%8):c.ref].s}
function cdesc(c){return HOUSE[c.kind===1?(c.ref%8):c.ref].d}
function open5(){
  const out=[];
  for(let i=0;i<5;i++){
    let r=rollR();
    if((!S.firstPack||S.ssrNext)&&i===4){if(r<4)r=4;S.ssrNext=false}
    else if(S.firstPack&&S.sinceSR+1>=10&&r<3)r=3;
    if(r>=3)S.sinceSR=0;else S.sinceSR++;
    if(r>=3)S.mis.sr++; if(r>=4)S.mis.ssr++;
    out.push(makeCard(r));
  }
  S.firstPack=true;S.pts+=5;
  S.mis.open5++;S.mis.open15++;S.mis.open50++;
  S.cards.push(...out);save();return out;
}
function rollR(){const x=Math.random()*1000;let a=0;for(let r=0;r<7;r++){a+=ODDS[r];if(x<a)return r}return 6}

/* ────────── 卡牌组件 ────────── */
function cardHTML(c){
  const st=statsOf(c);
  const eq=S.equipped===c.id;
  return `<div class="cg r${c.r}${c.r>=5?' holo':''}${eq?' equipped':''}">
    <div class="art">${artSVG(c)}</div>
    <div class="scrim"></div>
    <div class="frame"></div>
    <div class="top"><span class="rar">${RAR[c.r]}</span>${c.star?`<span class="stars">${'★'.repeat(c.star)}</span>`:''}</div>
    ${c.kind===1?'<span class="idt">.ai 身份</span>':''}
    ${eq?'<span class="eqd">已穿上</span>':''}
    <div class="foot">
      <div class="name">${cname(c)}</div>
      <div class="skill ruleline">${ruleShort(c)}</div>
      <div class="nums"><span>ATK <b>${st.atk}</b></span><span>DEF <b>${st.def}</b></span><span>RAT <b>${st.rat}</b></span></div>
    </div>
  </div>`;
}

/* ────────── 头部刷新 ────────── */
function regenFree(){
  const now=Date.now(),g=Math.floor((now-S.lastRegen)/20000);
  if(g>0){const cur=S.packs.length;const add=Math.max(0,Math.min(g,S.freeCap-cur));
    for(let i=0;i<add;i++)S.packs.push(1);S.lastRegen=now;save();}
  const cur=S.packs.length,full=cur>=S.freeCap;
  $('#chPacks').textContent=cur+'/'+S.freeCap;
  $('#chRf').textContent=full?'已满':Math.max(0,20-Math.floor((Date.now()-S.lastRegen)/1000))+' 秒后 +1';
  $('#pmCount').textContent=cur;
  $('#pmFill').style.width=Math.min(100,cur/S.freeCap*100)+'%';
  $('#regen').textContent=full?'已经存满，开掉才会继续回':'正在回包，每 20 秒 +1';
  $('#landN').textContent=S.freeCap;
}
function switchTab(v){
  $('#mmodal').classList.remove('on');
  $$('.tab').forEach(t=>t.classList.toggle('on',t.dataset.v===v));
  $$('.view').forEach(x=>x.classList.remove('on'));
  $('#v-'+v).classList.add('on');
  $('#land').style.display='none';
  window.scrollTo({top:0,behavior:'instant'});
  if(G&&v!=='gate'){cancelAnimationFrame(G.raf);G=null;$('#gatePlay').hidden=true;$('#gateEnd').hidden=true;$('#gateSetup').hidden=false}
  renderAll();
  if(v==='chain')renderChain();
  if(v==='gate')renderGate();
}
function renderAll(){regenFree();
  $('#chPts').textContent=S.pts;
  $('#chName').textContent=(S.name||'游客')+(S.myInPool?' · 在池':'');
  $('#pkN').textContent=S.packs.length+' 包';
  $('#rec').textContent='战绩 '+S.w+' / '+S.l;
  $('#streakN').textContent=S.streak;
  $('#streakD').textContent='已连续 '+S.streak+' 天。主网版对应每日免费包连签。';
  renderPk();renderCards();renderChapters();renderMis();renderPool();renderStreak();
}
function renderPk(){
  const pr=$('#pkRow');pr.innerHTML='';
  if(!S.packs.length){pr.innerHTML='<div class="sub">包空了——去「补给」领取，或等待自动恢复。</div>';return}
  S.packs.slice(0,16).forEach((_,i)=>{
    const b=document.createElement('button');b.className='packchip';
    b.innerHTML='<b>'+(i+1)+'</b>包';
    b.title='撕开第 '+(i+1)+' 个包';
    b.onclick=()=>{S.packs.splice(i,1);save();startOpen()};pr.appendChild(b)});
  if(S.packs.length>16)pr.insertAdjacentHTML('beforeend','<span class="sub" style="align-self:center">+'+(S.packs.length-16)+'</span>');
}
function renderStreak(){
  const box=$('#streakBox');if(!box)return;
  const RW=['1 包','2 包','3 包','4 包','5 包','6 包','SSR 包 ×1'];
  box.innerHTML=RW.map((rw,i)=>{
    const n=i+1,on=S.streak>=n,next=n===S.streak+1;
    return `<div class="sday${on?' on':''}${n===7?' bonus':''}${next?' next':''}">
      <i>第 ${n} 天</i><b>${rw}</b></div>`;
  }).join('');
}

/* ══════════ 开包仪式 ══════════ */
let opening=null,flipN=0,phase='pack';

/* 卡包：锡箔包装（上下压齿封口 + 镭射徽章 + 电路走线） */
function packArt(p){
  let crimp='';for(let x=0;x<180;x+=6)crimp+=`<path d="M${x} 0h6v14l-3 4-3-4z"/>`;
  let crimpB='';for(let x=0;x<180;x+=6)crimpB+=`<path d="M${x} 288h6v-14l-3-4-3 4z"/>`;
  return `<svg viewBox="0 0 180 288" role="img" aria-label="Agent Packs 卡包">
    <defs>
      <linearGradient id="${p}bg" x1="0" y1="0" x2=".6" y2="1">
        <stop offset="0" stop-color="#3b2f8f"/><stop offset=".5" stop-color="#1d1650"/><stop offset="1" stop-color="#110d33"/>
      </linearGradient>
      <linearGradient id="${p}fl" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FF8AD8"/><stop offset=".33" stop-color="#8AF0FF"/><stop offset=".66" stop-color="#D4FF8A"/><stop offset="1" stop-color="#B79BFF"/>
      </linearGradient>
      <linearGradient id="${p}cr" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#cfc8f2"/><stop offset=".5" stop-color="#8f86c4"/><stop offset="1" stop-color="#e8e3ff"/>
      </linearGradient>
      <radialGradient id="${p}gl" cx="50%" cy="42%" r="50%">
        <stop offset="0" stop-color="#B79BFF" stop-opacity=".55"/><stop offset="1" stop-color="#B79BFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect y="14" width="180" height="260" fill="url(#${p}bg)"/>
    <rect y="14" width="180" height="260" fill="url(#${p}gl)"/>
    <g stroke="#D6D1F2" stroke-opacity=".16" fill="none" stroke-width="1">
      <path d="M0 70h34v26h22M180 84h-30v-22h-18M0 214h28v-20h30M180 200h-26v24h-24M90 274v-26"/>
    </g>
    <g fill="#D6D1F2" fill-opacity=".4"><circle cx="56" cy="96" r="2"/><circle cx="132" cy="62" r="2"/><circle cx="58" cy="194" r="2"/><circle cx="130" cy="224" r="2"/></g>
    <g fill="url(#${p}cr)">${crimp}${crimpB}</g>
    <path d="M0 18h180M0 270h180" stroke="#0F0C24" stroke-opacity=".5"/>
    <text x="16" y="44" font-family="Archivo,sans-serif" font-size="8.5" font-weight="700" fill="#D6D1F2" fill-opacity=".8">第 0 季</text>
    <text x="164" y="44" text-anchor="end" font-family="Archivo,sans-serif" font-size="8.5" font-weight="700" fill="#D6D1F2" fill-opacity=".8">5 张卡</text>
    <circle cx="90" cy="122" r="44" fill="none" stroke="url(#${p}fl)" stroke-width="2.5"/>
    <circle cx="90" cy="122" r="36" fill="url(#${p}fl)" opacity=".92"/>
    <path d="M90 98l20 24-20 24-20-24z" fill="#0F0C24" opacity=".9"/>
    <circle cx="90" cy="122" r="5" fill="url(#${p}fl)"/>
    <text x="90" y="200" text-anchor="middle" font-family="Archivo,sans-serif" font-stretch="125%" font-size="25" font-weight="900" fill="#F2EFFF" letter-spacing="-1">AGENT</text>
    <text x="90" y="226" text-anchor="middle" font-family="Archivo,sans-serif" font-stretch="125%" font-size="25" font-weight="900" fill="url(#${p}fl)" letter-spacing="-1">PACKS</text>
    <text x="90" y="252" text-anchor="middle" font-family="Archivo,sans-serif" font-size="7.5" font-weight="600" fill="#9C96C4">Agent ID × TapeOut</text>
  </svg>`;
}
function startOpen(){
  if(opening)return toast('先收下这批');
  opening=open5();flipN=0;phase='pack';
  $('#ovlTag').textContent='开包中';
  $('#ovlHint').textContent='点卡包撕开';
  $('#stage').innerHTML=`<div class="pack3d" id="bp" data-tilt><div class="rays"></div>${packArt('op')}<span class="foil"></span><span class="glare"></span></div>`;
  $('#bAll').style.display='none';$('#bDone').style.display='none';$('#bOpenIt').style.display='';
  $('#ovl').classList.add('on');
  beep(220,.12,'triangle',.05);
  $('#bp').onclick=dealCards;
}

function dealCards(){
  if(phase!=='pack')return;
  phase='burst';
  beep(140,.3,'sawtooth',.09);
  const bp=$('#bp');
  const best=opening.reduce((m,c)=>Math.max(m,c.r),0);
  if(best>=4){$('#ovl').classList.add('flashg');setTimeout(()=>$('#ovl').classList.remove('flashg'),620)}
  if(bp){
    bp.classList.add('boom');
    const burst=document.createElement('div');burst.className='burst';
    const FOILC=['#FF8AD8','#8AF0FF','#D4FF8A','#B79BFF','#F2EFFF'];
    for(let i=0;i<40;i++){
      const a=Math.random()*Math.PI*2,d=90+Math.random()*300;
      const col=best>=4&&Math.random()<.5?RCOL[best]:FOILC[i%FOILC.length];
      burst.insertAdjacentHTML('beforeend',
        `<i style="--dx:${(Math.cos(a)*d).toFixed(0)}px;--dy:${(Math.sin(a)*d).toFixed(0)}px;animation-delay:${(Math.random()*140).toFixed(0)}ms;background:${col}"></i>`);
    }
    bp.appendChild(burst);
  }
  setTimeout(()=>{
    if(!opening||!$('#ovl').classList.contains('on'))return;
    phase='cards';
    $('#bOpenIt').style.display='none';
    $('#ovlTag').textContent='开包结果';
    $('#ovlHint').textContent='点任意一张翻开';
    $('#stage').innerHTML='<div class="deal-head"><b>5</b>张卡，背面已经写着稀有度</div><div class="slots" id="slots"></div>';
    opening.forEach((c,i)=>{
      const st=statsOf(c);
      const d=document.createElement('div');
      d.className='slot r'+c.r;
      d.style.animationDelay=(i*95)+'ms';
      d.innerHTML=`<div class="fcard">
        <div class="face back"><span class="bk-r">${RAR[c.r]}</span><span class="bt">Agent Packs</span></div>
        <div class="face front">
          <div class="art">${artSVG(c,220,314)}</div>
          <div class="scrim"></div>
          <div class="fbody">
            <div class="fr">${RAR[c.r]}</div>
            <div class="fn">${cname(c)}</div>
            <div class="fs">${cskill(c)}</div>
            ${c.kind===1?`<div class="fi">身份卡 · ${fmtN(S.pool[c.ref].name)}</div>`:''}
            <div class="fst">ATK ${st.atk} · DEF ${st.def} · RAT ${st.rat}</div>
          </div>
        </div>
      </div>`;
      d.onclick=()=>flip(d,c);
      $('#slots').appendChild(d);
    });
    $('#bAll').style.display='';
  },460);
}

function flip(d,c){
  const fc=d.querySelector('.fcard');
  if(fc.classList.contains('flip')||phase!=='cards')return;
  fc.classList.add('flip');d.classList.add('done');
  d.querySelector('.front').classList.add('pop');
  fanfare(c.r);flipN++;
  if(c.r>=5){$('#ovl').classList.add('flashg');setTimeout(()=>$('#ovl').classList.remove('flashg'),620)}
  if(flipN>=5){
    $('#bDone').style.display='';$('#bAll').style.display='none';
    $('#ovlHint').textContent='';
    const top=Math.max(...opening.map(x=>x.r));
    toast('开出 '+opening.map(x=>RAR[x.r]).join(' · ')+(top>=4?' 🔥':''));
  }
}
$('#bOpenIt').onclick=()=>{if(phase==='pack')dealCards()};
$('#bAll').onclick=()=>{
  if(!opening)return;
  const cards=opening.slice();
  $$('.slot').forEach((d,i)=>setTimeout(()=>flip(d,cards[i]),i*230));
};
$('#bDone').onclick=()=>{$('#ovl').classList.remove('on');opening=null;renderAll()};
$('#bClose').onclick=()=>{$('#ovl').classList.remove('on');opening=null;renderAll()};

/* ══════════ 收藏 ══════════ */
let sortMode='r';
$$('[data-sort]').forEach(b=>b.onclick=()=>{
  sortMode=b.dataset.sort;
  $$('[data-sort]').forEach(x=>x.classList.toggle('on',x===b));
  renderCards();
});
function renderCards(){
  const g=$('#cGrid');g.innerHTML='';
  if(!S.cards.length){
    g.innerHTML=`<div class="empty" style="grid-column:1/-1">
      <div class="e-fan"><div class="e-card c0">C</div><div class="e-card c1">LR</div><div class="e-card c2">SR</div></div>
      <h4>收藏还是空的</h4>
      <p>第一包的第 5 张保底 SSR。开出的 .ai 身份卡和电路卡都会出现在这里，挑一张穿到你的 Agent ID 上。</p>
      <button class="btn primary xl" id="eOpen">开第一包</button>
      <span class="e-link" id="eOdds">先看概率与保底</span>
    </div>`;
    const eo=$('#eOpen');if(eo)eo.onclick=()=>{switchTab('open');S.packs.length?startOpen():toast('先去补给领免费包')};
    const ed=$('#eOdds');if(ed)ed.onclick=()=>switchTab('open');
    $('#cstat').textContent='0 张';
    return;
  }
  const arr=[...S.cards].sort((a,b)=>sortMode==='id'?a.id-b.id:sortMode==='atk'?statsOf(b).atk-statsOf(a).atk:(b.r-a.r||b.id-a.id));
  const eqc=S.cards.find(x=>x.id===S.equipped);
  $('#cstat').textContent='共 '+S.cards.length+' 张 · '+(eqc?'生效中 #'+eqc.id+' · '+ruleName(eqc)+' · '+ruleShort(eqc):'未装备规则');
  arr.forEach((c,i)=>{
    const t=document.createElement('div');
    t.className='cg-wrap';t.style.animationDelay=Math.min(i*22,300)+'ms';
    t.innerHTML=cardHTML(c);
    t.onclick=()=>detail(c.id);
    g.appendChild(t);
  });
}
function detail(id){
  const c=S.cards.find(x=>x.id===id);if(!c)return;
  const st=statsOf(c);
  const fuel=S.cards.filter(x=>x.id!==c.id&&x.id!==S.equipped);
  const m=$('#mbox');
  m.innerHTML=`<div class="detail">
    <div class="detail-card">${cardHTML(c)}</div>
    <div class="detail-info">
      <span class="eyebrow">${c.kind===1?'身份卡':'电路卡'} #${c.id} · ${RAR[c.r]}${c.star?' ★'+c.star:''}</span>
      <h3>${cname(c)}</h3>
      <p class="sub">${cdesc(c)}<br><span style="color:var(--dim2)">战斗技能：${cskill(c)}</span></p>
      <div class="dstat">
        <div><i>ATK</i><b>${st.atk}</b></div>
        <div><i>DEF</i><b>${st.def}</b></div>
        <div><i>RAT</i><b>${st.rat}</b></div>
      </div>
      <div class="rulebox">
        <div class="rb-head"><span class="eyebrow" style="margin:0">这张卡的规则</span>
          <span class="chip ${S.equipped===c.id?'teal':''}">${S.equipped===c.id?'生效中':'未装备'}</span></div>
        <div class="rb-name">${ruleName(c)}</div>
        <p class="rb-desc">${ruleLong(c)}</p>
        
        <div class="rb-test">
          <input class="inp" id="chkAmt" type="number" min="0" step="0.01" placeholder="金额 USD" ${c.kind===1?'disabled':''}>
          <select class="inp" id="chkPayee" ${c.kind===1?'disabled':''}>
            <option value="1">收款方有 Agent ID</option><option value="0">收款方没有 Agent ID</option>
          </select>
          <button class="btn sm primary cut" id="chkBtn" ${c.kind===1?'disabled':''}>复算</button>
        </div>
        <div class="rb-out" id="chkOut">按卡上参数复算一笔支付，不产生交易。</div>
        <div class="rb-note">equip() 后生效 · 任何人可调用 checkPayment() 复算</div>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn sm ${S.equipped===c.id?'':'primary'}" id="mEq">${S.equipped===c.id?'脱下这张卡':'穿到我的 Agent ID 上'}</button>
        <button class="btn sm ghost" id="mSell">卖出 +${SELL[c.r]} 分</button>
      </div>
      <div style="margin-top:18px">
        <span class="sub">升星 starUp() · 1 张燃料 = 1 星（上限 5）</span>
        <div class="fuel" id="fuelBox">${fuel.slice(0,50).map(f=>`<span class="fchip" data-f="${f.id}">#${f.id} · ${RAR[f.r]}</span>`).join('')||'<span class="sub">没有多余卡</span>'}</div>
        <button class="btn sm primary" id="mStar" style="margin-top:10px">升星（已选 <b id="fc">0</b>）</button>
      </div>
    </div>
  </div>`;
  $('#mmodal').classList.add('on');
  const ck=$('#chkBtn');
  if(ck)ck.onclick=()=>{
    const amt=Math.round((parseFloat($('#chkAmt').value)||0)*100);
    const hasId=$('#chkPayee').value==='1';
    const [ok,msg]=checkRule(c,amt,hasId,0,0,0,false);
    const out=$('#chkOut');
    out.className='rb-out '+(ok?'ok':'bad');
    out.textContent=(ok?'PASS · ':'FAIL · ')+msg+'（$'+usd(amt)+'）';
  };
  const picked=new Set();
  $$('#fuelBox .fchip').forEach(ch=>ch.onclick=()=>{
    const fid=+ch.dataset.f;picked.has(fid)?picked.delete(fid):picked.add(fid);
    ch.classList.toggle('sel');$('#fc').textContent=picked.size});
  $('#mEq').onclick=()=>{
    if(S.equipped===c.id){S.equipped=0;toast('已脱下')}
    else{S.equipped=c.id;S.mis.equip++;toast('已穿到 '+(S.name||'你的身份'))}
    beep(660,.1);save();$('#mmodal').classList.remove('on');renderAll()};
  $('#mSell').onclick=()=>{
    if(S.equipped===c.id)S.equipped=0;
    S.pts+=SELL[c.r];S.mis.sell++;
    S.cards=S.cards.filter(x=>x.id!==c.id);
    toast('已卖出 +'+SELL[c.r]+' 分');save();$('#mmodal').classList.remove('on');renderAll()};
  $('#mStar').onclick=()=>{
    if(!picked.size)return toast('先选择燃料卡');
    S.cards=S.cards.filter(x=>!picked.has(x.id));
    c.star=Math.min(5,c.star+picked.size);S.mis.star++;
    beep(880,.16,'triangle',.08);toast('升到 ★'+c.star);save();$('#mmodal').classList.remove('on');renderAll()};
}
$('#mmodal').onclick=e=>{if(e.target.id==='mmodal')$('#mmodal').classList.remove('on')};
$('#bRedeem').onclick=()=>{
  if(S.pts<500)return toast('积分不够（需 500）');
  S.pts-=500;S.mis.redeem++;
  S.cards.push({id:S.nextId++,r:3,star:0,kind:0,ref:Math.floor(Math.random()*8)});
  beep(784,.2,'triangle',.08);toast('兑换成功：1 张保底 SR');save();renderAll();
};

/* ══════════ 自走棋 ══════════ */
function renderChapters(){
  const g=$('#chGrid');if(g){g.innerHTML='';
  CHAPTERS.forEach(ch=>{
    const done=!!S.chCleared[ch.id];
    const d=document.createElement('div');d.className='ch'+(done?' done':'');
    d.innerHTML=`<div class="chn">${ch.y}</div>
      <div class="cht">${ch.t}</div>
      <div class="chd">${ch.d}</div>
      <div class="chm"><span class="pips" title="难度 ${ch.lvl}/5">${'<i></i>'.repeat(ch.lvl)}</span><span>${done?'✓ 已通关':'首通 +2 包 +30 分'}</span></div>`;
    d.onclick=()=>startChapter(ch);g.appendChild(d);
  });}
  renderTeam();
  const pr=$('#chProg');
  if(pr)pr.innerHTML=CHAPTERS.map(ch=>`<div class="cprow${S.chCleared[ch.id]?' ok':''}">
    <span class="cpy">${ch.y}</span><b>${ch.t}</b><i>${S.chCleared[ch.id]?'✓':'—'}</i></div>`).join('');
  const cd=$('#chDone');if(cd)cd.textContent=Object.keys(S.chCleared).length+' / 5';
}
function renderTeam(){
  const slots=$('#teamSlots');if(!slots)return;
  S.team=S.team.filter(id=>S.cards.some(c=>c.id===id)).slice(0,3);
  slots.innerHTML=[0,1,2].map(i=>{
    const c=S.cards.find(x=>x.id===S.team[i]);
    return c?`<div class="tslot filled r${c.r}" data-id="${c.id}">
        <span class="ts-r">${RAR[c.r]}</span><span class="ts-n">${cname(c)}</span><span class="ts-x">×</span></div>`
      :`<div class="tslot"><span class="ts-e">空位 ${i+1}</span><span class="ts-h">从下面选 1 张卡</span></div>`;
  }).join('');
  $$('#teamSlots .tslot.filled').forEach(el=>el.onclick=()=>{
    S.team=S.team.filter(id=>id!==+el.dataset.id);save();renderTeam()});
  const tn=$('#teamN');if(tn)tn.textContent=S.team.length+' / 3';
  const pool=$('#teamPool');if(!pool)return;
  pool.innerHTML=S.cards.length?[...S.cards].sort((a,b)=>b.r-a.r||b.id-a.id).map(c=>{
    const on=S.team.includes(c.id);
    return `<button class="tpick r${c.r}${on?' on':''}" data-id="${c.id}"><b>${RAR[c.r]}</b><span>${cname(c)}</span></button>`;
  }).join(''):'<span class="sub">还没有卡 · 先去开包</span>';
  $$('#teamPool .tpick').forEach(b=>b.onclick=()=>{
    const id=+b.dataset.id;
    if(S.team.includes(id))S.team=S.team.filter(x=>x!==id);
    else if(S.team.length>=3)return toast('只能带 3 张卡');
    else S.team.push(id);
    save();renderTeam();
  });
}
let B=null;
function startChapter(ch){
  const myCards=S.team.length===3?S.team.slice():[...S.cards].sort((a,b)=>b.r-a.r).slice(0,3).map(c=>c.id);
  if(myCards.length<3)return toast('需要至少 3 张卡');
  S.team=myCards;
  const mk=(c,side)=>{
    const st=statsOf(c);
    return{n:side==='me'?cname(c):'野生·'+HOUSE[Math.floor(Math.random()*8)].n,
      mhp:Math.round(side==='me'?100:66+ch.lvl*8),hp:0,atk:Math.max(3,Math.round(st.atk*(side==='me'?1:0.5+ch.lvl*0.1))),
      sk:(c.kind===1?c.ref%8:c.ref),side,alive:true,buff:0,r:c.r};};
  const team=myCards.map(id=>mk(S.cards.find(c=>c.id===id),'me'));
  B={ch,team,wave:1,boss:false,log:[],over:false};
  B.foes=()=>[0,1,2].map(()=>mk({r:Math.min(5,Math.floor(Math.random()*4)+1),ref:Math.floor(Math.random()*8),kind:0,star:0},'en'));
  B.me=team.map(u=>({...u,hp:u.mhp}));
  $('#arena').classList.add('on');
  $('#arenaCh').textContent=ch.y+' · '+ch.t;
  nextWave();
}
function nextWave(){
  const ch=B.ch;
  if(B.wave>1)B.me.forEach(u=>{if(u.alive)u.hp=Math.min(u.mhp,u.hp+Math.round(u.mhp*0.35))});
  B.boss=(B.wave===4);
  B.en=B.foes().map(u=>{const m=1+B.wave*0.12+(B.boss?0.5:0);
    u.atk=Math.round(u.atk*m);u.mhp=Math.round(u.mhp*m);u.hp=u.mhp;
    if(B.boss)u.n='BOSS · '+u.n;return u});
  B.log.push('—— 第 '+B.wave+' 波'+(B.boss?' · Boss':'')+' ——');
  $('#arenaTag').textContent=B.boss?'Boss 战':'第 '+B.wave+' 波';
  simBattle();
}
function simBattle(){
  let guard=0;
  while(B.me.some(u=>u.alive)&&B.en.some(u=>u.alive)&&guard++<200){
    for(const u of [...B.me,...B.en].filter(x=>x.alive)){
      if(!u.alive)continue;
      const foes=(u.side==='me'?B.en:B.me).filter(x=>x.alive);if(!foes.length)break;
      let dmg=u.atk*(1+u.buff);u.buff+=u.sk===3?0.15:0;
      const target=foes[Math.floor(Math.random()*foes.length)];
      if(u.sk===1&&u.hp>90*u.mhp/100)dmg*=1.6;
      if(u.sk===5&&target.hp<0.25*target.mhp)dmg*=2;
      if(u.sk===6)dmg*=1.8;
      if(u.sk===2)dmg*=0.8;if(u.sk===7)dmg*=0.7;
      dmg=Math.max(1,Math.round(dmg));
      const hit=t=>{let d=dmg;if(t.sk===2)d*=0.8;if(t.sk===7)d*=0.7;
        t.hp=Math.max(0,Math.round(t.hp-d));
        B.log.push(u.n+' → '+t.n+' -'+Math.round(d));
        if(t.hp===0){t.alive=false;B.log.push('  '+t.n+' 阵亡')}};
      if(u.sk===4){dmg=Math.round(dmg*0.6);foes.forEach(hit)}else hit(target);
      if(u.sk===7&&u.alive){const back=Math.round(dmg*0.25);u.hp=Math.max(0,u.hp-back);
        B.log.push(target.n+' 反弹 '+u.n+' -'+back);if(u.hp===0){u.alive=false;B.log.push('  '+u.n+' 阵亡')}}
      if(u.sk===6&&u.alive){const self=Math.round(u.mhp*0.06);u.hp=Math.max(0,u.hp-self);
        B.log.push(u.n+' 杠杆自损 -'+self);if(u.hp===0){u.alive=false;B.log.push('  '+u.n+' 阵亡')}}
      if(u.sk===0&&u.alive&&u.hp<0.4*u.mhp){u.hp=Math.min(u.mhp,u.hp+Math.round(0.08*u.mhp));
        B.log.push(u.n+' 止损回血 +'+Math.round(0.08*u.mhp))}
      if(!B.me.some(x=>x.alive)||!B.en.some(x=>x.alive))break;
    }
  }
  drawBattle();
  const meAlive=B.me.some(u=>u.alive);
  if(!meAlive){B.over=true;S.l++;S.mis.battle++;
    B.log.push('','× 全军覆没——升星或换技能再来');drawBattle();save();renderAll();return}
  if(B.boss){B.over=true;S.w++;S.mis.battle++;S.mis.clear=1;
    const first=!S.chCleared[B.ch.id];S.chCleared[B.ch.id]=true;
    if(first){S.pts+=30;S.packs.push(1,1);toast('首通 '+B.ch.t+'：+30 分 +2 包')}
    else{S.pts+=15;toast('通关：+15 分')}
    B.log.push('','★ 通关 '+B.ch.t+'！'+(first?'首通奖励 +30 分 +2 包':''));
    [523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.25,'triangle',.09),i*110));
    drawBattle();save();renderAll();return}
  B.wave++;B.log.push('（波次胜利，进入下一波）');
  $('#bNext').style.display='';
}
function drawBattle(){
  const mk=(u)=>{
    const d=document.createElement('div');
    d.className='unit'+(u.alive?'':' dead');
    d.innerHTML=`<div class="un">${u.n}<span>${u.alive?u.hp+'/'+u.mhp:'KO'}</span></div>
      <div class="hpline"><div class="hpb ${u.side==='en'?'en':''}" style="width:${Math.max(0,100*u.hp/u.mhp)}%"></div></div>`;
    return d;
  };
  const me=$('#unitsMe'),en=$('#unitsEn');
  me.innerHTML='';en.innerHTML='';
  B.me.forEach(u=>me.appendChild(mk(u)));
  B.en.forEach(u=>en.appendChild(mk(u)));
  $('#blog').textContent=B.log.join('\n');
  $('#blog').scrollTop=99999;
  if(B.over)$('#bNext').style.display='none';
}
$('#bNext').onclick=()=>{$('#bNext').style.display='none';nextWave()};

/* ══════════ 任务 ══════════ */
function mval(k){
  if(k==='open5')return S.mis.open5;if(k==='open15')return S.mis.open15;if(k==='open50')return S.mis.open50;
  if(k==='streak')return 1;
  return S.mis[k]||0;
}
function renderMis(){
  const total=MS_DEF.length;
  const claimedN=MS_DEF.filter(m=>S.claimed[m.k]).length;
  const ready=MS_DEF.filter(m=>Math.min(mval(m.k),m.g)>=m.g&&!S.claimed[m.k]).length;
  const sum=$('#misSummary');
  if(sum)sum.innerHTML=`
    <div class="scard"><div class="k">今天已领</div><div class="v">${claimedN}<span> / ${total}</span></div>
      <div class="sbar"><i style="width:${(claimedN/total*100).toFixed(0)}%"></i></div></div>
    <div class="scard"><div class="k">可以领取</div><div class="v">${ready}<span> 份奖励</span></div>
      <div class="n">${ready?'在下面的任务里点「领取」':'做完任意一项就能领'}</div></div>
    <div class="scard gold"><div class="k">全部做完</div><div class="v">SSR 包 ×1</div>
      <div class="n">${total} 项全清，保底 SSR</div></div>`;

  const b=$('#misBox');if(!b)return;b.innerHTML='';
  MS_DEF.forEach(m=>{
    const v=Math.min(mval(m.k),m.g),done=v>=m.g,cl=S.claimed[m.k];
    const row=document.createElement('div');
    row.className='tcard'+(done?' done':'');
    row.innerHTML=`<div class="tn">${m.n}</div>
      <div class="tp">${v} / ${m.g}</div>
      <button class="btn sm ${done&&!cl?'primary':'ghost'}" ${done&&!cl?'':'disabled'}>${cl?'已领取':'领取 '+m.rw+' '+m.t}</button>
      <div class="tbar"><i style="width:${Math.round(v/m.g*100)}%"></i></div>`;
    if(done&&!cl)row.querySelector('button').onclick=()=>{
      S.claimed[m.k]=true;
      if(m.t==='包'){for(let i=0;i<m.rw;i++)S.packs.push(1)}else S.pts+=m.rw;
      beep(660,.12);toast('任务奖励：'+m.rw+' '+m.t);save();renderAll()};
    b.appendChild(row);
  });

  const lock=$('#misLock');
  if(lock){
    const need=Math.max(0,10-(S.mis.open5||0));
    lock.innerHTML=need?`<span class="lk">🔒</span> 再开 <b>${need}</b> 个包，解锁进阶任务和周榜`:
      `<span class="lk ok">✓</span> 进阶任务和周榜已解锁`;
  }
  const foot=$('#misFoot');
  const allDone=claimedN>=total;
  if(foot)foot.innerHTML=`<span class="fname">做完今天全部 ${total} 项任务</span>
    <span class="fp">${claimedN} / ${total}</span>
    <button class="btn sm ${allDone&&!S.claimed.__all?'primary':'ghost'}" id="bAllMis" ${allDone&&!S.claimed.__all?'':'disabled'}>${S.claimed.__all?'已领取':'领取 SSR 包'}</button>`;
  const am=$('#bAllMis');
  if(am&&allDone&&!S.claimed.__all)am.onclick=()=>{S.claimed.__all=true;S.packs.push(1);S.ssrNext=true;
    beep(784,.2,'triangle',.08);toast('全清奖励：1 个 SSR 保底包');save();renderAll()};
}

/* ══════════ 卡池 ══════════ */
function ensurePool(){
  DEMO_NAMES.forEach(n=>{if(!S.pool.some(p=>p.name===n))S.pool.push({name:n,active:true,mine:false,pulls:0})});
  if(S.name&&!S.pool.some(p=>p.name===S.name))S.pool.push({name:S.name,active:S.myInPool,mine:true,pulls:0});
}
function renderPool(){
  ensurePool();
  const b=$('#poolBox');b.innerHTML='';
  const act=S.pool.filter(p=>p.active).length;
  b.insertAdjacentHTML('beforeend','<div class="sub" style="margin-bottom:10px">在池身份 <b style="color:var(--teal)">'+act+'</b> 个（演示档含生态示例名）</div>');
  S.pool.forEach(p=>{
    const row=document.createElement('div');
    row.className='prow'+(p.mine?' mine':'');
    const initial=(p.name||'?').replace('.ai','').slice(0,1).toUpperCase();
    row.innerHTML=`<div class="pav">${initial}</div>
      <div class="pinfo">
        <div class="pname">${fmtN(p.name)}${p.mine?' <span class="mono" style="font-size:9px">你</span>':''}</div>
        <div class="pmeta">${p.active?'在池 · 可被抽到':'已退出 · 历史卡绝版'}</div>
      </div>
      <div class="pstat"><span class="pdot ${p.active?'':'off'}"></span>× ${p.pulls||0}</div>`;
    b.appendChild(row);
  });
}
$('#bClaim').onclick=()=>{
  let v=$('#nmIn').value.trim();if(!v)return toast('先填一个 .ai 名字');
  if(!v.endsWith('.ai'))v=v+'.ai';
  S.name=v;
  const mine=S.pool.find(p=>p.name===v);
  if(mine){mine.active=true;mine.mine=true}
  else S.pool.push({name:v,active:true,mine:true,pulls:0});
  S.myInPool=true;S.mis.join=1;
  beep(784,.2,'triangle',.08);toast('已认领 '+v+' 并入池');save();renderAll();
};
$('#bLeavePool').onclick=()=>{
  if(!S.name)return toast('先认领一个 .ai');
  const p=S.pool.find(x=>x.name===S.name);
  if(!p||!p.active)return toast('你不在池中');
  p.active=false;S.myInPool=false;toast('已退出 · 历史卡成为绝版');save();renderAll();
};
let resetArmed=false;
$('#bReset').onclick=()=>{
  if(!resetArmed){resetArmed=true;$('#bReset').textContent='⚠ 再点一次确认';
    setTimeout(()=>{resetArmed=false;$('#bReset').textContent='重置演示档'},3000);return}
  localStorage.removeItem(SKEY);location.reload();
};

/* ══════════ 补给 ══════════ */
$$('[data-buy]').forEach(b=>b.onclick=()=>{
  const t=+b.dataset.buy;const n=[10,13,122][t];
  for(let i=0;i<n;i++)S.packs.push(1);
  beep(523,.12);toast('已到账 '+n+' 包（演示档）');save();renderAll();
});
$('#bFollow').onclick=()=>{
  if(S.followed)return toast('已领取过');
  S.followed=true;for(let i=0;i<10;i++)S.packs.push(1);
  toast('关注奖励 +10 包（演示）');save();renderAll();
};

/* ══════════ 落地 & 开包按钮 ══════════ */
$('#bOpen1').onclick=()=>{if(!S.packs.length)return toast('包空了，等待恢复或去补给');S.packs.pop();save();startOpen()};
$('#bOpen5').onclick=()=>{if(S.packs.length<5)return toast('至少要 5 个包（去补给领取）');
  S.packs.splice(0,5);save();startOpen()};
$('#bLandOpen').onclick=()=>{if(!S.packs.length)S.packs.push(1);switchTab('open');S.packs.pop();save();startOpen()};
$('#bLandPool').onclick=()=>switchTab('verify');
$$('.tab').forEach(t=>t.onclick=()=>switchTab(t.dataset.v));
$('#heroPackWrap').onclick=()=>$('#bLandOpen').click();
$('#brandHome').onclick=e=>{
  e.preventDefault();
  $$('.view').forEach(x=>x.classList.remove('on'));
  $$('.tab').forEach(t=>t.classList.remove('on'));
  $('#land').style.display='';
  window.scrollTo({top:0,behavior:'instant'});
  renderAll();
};

/* ══════════ 链上 · 真交易 ══════════ */
const CHAIN_ABI=[
 "function claimDailyPack() returns (uint256)",
 "function buyPack(uint8) payable",
 "function packCommit(uint256,bytes32)",
 "function packReveal(uint256,bytes32)",
 "function claimIntoPool()","function leavePool()",
 "function equip(uint256)","function unequip()",
 "function invite(address)",
 "function isAgentIdHolder(address) view returns (bool)",
 "function packPoints(address) view returns (uint256)",
 "function packCount() view returns (uint256)",
 "function cardCount() view returns (uint256)",
 "function cardInfo(uint256) view returns ((uint8,uint8,uint8,uint32))",
 "function ruleOf(uint256) view returns (uint8,uint256,uint256)",
 "function equippedRule(address) view returns (uint256,uint8,uint256,uint256)",
 "function checkPayment(address,uint256,address,uint256,uint16,uint64,bool) view returns (bool,string)"
];
let chainAcc=null,chainPending=null;
try{chainPending=JSON.parse(localStorage.getItem('ap_pending')||'null')}catch(e){}
function coreAddr(){return localStorage.getItem('ap_core')||''}
/* 链 ID 以十六进制存：0x38 = 56（主网），0x61 = 97（测试网） */
function netId(){const v=localStorage.getItem('ap_chain');return v==='61'||v==='97'?'61':'38'}
function netName(){return netId()==='61'?'BNB 测试网 97':'BNB 主网 56'}
function chainScan(){return netId()==='61'?'https://testnet.bscscan.com':'https://bscscan.com'}
function savePending(){localStorage.setItem('ap_pending',chainPending?JSON.stringify(chainPending):'')}
async function chainProvider(){return new ethers.providers.Web3Provider(window.ethereum)}
async function getSigner(){const p=await chainProvider();await p.send('eth_requestAccounts',[]);return p.getSigner()}
async function ensureChain(){
  const id='0x'+netId();
  try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:id}]})}
  catch(e){if(id==='0x61'){try{await window.ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:'0x61',chainName:'BNB Smart Chain Testnet',nativeCurrency:{name:'tBNB',symbol:'tBNB',decimals:18},rpcUrls:['https://data-seed-prebsc-1-s1.binance.org:8545'],blockExplorerUrls:['https://testnet.bscscan.com']}]})}catch(_){}}}
}
async function chainSend(fn,args,opts){
  const s=await getSigner();await ensureChain();
  const core=new ethers.Contract(coreAddr(),CHAIN_ABI,s);
  const tx=await core[fn](...(args||[]),opts||{});
  return await tx.wait();
}
function txLink(hash){return '<a href="'+chainScan()+'/tx/'+hash+'" target="_blank" style="color:var(--gold)" class="mono">'+hash.slice(0,12)+'…↗</a>'}
async function chainRead(fn,args){
  const p=await chainProvider();
  const core=new ethers.Contract(coreAddr(),CHAIN_ABI,p);
  return await core[fn](...(args||[]));
}
function renderChain(){
  const box=$('#chainBox');if(!box)return;
  $('#cAddr').value=coreAddr();
  $('#cChain').textContent=netName();
  if(!coreAddr()){
    box.innerHTML='<div class="chain-status">● 未配置合约地址 —— 按 <span class="mono">contracts/DEPLOY.md</span> 部署 AgentPackCore 后，把地址粘贴到上方保存。</div>';
    return;
  }
  if(typeof ethers==='undefined'){box.innerHTML='<div class="chain-status bad">● ethers 库加载失败（离线环境），联网后刷新。</div>';return}
  if(!window.ethereum){box.innerHTML='<div class="chain-status bad">● 未检测到浏览器钱包 —— 请用 Binance Wallet / MetaMask 内置浏览器打开。</div>';return}
  box.innerHTML=`<div class="chain-status ok">● 合约 <span class="mono">${coreAddr().slice(0,10)}…${coreAddr().slice(-6)}</span> · ${netName()}</div>
    <div class="chain-actions">
      <button class="btn primary" id="bCC">连接钱包</button>
      <button class="btn primary" id="bCClaim">领包 + 承诺</button>
      <button class="btn" id="bCReveal" ${chainPending?'':'disabled'}>揭示 ${chainPending?'#'+chainPending.pid:''}</button>
    </div>
    <div class="chain-sep"></div>
    <div class="chain-actions">
      <button class="btn" id="bCBuy">买首充包 0.002 BNB</button>
      <button class="btn" id="bCJoin">入池 claimIntoPool</button>
      <button class="btn ghost" id="bCLeave">退池 leavePool</button>
    </div>
    <div class="chain-actions">
      <input class="inp" id="cCard" placeholder="卡号 #">
      <button class="btn" id="bCEquip">穿卡 equip</button>
      <button class="btn ghost" id="bCPts">查积分 packPoints</button>
    </div>
    <div class="chain-status" id="cStatus" style="margin-top:12px">● 等待连接</div>`;
  const st=(t,cls)=>{const el=$('#cStatus');el.className='chain-status '+(cls||'');el.innerHTML=t};
  if(chainAcc)st('● 已连接 <span class="mono">'+chainAcc+'</span>','ok');
  $('#bCC').onclick=async()=>{
    try{chainAcc=(await window.ethereum.request({method:'eth_requestAccounts'}))[0];
      await ensureChain();
      const held=await chainRead('isAgentIdHolder',[chainAcc]);
      st('● 已连接 <span class="mono">'+chainAcc+'</span><br>Agent ID 持有：<b style="color:'+(held?'var(--teal)':'var(--red)')+'">'+(held?'✓ 持有 .ai':'✗ 未持有')+'</b>'+(held?'':' —— 请先在 Binance App 领取 Agent ID'),held?'ok':'bad');
    }catch(e){toast('连接失败：'+(e.message||e))}};
  $('#bCClaim').onclick=async()=>{
    try{st('● 发送 claimDailyPack…');
      const before=Number(await chainRead('packCount'));
      const rc1=await chainSend('claimDailyPack');
      const pid=before+1;
      const salt=ethers.utils.hexlify(ethers.utils.randomBytes(32));
      await chainSend('packCommit',[pid,ethers.utils.keccak256(salt)]);
      chainPending={pid,salt};savePending();
      st('● 领包 + 承诺完成（pack #'+pid+'）'+txLink(rc1.transactionHash)+'<br>等约 3 秒（一个区块）后点「揭示」','ok');
      renderChain();
    }catch(e){st('● '+(e.reason||e.message||e),'bad')}};
  $('#bCReveal').onclick=async()=>{
    if(!chainPending)return toast('先完成领包 + 承诺');
    try{st('● 揭示 packReveal #'+chainPending.pid+'…');
      const rc=await chainSend('packReveal',[chainPending.pid,chainPending.salt]);
      const start=Number(await chainRead('cardCount'));
      let ids='';for(let i=start-4;i<=start;i++){try{const c=await chainRead('cardInfo',[i]);ids+=' #'+i+'·'+RAR[c[0]];}catch(e){}}
      chainPending=null;savePending();
      st('● 开包成功 '+txLink(rc.transactionHash)+'<br>开出：'+ids,'ok');
      beep(784,.25,'triangle',.09);
    }catch(e){st('● '+(e.reason||e.message||e),'bad')}};
  $('#bCBuy').onclick=async()=>{
    try{st('● 发送 buyPack(0) 0.002 BNB…');
      const before=Number(await chainRead('packCount'));
      const rc1=await chainSend('buyPack',[0],{value:ethers.utils.parseEther('0.002')});
      const pid=before+1;
      const salt=ethers.utils.hexlify(ethers.utils.randomBytes(32));
      await chainSend('packCommit',[pid,ethers.utils.keccak256(salt)]);
      chainPending={pid,salt};savePending();
      st('● 付费包 + 承诺完成（pack #'+pid+'）'+txLink(rc1.transactionHash)+' —— 等约 3 秒后点「揭示」','ok');
      renderChain();
    }catch(e){st('● '+(e.reason||e.message||e),'bad')}};
  $('#bCJoin').onclick=async()=>{try{const rc=await chainSend('claimIntoPool');st('● 已入池 '+txLink(rc.transactionHash),'ok');beep(784,.2)}catch(e){st('● '+(e.reason||e.message||e),'bad')}};
  $('#bCLeave').onclick=async()=>{try{const rc=await chainSend('leavePool');st('● 已退池（历史卡绝版）'+txLink(rc.transactionHash),'ok')}catch(e){st('● '+(e.reason||e.message||e),'bad')}};
  $('#bCEquip').onclick=async()=>{try{
      const id=$('#cCard').value.trim().replace('#','');if(!id)return toast('填卡号');
      const rc=await chainSend('equip',[Number(id)]);
      st('● 已穿卡 #'+id+' '+txLink(rc.transactionHash),'ok');beep(660,.15);
    }catch(e){st('● '+(e.reason||e.message||e),'bad')}};
  $('#bCPts').onclick=async()=>{try{
      if(!chainAcc)chainAcc=(await window.ethereum.request({method:'eth_requestAccounts'}))[0];
      const pts=await chainRead('packPoints',[chainAcc]);
      st('● packPoints = <b style="color:var(--gold)">'+pts+'</b>','ok');
    }catch(e){st('● '+(e.reason||e.message||e),'bad')}};
}
$('#bSaveAddr').onclick=()=>{
  const v=$('#cAddr').value.trim();
  if(v&&!/^0x[0-9a-fA-F]{40}$/.test(v))return toast('地址格式不正确');
  localStorage.setItem('ap_core',v);
  toast(v?'合约地址已保存':'已清空');renderChain();
};
$('#bRuleCheck').onclick=async()=>{
  const out=$('#ruleOut');
  const say=(t,cls)=>{out.className='banner'+(cls?' '+cls:'');out.innerHTML=t};
  try{
    if(!window.ethereum)return say('没有检测到钱包。演示档可在收藏册里用「复算」试算同一套规则。');
    if(!coreAddr())return say('先在上面填入 AgentPackCore 合约地址。');
    if(!chainAcc)chainAcc=(await window.ethereum.request({method:'eth_requestAccounts'}))[0];
    const [cid,t]=await chainRead('equippedRule',[chainAcc]);
    if(Number(cid)===0)return say('这个地址还没有穿卡。先到「收藏」里 equip() 一张。');
    const amt=Math.round((parseFloat($('#rcAmt').value)||0)*100);
    const payee=$('#rcPayee').value.trim()||chainAcc;
    if(!/^0x[0-9a-fA-F]{40}$/.test(payee))return say('收款方地址格式不对。');
    const spent=Math.round((parseFloat($('#rcSpent').value)||0)*100);
    const [ok,reason]=await chainRead('checkPayment',[chainAcc,amt,payee,spent,0,0,false]);
    say((ok?'<b style="color:var(--teal)">PASS</b> · ':'<b style="color:var(--red)">FAIL</b> · ')+reason+
      ' <span class="mono">· card #'+Number(cid)+' · rule '+Number(t)+'</span>');
  }catch(e){say('● '+(e.reason||e.message||e))}
};
$('#bTogChain').onclick=()=>{
  localStorage.setItem('ap_chain',netId()==='38'?'61':'38');
  renderChain();toast('切换到 '+netName());
};

/* ══════════ 守门人：规则电路实战 ══════════
   每笔请求都过一遍规则栈（与合约 checkPayment 同参数）；
   玩家不操作 = 按规则自动处理；手动操作 = 人工放行/拦截（对应合约的 approved 标志）。 */
const GATE_N=10, GATE_MS=6000;
const GATE_LEGIT=[
  {m:'GPU 推理账单',lo:800,hi:4200},{m:'数据集月度订阅',lo:1000,hi:3000},{m:'API 调用费',lo:100,hi:1200},
  {m:'翻译服务结算',lo:500,hi:2500},{m:'链上存证 gas 报销',lo:100,hi:600},{m:'向量库存储费',lo:300,hi:1800},
];
const GATE_SCAM=[
  {k:'refund',m:'「紧急退款」请立刻付款',lo:12000,hi:60000,id:false},
  {k:'airdrop',m:'空投领取，先付 gas',lo:1500,hi:6000,id:false,fake:true},
  {k:'upgrade',m:'套餐「自动升级」',lo:30000,hi:90000,id:true},
  {k:'dupe',m:'',id:true},
];
const lookalike=n=>{const b=n.replace('.ai','');const swaps=[[/l/,'I'],[/o/,'0'],[/i/,'1'],[/e/,'3']];
  for(const [a,z] of swaps)if(a.test(b))return b.replace(a,z)+'.ai';return b+'.al'};
const rndAddr=()=>'0x'+[...Array(4)].map(()=>Math.floor(Math.random()*16).toString(16)).join('')+'…'+[...Array(4)].map(()=>Math.floor(Math.random()*16).toString(16)).join('');
const rint=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
let G=null, gateSel=[];

function gateEval(c,q,st){
  const {t,p1}=ruleParams(c);
  if(t===7){const ok=st.lastAt===null||q.at-st.lastAt>=p1;return ok?[1,'冷却已满足']:[0,'距上一笔不到 '+Math.round(p1/60)+' 分钟']}
  if(t===8)return q.payee===S.pool[c.ref]?.name?[1,'是正主']:[0,'不是这张卡的正主'];
  return checkRule(c,q.amt,q.hasId,st.spent,st.count,0,false);
}
function gateMake(){
  ensurePool();
  const names=S.pool.filter(p=>p.active).map(p=>p.name);
  const qs=[];let clock=9*3600,prev=null;
  const scamSlots=new Set();while(scamSlots.size<4)scamSlots.add(rint(1,GATE_N-1));
  for(let i=0;i<GATE_N;i++){
    clock+=rint(4,55)*60;
    let q;
    if(scamSlots.has(i)){
      let s=GATE_SCAM[rint(0,GATE_SCAM.length-1)];
      if(s.k==='dupe'&&!prev)s=GATE_SCAM[0];
      if(s.k==='dupe'){q={payee:prev.payee,hasId:prev.hasId,amt:prev.amt,memo:prev.memo+'（重复扣款）',scam:true,kind:'dupe'};clock=prev.at+rint(20,90)}
      else{const nm=names[rint(0,names.length-1)];
        q={payee:s.fake?lookalike(nm):(s.id?nm:rndAddr()),hasId:!!s.id,amt:rint(s.lo,s.hi),memo:s.m,scam:true,kind:s.k}}
    }else{
      const l=GATE_LEGIT[rint(0,GATE_LEGIT.length-1)];
      q={payee:names[rint(0,names.length-1)],hasId:true,amt:rint(l.lo,l.hi),memo:l.m,scam:false,kind:'legit'};
    }
    q.at=clock;qs.push(q);if(!q.scam)prev=q;
  }
  return qs;
}
function gateCards(){return S.cards.filter(c=>c.kind===0).sort((a,b)=>b.r-a.r||b.id-a.id)}
function renderGate(){
  if(!$('#gateStack'))return;
  gateSel=gateSel.filter(id=>S.cards.some(c=>c.id===id));
  if(!gateSel.length&&S.equipped&&S.cards.some(c=>c.id===S.equipped&&c.kind===0))gateSel=[S.equipped];
  $('#gateN').textContent=gateSel.length+' / 3';
  $('#gateStack').innerHTML=[0,1,2].map(i=>{
    const c=S.cards.find(x=>x.id===gateSel[i]);
    return c?`<div class="gslot r${c.r}" data-id="${c.id}"><span class="ts-r">${RAR[c.r]}</span><b>${ruleName(c)}</b><span>${ruleShort(c)}</span><span class="ts-x">×</span></div>`
      :`<div class="gslot empty"><span>空槽 ${i+1}</span><b>从下面挑一张电路卡</b></div>`;
  }).join('');
  $$('#gateStack .gslot[data-id]').forEach(el=>el.onclick=()=>{gateSel=gateSel.filter(x=>x!==+el.dataset.id);renderGate()});
  const pool=gateCards();
  $('#gatePool').innerHTML=pool.length?pool.map(c=>`<button class="tpick r${c.r}${gateSel.includes(c.id)?' on':''}" data-id="${c.id}"><b>${RAR[c.r]}</b><span>${ruleName(c)} · ${ruleShort(c)}</span></button>`).join('')
    :'<span class="sub">还没有电路卡，先去开包。</span>';
  $$('#gatePool .tpick').forEach(b=>b.onclick=()=>{
    const id=+b.dataset.id;
    if(gateSel.includes(id))gateSel=gateSel.filter(x=>x!==id);
    else if(gateSel.length>=3)return toast('规则栈最多 3 张');
    else gateSel.push(id);
    renderGate();
  });
  $('#gateHint').textContent=gateSel.length?'规则越多越严，也越容易误杀真账单。':'不放规则也能玩，但每一笔都得你自己判断。';
  const best=S.gateBest;
  $('#gateBest').innerHTML=best?`<span class="gb-k">你的最好成绩</span><b class="grade g${best.g}">${best.g}</b><span>拦下 $${usd(best.saved)} · 被骗 $${usd(best.lost)}</span>`
    :`<span class="gb-k">还没打过</span><b class="grade">—</b><span>评级 S 奖励 3 包，A 2 包，B 1 包</span>`;
}
function gateStart(){
  G={qs:gateMake(),i:0,stack:gateSel.map(id=>S.cards.find(c=>c.id===id)).filter(Boolean),
     st:{spent:0,count:0,lastAt:null},paid:0,saved:0,lost:0,miss:0,right:0,log:[],t0:0,raf:0,busy:false};
  $('#gateSetup').hidden=true;$('#gateEnd').hidden=true;$('#gatePlay').hidden=false;
  $('#gLog').innerHTML='';
  gateShow();
}
function gateVerdict(q){
  const res=G.stack.map(c=>({c,r:gateEval(c,q,G.st)}));
  return{res,ok:res.every(x=>x.r[0])};
}
function gateShow(){
  const q=G.qs[G.i];G.busy=false;
  const v=gateVerdict(q);G.v=v;
  const hh=String(Math.floor(q.at/3600)%24).padStart(2,'0'),mm=String(Math.floor(q.at/60)%60).padStart(2,'0');
  $('#gQ').textContent=G.i+1;
  const inv=$('#gInv');
  inv.className='invoice';void inv.offsetWidth;inv.classList.add('in');
  inv.innerHTML=`<div class="inv-top"><span>付款请求 #${String(G.i+1).padStart(2,'0')}</span><span>${hh}:${mm}</span></div>
    <div class="inv-amt">$${usd(q.amt)}</div>
    <div class="inv-memo">${q.memo}</div>
    <dl class="inv-meta">
      <div><dt>收款方</dt><dd class="mono">${q.payee}</dd></div>
      <div><dt>Agent ID</dt><dd class="${q.hasId?'ok':'bad'}">${q.hasId?'注册表可查到':'注册表查不到'}</dd></div>
    </dl>`;
  $('#gRules').innerHTML=v.res.length?v.res.map(x=>`<div class="grule ${x.r[0]?'ok':'bad'}"><span class="gr-n">${ruleName(x.c)}</span><span class="gr-v">${x.r[0]?'通过':'拦截'}</span><span class="gr-why">${x.r[1]}</span></div>`).join('')
      +`<div class="gverdict ${v.ok?'ok':'bad'}">规则判定：${v.ok?'放行':'拦截'}</div>`
    :`<div class="gverdict none">没有规则，全靠你。不动手默认放行。</div>`;
  $('#gTip').textContent='不动手 6 秒后按规则处理。←/A 拦截，→/D 放行。';
  G.t0=performance.now();cancelAnimationFrame(G.raf);
  const tick=now=>{
    if(!G||G.busy)return;
    const k=Math.min(1,(now-G.t0)/GATE_MS);
    $('#gTimer').style.width=(100-k*100)+'%';
    if(k>=1)return gateDecide(null);
    G.raf=requestAnimationFrame(tick);
  };
  G.raf=requestAnimationFrame(tick);
}
function gateDecide(pass){
  if(!G||G.busy)return;G.busy=true;cancelAnimationFrame(G.raf);
  const q=G.qs[G.i];
  const auto=pass===null;
  const ruleOk=G.v.res.length?G.v.ok:true;
  const go=auto?ruleOk:pass;
  let out,cls;
  if(go){
    G.st.spent+=q.amt;G.st.count++;G.st.lastAt=q.at;G.paid+=q.amt;
    if(q.scam){G.lost+=q.amt;out='被骗';cls='bad';beep(150,.3,'sawtooth',.07)}
    else{G.right++;out='已付款';cls='ok';beep(660,.08)}
  }else{
    if(q.scam){G.saved+=q.amt;G.right++;out='拦下骗局';cls='ok';beep(880,.12,'triangle',.08)}
    else{G.miss++;out='误杀';cls='warn';beep(260,.15,'square',.05)}
  }
  const how=auto?'规则自动':(go===ruleOk?'人工确认':'人工推翻');
  $('#gLog').insertAdjacentHTML('afterbegin',`<li class="${cls}"><span>#${G.i+1}</span><b>${q.memo}</b><em>$${usd(q.amt)}</em><i>${how}</i><strong>${out}</strong></li>`);
  $('#gPaid').textContent='$'+usd(G.paid);$('#gSaved').textContent='$'+usd(G.saved);
  $('#gLost').textContent='$'+usd(G.lost);$('#gMiss').textContent=G.miss;
  const inv=$('#gInv');inv.classList.add(go?'gone-pass':'gone-block');
  $('#gTip').textContent=(q.scam?'这是骗局：':'这是真账单：')+(q.kind==='dupe'?'同一收款方同一金额，一分钟内又扣一次。':q.kind==='airdrop'?'名字是仿冒的，注册表查不到。':q.kind==='refund'?'陌生地址 + 天价 + 催你快付。':q.kind==='upgrade'?'真服务商，但金额远超平时。':'金额正常，收款方有 Agent ID。');
  setTimeout(()=>{G.i++;G.i<GATE_N?gateShow():gateEnd()},auto?900:650);
}
function gateEnd(){
  const acc=G.right/GATE_N;
  const g=G.lost===0&&G.miss===0?'S':acc>=.8&&G.lost<5000?'A':acc>=.6?'B':'C';
  const packs={S:3,A:2,B:1,C:0}[g];
  S.mis.gate=(S.mis.gate||0)+1;
  for(let i=0;i<packs;i++)S.packs.push(1);
  S.pts+=G.right*2;
  const rank={S:4,A:3,B:2,C:1};
  if(!S.gateBest||rank[g]>rank[S.gateBest.g]||(rank[g]===rank[S.gateBest.g]&&G.lost<S.gateBest.lost))S.gateBest={g,saved:G.saved,lost:G.lost};
  save();
  const stack=G.stack.map(c=>ruleName(c)+'（'+ruleShort(c)+'）').join(' + ')||'没有规则';
  $('#gatePlay').hidden=true;
  const end=$('#gateEnd');end.hidden=false;
  end.innerHTML=`<div class="gate-result">
    <b class="grade big g${g}">${g}</b>
    <div>
      <h3>${{S:'一笔没漏，一笔没错',A:'守得很稳',B:'还有漏洞',C:'Agent 被掏空了'}[g]}</h3>
      <p class="sub">判对 ${G.right} / ${GATE_N} 笔 · 拦下骗局 $${usd(G.saved)} · 被骗走 $${usd(G.lost)} · 误杀 ${G.miss} 笔</p>
      <p class="sub">规则栈：${stack}</p>
      <p class="sub">奖励：${packs?packs+' 包 + ':''}${G.right*2} 分。主网上，每一笔的规则判定都能用 <span class="mono">checkPayment()</span> 原样重放。</p>
      <div class="row">
        <button class="btn primary" id="bGAgain">再守一局</button>
        <button class="btn ghost" id="bGEdit">换规则</button>
        <button class="btn ghost" id="bGOpen">去开包</button>
      </div>
    </div>
  </div>`;
  fanfare(g==='S'?5:g==='A'?4:2);
  toast('守门评级 '+g+(packs?'：+'+packs+' 包':''));
  $('#bGAgain').onclick=gateStart;
  $('#bGEdit').onclick=()=>{end.hidden=true;$('#gateSetup').hidden=false;renderGate()};
  $('#bGOpen').onclick=()=>switchTab('open');
  G=null;renderAll();
}
$('#bGateGo').onclick=gateStart;
$('#bGPass').onclick=()=>gateDecide(true);
$('#bGBlock').onclick=()=>gateDecide(false);
document.addEventListener('keydown',e=>{
  if(!G||!$('#v-gate').classList.contains('on'))return;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){e.preventDefault();gateDecide(true)}
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){e.preventDefault();gateDecide(false)}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#mmodal').classList.remove('on')});

/* ══════════ 主循环 ══════════ */
if(S.day===today()&&S.cards.length&&S.name){switchTab('open')}
$('#heroPack').innerHTML=packArt('hp');
/* 落地页卡砖：一张示例 SSR 止损电路卡，参数与合约 ruleOf 同算法 */
(function(){
  const demo={id:42,r:4,star:1,kind:0,ref:0};
  const {t,p1,p2}=ruleParams(demo);
  $('#slabCard').innerHTML=cardHTML(demo);
  $('.slab-foot').textContent='ruleOf(42) → ('+t+', '+p1+', '+p2+')';
})();

/* ══════════ 镭射与倾斜：随指针移动（触屏与减少动态时关闭） ══════════ */
(function(){
  const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  const calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(!fine||calm)return;
  let cur=null;
  const SEL='[data-tilt],.cg';
  const reset=el=>{el.classList.remove('tilting');el.style.removeProperty('--rx');el.style.removeProperty('--ry');};
  document.addEventListener('pointermove',e=>{
    if(e.target.closest&&e.target.closest('.tear-zone')){if(cur)reset(cur);cur=null;return}
    const el=e.target.closest&&e.target.closest(SEL);
    if(cur&&cur!==el)reset(cur);
    cur=el;if(!el)return;
    const r=el.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    const max=el.classList.contains('cg')?10:14;
    el.classList.add('tilting');
    el.style.setProperty('--ry',((x-.5)*max*2).toFixed(2)+'deg');
    el.style.setProperty('--rx',((.5-y)*max*2).toFixed(2)+'deg');
    el.style.setProperty('--mx',(x*100).toFixed(1)+'%');
    el.style.setProperty('--my',(y*100).toFixed(1)+'%');
    el.style.setProperty('--fa',(x*360).toFixed(0)+'deg');
  },{passive:true});
  document.addEventListener('pointerleave',()=>{if(cur){reset(cur);cur=null}});
})();

renderAll();
setInterval(()=>{regenFree()},1000);
