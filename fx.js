/* ═══════════════════════════════════════════════════
   Agent Packs · 动效层（v4.1）
   - WebGL 镭射箔：卡包表面的薄膜干涉 + 褶皱 + 闪点，跟随指针
   - 撕开卡包：沿顶部虚线拖动，压齿条被撕下
   - 稀有卡翻开前蓄力，SSR+ 全屏闪光 + 稀有度大字
   - 落地页滚动叙事、赔率条入场、页面切换扫屏、情境指针
   依赖 app.js 的全局函数（dealCards / flip / switchTab / cardHTML …）。
   ═══════════════════════════════════════════════════ */
(()=>{
const ovl=document.querySelector('#ovl');
const CALM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
const q=s=>document.querySelector(s), qa=s=>document.querySelectorAll(s);

/* ───────────── 1 · WebGL 镭射箔 ───────────── */
const FRAG=`precision mediump float;
uniform vec2 r;uniform vec2 m;uniform float t;uniform float k;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}
vec3 film(float x){return .5+.5*cos(6.2831*(x+vec3(0.,.33,.67)));}
void main(){
  vec2 uv=gl_FragCoord.xy/r; uv.y=1.-uv.y;
  vec2 p=uv*vec2(r.x/r.y,1.);
  float c=n(p*5.)*.55+n(p*13.+3.1)*.3+n(p*31.+7.)*.15;
  float e=.06;
  vec2 g=vec2(n(p*7.+vec2(e,0.))-n(p*7.-vec2(e,0.)),n(p*7.+vec2(0.,e))-n(p*7.-vec2(0.,e)));
  vec2 d=m-uv;
  vec3 N=normalize(vec3(g*3.,1.));
  vec3 L=normalize(vec3(d*1.6,1.));
  float ndl=dot(N,L);
  float x=c*1.3+ndl*1.8+(uv.x*.7+uv.y*.5)+m.x*.9-m.y*.4+t*.025;
  vec3 col=film(x);
  float band=pow(.5+.5*sin((uv.x*1.3-uv.y*.9+m.x*1.2)*8.),3.)*.55;
  float glare=pow(max(0.,1.-length(d)*1.7),2.5)*.9;
  float sp=step(.9965,h(floor(gl_FragCoord.xy/1.5)+floor(t*5.)))*pow(max(0.,1.-length(d)*1.4),1.5)*2.2;
  vec3 o=col*(.22+band)*(.55+.45*ndl)+glare+sp;
  gl_FragColor=vec4(o*k,1.);
}`;
const VERT='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const holos=new Set();
function mountHolo(host,{k=1}={}){
  if(!host||host.querySelector('.holo-gl'))return null;
  const cv=document.createElement('canvas');cv.className='holo-gl';
  const gl=cv.getContext('webgl',{premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:false});
  if(!gl)return null;
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null};
  const vs=sh(gl.VERTEX_SHADER,VERT),fs=sh(gl.FRAGMENT_SHADER,FRAG);
  if(!vs||!fs)return null;
  const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return null;
  gl.useProgram(pr);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const U={r:gl.getUniformLocation(pr,'r'),m:gl.getUniformLocation(pr,'m'),t:gl.getUniformLocation(pr,'t'),k:gl.getUniformLocation(pr,'k')};
  host.appendChild(cv);host.classList.add('gl-on');
  const H={host,cv,gl,U,k,mx:.35,my:.25,tx:.35,ty:.25,vis:true,t0:performance.now(),dead:false};
  const size=()=>{const dpr=Math.min(1.5,devicePixelRatio||1);const w=Math.max(2,Math.round(host.clientWidth*dpr/2)),h=Math.max(2,Math.round(host.clientHeight*dpr/2));
    if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;gl.viewport(0,0,w,h)}};
  H.size=size;size();
  new ResizeObserver(size).observe(host);
  const io=new IntersectionObserver(es=>{H.vis=es[0].isIntersecting},{threshold:0});io.observe(host);
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();H.tx=(e.clientX-r.left)/r.width;H.ty=(e.clientY-r.top)/r.height});
  host.addEventListener('pointerleave',()=>{H.tx=.35;H.ty=.25});
  holos.add(H);draw(H,performance.now());
  return H;
}
function draw(H,now){
  if(!H.host.isConnected){H.dead=true;holos.delete(H);return}
  const{gl,U}=H;
  H.mx+=(H.tx-H.mx)*.12;H.my+=(H.ty-H.my)*.12;
  if(!FINE){const s=(now-H.t0)/1000;H.tx=.5+Math.sin(s*.7)*.35;H.ty=.4+Math.cos(s*.5)*.25}
  gl.uniform2f(U.r,H.cv.width,H.cv.height);gl.uniform2f(U.m,H.mx,H.my);
  gl.uniform1f(U.t,(now-H.t0)/1000);gl.uniform1f(U.k,H.k);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
if(!CALM){
  const loop=now=>{if(!document.hidden)for(const H of holos)if(H.vis)draw(H,now);requestAnimationFrame(loop)};
  requestAnimationFrame(loop);
}
mountHolo(q('#heroPackWrap'));
mountHolo(q('.sc-back'),{k:.5});

/* ───────────── 2 · 开包：撕开压齿条 ───────────── */
const _deal=dealCards;
let tearing=false;
function tearThen(go){
  const bp=q('#bp');
  if(!bp||bp.classList.contains('torn')||CALM){go();return}
  bp.classList.add('torn');
  if(typeof SFX!=='undefined')SFX.tear();else beep(900,.05,'sawtooth',.03);
  setTimeout(go,520);
}
dealCards=function(){
  if(phase!=='pack'||tearing)return;
  tearing=true;tearThen(()=>{tearing=false;if(opening&&phase==='pack'&&ovl.classList.contains('on'))_deal()});
};
function armPack(bp){
  if(!bp||bp.dataset.armed)return;bp.dataset.armed=1;
  bp.onclick=dealCards;
  const svg=bp.querySelector('svg');
  const strip=document.createElement('div');strip.className='tear-strip';strip.appendChild(svg.cloneNode(true));
  const zone=document.createElement('div');zone.className='tear-zone';zone.innerHTML='<i></i>';zone.setAttribute('aria-hidden','true');
  const leak=document.createElement('div');leak.className='light-leak';
  bp.append(leak,strip,zone);
  mountHolo(bp);
  let x0=null,best=0;
  zone.addEventListener('pointerdown',e=>{e.stopPropagation();x0=e.clientX;best=0;zone.setPointerCapture(e.pointerId)});
  zone.addEventListener('pointermove',e=>{
    if(x0===null)return;
    const w=zone.clientWidth;const p=Math.max(0,Math.min(1,Math.abs(e.clientX-x0)/(w*.7)));
    if(p>best){best=p;zone.querySelector('i').style.width=(p*88)+'%';if(Math.random()<.35)beep(500+p*900,.02,'sawtooth',.015)}
    if(p>=1){x0=null;dealCards()}
  });
  const end=e=>{e&&e.stopPropagation();if(x0!==null&&best<1)zone.querySelector('i').style.width='0';x0=null};
  zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end);
  zone.addEventListener('click',e=>e.stopPropagation());
}
if(!ovl.querySelector('.dim')){const d=document.createElement('div');d.className='dim';ovl.prepend(d)}
new MutationObserver(()=>armPack(q('#bp'))).observe(q('#stage'),{childList:true});

/* ───────────── 3 · 翻卡：稀有卡蓄力 + 闪光 ───────────── */
const _flip=flip;
flip=function(d,c){
  const fc=d.querySelector('.fcard');
  if(!fc||fc.classList.contains('flip')||phase!=='cards'||d.dataset.charging)return;
  if(c.r<4||CALM){_flip(d,c);return}
  d.dataset.charging=1;d.classList.add('charging');ovl.classList.add('focus');
  if(typeof SFX!=='undefined')SFX.charge();else [220,277,330,392,440].forEach((f,i)=>setTimeout(()=>beep(f,.12,'triangle',.04),i*150));
  setTimeout(()=>{
    d.classList.remove('charging');delete d.dataset.charging;
    _flip(d,c);
    const r=d.getBoundingClientRect();
    const fl=document.createElement('div');fl.className='rare-flash r'+c.r;
    fl.style.setProperty('--fx',(r.left+r.width/2)+'px');fl.style.setProperty('--fy',(r.top+r.height/2)+'px');
    document.body.appendChild(fl);setTimeout(()=>fl.remove(),950);
    const nm=document.createElement('div');nm.className='rare-name';nm.textContent=RAR[c.r];
    document.body.appendChild(nm);setTimeout(()=>nm.remove(),1650);
    setTimeout(()=>ovl.classList.remove('focus'),700);
  },900);
};
q('#bAll').onclick=()=>{
  if(!opening)return;
  const slots=[...qa('.slot')];const cards=opening.slice();
  const order=slots.map((d,i)=>i).sort((a,b)=>cards[a].r-cards[b].r);
  let t=0;order.forEach(i=>{setTimeout(()=>flip(slots[i],cards[i]),t);t+=cards[i].r>=4?1300:260});
};

/* ───────────── 4 · 落地页：赔率条入场 + 滚动叙事 ───────────── */
const strip=q('#oddsLadder .odds-strip');
if(strip){if(CALM)strip.classList.add('in');else new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){strip.classList.add('in');o.disconnect()}},{threshold:.4}).observe(strip)}
const st2=q('#oddsLadder2 .odds-strip');if(st2)st2.classList.add('in');

const story=q('#story'),scard=q('#storyCard');
if(story&&scard){
  const demo={id:42,r:4,star:1,kind:0,ref:0};
  q('#storyFront').innerHTML=cardHTML(demo);
  const lim=ruleShort(demo);
  q('#storyPay li:nth-child(2) span').textContent='订阅续费，今天已花 $20';
  const steps=[...qa('.story-steps li')],pays=[...qa('#storyPay li')];
  let last=-1;
  const upd=()=>{
    const r=story.getBoundingClientRect(),vh=innerHeight;
    const p=Math.max(0,Math.min(1,(-r.top+vh*.15)/(r.height-vh)));
    if(Math.abs(p-last)<.001)return;last=p;
    story.style.setProperty('--p',p.toFixed(4));
    const flipP=Math.max(0,Math.min(1,(p-.3)/.25));
    const e=flipP<.5?2*flipP*flipP:1-Math.pow(-2*flipP+2,2)/2;
    scard.style.setProperty('--flip',e.toFixed(4));
    const step=p<.3?0:p<.62?1:2;
    steps.forEach((li,i)=>li.classList.toggle('on',i===step));
    pays.forEach(li=>{const on=p>=+li.dataset.at;if(on&&!li.classList.contains('on')&&p<.99){
      const k=li.querySelector('em').className;beep(k==='ok'?660:k==='ask'?440:180,.09,k==='bad'?'sawtooth':'triangle',.04)}
      li.classList.toggle('on',on)});
  };
  if(!CALM){addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd)}
  upd();
}

/* ───────────── 5 · 页面切换扫屏 ───────────── */
const _switch=switchTab;
switchTab=function(v){
  if(CALM||!q('#land')||document.hidden){_switch(v);return}
  if(document.startViewTransition){document.startViewTransition(()=>_switch(v));return}
  const w=document.createElement('div');w.className='wipe';document.body.appendChild(w);
  setTimeout(()=>_switch(v),300);setTimeout(()=>w.remove(),720);
};
qa('.tab[data-v]').forEach(t=>t.onclick=()=>switchTab(t.dataset.v));

/* ───────────── 6 · 情境指针 + 磁吸主按钮 ───────────── */
if(FINE&&!CALM){

  qa('.btn.primary.xl').forEach(b=>{
    b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();
      b.style.transform=`translate(${((e.clientX-r.left)/r.width-.5)*10}px,${((e.clientY-r.top)/r.height-.5)*8}px)`});
    b.addEventListener('pointerleave',()=>b.style.transform='');
  });
}

/* ───────────── 7 · Canvas 粒子（CT Packs 同款 burst / converge） ───────────── */
(function(){
  if(CALM)return;
  let cv=null,ctx=null,parts=[],raf=0;
  function mount(){
    if(cv)return;cv=document.createElement('canvas');cv.className='fx-layer';document.body.appendChild(cv);
    ctx=cv.getContext('2d');const size=()=>{const a=Math.min(2,devicePixelRatio||1);cv.width=innerWidth*a;cv.height=innerHeight*a;ctx.setTransform(a,0,0,a,0,0)};
    size();addEventListener('resize',size);
  }
  function frame(){
    ctx.clearRect(0,0,innerWidth,innerHeight);ctx.globalCompositeOperation='lighter';
    parts=parts.filter(p=>p.life>0);
    for(const p of parts){
      p.life-=p.decay;p.vx*=p.drag;p.vy=p.vy*p.drag+p.g;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;
      ctx.globalAlpha=Math.max(0,p.life);
      if(p.kind==='spark'){ctx.strokeStyle=p.color;ctx.lineWidth=p.size;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*3,p.y-p.vy*3);ctx.stroke()}
      else if(p.kind==='shard'){ctx.save();ctx.translate(p.x,p.y);ctx.rot=p.rot||0;ctx.rotate(p.rot);
        ctx.fillStyle=p.color;ctx.fillRect(-p.size,-p.size*.35,p.size*2,p.size*.7);ctx.restore()}
      else{const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*3);
        g.addColorStop(0,p.color);g.addColorStop(1,'transparent');ctx.fillStyle=g;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size*3,0,Math.PI*2);ctx.fill()}
    }
    ctx.globalAlpha=1;raf=parts.length?requestAnimationFrame(frame):0;
  }
  function run(){if(!raf)raf=requestAnimationFrame(frame)}
  window.fxBurst=({x=innerWidth/2,y=innerHeight/2,colors=['#fff'],count=60,power=12,kinds=['spark','glow','shard'],gravity=.18}={})=>{
    mount();for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2,s=power*(.3+Math.random()*.9);
      parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-power*.15,g:gravity,drag:.96,life:1,
        decay:.008+Math.random()*.014,size:1.2+Math.random()*3.2,rot:Math.random()*6,vr:(Math.random()-.5)*.3,
        color:colors[i%colors.length],kind:kinds[i%kinds.length]});
    }run();
  };
  window.fxConverge=({colors=['#fff'],count=50,x=innerWidth/2,y=innerHeight/2}={})=>{
    mount();for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2,R=Math.max(innerWidth,innerHeight)*(.4+Math.random()*.3),
        px=x+Math.cos(a)*R,py=y+Math.sin(a)*R,s=50+Math.random()*30;
      parts.push({x:px,y:py,vx:(x-px)/s,vy:(y-py)/s,g:0,drag:1,life:1,decay:1/s,
        size:1+Math.random()*2.5,rot:0,vr:0,color:colors[i%colors.length],kind:'spark'});
    }run();
  };
})();
})();
