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
  {n:'封控电路',s:'绝境壁垒',d:'首次受到致命伤害时免疫该次伤害，并封控自身 1 回合'},
  {n:'双签电路',s:'联署强击',d:'场上每多一名存活队友，攻击 +35%'},
  {n:'会签电路',s:'议会裁决',d:'队友存活过半时，攻击 +50% 且受伤 -25%'},
  {n:'委托电路',s:'限时附体',d:'开局前 3 回合攻击 +70%，之后回归常态'},
];
const CHAPTERS=[
  {id:'c17',t:'ICO 狂潮',y:'2017',d:'人人都在发币，泡沫最高处',lvl:1},
  {id:'c18',t:'漫长的冬天',y:'2018',d:'九成归零，活下来的是钻石手',lvl:2},
  {id:'c22',t:'暴雷纪元',y:'2022',d:'连环巨雷，信任冰点',lvl:3},
  {id:'c24',t:'Meme 狂欢季',y:'2024',d:'猫狗起飞，理性清仓',lvl:4},
  {id:'c25',t:'大清算',y:'2025',d:'潮水退尽，真电路活到最后',lvl:5},
];
const DEMO_NAMES=[
  // ── Crypto 圈（10）──
  'cz.ai','heyi.ai','justin.ai','vitalik.ai','satoshi.ai',
  // ── 科技圈（9）──
  'musk.ai','zuck.ai','jensen.ai','tim.ai','sam.ai',
  'bezos.ai','gates.ai','brin.ai','jack.ai',
  // ── 明星圈（7）──
  'taylor.ai','rihanna.ai','jay.ai','jackie.ai','snoop.ai','andy.ai','drake.ai',
  // ── 网红圈（2）──
  'mrbeast.ai','speed.ai',
  // ── 金融圈（4）──
  'warren.ai','jamie.ai','jerome.ai','larry.ai',
  // ── 虚构示例（保留 1 个占位）──
  'kestrel.ai',
];
/// 名人卡面（faces/ 槽位：丢入 <name>.jpg 即自动上卡；无照片时显示首字母徽章兜底）
/* 12 条真网表元数据（TapeForge 铸造 · 全输入穷举验证，tools/mint12.mjs）*/
const NETLIST_META={"0":{"g":36,"d":13,"cases":128},"1":{"g":22,"d":10,"cases":64},"2":{"g":4,"d":2,"cases":2},"3":{"g":39,"d":15,"cases":256},"4":{"g":22,"d":11,"cases":64},"5":{"g":20,"d":9,"cases":32},"6":{"g":125,"d":19,"cases":1024},"7":{"g":31,"d":14,"cases":256},"8":{"g":15,"d":8,"cases":32},"9":{"g":189,"d":25,"cases":8192},"10":{"g":90,"d":23,"cases":4096},"11":{"g":4,"d":2,"cases":4}};

function ruleUSD(t){const g=(NETLIST_META[t]||{}).g||36;return ((g*0.01734+0.01)*9.61)+(0.0002*560.67)}
async function doPublicTape(rule,say){
  try{
    const sg=await vaultSigner();await ensureChain();
    const me=await sg.getAddress();
    const [bemCost,bnbCost]=await (new ethers.Contract(pubAddr(),PUB_ABI,readProvider())).quote(rule);
    const bem=new ethers.Contract(bemAddr(),BEM_ABI,sg);
    const allowance=await bem.allowance(me,pubAddr());
    if(allowance.lt(bemCost)){
      say&&say('授权 '+ethers.utils.formatUnits(bemCost,8)+' BEM…');
      const a=await bem.approve(pubAddr(),bemCost);await a.wait();
    }
    say&&say('流片签名中…');
    const tx=await new ethers.Contract(pubAddr(),PUB_ABI,sg).tapeoutRaw(rule,{value:bnbCost});
    const rc=await tx.wait();
    let cid='?';try{const ev=rc.events&&rc.events[0];cid=ev&&ev.args&&ev.args[2]}catch(e){}
    say&&say('✅ 已流片 circuit #'+cid);
    beep(880,.12);return cid;
  }catch(e){const m=e.reason||e.message||String(e);say&&say('⛔ '+m);throw e}
}
window.__pkt=async(rule,btn)=>{
  btn.disabled=true;const old=btn.textContent;btn.textContent='签名中…';
  try{await doPublicTape(rule,t=>{btn.textContent=t.length>20?'流片中…':t;toast(t)});btn.textContent='✓ 已流片'}
  catch(e){btn.textContent='重试流片';setTimeout(()=>btn.textContent=old,2200)}
};
const FACES={
  // crypto
  'cz.ai':      {mono:'C',tag:'币安掌门',   c:'#F2C14E',photo:'faces/cz.jpg'},
  'heyi.ai':    {mono:'Y',tag:'BNB 大管家', c:'#F2C14E',photo:'faces/heyi.jpg'},
  'justin.ai':  {mono:'S',tag:'波场教主',   c:'#FF8AD8',photo:'faces/justin.jpg'},
  'vitalik.ai': {mono:'V',tag:'以太架构师', c:'#8AF0FF',photo:'faces/vitalik.jpg'},
  'satoshi.ai': {mono:'S',tag:'创世传奇',   c:'#B79BFF',photo:'faces/satoshi.jpg'},  'michael.ai': {mono:'M',tag:'囤币狂人',   c:'#F2C14E',photo:'faces/michael.jpg'},  // tech
  'musk.ai':    {mono:'M',tag:'火星船长',   c:'#D4FF8A',photo:'faces/musk.jpg'},
  'zuck.ai':    {mono:'Z',tag:'元宇宙房东', c:'#8AF0FF',photo:'faces/zuck.jpg'},
  'jensen.ai':  {mono:'J',tag:'算力教父',   c:'#D4FF8A',photo:'faces/jensen.jpg'},
  'tim.ai':     {mono:'T',tag:'苹果大掌柜', c:'#F2EFFF',photo:'faces/tim.jpg'},
  'sam.ai':     {mono:'S',tag:'OpenAI 掌门',c:'#D4FF8A',photo:'faces/sam.jpg'},
  'bezos.ai':   {mono:'B',tag:'蓝色起源',   c:'#8AF0FF',photo:'faces/bezos.jpg'},
  'gates.ai':   {mono:'G',tag:'慈善首富',   c:'#F2EFFF',photo:'faces/gates.jpg'},
  'brin.ai':    {mono:'B',tag:'谷歌双子',   c:'#8AF0FF',photo:'faces/brin.jpg'},
  'jack.ai':    {mono:'J',tag:'推特始祖',   c:'#B79BFF',photo:'faces/jack.jpg'},
  // stars
  'taylor.ai':  {mono:'T',tag:'霉霉女王',   c:'#FF8AD8',photo:'faces/taylor.jpg'},
  'rihanna.ai': {mono:'R',tag:'日日天后',   c:'#F2C14E',photo:'faces/rihanna.jpg'},
  'jay.ai':     {mono:'J',tag:'周董',       c:'#FF8AD8',photo:'faces/jay.jpg'},
  'jackie.ai':  {mono:'J',tag:'功夫成龙',   c:'#F2C14E',photo:'faces/jackie.jpg'},
  'snoop.ai':   {mono:'S',tag:'狗爷',       c:'#D4FF8A',photo:'faces/snoop.jpg'},
  'andy.ai':    {mono:'A',tag:'华仔',       c:'#F2EFFF',photo:'faces/andy.jpg'},
  'drake.ai':   {mono:'D',tag:'公鸭',       c:'#B79BFF',photo:'faces/drake.jpg'},
  // 网红
  'mrbeast.ai':{mono:'M',tag:'YouTube 顶流', c:'#D4FF8A',photo:'faces/mrbeast.jpg'},
  'speed.ai':  {mono:'A',tag:'甲亢哥',      c:'#FF8AD8',photo:'faces/speed.jpg'},  'ninja.ai':  {mono:'N',tag:'蓝发主播',   c:'#8AF0FF',photo:'faces/ninja.jpg'},  // finance
  'warren.ai':  {mono:'W',tag:'奥马哈股神', c:'#F2C14E',photo:'faces/warren.jpg'},
  'jamie.ai':   {mono:'J',tag:'摩根船长',   c:'#8AF0FF',photo:'faces/jamie.jpg'},
  'jerome.ai':  {mono:'J',tag:'加息之手',   c:'#F2EFFF',photo:'faces/jerome.jpg'},
  'larry.ai':   {mono:'L',tag:'贝莱德掌门', c:'#F2C14E',photo:'faces/larry.jpg'},
  // 虚构示例
  'kestrel.ai': {mono:'K',tag:'虚构示例',   c:'#FF8AD8',photo:''},
};
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
const DEMO_DAILY_CAP=20; // 游客演示档每天最多 20 包（=100 张卡）；所有演示发放走 grantPacks()
function fresh(){return{v:5,name:null,pts:0,packs:[],freeCap:20,lastRegen:Date.now(),
  cards:[],nextId:1,equipped:0,firstPack:false,sinceSR:0,
  pool:[],myInPool:false,sort:'r',w:0,l:0,team:[],chCleared:{},
  day:null,mis:{},claimed:{},streak:1,lastDay:Date.now(),followed:false,
  demoDay:null,demoToday:0};}
function save(){localStorage.setItem(SKEY,JSON.stringify(S))}
function load(){try{S=JSON.parse(localStorage.getItem(SKEY))}catch(e){}if(!S||S.v!==5)S=fresh()}
load();
const today=()=>new Date().toDateString();
if(S.day!==today()){
  const gap=S.lastDay?Math.floor((Date.now()-S.lastDay)/864e5):99;
  S.streak=(gap===1)?S.streak+1:1;S.lastDay=Date.now();
  S.day=today();S.mis={open5:0,open15:0,open50:0,sr:0,ssr:0,equip:0,star:0,sell:0,join:0,gate:0,battle:0,clear:0,redeem:0};
  S.mis.streak=1;S.claimed={};
  S.demoDay=today();S.demoToday=0; // 演示档每日额度按自然日重置
  save();
}

/* ────────── 演示档每日限额 ────────── */
const $=q=>document.querySelector(q), $$=q=>document.querySelectorAll(q);
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),1900)}
function demoQuota(){
  if(S.demoDay!==today()){S.demoDay=today();S.demoToday=0}
  return Math.max(0,DEMO_DAILY_CAP-(S.demoToday||0));
}
function grantPacks(n,tag,silent){
  const room=Math.min(demoQuota(),Math.max(0,(S.freeCap||20)-S.packs.length));
  const add=Math.max(0,Math.min(n,room));
  if(add>0){for(let i=0;i<add;i++)S.packs.push(1);S.demoToday=(S.demoToday||0)+add;save()}
  if(add<n&&!silent)toast('演示档每天最多 '+DEMO_DAILY_CAP+' 包，今日已领满'+(tag?'（'+tag+'）':''));
  return add;
}
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
    return `<div class="r${i}"><b>${r}</b><span>${ODDS[i]}‰</span><em>${every<=1?'几乎每张':'约每 '+every+' 张出 1 张'}</em></div>`;
  }).join('');
  return `<div class="odds-strip" role="img" aria-label="稀有度概率：${RAR.map((r,i)=>r+' '+ODDS[i]+'‰').join('，')}">${strip}</div><div class="odds-legend">${legend}</div>`;
}
$('#oddsLadder').innerHTML=oddsLadderHTML();
$('#oddsLadder2').innerHTML=oddsLadderHTML();

/* ────────── 一键晒卡：canvas 生成分享图 → 系统 share / X intent ────────── */
function loadImg(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})}
async function renderShareCard(c){
  const cv=document.createElement('canvas');cv.width=600;cv.height=840;
  const x=cv.getContext('2d');
  x.fillStyle='#0F0C24';x.fillRect(0,0,600,840);
  const n=cname(c),f=FACES[n]||{c:'#B79BFF',photo:''};
  try{ // 照片铺满上半（cover 裁剪）
    const img=await loadImg(f.photo);
    const sc=Math.max(600/img.width,760/img.height);
    const w=img.width*sc,h=img.height*sc;
    x.drawImage(img,(600-w)/2,Math.min(0,(760-h)*.15),w,h);
  }catch(e){}
  x.fillStyle='rgba(10,8,25,.86)';x.fillRect(0,660,600,180);
  x.fillStyle='rgba(10,8,25,.35)';x.fillRect(0,600,600,60);
  // 名字 + 标签
  x.fillStyle='#F2EFFF';x.font='900 56px Archivo,Arial';x.fillText(n,36,726);
  x.fillStyle=f.c||'#F2C14E';x.font='700 26px Arial';x.fillText(f.tag||'.ai 身份卡',38,762);
  // 稀有度 + 编号
  x.fillStyle='#F2C14E';x.font='900 30px Arial';
  x.fillText(RAR[c.r]+(c.star?' ★'+c.star:''),38,812);
  x.fillStyle='#9C96C4';x.fillText('#'+c.id,120,812);
  // 水印
  x.fillStyle='#6b639a';x.font='600 20px Arial';x.textAlign='right';
  x.fillText('agentid.cards · 每包必出名人卡',572,812);x.textAlign='left';
  // 金框
  x.strokeStyle='rgba(242,193,78,.55)';x.lineWidth=3;x.strokeRect(6,6,588,828);
  return new Promise(ok=>cv.toBlob(ok,'image/png'));
}
/* ────────── 邀请（链上）：分享链接带 ?ref=0x… ，受邀人连钱包后写进合约 ────────── */
function saveRef(){
  const r=new URLSearchParams(location.search).get('ref');
  if(/^0x[0-9a-fA-F]{40}$/.test(r||'')){localStorage.setItem('ap_ref',r);return r}
  return localStorage.getItem('ap_ref')||'';
}
let refAddr=saveRef();
let chainHeld=false;
function shareURL(c){
  let u='https://agentid.cards/c/'+cname(c).replace('.ai','')+'?r='+encodeURIComponent(RAR[c.r]+(c.star?'★'+c.star:''))+'&id='+c.id;
  if(chainAcc&&/^0x[0-9a-fA-F]{40}$/.test(chainAcc))u+='&ref='+chainAcc; // 受邀人开满 15 包 → 双方各得 1 包（链上）
  return u;
}
const RAR_CN=['普通','进阶','稀有','超稀有','史诗','传说','神话'];
function shareText(c){
  // 关键：卡名不带 .ai 后缀（.ai 是真实 TLD，X 会链接化）；稀有度用中文（UC 看不懂）
  const n=cname(c).replace('.ai','');
  return '我在卡灵战争抽到了名人卡灵 '+n+'【'+(RAR_CN[c.r]||RAR[c.r])+(c.star?'·'+c.star+'星':'')+'】→ '+shareURL(c);
}
async function shareCard(c){
  // X 的 OG 链接预览：推文只带链接，X 自动抓 og:image 渲染名人卡（CT Packs 同款）
  const t=shareText(c);
  beep(660,.08);
  // 关键：canShare 同步判定，不做 await——否则 window.open 丢失用户手势被弹窗拦截器吞掉
  // 桌面端跳过系统分享菜单（一步直达 X 编辑器）；手机端走原生分享
  const mobile=matchMedia&&matchMedia('(pointer:coarse)').matches;
  if(mobile&&navigator.canShare&&navigator.canShare({text:t})){
    try{await navigator.share({text:t});shareBonus();return}catch(e){}
  }
  const w=window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(t),'_blank');
  if(!w){ // webview/拦截器全兜底：页内面板，文案+链接一键复制
    showShareFallback(t);
    return
  }
  shareBonus();
}
function showShareFallback(t){
  let m=$('#shareFallback');
  if(!m){m=document.createElement('div');m.id='shareFallback';document.body.appendChild(m)}
  m.innerHTML=`<div class="sm-box">
    <button class="ovl-x" id="fbClose" aria-label="关闭">✕</button>
    <b class="sm-t">复制这条发到 X</b>
    <p class="sm-p mono" style="word-break:break-all;text-align:left;background:rgba(0,0,0,.3);padding:12px;border-radius:10px">${t}</p>
    <div class="row">
      <button class="btn primary cut" id="fbCopy">复制文案</button>
      <a class="btn ghost" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}">手动打开 X</a>
    </div>
    <p class="sm-p" style="margin-top:10px">发出去后，X 会自动把链接渲染成名人大卡图。</p>
  </div>`;
  m.classList.add('on');
  $('#fbClose').onclick=()=>m.classList.remove('on');
  $('#fbCopy').onclick=()=>{navigator.clipboard?navigator.clipboard.writeText(t):0;
    toast('已复制，去 X 粘贴发推');m.classList.remove('on');shareBonus()};
}
function showShareModal(c,imgUrl){
  let m=$('#shareModal');
  if(!m){m=document.createElement('div');m.id='shareModal';document.body.appendChild(m)}
  m.innerHTML=`<div class="sm-box">
    <button class="ovl-x" id="smClose" aria-label="关闭">✕</button>
    <b class="sm-t">晒到 X</b>
    <img src="${imgUrl}" alt="${cname(c)} 分享卡">
    <p class="sm-p">把这张图<b>直接拖进</b> X 的发推框，或先保存再上传——图会跟着推文一起发。</p>
    <div class="row">
      <a class="btn primary cut" target="_blank" rel="noopener"
         href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText(c))}">打开 X</a>
      <a class="btn ghost" href="${imgUrl}" download="agentpacks-${cname(c)}.png">保存图片</a>
      <button class="btn ghost" id="smDone">发完了 · 领 +1 包</button>
    </div>
  </div>`;
  m.classList.add('on');
  $('#smClose').onclick=()=>m.classList.remove('on');
  $('#smDone').onclick=()=>{m.classList.remove('on');shareBonus()};
}
function shareBonus(){ // 分享得包：演示档每天 1 次（本地，不可上链）；真实奖励走链上 invite()
  const t=today();
  if(S.shareDay===t){toast('今天的演示分享包已领过啦');return}
  S.shareDay=t;grantPacks(1,'分享');beep(660,.1);
  toast(chainHeld?'演示包 +1（本地）· 邀请关系已写入链上，对方开满 15 包双方各得 1 包':'演示包 +1（本地）· 持 .ai 连钱包分享可拿链上邀请奖励');
  renderAll();
}
$('#bShareX')&&($('#bShareX').onclick=null);

/* ────────── 卡面：程序化 SVG ────────── */
function statsOf(c){return{atk:Math.round(5+c.r*3.2+c.star*2),def:Math.round(4+c.r*2.4+c.star*2),rat:Math.min(99,Math.round(57+c.r*5.6+c.star*3.4))}}

/* ────────── 规则电路：与合约 ruleOf / checkPayment 同参数 ────────── */
/* ── 四类电路卡（docs/four-circuit-families.md）：① 交易 ② 风控 ③ 安全 ④ 协作 ── */
const FAM=[
  {n:'交易',tag:'TRADE',d:'管额度：一天一笔能花多少'},
  {n:'风控',tag:'LOCK', d:'管刹车：什么时候必须停'},
  {n:'安全',tag:'SEC',  d:'管对手：钱能付给谁'},
  {n:'协作',tag:'TRUST',d:'管签字的人：谁点头才算数'},
];
const RULE_DEF=[
  {f:0,n:'止损电路', s:p=>`每日 ≤ $${usd(p)}`, l:p=>`每天最多支出 $${usd(p)}；超出需人工放行。`},
  {f:0,n:'梭哈电路', s:p=>`单笔 ≤ $${usd(p)}`, l:p=>`单笔支付不超过 $${usd(p)}，超过直接拒绝。`},
  {f:2,n:'白名单电路', s:()=>'只付 Agent ID', l:()=>'只允许付给持有 Binance Agent ID 的地址，其余一律拒绝。'},
  {f:0,n:'加仓电路', s:p=>`$${usd(p)} 起 +2%/笔`, l:p=>`当日额度从 $${usd(p)} 起，每成功一笔上浮 2%，当日有效。`},
  {f:0,n:'清仓电路', s:p=>`每日 ≤ ${p} 笔`, l:p=>`每天最多 ${p} 笔支付，超出需等次日。`},
  {f:0,n:'抄底电路', s:p=>`≤ $${usd(p)} 免确认`, l:p=>`单笔不超过 $${usd(p)} 直接放行；更大金额需人工确认。`},
  {f:2,n:'杠杆电路', s:p=>`上限 $${usd(p)} · 半额需人工`, l:p=>`单笔上限 $${usd(p)}；超过一半额度时必须人工确认。`},
  {f:1,n:'钻石手电路', s:p=>`间隔 ≥ ${Math.round(p/60)} 分钟`, l:p=>`两笔支付之间至少间隔 ${Math.round(p/60)} 分钟，防止手滑连发。`},
  {f:1,n:'封控电路', s:p=>`被骗即全锁 ${Math.round(p/3600)} 小时`, l:p=>`当日一旦被骗，立即封锁 ${Math.round(p/3600)} 小时：期间任何支付一律拒绝，先止血再复盘。`},
  {f:3,n:'双签电路', s:p=>`超 $${usd(p/2)} 需双人`, l:p=>`单笔不超过 $${usd(p/2)} 直接放行；到 $${usd(p)} 为止需两个人批准；再多直接拒绝。`},
  {f:3,n:'会签电路', s:p=>`超额需 ${p.p2||2} 人会签`, l:p=>`额度内直放；单笔超过 $${usd(p.p1)} 需要 ${p.p2||2} 人同时批准——像董事会，不是一个人说了算。`},
  {f:3,n:'委托电路', s:p=>`限时 ${Math.round(p/3600)} 小时 · 指定收款方`, l:p=>`只在 ${Math.round(p/3600)} 小时窗口内、只付给你指定的那个收款方；窗口一过自动失效，无需撤销操作。`},
  {f:2,n:'身份卡 · 指定收款方', s:()=>'只付给正主', l:p=>`只允许付给这张身份卡的正主（${p}），链上按地址校验。`},
];
function usd(cents){const v=cents/100;return Number.isInteger(v)?v.toFixed(0):v.toFixed(2)}
function ruleDerived(c){
  if(c.kind===1){const p=S.pool[c.ref];return{t:12,p1:p?p.name:'—',p2:0}}
  const mult=100+c.r*40+c.star*20,t=c.ref%12;let p1=0,p2=0;
  if(t===0)p1=2000*mult/100;
  else if(t===1)p1=5000*mult/100;
  else if(t===3){p1=3000*mult/100;p2=2}
  else if(t===4)p1=3+Math.floor(c.r/2)+c.star;
  else if(t===5)p1=500*mult/100;
  else if(t===6)p1=10000*mult/100;
  else if(t===7){const cut=c.r*300+c.star*120;p1=cut<3600?3600-cut:300}
  else if(t===8)p1=7200*mult/100;                                   // 封控：锁 2 小时 × mult
  else if(t===9)p1=5000*mult/100;                                    // 双签：基准 $50
  else if(t===10){p1=5000*mult/100;p2=2+Math.floor(c.star/2)}        // 会签：M = 2 + star/2
  else if(t===11)p1=12*3600*mult/100;                                // 委托：窗口 12h × mult
  return{t,p1,p2};
}
function famOf(c){return RULE_DEF[ruleDerived(c).t].f}
// 卡主可编辑的数值（TapeID：不可变电路 + 用户签名参数）。ovr 存在卡对象上，
// 主网对应 setRuleConfig(cardId, cfg)——只有卡主能改，电路字节永不变。
function ruleParams(c){
  const d=ruleDerived(c);
  if(c.ovr!=null&&d.t!==2&&d.t!==8)d.p1=c.ovr;
  return d;
}
function ruleRange(c){ // 数值可调范围：[下限, 卡档位上限]
  const {t,p1}=ruleDerived(c);
  if(t===4)return[1,Math.round(p1)];
  if(t===7)return[Math.max(60,Math.floor(p1/4)),Math.round(p1*4)];
  return[100,Math.round(p1)];
}
function fmtParam(t,v){
  if(t===4)return v+' 笔';
  if(t===7)return Math.round(v/60)+' 分钟';
  return '$'+usd(v);
}
function parseRuleSentence(t,txt){
  if(!txt)return null;
  const m=String(txt).replace(/,/g,'').match(/(\d+(?:\.\d+)?)\s*(美元|美金|刀|块|usd|\$|笔|次|小时|分钟|秒)/i);
  if(!m)return null;
  const v=parseFloat(m[1]),u=m[2].toLowerCase();
  if(t===4)return /笔|次/.test(u)?Math.round(v):null;
  if(t===7){const s=/小时/.test(u)?v*3600:/分钟/.test(u)?v*60:v;return Math.round(s)}
  return /笔|次|小时|分钟|秒/.test(u)?null:Math.round(v*100);
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
  if(t===8)return[1,'（未触发）当日一旦被骗将全锁 '+Math.round(p1/3600)+' 小时'];
  if(t===9)return amountCents*2<=p1?[1,'半额内直放']:(amountCents<=p1?(approved?[1,'双签通过']:[0,'需双人批准']):[0,'超出双签额度']);
  if(t===10)return amountCents<=p1?[1,'额度内直放']:(approved?[1,'会签通过（'+p2+' 人）']:[0,'需 '+p2+' 人会签']);
  if(t===11)return payeeHasId?[1,'窗口内 · 指定收款方']:[0,'不在委托名单 / 已出窗口'];
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
  let kind=0,ref=Math.floor(Math.random()*12);
  const act=S.pool.filter(p=>p.active);
  if(r>=3&&act.length&&Math.random()<0.6){const p=act[Math.floor(Math.random()*act.length)];
    kind=1;ref=S.pool.indexOf(p);p.pulls=(p.pulls||0)+1;}
  return{id:S.nextId++,r,star:0,kind,ref};
}
function cname(c){return c.kind===1?S.pool[c.ref].name:HOUSE[c.ref%12].n}
/// 电路卡英雄徽章：每种规则一个形象（heroes/t0..t11），电路纹 artSVG 垫底兜底
function heroHTML(c,size){
  const t=ruleDerived(c).t;
  return `<div class="art">${size?artSVG(c,size,size):artSVG(c)}</div>
    <img class="hero-img" src="heroes/t${t}.jpg" alt="${ruleName(c)}" loading="lazy" onerror="this.remove()">`;
}
/// 名人卡面：faces/<name>.jpg 存在即直上卡面；不存在显示首字母徽章（照片槽位，随时补图）
function faceHTML(c){
  const n=cname(c);
  const f=FACES[n]||{mono:(n[0]||'?').toUpperCase(),tag:'.ai 身份',c:'#B79BFF',photo:''};
  // <img> + onerror 自删：加载失败时首字母徽章自然兜底，绝不出现空黑卡
  return `<div class="art face-art">
    <img class="face-img" src="${f.photo}" alt="${n}" loading="lazy" onerror="this.remove()">
    <div class="face-mono" style="--fc:${f.c}">${f.mono}</div>
    <span class="face-tag">${f.tag}</span>
  </div>`;
}
function cskill(c){return HOUSE[c.ref%12].s}
function cdesc(c){return HOUSE[c.ref%12].d}
function open5(){
  const out=[];
  const idSlot=Math.floor(Math.random()*5);   // 每包必出 1 张名人身份卡
  ensurePool();
  for(let i=0;i<5;i++){
    let r=rollR();
    if((!S.firstPack||S.ssrNext)&&i===4){if(r<4)r=4;S.ssrNext=false}
    else if(S.firstPack&&S.sinceSR+1>=10&&r<3)r=3;
    if(r>=3)S.sinceSR=0;else S.sinceSR++;
    if(r>=3)S.mis.sr++; if(r>=4)S.mis.ssr++;
    if(i===idSlot){
      const act=S.pool.filter(p=>p.active);
      const p=act[Math.floor(Math.random()*act.length)];
      p.pulls=(p.pulls||0)+1;
      out.push({id:S.nextId++,r,star:0,kind:1,ref:S.pool.indexOf(p)});
    }else out.push(makeCard(r));
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
    ${c.kind===1?faceHTML(c):heroHTML(c)}
    <div class="scrim"></div>
    <div class="frame"></div>
    <div class="top"><span class="rar">${RAR[c.r]}</span>${c.star?`<span class="stars">${'★'.repeat(c.star)}</span>`:''}</div>
    ${c.kind===1?'<span class="idt">.ai 身份</span>':''}
    ${eq?'<span class="eqd">已穿上</span>':''}
    <div class="foot">
      <div class="name">${cname(c)}</div>
      <div class="skill ruleline"><i class="famdot f${c.kind===1?2:RULE_DEF[ruleDerived(c).t].f}"></i>${ruleShort(c)}</div>
      <div class="nums"><span>ATK <b>${st.atk}</b></span><span>DEF <b>${st.def}</b></span><span>RAT <b>${st.rat}</b></span></div>
    </div>
  </div>`;
}

/* ────────── 头部刷新 ────────── */
function regenFree(){
  demoQuota(); // 跨日重置演示额度
  const now=Date.now(),g=Math.floor((now-S.lastRegen)/20000);
  if(g>0){grantPacks(g,'每日恢复',true);S.lastRegen=now;save()}
  const cur=S.packs.length,full=cur>=S.freeCap,quota=demoQuota();
  $('#chPacks').textContent=cur+'/'+S.freeCap;
  $('#chRf').textContent=quota===0?'今日 '+DEMO_DAILY_CAP+'/'+DEMO_DAILY_CAP:full?'包已满':Math.max(0,20-Math.floor((now-S.lastRegen)/1000))+' 秒后 +1';
  $('#pmCount').textContent=cur;
  $('#pmFill').style.width=Math.min(100,cur/S.freeCap*100)+'%';
  $('#regen').textContent=quota===0?'今日演示包已领满（'+DEMO_DAILY_CAP+'/'+DEMO_DAILY_CAP+'），明天 00:00 重置':
    full?'已经存满，开掉才会继续回':'正在回包，每 20 秒 +1 · 今日 '+S.demoToday+'/'+DEMO_DAILY_CAP;
  $('#landN').textContent=quota?DEMO_DAILY_CAP:0;
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
  if(v==='chain'||v==='gate')renderChain();
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
  $('#bAll').style.display='none';$('#bDone').style.display='none';$('#bShareX').style.display='none';$('#bOpenIt').style.display='';
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
          ${c.kind===1?faceHTML(c):heroHTML(c,220)}
          <div class="scrim"></div>
          <div class="fbody">
            <div class="fr">${RAR[c.r]}</div>
            <div class="fn">${cname(c)}</div>
            <div class="fs">${cskill(c)}</div>
            ${c.kind===1?`<div class="fi">身份卡 · ${fmtN(S.pool[c.ref].name)}</div>`:''}
            <div class="fst">ATK ${st.atk} · DEF ${st.def} · RAT ${st.rat}</div>
          </div>
          ${c.kind===0?`<button class="pkt" data-rule="${c.ref%12}" style="position:absolute;top:8px;right:8px;z-index:8;padding:5px 10px;border-radius:99px;border:1px solid rgba(242,193,78,.75);background:rgba(10,8,25,.9);color:#F2C14E;font-size:10.5px;font-weight:800">⚡ 流片 ≈ $${ruleUSD(c.ref%12).toFixed(2)}</button>`:''}
        </div>
      </div>`;
      d.onclick=()=>{
        if(!d.querySelector('.fcard').classList.contains('flip')){flip(d,c);return}
        $('#ovl').classList.remove('on');opening=null;detail(c.id);
      };
      const pb=d.querySelector('.pkt');
      if(pb)pb.onclick=ev=>{ev.stopPropagation();window.__pkt(Number(pb.dataset.rule),pb)};
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
    const arr=(opening&&opening.length)?opening:[c];
    const top=Math.max(...arr.map(x=>x.r));
    toast('开出 '+arr.map(x=>RAR[x.r]).join(' · ')+(top>=4?' 🔥':''));
    const star=arr.filter(x=>x.kind===1).sort((a,b)=>b.r-a.r)[0];
    if(star){$('#bShareX').style.display='';$('#bShareX').onclick=()=>shareCard(star);
      $('#ovlHint').textContent='抽到 '+cname(star)+' · 当场晒到 X，再领 1 个包';}
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
  const fb=$$('#cFam .seg-b');
  fb.forEach(b=>b.onclick=()=>{S.famF=+b.dataset.fam;save();renderCards()});
  if(S.famF===undefined)S.famF=-1;
  fb.forEach(b=>b.classList.toggle('on',+b.dataset.fam===S.famF));
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
  const arr=[...S.cards].filter(c=>S.famF<0||(c.kind===1?2:RULE_DEF[ruleDerived(c).t].f)===S.famF)
    .sort((a,b)=>sortMode==='id'?a.id-b.id:sortMode==='atk'?statsOf(b).atk-statsOf(a).atk:(b.r-a.r||b.id-a.id));
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
  const edD=ruleDerived(c),edT=edD.t;
  const edAvail=c.kind===0&&edT!==2;
  const [edLo,edHi]=ruleRange(c);
  const edCur=ruleParams(c).p1;
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
          <span class="chip fam${c.kind===1?2:RULE_DEF[edT].f}">${c.kind===1?'安全 · 身份':FAM[RULE_DEF[edT].f].n+' · '+FAM[RULE_DEF[edT].f].tag}</span>
          <span class="chip ${S.equipped===c.id?'teal':''}" style="margin-left:auto">${S.equipped===c.id?'生效中':'未装备'}</span></div>
        <div class="rb-name">${ruleName(c)}</div>
        <p class="rb-desc">${ruleLong(c)}</p>
        <div class="stack4">
          <div class="s4">
            <span class="s4-n">1 芯</span><b>电路</b>
            <span class="s4-v">${c.kind===1?'身份卡走注册表，无需流片':'本地数据 · 未流片 · 用下方「链上流片」把规则铸成 NFT'+(NETLIST_META[ruleDerived(c).t]?' · '+NETLIST_META[ruleDerived(c).t].g+' 门 NAND':'')}</span>
          </div>
          <div class="s4 ${c.ovr!=null?'on':''}">
            <span class="s4-n">2 魂</span><b>参数</b>
            <span class="s4-v">${c.ovr!=null?'已自定义 · '+ruleShort(c):'卡档位 · '+ruleShort(c)}</span>
          </div>
          <div class="s4 on">
            <span class="s4-n">3 证</span><b>证书</b>
            <span class="s4-v">ruleOf(#${c.id}) 链上可读 · 卡面规则句 ✓</span>
          </div>
          <div class="s4 ${((S.mis.gate||0)>0&&S.equipped===c.id)?'on':''}">
            <span class="s4-n">4 履</span><b>履历</b>
            <span class="s4-v">checkPayment() 可复算 ✓${(S.mis.gate||0)>0?' · 守门 '+S.mis.gate+' 局':''}</span>
          </div>
        </div>
        
        <div class="rb-test">
          <input class="inp" id="chkAmt" type="number" min="0" step="0.01" placeholder="金额 USD" ${c.kind===1?'disabled':''}>
          <select class="inp" id="chkPayee" ${c.kind===1?'disabled':''}>
            <option value="1">收款方有 Agent ID</option><option value="0">收款方没有 Agent ID</option>
          </select>
          <button class="btn sm primary cut" id="chkBtn" ${c.kind===1?'disabled':''}>复算</button>
        </div>
        <div class="rb-out" id="chkOut">按卡上参数复算一笔支付，不产生交易。</div>
        <div class="rb-note">equip() 后生效 · 任何人可调用 checkPayment() 复算</div>
        ${c.kind===0?`<div class="rb-test" style="margin-top:12px;display:block">
          <span class="eyebrow" style="margin:0 0 8px">链上流片 · TAPE OUT</span>
          <div class="rb-out" id="chainTapeOut">读 tapeNandCost()/tapeCost() 拿真实 NAND（BEM）+ tapeout（BNB）报价；先授权 BEM 再流片，电路 NFT 归你。</div>
          <div class="row" style="margin-top:8px;flex-wrap:wrap">
            <span class="chip" id="mTapePrice">价格加载中…</span>
            <button class="btn sm primary" id="mTapeChain" disabled>直接流片</button>
          </div>
          <div class="row" style="margin-top:8px;flex-wrap:wrap">
            <input class="inp mono" id="evalIn" placeholder="eval 输入字节 0x…（低位在前）">
            <button class="btn sm ghost" id="mEval">问电路</button>
          </div>
        </div>`:''}
        <div style="margin-top:10px"><button class="btn sm ghost" id="mTheater">亲眼看这条规则怎么判 →</button></div>
        ${edAvail?`
        <div class="rb-ed">
          <div class="rb-ed-head"><span class="eyebrow" style="margin:0">调数值 · TapeID 同款</span>
            ${c.ovr!=null?'<span class="chip gold">已自定义</span>':''}</div>
          <p class="rb-desc">数值跟卡走，只有卡主能改；上限由稀有度 × 星级决定。${c.ovr!=null?'':'默认即卡档位上限，往下调越守越严。'}</p>
          <div class="rb-test">
            <input class="inp" id="edSent" placeholder="一句话：把上限改成 35 美元 / 冷却改成 90 分钟">
            <button class="btn sm cut" id="edPrev">生成对比</button>
          </div>
          <div class="rb-out" id="edOut">可调范围 ${fmtParam(edT,edLo)} – ${fmtParam(edT,edHi)} · 当前 ${fmtParam(edT,edCur)}</div>
        </div>`:''}
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn sm ${S.equipped===c.id?'':'primary'}" id="mEq">${S.equipped===c.id?'脱下这张卡':'穿到我的 Agent ID 上'}</button>
        <button class="btn sm ghost" id="mSell">卖出 +${SELL[c.r]} 分</button>
        ${c.kind===1?'<button class="btn sm cut" id="mShare">晒到 X</button>':''}
      </div>
      <div style="margin-top:18px">
        <span class="sub">升星 starUp() · 1 张燃料 = 1 星（上限 5）</span>
        <div class="fuel" id="fuelBox">${fuel.slice(0,50).map(f=>`<span class="fchip" data-f="${f.id}">#${f.id} · ${RAR[f.r]}</span>`).join('')||'<span class="sub">没有多余卡</span>'}</div>
        <button class="btn sm primary" id="mStar" style="margin-top:10px">升星（已选 <b id="fc">0</b>）</button>
      </div>
    </div>
  </div>`;
  $('#mmodal').classList.add('on');
  const mS=$('#mShare');
  if(mS)mS.onclick=()=>shareCard(c);
  /* ── 链上流片面板：BEM 买 NAND + BNB 付 tapeout + 真 eval ── */
  const cto=$('#chainTapeOut'),cc=$('#mTapeChain');
  let quote=null;
  async function autoCardQuote(){
    try{
      // 卡只是本地数据；价格永远按这张卡的规则走公开流片报价，不依赖卡是否上链
      const rule=Number(ruleDerived(c).t);
      const [bemCost,bnbCost,gates]=await (new ethers.Contract(pubAddr(),PUB_ABI,readProvider())).quote(rule);
      quote={bemCost,bnbCost,gates,rule};
      const usd=(Number(bemCost)/1e8*9.61)+(Number(bnbCost)/1e18*560.67);
      const mp=$('#mTapePrice');if(mp)mp.textContent='≈ $'+usd.toFixed(2);
      cto.innerHTML='<b style="color:var(--gold)">≈ $'+usd.toFixed(2)+'</b> · '
        +ethers.utils.formatUnits(bemCost,8)+' BEM (NAND) + '
        +ethers.utils.formatEther(bnbCost)+' BNB (tapeout) · '+gates.toString()+' 门 · 规则 t'+rule+'（不需要卡）';
      cc.disabled=false;
    }catch(e){cto.textContent='价格读取失败：'+(e.reason||e.message||e)}
  }
  autoCardQuote();
  if(cc)cc.onclick=async()=>{
    try{
      if(!quote)return toast('价格还没加载好');
      const sg=await vaultSigner();await ensureChain();
      const me=await sg.getAddress();
      const bem=new ethers.Contract(bemAddr(),BEM_ABI,sg);
      const allowance=await bem.allowance(me,pubAddr());
      if(allowance.lt(quote.bemCost)){
        cto.textContent='授权 '+ethers.utils.formatUnits(quote.bemCost,8)+' BEM…';
        const a=await bem.approve(pubAddr(),quote.bemCost);await a.wait();
      }
      const tx=await new ethers.Contract(pubAddr(),PUB_ABI,sg).tapeoutRaw(quote.rule,{value:quote.bnbCost});
      cto.textContent='流片交易 '+tx.hash.slice(0,12)+'… 等待确认';
      const rc=await tx.wait();
      let cid='?';try{const ev=rc.events&&rc.events[0];cid=ev&&ev.args&&ev.args[2]}catch(e){}
      cto.innerHTML='✅ 流片成功 · <a href="'+chainScan()+'/token/'+processorAddr()+'?a='+cid+'" target="_blank" style="color:var(--gold)">circuit #'+cid+' ↗</a> · NFT 已进钱包。';
      beep(880,.12);toast('真身 circuit NFT 已进钱包');
    }catch(e){cto.textContent='⛔ '+(e.reason||e.message||e)}
  };
  const me=$('#mEval');
  if(me)me.onclick=async()=>{
    try{
      const hex=$('#evalIn').value.trim();
      if(!/^0x([0-9a-fA-F]{2})*$/.test(hex))return toast('输入字节格式不对，例如 0x05');
      const cid=await chainRead('cardCircuit',[c.id]);
      if(Number(cid)===0)return toast('这张卡还没链上流片');
      const p=await chainProvider();
      const ret=await new ethers.Contract(processorAddr(),PROC_ABI,p).eval(cid,hex);
      const b=Array.from(ethers.utils.arrayify(ret));
      const v=b[0]||0;
      cto.innerHTML='eval('+cid.toString()+', '+hex+') → <b style="color:var(--gold)">0x'+v.toString(16).padStart(2,'0')+'</b> · allow='+(v&1)+' ask='+((v>>1)&1);
    }catch(e){cto.textContent='eval 失败：'+(e.reason||e.message||e)}
  };
  const mt=$('#mTheater');
  if(mt)mt.onclick=()=>{$('#mmodal').classList.remove('on');switchTab('gate');setTimeout(()=>{const t=document.querySelector('#thStage');t&&t.scrollIntoView({behavior:'smooth',block:'center'})},80)};
  const ck=$('#chkBtn');
  if(ck)ck.onclick=()=>{
    const amt=Math.round((parseFloat($('#chkAmt').value)||0)*100);
    const hasId=$('#chkPayee').value==='1';
    const [ok,msg]=checkRule(c,amt,hasId,0,0,0,false);
    const out=$('#chkOut');
    out.className='rb-out '+(ok?'ok':'bad');
    out.textContent=(ok?'PASS · ':'FAIL · ')+msg+'（$'+usd(amt)+'）';
  };
  const edBtn=$('#edPrev');
  if(edBtn)edBtn.onclick=()=>{
    const txt=$('#edSent').value;
    const val=parseRuleSentence(edT,txt);
    const out=$('#edOut');
    if(val==null){out.className='rb-out bad';
      out.textContent='没听懂。试试「把上限改成 35 美元」「每天最多 5 笔」「冷却改成 90 分钟」。';return}
    if(val<edLo||val>edHi){out.className='rb-out bad';
      out.textContent='超档：这张卡的范围是 '+fmtParam(edT,edLo)+' – '+fmtParam(edT,edHi)+'。要么调进来，要么升星 / 换更高稀有度的卡。';return}
    out.className='rb-out';
    out.innerHTML=fmtParam(edT,edCur)+' → <b style="color:var(--pass)">'+fmtParam(edT,val)+'</b> ✓ 档位内<br>'+
      '只修改签名参数，电路本身不变。主网 = <span class="mono">setRuleConfig(#'+c.id+', cfg)</span> 一笔交易。 '+
      '<button class="btn sm primary cut" id="edOk">确认修改</button>'+
      (c.ovr!=null?' <button class="btn sm ghost" id="edRst">恢复卡档位</button>':'');
    $('#edOk').onclick=()=>{c.ovr=val;save();beep(660,.1);toast('数值已更新：'+fmtParam(edT,val));detail(id)};
    const rst=$('#edRst');
    if(rst)rst.onclick=()=>{delete c.ovr;save();toast('已恢复卡档位');detail(id)};
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
  S.cards.push({id:S.nextId++,r:3,star:0,kind:0,ref:Math.floor(Math.random()*12)});
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
    return{n:side==='me'?cname(c):'野生·'+HOUSE[Math.floor(Math.random()*12)].n,
      mhp:Math.round(side==='me'?100:66+ch.lvl*8),hp:0,atk:Math.max(3,Math.round(st.atk*(side==='me'?1:0.5+ch.lvl*0.1))),
      sk:(c.kind===1?c.ref%8:c.ref%12),side,alive:true,buff:0,r:c.r};};
  const team=myCards.map(id=>mk(S.cards.find(c=>c.id===id),'me'));
  B={ch,team,wave:1,boss:false,log:[],over:false};
  B.foes=()=>[0,1,2].map(()=>mk({r:Math.min(5,Math.floor(Math.random()*4)+1),ref:Math.floor(Math.random()*12),kind:0,star:0},'en'));
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
    if(first){S.pts+=30;const g=grantPacks(2,'首通');toast('首通 '+B.ch.t+'：+30 分 +'+g+' 包'+(g<2?'（今日额度不足）':''))}
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
      if(m.t==='包'){grantPacks(m.rw,'任务')}else S.pts+=m.rw;
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
  if(am&&allDone&&!S.claimed.__all)am.onclick=()=>{S.claimed.__all=true;grantPacks(1,'全任务');S.ssrNext=true;
    beep(784,.2,'triangle',.08);toast('全清奖励：1 个 SSR 保底包');save();renderAll()};
}

/* ══════════ 卡池 ══════════ */
function ensurePool(){
  DEMO_NAMES.forEach(n=>{if(!S.pool.some(p=>p.name===n))S.pool.push({name:n,active:true,mine:false,pulls:0})});
  // 迁移：旧版虚构演示名不在当前 DEMO_NAMES → 绝版（被抽过的停发，没被抽过的直接清掉）
  S.pool=S.pool.filter(p=>p.mine||DEMO_NAMES.includes(p.name)||(p.pulls>0?(p.active=false,true):false));
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
  const t=+b.dataset.buy;const n=[1,10,100][t];
  const g=grantPacks(n,'补给');
  beep(523,.12);toast(g?'已到账 '+g+' 包（演示档，今日额度 '+S.demoToday+'/'+DEMO_DAILY_CAP+'）':'今日演示额度已用完');renderAll();
});
$('#bFollow').onclick=()=>{
  if(S.followed)return toast('已领取过');
  S.followed=true;const g=grantPacks(10,'关注');
  toast('关注奖励 +'+g+' 包（演示，今日额度 '+S.demoToday+'/'+DEMO_DAILY_CAP+'）');renderAll();
};

/* ══════════ 落地 & 开包按钮 ══════════ */
$('#bOpen1').onclick=()=>{if(!S.packs.length)return toast('包空了，等待恢复或去补给');S.packs.pop();save();startOpen()};
$('#bOpen5').onclick=()=>{if(S.packs.length<5)return toast('至少要 5 个包（去补给领取）');
  S.packs.splice(0,5);save();startOpen()};
$('#bLandOpen').onclick=()=>{if(!S.packs.length&&!grantPacks(1,'落地页'))return toast('今日演示额度已用完，明天再来');switchTab('open');S.packs.pop();save();startOpen()};
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
 "function checkPayment(address,uint256,address,uint256,uint16,uint64,bool,uint8,bool) view returns (bool,string)",
 "function ownerOf(uint256) view returns (address)",
 "function cardCircuit(uint256) view returns (uint256)",
 "function tapeCost(uint256) view returns (uint256,uint256)",
 "function tapeNandCost(uint256) view returns (uint256,uint256)"
];
const BEM_ABI=[
 "function approve(address,uint256) returns (bool)",
 "function allowance(address,address) view returns (uint256)",
 "function balanceOf(address) view returns (uint256)"
];
const BEM_MAINNET='0x5ce033B2bFCa3Af30b3e8C8457DeaF776A8b695a';
function bemAddr(){return BEM_MAINNET}
const PROC_ABI=["function eval(uint256,bytes) view returns (bytes)"];
let chainAcc=null,chainPending=null;
try{chainPending=JSON.parse(localStorage.getItem('ap_pending')||'null')}catch(e){}
const MAINNET_CORE='0xee7928436a480af5f93c3558a8ef27588c511d7b';
const MAINNET_VAULT='0xa0fb1d7f76d4b1bc55a8060cdbcf773c1d8d8d3d';
const MAINNET_PROC='0xAdfDB520db78C252382E4bCdf62692fAD453035a';
const TESTNET_CORE='0xdc2dcE427379a048280Bb43AeC5E7A302B732650';
const TESTNET_VAULT='0x43AfFA20eAC55aAFFD8aB7B90729413d6aDCBc3A';
function coreAddr(){return localStorage.getItem('ap_core')||(netId()==='61'?TESTNET_CORE:MAINNET_CORE)}
/* 链 ID 以十六进制存：0x38 = 56（主网），0x61 = 97（测试网）。默认主网（已部署） */
function netId(){const v=localStorage.getItem('ap_chain');return v==='61'||v==='97'?'61':'38'}
function netName(){return netId()==='61'?'BNB 测试网 97':'BNB 主网 56'}
function chainScan(){return netId()==='61'?'https://testnet.bscscan.com':'https://bscscan.com'}
function savePending(){localStorage.setItem('ap_pending',chainPending?JSON.stringify(chainPending):'')}
async function chainProvider(){return new ethers.providers.Web3Provider(window.ethereum)}
function readProvider(){
  if(window.ethereum)return new ethers.providers.Web3Provider(window.ethereum);
  const rpc=netId()==='61'?'https://data-seed-prebsc-1-s1.binance.org:8545':'https://bsc-dataseed.bnbchain.org';
  return new ethers.providers.JsonRpcProvider(rpc);
}
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
/* ── Privy：X / 邮箱 登录，自动创建 BNB Chain 嵌入式钱包 ── */
function wcPanelHTML(){
  return '<div class="chain-actions"><button class="btn ghost" id="bPrivy">用 X / 邮箱连接（Privy）</button></div>'
    +'<div class="chain-status">登录后自动生成嵌入钱包 · BNB Chain · 无需下载 App。</div>';
}
function bindWc(){
  const b=$('#bPrivy');if(!b)return;
  b.onclick=async()=>{
    b.textContent='连接中…';b.disabled=true;
    try{
      if(!window.PrivyWidget)throw new Error('Privy 组件未加载');
      await window.PrivyWidget.ready;
      const {address,provider}=await window.PrivyWidget.api.connect();
      window.ethereum=provider;chainAcc=address;
      toast('Privy 钱包已连接：'+address.slice(0,8)+'…');
      renderChain();
    }catch(e){toast('Privy 连接失败：'+(e.message||e))}
    finally{b.textContent='用 X / 邮箱连接（Privy）';b.disabled=false}
  };
}
function renderChain(){
  const box=$('#chainBox');if(!box)return;
  if($('#vAddr'))$('#vAddr').value=vaultAddr();
  $('#cAddr').value=coreAddr();
  $('#cChain').textContent=netName();
  if(!coreAddr()){
    box.innerHTML='<div class="chain-status">● 未配置合约地址 —— 按 <span class="mono">contracts/DEPLOY.md</span> 部署 AgentPackCore 后，把地址粘贴到上方保存。</div>';
    return;
  }
  if(typeof ethers==='undefined'){box.innerHTML='<div class="chain-status bad">● ethers 库加载失败（离线环境），联网后刷新。</div>';return}
  if(!window.ethereum){box.innerHTML='<div class="chain-status bad">● 未检测到注入钱包 —— 可用下方 X / 邮箱 登录（Privy 嵌入钱包），或用 Binance Wallet 内置浏览器打开。</div>'+wcPanelHTML();bindWc();return}
  box.innerHTML=`<div class="chain-status ok">● 合约 <span class="mono">${coreAddr().slice(0,10)}…${coreAddr().slice(-6)}</span> · ${netName()}</div>
    <div class="chain-actions">
      <button class="btn primary" id="bCC">连接钱包</button>
      <button class="btn primary" id="bCClaim">领包 + 承诺</button>
      <button class="btn" id="bCReveal" ${chainPending?'':'disabled'}>揭示 ${chainPending?'#'+chainPending.pid:''}</button>
    </div>
    ${wcPanelHTML()}
    <div class="chain-sep"></div>
    <div class="chain-actions">
      <button class="btn" id="bCBuy">买单包 0.002 BNB</button>
      <button class="btn" id="bCJoin">入池 claimIntoPool</button>
      <button class="btn ghost" id="bCLeave">退池 leavePool</button>
    </div>
    <div class="chain-actions">
      <input class="inp" id="cCard" placeholder="卡号 #">
      <button class="btn" id="bCEquip">穿卡 equip</button>
      <button class="btn ghost" id="bCPts">查积分 packPoints</button>
    </div>
    <div class="chain-status" id="cStatus" style="margin-top:12px">● 等待连接</div>`;
  bindWc();
  const st=(t,cls)=>{const el=$('#cStatus');el.className='chain-status '+(cls||'');el.innerHTML=t};
  if(chainAcc)st('● 已连接 <span class="mono">'+chainAcc+'</span>','ok');
  $('#bCC').onclick=async()=>{
    try{chainAcc=(await window.ethereum.request({method:'eth_requestAccounts'}))[0];
      await ensureChain();
      const held=await chainRead('isAgentIdHolder',[chainAcc]);
      chainHeld=held;
      st('● 已连接 <span class="mono">'+chainAcc+'</span><br>Agent ID 持有：<b style="color:'+(held?'var(--teal)':'var(--red)')+'">'+(held?'✓ 持有 .ai':'✗ 未持有')+'</b>'+(held?'':' —— 请先在 Binance App 领取 Agent ID'),held?'ok':'bad');
      // 持 .ai 的受邀人：把邀请关系写进合约，开满 15 包后双方各得 1 包（链上，不依赖 localStorage）
      if(held&&refAddr&&refAddr.toLowerCase()!==chainAcc.toLowerCase()&&localStorage.getItem('ap_refdone')!=='1'){
        try{
          st('● 检测到邀请人 '+refAddr.slice(0,10)+'… · 正在写入链上 invite()…');
          const rc=await chainSend('invite',[refAddr]);
          localStorage.setItem('ap_refdone','1');
          st('● 邀请关系已上链 '+txLink(rc.transactionHash)+'<br>你开满 15 包后，双方各得 1 奖励包（下次 claimDailyPack 免冷却领取）。','ok');
        }catch(err){st('● 邀请写入跳过：'+(err.reason||err.message||err),'bad')}
      }
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
      let ids='';
      for(let i=start-4;i<=start;i++){try{
        const c=await chainRead('cardInfo',[i]);
        ids+=' #'+i+'·'+RAR[c[0]];
        // 把链上电路卡同步进收藏，用户才能点开它流片
        if(Number(c[2])===0&&!S.cards.some(x=>x.id===i)){
          S.cards.push({id:i,r:Number(c[0]),star:Number(c[1]),kind:0,ref:Number(c[3])});
          S.nextId=Math.max(S.nextId,i+1);
        }
      }catch(e){}}
      save();renderAll();chainPending=null;savePending();
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
    const [ok,reason]=await chainRead('checkPayment',[chainAcc,amt,payee,spent,0,0,false,0,false]);
    say((ok?'<b style="color:var(--teal)">PASS</b> · ':'<b style="color:var(--red)">FAIL</b> · ')+reason+
      ' <span class="mono">· card #'+Number(cid)+' · rule '+Number(t)+'</span>');
  }catch(e){say('● '+(e.reason||e.message||e))}
};
$('#bTogChain').onclick=()=>{
  localStorage.setItem('ap_chain',netId()==='38'?'61':'38');
  renderChain();toast('切换到 '+netName());
};

/* ══════════ 公开流片：任何钱包直接把官方网表流片成 NFT ══════════ */
const PUB_ABI=[
 "function quote(uint8) view returns (uint256,uint256,uint256,uint32)",
 "function tapeoutRaw(uint8) payable returns (uint256)"
];
const PUB_MAINNET='0xfbe8c8535bfa3602a4ab24f4a247a4cedc719f62';
function pubAddr(){return PUB_MAINNET}
let pubQuote=null;
async function autoPubQuote(){
  try{
    const rule=Number(($('#pubRule')||{}).value||0);
    const [bemCost,bnbCost,gates,nIn]=await (new ethers.Contract(pubAddr(),PUB_ABI,readProvider())).quote(rule);
    pubQuote={bemCost,bnbCost,gates,nIn};
    const usd=(Number(bemCost)/1e8*9.61)+(Number(bnbCost)/1e18*560.67);
    const pp=$('#pubPrice');if(pp)pp.textContent='≈ $'+usd.toFixed(2);
    const po=$('#pubOut');
    if(po)po.innerHTML='<b style="color:var(--gold)">≈ $'+usd.toFixed(2)+'</b> · '
      +ethers.utils.formatUnits(bemCost,8)+' BEM (NAND) + '
      +ethers.utils.formatEther(bnbCost)+' BNB (tapeout) · '+gates.toString()+' 门';
    const bt=$('#bPubTape');if(bt)bt.disabled=false;
  }catch(e){const pp=$('#pubPrice');if(pp)pp.textContent='价格读取失败';}
}
if($('#pubRule'))$('#pubRule').onchange=autoPubQuote;
autoPubQuote();
$('#bPubTape')&&($('#bPubTape').onclick=async()=>{
  try{
    if(!pubQuote)return toast('先查报价');
    const sg=await vaultSigner();await ensureChain();
    const me=await sg.getAddress();
    const bem=new ethers.Contract(bemAddr(),BEM_ABI,sg);
    const allowance=await bem.allowance(me,pubAddr());
    if(allowance.lt(pubQuote.bemCost)){
      $('#pubOut').textContent='授权 '+ethers.utils.formatUnits(pubQuote.bemCost,8)+' BEM…';
      const a=await bem.approve(pubAddr(),pubQuote.bemCost);await a.wait();
    }
    const tx=await new ethers.Contract(pubAddr(),PUB_ABI,sg).tapeoutRaw(Number($('#pubRule').value),{value:pubQuote.bnbCost});
    $('#pubOut').textContent='流片交易 '+tx.hash.slice(0,12)+'… 等待确认';
    const rc=await tx.wait();
    let cid='?';try{const ev=rc.events&&rc.events[0];cid=ev&&ev.args&&ev.args[2]}catch(e){}
    $('#pubOut').innerHTML='✅ 流片成功 · circuit #'+cid+' · <a href="'+chainScan()+'/token/'+processorAddr()+'?a='+cid+'" target="_blank" style="color:var(--gold)">BscScan ↗</a> · NFT 已进你的钱包。';
    beep(880,.12);toast('真身 circuit NFT 已进钱包');
  }catch(e){$('#pubOut').textContent='⛔ '+(e.reason||e.message||e)}
});

/* ══════════ GuardVault：卡灵的闸门 ══════════ */
const VAULT_ABI=[
 "function deposit() payable",
 "function withdraw(uint256)",
 "function setRate(uint256)",
 "function setAgent(address)",
 "function approveNext()",
 "function setTripped(bool)",
 "function pay(address,uint256,uint8) returns (uint256)",
 "function payFor(address,address,uint256,uint8) returns (uint256)",
 "function preview(address,address,uint256,uint8) view returns (bool,string,uint256)",
 "function balanceOf(address) view returns (uint256)",
 "function rateWeiPerCent(address) view returns (uint256)"
];
function vaultAddr(){return localStorage.getItem('ap_vault')||(netId()==='61'?TESTNET_VAULT:MAINNET_VAULT)}
const TESTNET_PROC='0x36b5b5b0b8a8ee405d4db1c53dac591c1f5e8ac9';
function processorAddr(){return localStorage.getItem('ap_processor')||(netId()==='61'?TESTNET_PROC:MAINNET_PROC)}
function vaultContract(signer){return new ethers.Contract(vaultAddr(),VAULT_ABI,signer)}
function vaultSay(t,cls){const o=$('#vaultOut');o.className='banner'+(cls?' '+cls:'');o.innerHTML=t}
async function vaultSigner(){const p=await chainProvider();await p.send('eth_requestAccounts',[]);return p.getSigner()}
$('#bSaveVault').onclick=()=>{
  const v=$('#vAddr').value.trim();
  if(v&&!/^0x[0-9a-fA-F]{40}$/.test(v))return toast('地址格式不正确');
  localStorage.setItem('ap_vault',v);
  toast(v?'金库地址已保存':'已清空');
  if(v)vaultSay('金库 <span class="mono">'+v.slice(0,10)+'…'+v.slice(-6)+'</span> · 连接钱包后可存可取。');
};
$('#bVaultRate').onclick=async()=>{
  try{
    const s=await vaultSigner();await ensureChain();
    const tx=await vaultContract(s).setRate(ethers.BigNumber.from('100000000000000')); // 1e14 wei / 美分
    vaultSay('设定费率… <span class="mono">'+tx.hash.slice(0,12)+'…</span>');
    await tx.wait();
    vaultSay('费率已设为 1 美分 = 0.0001 BNB。','ok');
  }catch(e){vaultSay('● '+(e.reason||e.message||e),'bad')}
};
$('#bVaultDeposit').onclick=async()=>{
  try{
    const v=parseFloat($('#vDep').value)||0;
    if(v<=0)return vaultSay('先填一个大于 0 的 BNB 数量。','bad');
    const s=await vaultSigner();await ensureChain();
    const tx=await vaultContract(s).deposit({value:ethers.utils.parseEther(String(v))});
    vaultSay('存入中… <span class="mono">'+tx.hash.slice(0,12)+'…</span>');
    await tx.wait();
    const bal=await vaultContract(await chainProvider()).balanceOf(await s.getAddress());
    vaultSay('已存入 '+v+' BNB · 金库余额 '+ethers.utils.formatEther(bal)+' BNB。','ok');
  }catch(e){vaultSay('● '+(e.reason||e.message||e),'bad')}
};
$('#bVaultPay').onclick=async()=>{
  try{
    if(!vaultAddr())return vaultSay('先保存 GuardVault 地址。','bad');
    const v=parseFloat($('#vPay').value)||0;
    if(v<=0)return vaultSay('先填一个大于 0 的付款金额。','bad');
    const payee=$('#vPayee').value.trim();
    if(!/^0x[0-9a-fA-F]{40}$/.test(payee))return vaultSay('收款方地址格式不对。','bad');
    const s=await vaultSigner();await ensureChain();
    const me=await s.getAddress();
    const wei=ethers.utils.parseEther(String(v));
    const [ok,why,cents]=await vaultContract(await chainProvider()).preview(me,payee,wei,0);
    vaultSay('预演：'+(ok?'<b style="color:var(--teal)">PASS</b>':'<b style="color:var(--red)">FAIL</b>')+' · '+why+' <span class="mono">· '+cents.toString()+' 美分</span>');
    if(!ok)return;
    const tx=await vaultContract(s).pay(payee,wei,0);
    vaultSay('付款中… <span class="mono">'+tx.hash.slice(0,12)+'…</span>');
    await tx.wait();
    vaultSay('✅ 付款成功：卡放行了这笔钱。 <span class="mono">'+why+'</span>','ok');
  }catch(e){
    const m=e.reason||e.message||String(e);
    vaultSay('⛔ 被卡灵拦下：<b style="color:var(--red)">'+m+'</b> —— 钱没动。','bad');
  }
};

/* ══════════ 电路剧场：NAND 网表引擎 + 渲染（TapeOut 字节格式）══════════
   网表语义（11 门）：
     allow = (金额 ≤ 剩余) ∨ 人工
     ask   = ¬allow ∧ (白名单 ∨ 人工)     —— deny = 既不 allow 也不 ask
   信号编号同 TapeOut：0/1=常量，2..5=输入(a,l,pk,h)，6..=逐门。
   字节格式：每门 7B = 0x00 + 两信号 u24，与处理器 tapeout(bytes,nIn,nOut) 一致。 */
const TH={nIn:4,gates:[[3,3],[2,6],[7,7],[5,5],[4,4],[10,9],[8,9],[12,12],[13,11],[14,14],[13,13]],nOut:2};
const TH_IN=[{k:'a',n:'这笔钱有点大',d:'打开 = 大额（比如 $150）'},
             {k:'l',n:'今天额度还够',d:'打开 = 剩余额度还不少'},
             {k:'pk',n:'收款人我认识',d:'打开 = 在白名单 / 有 Agent ID'},
             {k:'h',n:'有人点头了',d:'打开 = 人工已批准'}];
const thBytes=()=>TH.gates.reduce((s,[x,y])=>s+'00'+x.toString(16).padStart(6,'0')+y.toString(16).padStart(6,'0'),'');
function thTrace(word){
  const sig=new Uint8Array(2+TH.nIn+TH.gates.length);sig[1]=1;
  for(let i=0;i<TH.nIn;i++)sig[2+i]=(word>>i)&1;
  for(let i=0;i<TH.gates.length;i++){const[a,b]=TH.gates[i];sig[2+TH.nIn+i]=sig[a]&sig[b]?0:1}
  return sig;
}
const thDepth=()=>{const d=[0,0,0,0,0,0];TH.gates.forEach(([a,b],i)=>{d[2+TH.nIn+i]=1+Math.max(d[a],d[b])});return d};
let thTimers=[];
const thClear=()=>{thTimers.forEach(clearTimeout);thTimers=[]};

function renderTheater(){
  if(!$('#thStage'))return;
  $('#thIn').innerHTML=TH_IN.map((f,i)=>`
    <button class="th-sw" data-i="${i}" aria-pressed="false">
      <span class="sw"><i></i></span>
      <span class="sw-txt"><b>${f.n}</b><em>${f.k}=0</em><small>${f.d}</small></span>
    </button>`).join('');
  $$('#thIn .th-sw').forEach(b=>b.onclick=()=>{
    b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')==='true'?'false':'true');
    const i=+b.dataset.i;thWord^= (1<<i);b.querySelector('em').textContent=TH_IN[i].k+'='+(thWord>>i&1);
    beep(520,.04,'square',.02);
  });
  // 布局：输入列 + 每深度一列
  const dep=thDepth();const maxD=Math.max(...dep);
  const colOf=s=>s<2+TH.nIn?0:dep[s];
  const XS=[0];for(let c=1;c<=maxD+1;c++)XS.push(0);           // 占位
  const colW=118,x0=30,yIn=[70,130,190,250],yGate=[],H=330;
  const byCol={};TH.gates.forEach((g,i)=>{const c=colOf(6+i);(byCol[c]=byCol[c]||[]).push(i)});
  Object.values(byCol).flat().forEach(i=>yGate[i]=0);
  let svg=`<svg viewBox="0 0 ${30+colW*(maxD+2)+40} ${H}" width="100%">`;
  // 输入节点
  TH_IN.forEach((f,i)=>{svg+=`<circle class="nd in" id="thi${i}" cx="34" cy="${yIn[i]}" r="7"/>`+
    `<text class="lbl" x="12" y="${yIn[i]-14}">${f.n}</text>`});
  // 门
  TH.gates.forEach((g,i)=>{
    const x=34+colW*colOf(6+i);
    const ys=byCol[colOf(6+i)];yGate[i]=ys.indexOf(i)===0?110:Math.min(H-40,110+ys.indexOf(i)*62);
    const y=yGate[i],a=g[0],b=g[1];
    const pos=s=>s<2+TH.nIn?[34,yIn[s-2]]:[34+colW*colOf(s),yGate[s-6]];
    const[ax,ay]=pos(a),[bx,by]=pos(b);
    svg+=`<path class="wire" id="tw${i}a" d="M${ax+7} ${ay} C ${ax+40} ${ay}, ${x-40} ${y-8}, ${x-11} ${y-8}"/>`;
    svg+=`<path class="wire" id="tw${i}b" d="M${bx+7} ${by} C ${bx+40} ${by}, ${x-40} ${y+8}, ${x-11} ${y+8}"/>`;
    svg+=`<g class="gate" id="tg${i}"><rect x="${x-11}" y="${y-16}" width="24" height="32" rx="5"/>`+
      `<text x="${x+1}" y="${y+4}">∧¬</text><text class="gn" x="${x+1}" y="${y-24}">G${i}</text></g>`;
  });
  // 输出灯（最后 nOut 个信号）
  for(let k=0;k<TH.nOut;k++){
    const gi=TH.gates.length-TH.nOut+k, x=34+colW*(colOf(6+gi)+1)+26, y=110+k*70;
    svg+=`<path class="wire" id="ow${k}" d="M${34+colW*colOf(6+gi)+13} ${yGate[gi]} C ${34+colW*colOf(6+gi)+60} ${yGate[gi]}, ${x-60} ${y}, ${x-9} ${y}"/>`;
    svg+=`<circle class="lamp" id="tho${k}" cx="${x}" cy="${y}" r="10"/>`+
      `<text class="lbl" x="${x+16}" y="${y+4}">${k===0?'ask':'allow'}</text>`;
  }
  svg+='</svg>';
  $('#thStage').innerHTML=svg;
  thMsg('网表 <span class="mono">'+thBytes().length/7+' 门 · 0x'+thBytes().slice(0,28)+'…</span> · 拨动输入后运行。');
}
function thMsg(t){const m=$('#thMsg');m.className='banner';m.innerHTML=t}
let thWord=0;
function thRun(failClosed){
  thClear();
  const v=$('#thVerdict');v.className='th-verdict';
  v.querySelector('.tv-v').textContent='…';v.querySelector('.tv-sub').textContent='eval 中';
  if(failClosed){ // TapeID guard 的 fail-closed：网络异常 → 不评估、不签名、不放行
    v.classList.add('deny');
    v.querySelector('.tv-v').textContent='deny';
    v.querySelector('.tv-sub').textContent='网络异常 · fail-closed：不产生签名，不放行';
    thMsg('<b style="color:var(--red)">guard 什么都没签。</b> tapeid 规则：评估失败时宁可不签名，绝不猜一个 allow。<span class="mono">evaluatePayment() → throw</span>');
    beep(140,.3,'sawtooth',.07);return;
  }
  const sig=thTrace(thWord);
  const allow=sig[2+TH.nIn+TH.gates.length-1],ask=sig[2+TH.nIn+TH.gates.length-2];
  // 逐深度点亮：输入 → 门 → 输出
  const dep=thDepth(),maxD=Math.max(...dep.slice(0,2+TH.nIn).concat(dep));
  const light=(id,on)=>{const el=document.getElementById(id);if(el)el.classList.toggle('on',!!on)};
  thTimers.push(setTimeout(()=>{for(let i=0;i<TH.nIn;i++){light('thi'+i,(thWord>>i)&1);TH_IN[i]}} ,0));
  const step=340;
  for(let d=1;d<=maxD;d++)thTimers.push(setTimeout(()=>{
    TH.gates.forEach((g,i)=>{if(dep[6+i]!==d)return;const on=sig[6+i];
      light('tg'+i,on);light('tw'+i+'a',sig[g[0]]);light('tw'+i+'b',sig[g[1]]);
      if(on)beep(700+d*40,.03,'triangle',.015)});
  },d*step));
  thTimers.push(setTimeout(()=>{
    light('ow0',ask);light('ow1',allow);light('tho0',ask);light('tho1',allow);
    const g=allow?'allow':ask?'ask':'deny';
    v.classList.add(g);
    v.querySelector('.tv-v').textContent=g.toUpperCase();
    const A=(thWord&1)?'$150':'$8',L=(thWord>>1&1),P=(thWord>>2&1),H=(thWord>>3&1);
    v.querySelector('.tv-sub').textContent=(g==='allow'?'guard 放行：签名继续':g==='ask'?'guard 转人工：停下来问人':'guard 拒签：这笔发不出去');
    thMsg((g==='allow'
      ?`<b style="color:var(--pass)">allow</b> · ${A}${L?'（额度内）':''}${H?' · 人工批准':''} → 签名放行`
      :g==='ask'
      ?`<b style="color:var(--gold)">ask</b> · ${A} 超了额度，但${P?'白名单收款方':'人工在场'} → 停下来问人`
      :`<b style="color:var(--red)">deny</b> · ${A} 超额度、无白名单、无人工 → 拒签，fail-closed`)
      +' · <span class="mono">word=0b'+thWord.toString(2).padStart(4,'0')+' → ('+ask+','+allow+')</span>');
    beep(g==='allow'?880:g==='ask'?440:160,.15,g==='allow'?'triangle':'square',.05);
  },(maxD+1)*step));
}
function renderTheaterInit(){
  renderTheater();
  $('#thRun').onclick=()=>thRun(false);
  $('#thRand').onclick=()=>{thWord=Math.floor(Math.random()*16)&~8;  // 人工=0 更常见
    $$('#thIn .th-sw').forEach(b=>{const i=+b.dataset.i;const on=(thWord>>i)&1;
      b.setAttribute('aria-pressed',on?'true':'false');b.querySelector('em').textContent=TH_IN[i].k+'='+on});
    thRun(false)};
  $('#thFail').onclick=()=>thRun(true);
}
renderTheaterInit();

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
  const {t,p1,p2}=ruleParams(c);
  if(t===7){const ok=st.lastAt===null||q.at-st.lastAt>=p1;return ok?[1,'冷却已满足']:[0,'距上一笔不到 '+Math.round(p1/60)+' 分钟']}
  if(t===8){const ok=!st.lockUntil||q.at>=st.lockUntil;return ok?[1,'未封控']:[0,'封控中 · 已锁 '+Math.round((st.lockUntil-q.at)/60)+' 分钟']}
  if(t===12)return q.payee===S.pool[c.ref]?.name?[1,'是正主']:[0,'不是这张卡的正主'];
  if(t===11)return q.payee===st.delegated&&q.at<=st.delegUntil?[1,'窗口内 · 是指定收款方']:[0,'不在委托窗口/名单'];
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
    :`<span class="gb-k">还没打过</span><b class="grade none">N/A</b><span>评级 S 奖励 3 包，A 2 包，B 1 包</span>`;
}
function gateStart(){
  G={qs:gateMake(),i:0,stack:gateSel.map(id=>S.cards.find(c=>c.id===id)).filter(Boolean),
     st:{spent:0,count:0,lastAt:null,lockUntil:0,delegated:S.pool.filter(p=>p.active)[0]?.name||'',delegUntil:1e18},paid:0,saved:0,lost:0,miss:0,right:0,log:[],t0:0,raf:0,busy:false};
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
    if(q.scam){G.lost+=q.amt;out='被骗';cls='bad';beep(150,.3,'sawtooth',.07);
      const lock=G.stack.find(x=>ruleDerived(x).t===8); // 封控电路：被骗即锁
      if(lock)G.st.lockUntil=q.at+ruleParams(lock).p1;
    }
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
  // 两种失败分开算：漏放骗局（lost>0）与误杀真账单（miss>0）
  let g;
  if(G.lost===0&&G.miss===0)g='S';
  else if(G.lost>0)g=G.lost>=10000?'C':(G.lost<=2000&&acc>=.7?'A':'B'); // 被骗优先扣评级
  else g=G.miss<=2?'A':(G.miss<=4?'B':'C'); // 没被骗但拦太严
  const title=G.lost>0
    ?{A:'守得很稳，只是漏了一笔小额',B:'还有漏洞，被骗了 '+usd(G.lost),C:'Agent 被掏空了'}[g]
    :{A:'没被骗，误杀在 2 笔以内',B:'守得太严：真账单被拦了 '+G.miss+' 笔',C:'全是误杀，正常账单全停'}[g];
  const packs={S:3,A:2,B:1,C:0}[g];
  S.mis.gate=(S.mis.gate||0)+1;
  const gotPacks=grantPacks(packs,'守门');
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
      <h3>${g==='S'?'一笔没漏，一笔没错':title}</h3>
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
