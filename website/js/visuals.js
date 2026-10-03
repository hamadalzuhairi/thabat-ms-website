/* Thabat MS website v4: code-drawn visuals.
   No photos and no AI images: every visual here is drawn live from simulated data, so it explains
   the product instead of decorating it.
     lab(root)      "The signal": 30 days of one person's tapping, a live tap tape and the alert rule
     story(root)    "How it works": a sticky phone that changes screen as you scroll
     bento(root)    feature tiles with small live demos
     privacy(root)  what is filtered on the phone, and the one summary that leaves it each day
   ctx = {t(key), lang(), rtl(), rm (reduced motion), qa, onLang(fn), logo (img src)}
   Numbers match the app prototype: usual 240 ms, a slower day is 9% above usual (262 ms),
   and slowing that lasts several days gives "Please contact your MS team" (the demo uses 4 days in a row as a
   placeholder; the real rule is calibrated in the pilot, see research/alert-rule-validation.md). All data is simulated. */
window.ThabatVisuals=(function(){
"use strict";

/* ---------- shared simulated data ---------- */
const USUAL=240, SLOW=Math.round(USUAL*1.09), LO=228;
const NOISE=[3,-2,4,-5,1,6,-3,2,-1,5,-4,0,3,-6,2,4,-2,1,-3,5,0,-4,2,3,-1,-5,4,1,-2,2];
const DAYS=NOISE.map(n=>USUAL+Math.round(n*1.6)); DAYS[25]=264; DAYS[26]=268; DAYS[27]=271; DAYS[28]=274; DAYS[29]=277;
const DOSE=DAYS.map(()=>"taken"); DOSE[8]="late"; DOSE[15]="not";
const isSlow=d=>d>14&&DAYS[d-1]>SLOW;
/* 0 learning, 1 within usual, 2 slower day, 3 contact your MS team */
const status=d=>d<=14?0:(isSlow(d)&&isSlow(d-1)&&isSlow(d-2)&&isSlow(d-3))?3:isSlow(d)?2:1;
const ST_IC=["i-clock","i-check","i-alert","i-phone-call"];

/* ---------- helpers ---------- */
const fmt=(s,o)=>String(s==null?"":s).replace(/\{(\w+)\}/g,(m,k)=>o&&o[k]!=null?o[k]:m);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const icon=(id,c)=>`<svg class="ic${c?" "+c:""}" aria-hidden="true"><use href="#${id}"/></svg>`;
const pad=(n,l)=>String(n).padStart(l||2,"0");
const stamp=ms=>`${pad(Math.floor(ms/36e5)%24)}:${pad(Math.floor(ms/6e4)%60)}:${pad(Math.floor(ms/1e3)%60)}.${pad(Math.floor(ms%1000),3)}`;
function rng(a){ return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function gauss(r){ let u=0; while(!u) u=r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*r()); }
function rgba(hex,a){ const n=parseInt(hex.slice(1),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
function onVisible(node,cb,margin){
  if(!("IntersectionObserver" in window)){ cb(true); return; }
  new IntersectionObserver(es=>{ for(const e of es) cb(e.isIntersecting); },{rootMargin:margin||"0px"}).observe(node);
}
function onResize(node,cb){ if("ResizeObserver" in window) new ResizeObserver(()=>cb()).observe(node); else addEventListener("resize",cb); }
function offsetIn(el,anc){ let x=0,y=0,n=el; while(n&&n!==anc){ x+=n.offsetLeft; y+=n.offsetTop; n=n.offsetParent; } return {x,y}; }
function smooth(p){
  let d=`M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for(let i=0;i<p.length-1;i++){
    const p0=p[i-1]||p[i], p1=p[i], p2=p[i+1], p3=p[i+2]||p2;
    d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)} ${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)} ${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
/* a self-rescheduling timer: fn returns the delay until its next call */
function runner(fn){
  let id=0, on=false;
  const tick=()=>{ if(!on) return; const w=fn(); id=setTimeout(tick,w); };
  return { get on(){ return on; }, start(delay){ if(on) return; on=true; id=setTimeout(tick,delay||0); }, stop(){ on=false; clearTimeout(id); } };
}
function tween(from,to,dur,cb){
  const s=performance.now(); let raf=0;
  const f=n=>{ const k=Math.min(1,(n-s)/dur), e=1-Math.pow(1-k,3); cb(from+(to-from)*e); if(k<1) raf=requestAnimationFrame(f); };
  raf=requestAnimationFrame(f); return ()=>cancelAnimationFrame(raf);
}
const restart=(el,cls)=>{ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

/* =====================================================================
   1. LAB: "The signal"
   ===================================================================== */
function lab(root,ctx){
  const t=ctx.t;
  root.innerHTML=`
  <div class="lab-head">
    <div class="lab-status"><span class="ls-ic"></span><div><b class="ls-t"></b><span class="ls-d"></span></div></div>
    <span class="sim-tag">${icon("i-info")}<span data-i="simTag"></span></span>
  </div>
  <div class="lab-body">
    <div class="lab-read">
      <div class="ro ro-main">
        <span class="ro-l" data-i="labMedian"></span>
        <div class="ro-v"><b class="ro-ms num">${DAYS[0]}</b><span class="ro-u" data-i="msUnit"></span></div>
        <span class="ro-delta"></span>
      </div>
      <div class="ro-row">
        <div class="ro"><span class="ro-l" data-i="labUsual"></span><div class="ro-v sm"><b class="num">${USUAL}</b><span class="ro-u" data-i="msUnit"></span></div></div>
        <div class="ro"><span class="ro-l" data-i="labDay"></span><div class="ro-v sm"><b class="ro-day num">1</b><span class="ro-u num">/ 30</span></div></div>
      </div>
      <p class="ro-note">${icon("i-info")}<span data-i="lowerFaster"></span></p>
    </div>
    <div class="lab-tape" aria-hidden="true"><canvas></canvas><div class="tape-cap"><i></i><span data-i="labTape"></span></div></div>
  </div>
  <div class="lab-chart">
    <div class="lab-svgw"></div>
    <span class="lab-ov ov-zone" data-i="st0"></span>
    <span class="lab-ov ov-thr"></span>
    <span class="lab-ov ov-band" data-i="lgBand"></span>
    <span class="lab-ov ov-doses"><b data-i="labDoses"></b><span><i class="lg-d"></i><span data-i="labLegTaken"></span></span><span><i class="lg-d late"></i><span data-i="labLegLate"></span></span><span><i class="lg-d not"></i><span data-i="labLegNot"></span></span></span>
    <span class="lab-ov ov-tip"></span>
    <input class="lab-range" type="range" min="1" max="30" step="1" value="1" dir="ltr" data-al="labScrub">
  </div>
  <div class="lab-foot">
    <ol class="stages">${[0,1,2,3].map(i=>`<li><button type="button" data-s="${i}">${icon(ST_IC[i])}<span data-i="st${i}"></span></button></li>`).join("")}</ol>
    <button type="button" class="replay lab-play"><span class="lp-ic"></span><span class="lp-t"></span></button>
  </div>`;
  const q=s=>root.querySelector(s);
  const chart=q(".lab-chart"), svgw=q(".lab-svgw"), range=q(".lab-range"), tip=q(".ov-tip"), playBtn=q(".lab-play");
  const msEl=q(".ro-ms"), dayEl=q(".ro-day"), delta=q(".ro-delta");
  let W=0,H=0,X=null,Y=null,day=1,shown=DAYS[0],stopTw=null,playing=false,ptimer=0,started=false,drag=false,cur,curP,clip;

  function build(){
    const w=Math.round(chart.clientWidth); if(!w||w===W) return; W=w;
    H=W>=760?340:W>=520?300:272;
    const top=52, bot=H-78, xs=14, xe=W-48;
    X=d=>xs+16+(d-1)*(xe-xs-32)/29; Y=v=>bot-(v-212)/(286-212)*(bot-top);
    const P=DAYS.map((v,i)=>[X(i+1),Y(v)]), path=smooth(P), area=path+` L${X(30)} ${bot+2} L${X(1)} ${bot+2} Z`;
    const xL=X(14.5), lane=H-44, f=(X(25.5)-X(1))/(X(30)-X(1));
    svgw.innerHTML=`<svg class="lab-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
<defs>
 <linearGradient id="labLineG" gradientUnits="userSpaceOnUse" x1="${X(1)}" x2="${X(30)}" y1="0" y2="0"><stop offset="0" stop-color="#4D8FF0"/><stop offset=".5" stop-color="#8DBBFA"/><stop offset="${(f-.02).toFixed(3)}" stop-color="#B5D2FF"/><stop offset="${(f+.03).toFixed(3)}" stop-color="#FFB073"/><stop offset="1" stop-color="#FF8A2B"/></linearGradient>
 <linearGradient id="labAreaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4D8FF0" stop-opacity=".26"/><stop offset="1" stop-color="#4D8FF0" stop-opacity="0"/></linearGradient>
 <linearGradient id="labBandG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8DBBFA" stop-opacity=".2"/><stop offset="1" stop-color="#8DBBFA" stop-opacity=".06"/></linearGradient>
 <pattern id="labHatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" stroke="rgba(141,187,250,.1)" stroke-width="3"/></pattern>
 <clipPath id="labClip"><rect class="lab-clip" x="0" y="0" height="${H}" width="0"/></clipPath>
</defs>
<g class="lab-grid">${[220,240,260,280].map(v=>`<line x1="${xs}" x2="${xe}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="${W-10}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end">${v}</text>`).join("")}</g>
<rect x="${xs}" y="${top-14}" width="${(xL-xs).toFixed(1)}" height="${(bot-top+16).toFixed(1)}" rx="14" fill="url(#labHatch)" stroke="rgba(141,187,250,.12)"/>
<rect x="${xL.toFixed(1)}" y="${Y(SLOW).toFixed(1)}" width="${(xe-xL).toFixed(1)}" height="${(Y(LO)-Y(SLOW)).toFixed(1)}" rx="8" fill="url(#labBandG)"/>
<line class="lab-thr" x1="${xL.toFixed(1)}" x2="${xe}" y1="${Y(SLOW).toFixed(1)}" y2="${Y(SLOW).toFixed(1)}"/>
<line class="lab-usual" x1="${xL.toFixed(1)}" x2="${xe}" y1="${Y(USUAL).toFixed(1)}" y2="${Y(USUAL).toFixed(1)}"/>
<path class="lab-ghost" d="${path}"/>
<g clip-path="url(#labClip)">
 <path d="${area}" fill="url(#labAreaG)"/>
 <path class="lab-line" d="${path}" stroke="url(#labLineG)"/>
 ${P.map((p,i)=>isSlow(i+1)?`<path class="lab-tri" d="M${p[0].toFixed(1)} ${(p[1]-27).toFixed(1)} l8 13 h-16z"/><circle class="lab-pt slow" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5.5"/>`:`<circle class="lab-pt" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2"/>`).join("")}
 ${DOSE.map((s,i)=>{ const x=X(i+1).toFixed(1); return s==="late"?`<circle class="dz late" cx="${x}" cy="${lane}" r="5"/><path class="dz-half" d="M${(X(i+1)-5).toFixed(1)} ${lane} a5 5 0 0 0 10 0z"/>`:`<circle class="dz ${s}" cx="${x}" cy="${lane}" r="5"/>`; }).join("")}
</g>
<g class="lab-axis">${[1,7,14,21,30].map(d=>`<text x="${X(d).toFixed(1)}" y="${H-12}" text-anchor="middle">${d}</text>`).join("")}</g>
<g class="lab-cur"><line class="cur-l" x1="0" x2="0" y1="34" y2="${lane+12}"/><g class="cur-p"><circle class="cur-glow" r="14"/><circle class="cur-dot" r="6.5"/></g></g>
</svg>`;
    cur=svgw.querySelector(".lab-cur"); curP=svgw.querySelector(".cur-p"); clip=svgw.querySelector(".lab-clip");
    const zone=q(".ov-zone"); zone.style.left=xs+"px"; zone.style.width=(xL-xs)+"px"; zone.style.top=(top-6)+"px";
    const thr=q(".ov-thr"); thr.style.left=(xL+8)+"px"; thr.style.top=(Y(SLOW)-4)+"px";
    const band=q(".ov-band"); band.style.left=(xL+8)+"px"; band.style.top=(Y(LO)+4)+"px";
    const dz=q(".ov-doses"); dz.style.left=xs+"px"; dz.style.top=(lane-12)+"px";
    setDay(day,true);
  }

  function label(){
    const again=!playing&&day>=30;
    q(".lp-ic").innerHTML=icon(playing?"i-pause":again?"i-refresh":"i-play");
    q(".lp-t").textContent=t(playing?"labPause":again?"labAgain":"labPlay");
  }
  function setDay(d,instant){
    d=clamp(Math.round(d),1,30); day=d;
    const v=DAYS[d-1], s=status(d), slow=isSlow(d);
    root.dataset.s=s; root.toggleAttribute("data-slow",slow); root.toggleAttribute("data-learn",s===0);
    if(X){
      const x=X(d), y=Y(v);
      cur.style.transform=`translateX(${x.toFixed(1)}px)`; curP.style.transform=`translateY(${y.toFixed(1)}px)`;
      clip.style.width=(x+12).toFixed(1)+"px";
      tip.style.left=clamp(x,62,W-62).toFixed(1)+"px";
      if(instant){ [cur,curP,clip,tip].forEach(e=>{ e.style.transition="none"; void e.getBoundingClientRect(); e.style.transition=""; }); }
    }
    tip.textContent=fmt(t("labTip"),{d,ms:v});
    root.querySelectorAll(".lab-ov").forEach(o=>{ o.dir=ctx.rtl()?"rtl":"ltr"; });
    q(".ov-thr").hidden=W<560;
    q(".ov-thr").textContent=fmt(t("labThr"),{ms:SLOW});
    range.value=d; range.setAttribute("aria-valuetext",fmt(t("labValText"),{d,ms:v,s:t("st"+s)}));
    dayEl.textContent=d;
    if(stopTw) stopTw();
    if(instant||ctx.rm){ shown=v; msEl.textContent=v; stopTw=null; }
    else stopTw=tween(shown,v,420,x=>{ shown=x; msEl.textContent=Math.round(x); });
    if(s===0){ delta.textContent=fmt(t("learnDay"),{d}); delta.className="ro-delta"; }
    else{ const p=Math.round((v/USUAL-1)*100); delta.textContent=p>0?fmt(t("slowerBy"),{p}):p<0?fmt(t("fasterBy"),{p:-p}):t("sameUsual"); delta.className="ro-delta"+(slow?" up":""); }
    q(".ls-ic").innerHTML=icon(ST_IC[s]); q(".ls-t").textContent=t("st"+s); q(".ls-d").textContent=fmt(t("stD"+s),{d});
    root.querySelectorAll(".stages button").forEach(b=>{ if(+b.dataset.s===s) b.setAttribute("aria-current","step"); else b.removeAttribute("aria-current"); });
    tape.mode=s===0?"learn":slow?"slow":"ok";
    label();
  }
  function play(from){
    clearTimeout(ptimer); playing=true; setDay(from); label();
    const step=()=>{ if(!playing) return; if(day>=30){ playing=false; label(); return; } setDay(day+1); ptimer=setTimeout(step,day>=25?1300:day===14?1100:280); };
    ptimer=setTimeout(step,700);
  }
  function stop(){ if(!playing) return; playing=false; clearTimeout(ptimer); label(); }
  playBtn.addEventListener("click",()=>{ if(playing) stop(); else play(day>=30?1:day); });
  root.querySelector(".stages").addEventListener("click",e=>{ const b=e.target.closest("button[data-s]"); if(!b) return; stop(); setDay([7,20,27,29][+b.dataset.s]); });
  range.addEventListener("input",()=>{ stop(); setDay(+range.value); });
  const scrub=e=>{ if(!X) return; const r=chart.getBoundingClientRect(); setDay((e.clientX-r.left-X(1))/((X(30)-X(1))/29)+1); };
  chart.addEventListener("pointerdown",e=>{ if(e.button>0) return; stop(); drag=true; try{ chart.setPointerCapture(e.pointerId); }catch(_){} scrub(e); });
  chart.addEventListener("pointermove",e=>{ if(drag) scrub(e); });
  ["pointerup","pointercancel","lostpointercapture"].forEach(n=>chart.addEventListener(n,()=>{ drag=false; }));

  /* live tap tape: each bar is one tap, the gap between bars is the time between taps */
  const cv=q(".lab-tape canvas"), g=cv.getContext("2d"); cv.setAttribute("dir","ltr"); try{ g.direction="ltr"; }catch(_){}
  const tape={w:0,h:0,k:.4,sim:0,next:0,prev:0,ticks:[],last:0,raf:0,r:rng(7),mode:"learn"};
  const COL={ok:"#8DBBFA",slow:"#FFA45C",learn:"#B9D3F7"};
  function tapeSize(){
    const dpr=Math.min(2,window.devicePixelRatio||1); tape.w=cv.clientWidth; tape.h=cv.clientHeight;
    cv.width=Math.max(1,Math.round(tape.w*dpr)); cv.height=Math.max(1,Math.round(tape.h*dpr)); g.setTransform(dpr,0,0,dpr,0,0);
    tape.k=clamp(tape.w/1250,.26,.44);
    if(!tape.ticks.length) tape.sim=tape.w/tape.k;
    if(!tape.raf) drawTape();
  }
  const nextGap=()=>clamp(DAYS[day-1]*(1+gauss(tape.r)*.15),140,480);
  function advance(){
    while(tape.sim>=tape.next){ tape.ticks.push({t:tape.next,hold:60+tape.r()*70}); tape.prev=tape.next; tape.next+=nextGap(); }
  }
  function drawTape(){
    advance();
    const {w,h,k}=tape; if(!w||!h) return;
    const head=w-46, base=Math.round(h*.56), col=COL[tape.mode];
    g.clearRect(0,0,w,h);
    g.lineWidth=1; g.strokeStyle="rgba(141,187,250,.07)"; g.beginPath();
    const st=100*k; for(let x=head-(tape.sim%100)*k; x>0; x-=st){ const xx=Math.round(x)+.5; g.moveTo(xx,34); g.lineTo(xx,h-40); } g.stroke();
    g.strokeStyle="rgba(141,187,250,.2)"; g.beginPath(); g.moveTo(0,base+.5); g.lineTo(head,base+.5); g.stroke();
    const gr=g.createLinearGradient(0,30,0,h-36); gr.addColorStop(0,"rgba(255,255,255,0)"); gr.addColorStop(.5,"rgba(255,255,255,.4)"); gr.addColorStop(1,"rgba(255,255,255,0)");
    g.strokeStyle=gr; g.beginPath(); g.moveTo(head+.5,30); g.lineTo(head+.5,h-36); g.stroke();
    const T=tape.ticks; let drop=0;
    g.lineCap="round";
    for(let i=0;i<T.length;i++){
      const x=head-(tape.sim-T[i].t)*k; if(x<-30){ drop=i+1; continue; }
      const age=tape.sim-T[i].t, hh=T[i].hold*.42;
      g.strokeStyle=col; g.lineWidth=4; g.beginPath(); g.moveTo(x,base); g.lineTo(x,base-hh); g.stroke();
      g.fillStyle="#fff"; g.beginPath(); g.arc(x,base-hh,2.2,0,7); g.fill();
      if(age<500){ const a=1-age/500; g.strokeStyle=rgba(col,a*.85); g.lineWidth=2; g.beginPath(); g.arc(x,base-hh*.5,8+age*.06,0,7); g.stroke(); }
    }
    if(drop) T.splice(0,drop);
    g.font="500 12px 'IBM Plex Mono',ui-monospace,monospace"; g.textAlign="center";
    for(let j=1;j<=3;j++){
      const i=T.length-j; if(i<1) break;
      const xa=head-(tape.sim-T[i].t)*k, xb=head-(tape.sim-T[i-1].t)*k, y=base+20, al=[1,.55,.3][j-1];
      g.strokeStyle=`rgba(207,226,255,${.55*al})`; g.lineWidth=1.2; g.beginPath();
      g.moveTo(xb+4,y); g.lineTo(xa-4,y); g.moveTo(xb+4,y-4); g.lineTo(xb+4,y+4); g.moveTo(xa-4,y-4); g.lineTo(xa-4,y+4); g.stroke();
      g.fillStyle=`rgba(234,242,255,${al})`; g.fillText(Math.round(T[i].t-T[i-1].t)+" ms",(xa+xb)/2,y+18);
    }
    g.textAlign="right"; g.fillStyle="rgba(169,190,220,.75)"; g.font="500 11px 'IBM Plex Mono',ui-monospace,monospace";
    const sy=h-14; g.strokeStyle="rgba(169,190,220,.6)"; g.lineWidth=1.5; g.beginPath(); g.moveTo(head-100*k,sy-4); g.lineTo(head,sy-4); g.moveTo(head-100*k,sy-8); g.lineTo(head-100*k,sy); g.moveTo(head,sy-8); g.lineTo(head,sy); g.stroke();
    g.fillText("100 ms",head-100*k-8,sy);
  }
  function frame(now){
    const dt=Math.min(50,now-(tape.last||now)); tape.last=now; tape.sim+=dt*.5;
    drawTape(); tape.raf=requestAnimationFrame(frame);
  }
  function tapeOn(on){
    if(ctx.rm){ drawTape(); return; }
    if(on&&!tape.raf){ tape.last=0; tape.raf=requestAnimationFrame(frame); }
    if(!on&&tape.raf){ cancelAnimationFrame(tape.raf); tape.raf=0; }
  }

  onResize(chart,build); onResize(cv,tapeSize);
  build(); tapeSize();
  onVisible(root,v=>{
    tapeOn(v);
    if(v&&!started){ started=true; if(ctx.rm||ctx.qa) setDay(ctx.qaDay||30,true); else play(1); }
  },"-10% 0px -10% 0px");
  ctx.onLang(()=>{ setDay(day,true); });
  if(ctx.qa){ started=true; setDay(ctx.qaDay||30,true); } else setDay(1,true);
  return {setDay,play,stop};
}

/* =====================================================================
   2. STORY: "How it works" sticky phone
   ===================================================================== */
const KB_EN=["qwertyuiop","asdfghjkl","zxcvbnm"].map(r=>r.split(""));
const KB_AR=[["ض","ص","ث","ق","ف","غ","ع","ه","خ","ح","ج"],["ش","س","ي","ب","ل","ا","ت","ن","م","ك","ط"],["ئ","ء","ؤ","ر","ى","ة","و","ز","ظ","د"]];
const SB=`<div class="sb"><span>9:41</span><span class="sb-r"><svg viewBox="0 0 17 11" aria-hidden="true"><path d="M1 10h2V7H1zM5 10h2V5H5zM9 10h2V3H9zM13 10h2V0h-2z" fill="currentColor"/></svg><svg viewBox="0 0 16 11" aria-hidden="true"><path d="M8 10.5 5.6 8a3.4 3.4 0 0 1 4.8 0zM3.5 6a6.4 6.4 0 0 1 9 0l-1.4 1.4a4.4 4.4 0 0 0-6.2 0zM1.3 3.8a9.5 9.5 0 0 1 13.4 0l-1.4 1.4a7.5 7.5 0 0 0-10.6 0z" fill="currentColor"/></svg><svg viewBox="0 0 26 12" aria-hidden="true"><rect x=".5" y=".5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor"/><rect x="23.6" y="4" width="1.8" height="4" rx=".9" fill="currentColor" opacity=".45"/></svg></span></div>`;
const SCR=[
`<div class="scr scr-chat">${SB}
  <div class="ch-head"><svg class="ch-back" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span class="ch-av"></span><span class="ch-nm"><i></i><i></i></span><span class="ch-call"></span></div>
  <div class="ch-msgs">
    <div class="bub in" style="width:62%"><i style="width:92%"></i><i style="width:58%"></i></div>
    <div class="bub out" style="width:48%"><i style="width:84%"></i></div>
    <div class="bub in" style="width:70%"><i style="width:95%"></i><i style="width:80%"></i><i style="width:44%"></i></div>
    <div class="bub out" style="width:56%"><i style="width:70%"></i><i style="width:90%"></i></div>
  </div>
  <div class="ch-in"><span class="ch-dots"></span><span class="ch-caret"></span></div>
  <div class="kb"></div>
  <div class="ph-rip"></div>
</div>`,
`<div class="scr scr-learn">${SB}
  <div class="ap-bar"><img class="ap-logo" alt=""><b data-i="brand"></b><span class="ap-chip"></span></div>
  <div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="r-bg" cx="60" cy="60" r="52"/><circle class="r-fg" cx="60" cy="60" r="52" pathLength="100"/></svg>
    <div class="ring-c"><b class="ring-d num">0</b><span class="ring-of num">/ 14</span></div><span class="ring-ok">${icon("i-check")}</span></div>
  <p class="lr-t" data-i="phLearnT"></p>
  <div class="histo"><div class="h-band"></div><div class="h-dots"></div><div class="h-mid"></div></div>
  <div class="h-axis num"><span>210</span><span>240</span><span>270 ms</span></div>
  <p class="lr-u"></p>
  <p class="lr-n">${icon("i-hand")}<span data-i="phLearnB"></span></p>
</div>`,
`<div class="scr scr-lock">${SB}
  <div class="lk-top">${icon("i-lock","lk-ic")}<div class="lk-time">9:41</div><div class="lk-date" data-i="phDate"></div></div>
  <div class="nts">
    <div class="nt nt-alert"><div class="nt-h"><img class="nt-ic" alt=""><span data-i="brand"></span><span class="nt-now" data-i="phNow"></span></div>
      <b class="nt-t" data-i="st3"></b><p class="nt-b" data-i="phNotifB"></p>
      <div class="nt-acts"><span class="nt-call">${icon("i-phone-call")}<span data-i="phCall"></span></span><span class="nt-later" data-i="phLater"></span></div></div>
    <div class="nt nt-med"><div class="nt-h"><img class="nt-ic" alt=""><span data-i="brand"></span><span class="nt-now num">8:00</span></div><b class="nt-t" data-i="phMedT"></b><p class="nt-b" data-i="phMedB"></p></div>
  </div>
  <div class="lk-bot"><span>${icon("i-bolt")}</span><span>${icon("i-camera")}</span></div>
</div>`];
function auxHTML(i){
  if(i===0) return `<div class="aux aux0"><div class="lg-h"><i></i><b data-i="phLedger"></b></div><ol class="lg-list" dir="ltr"></ol><p data-i="phLedgerSub"></p></div>`;
  if(i===1){
    let bell=""; for(let x=8;x<=152;x+=4){ const y=58-44*Math.exp(-Math.pow((x-80)/24,2)); bell+=(x===8?"M":"L")+x+" "+y.toFixed(1); }
    return `<div class="aux aux1"><svg viewBox="0 0 160 66" aria-hidden="true"><rect x="52" y="6" width="56" height="54" rx="8" fill="rgba(141,187,250,.13)" stroke="rgba(141,187,250,.45)" stroke-dasharray="3 4"/><path d="${bell}" fill="none" stroke="#8DBBFA" stroke-width="2.5" stroke-linecap="round"/><line x1="80" x2="80" y1="10" y2="60" stroke="#CFE2FF" stroke-dasharray="2 3"/></svg><b data-i="aux1T"></b><span class="ax-v num" dir="ltr">${USUAL} ms</span><small data-i="aux1B"></small></div>`;
  }
  const pts=[[10,43],[30,40],[50,45],[70,41],[90,44],[118,22],[146,14]];
  return `<div class="aux aux2"><svg viewBox="0 0 160 62" aria-hidden="true"><rect x="4" y="32" width="152" height="18" rx="5" fill="rgba(141,187,250,.14)"/><path d="${smooth(pts)}" fill="none" stroke="#8DBBFA" stroke-width="2.5" stroke-linecap="round"/><path d="M118 6l6 10h-12zM146 -2l6 10h-12z" fill="#FF9A3D" transform="translate(0 2)"/><circle cx="118" cy="22" r="4" fill="#FF9A3D"/><circle cx="146" cy="14" r="4" fill="#FF9A3D"/></svg><b data-i="aux2T"></b><small data-i="aux2B"></small></div>`;
}

function makePhone(host,ctx,screens){
  const has=i=>screens.indexOf(i)>=0;
  host.insertAdjacentHTML("beforeend",`<div class="phone" data-scr="${screens[0]}"><div class="ph-screen"><div class="ph-island"></div>${screens.map(i=>SCR[i]).join("")}<span class="ph-home"></span></div></div>`);
  const el=host.lastElementChild, q=s=>el.querySelector(s);
  el.querySelectorAll(".ap-logo,.nt-ic").forEach(i=>{ i.src=ctx.logo; });
  const r=rng(31+screens[0]*17), api={el,ledger:null,setScreen,setVisible,refresh}, still=ctx.rm||ctx.qa;
  let scr=screens[0], vis=false;

  /* any app: typing on the normal keyboard; only the time of each tap is noted */
  const C=has(0)?{s:q(".scr-chat"),kb:q(".kb"),dots:q(".ch-dots"),msgs:q(".ch-msgs"),rip:q(".ph-rip"),clock:(9*3600+41*60+7)*1000+120,n:0,target:12}:null;
  function renderKb(){
    if(!C) return;
    const rows=ctx.lang()==="ar"?KB_AR:KB_EN;
    C.kb.innerHTML=rows.map(r=>`<div class="kb-r">${r.map(c=>`<span class="k">${c}</span>`).join("")}</div>`).join("")+
      `<div class="kb-r"><span class="k m">?123</span><span class="k m">,</span><span class="k w"></span><span class="k m">.</span><span class="k m">${icon("i-enter")}</span></div>`;
  }
  function pushLedger(ts,gap){
    if(!api.ledger) return;
    const li=document.createElement("li"); li.innerHTML=`<span>${ts}</span><b>+${gap} ms</b>`;
    api.ledger.prepend(li); while(api.ledger.children.length>5) api.ledger.lastElementChild.remove();
  }
  function bubble(cls){
    const b=document.createElement("div"); b.className="bub "+cls; b.style.width=(42+r()*30).toFixed(0)+"%";
    const n=1+Math.floor(r()*2.4); b.innerHTML=Array.from({length:n},(_,i)=>`<i style="width:${(i===n-1?40+r()*45:85+r()*15).toFixed(0)}%"></i>`).join("");
    C.msgs.appendChild(b); while(C.msgs.children.length>4) C.msgs.firstElementChild.remove();
  }
  function chatTap(){
    const keys=C.kb.querySelectorAll(".k"), sp=C.kb.querySelector(".k.w");
    const key=(C.n%5===4&&r()<.75)?sp:keys[Math.floor(r()*(keys.length-5))];
    key.classList.add("dn"); setTimeout(()=>key.classList.remove("dn"),140);
    const p=offsetIn(key,C.s), ri=document.createElement("i");
    ri.style.left=(p.x+key.offsetWidth/2)+"px"; ri.style.top=(p.y+key.offsetHeight/2)+"px";
    C.rip.appendChild(ri); setTimeout(()=>ri.remove(),720);
    const gap=Math.round(clamp(USUAL*(1+gauss(r)*.17),150,420)); C.clock+=gap;
    C.dots.insertAdjacentHTML("beforeend","<i></i>"); C.n++;
    pushLedger(stamp(C.clock),gap);
    if(C.n>=C.target){ C.n=0; C.target=9+Math.floor(r()*7);
      setTimeout(()=>{ C.dots.innerHTML=""; bubble("out"); setTimeout(()=>{ if(chatRun.on) bubble("in"); },1500); },420); return gap*2.4+700; }
    return gap*2.4;
  }
  const chatRun=runner(()=>chatTap());

  /* learning: about 14 days of data form the person's own usual range */
  const L=has(1)?{s:q(".scr-learn"),fg:q(".r-fg"),d:q(".ring-d"),chip:q(".ap-chip"),u:q(".lr-u"),dots:[],day:0}:null;
  if(L){
    const rr=rng(5), bins=new Array(12).fill(0), host2=q(".h-dots"), list=[];
    for(let i=0;i<46;i++){ const v=clamp(240+gauss(rr)*9,210.1,269.9), b=Math.floor((v-210)/5); list.push({b,y:bins[b]++}); }
    for(let i=list.length-1;i>0;i--){ const j=Math.floor(rr()*(i+1)); [list[i],list[j]]=[list[j],list[i]]; }
    host2.innerHTML=list.map(o=>`<i style="left:${((o.b+.5)/12*100).toFixed(2)}%;bottom:${o.y*10+2}px"></i>`).join("");
    L.dots=[...host2.children];
  }
  function learnSet(d){
    L.day=d; L.fg.style.strokeDashoffset=String(100-Math.min(d,14)/14*100); L.d.textContent=Math.min(d,14);
    const k=Math.round(Math.min(d,14)/14*L.dots.length); L.dots.forEach((e,i)=>e.classList.toggle("on",i<k));
    const ready=d>=14; L.s.classList.toggle("ready",ready);
    L.chip.textContent=ctx.t(ready?"phReady":"labLearning"); L.u.textContent=fmt(ctx.t("phUsual"),{ms:USUAL});
  }
  const learnRun=runner(()=>{ if(L.day>=18){ learnSet(0); return 700; } learnSet(L.day+1); return L.day===14?1200:L.day>14?900:480; });

  /* lock screen: the one message, after slowing that lasts several days */
  const K=has(2)?q(".scr-lock"):null;
  const lockRun=runner(()=>{ K.classList.remove("on"); setTimeout(()=>K.classList.add("on"),500); return 7500; });

  function sync(){
    const want=i=>vis&&scr===i&&!still;
    if(C){ want(0)?chatRun.start(400):chatRun.stop(); }
    if(L){ want(1)?learnRun.start(300):learnRun.stop(); }
    if(K){ want(2)?lockRun.start(0):lockRun.stop(); }
  }
  function setScreen(i){ if(!has(i)) return; scr=i; el.dataset.scr=i; if(L&&i===1&&!still) learnSet(0); sync(); }
  function setVisible(v){ vis=v; sync(); }
  function refresh(){ renderKb(); if(L) learnSet(L.day); }
  renderKb();
  if(L) learnSet(still?14:0);
  if(still){ if(K) K.classList.add("on"); if(C) C.dots.innerHTML="<i></i>".repeat(7); }
  ctx.onLang(refresh);
  return api;
}

function story(root,ctx){
  const stage=root.querySelector(".story-stage"), steps=[...root.querySelectorAll(".sstep")], list=root.querySelector(".story-steps"), rail=root.querySelector(".story-rail");
  const sp=makePhone(stage.querySelector(".stage-phone"),ctx,[0,1,2]);
  stage.querySelector(".stage-aux").innerHTML=auxHTML(0)+auxHTML(1)+auxHTML(2);
  sp.ledger=stage.querySelector(".aux0 .lg-list");
  onVisible(stage,v=>sp.setVisible(v||!!ctx.qa),"0px"); if(ctx.qa) sp.setVisible(true);
  steps.forEach((s,i)=>{
    const v=s.querySelector(".sstep-vis"); const p=makePhone(v,ctx,[i]);
    v.insertAdjacentHTML("beforeend",auxHTML(i)); p.ledger=v.querySelector(".lg-list");
    onVisible(v,on=>p.setVisible(on),"0px");
  });
  if(ctx.rm||ctx.qa){ const seed=(n,ul)=>{ if(!ul) return; ul.innerHTML=""; let c=(9*3600+41*60+7)*1000; for(let i=0;i<n;i++){ const gp=[236,251,229,244,262][i%5]; c+=gp; ul.insertAdjacentHTML("afterbegin",`<li><span>${stamp(c)}</span><b>+${gp} ms</b></li>`); } };
    seed(5,sp.ledger); root.querySelectorAll(".sstep-vis .lg-list").forEach(u=>seed(5,u)); }
  let active=-1;
  function activate(i){
    if(i===active) return; active=i; stage.dataset.step=i; sp.setScreen(i);
    steps.forEach((s,k)=>s.classList.toggle("on",k===i));
  }
  if("IntersectionObserver" in window&&ctx.qaStep==null){
    const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting) activate(+e.target.dataset.step); }); },{rootMargin:"-48% 0px -48% 0px"});
    steps.forEach(s=>io.observe(s));
  }
  activate(ctx.qaStep!=null?ctx.qaStep:0);
  let raf=0;
  const prog=()=>{ raf=0; const r=list.getBoundingClientRect(); rail.style.setProperty("--p",clamp((innerHeight*.5-r.top)/r.height,0,1).toFixed(3)); };
  addEventListener("scroll",()=>{ if(!raf) raf=requestAnimationFrame(prog); },{passive:true}); prog();
  return {activate};
}

/* =====================================================================
   3. BENTO: feature tiles with small live demos
   ===================================================================== */
function bento(root,ctx){
  const t=ctx.t;
  const loopWhenVisible=(el,fn,every)=>{
    if(ctx.rm||ctx.qa){ fn(true); return; }
    const run=runner(()=>{ fn(); return every; });
    onVisible(el,v=>v?run.start(150):run.stop(),"-15% 0px");
  };
  const V={
    alert(tv){
      tv.innerHTML=`<p class="lad-cap">${icon("i-info")}<span data-i="bxCap"></span></p><ol class="ladder">${[25,26,29].map((d,i)=>`<li class="lad ${i?"slow":"ok"}"><span class="lad-ic">${icon(i?"i-alert":"i-check")}</span><div><b><span class="bx-d" data-d="${d}"></span> · <bdi dir="ltr">${DAYS[d-1]} ms</bdi></b><span class="bx-s" data-k="${i}"></span></div>${i?`<span class="lad-tri" aria-hidden="true">${"▲".repeat(i)}</span>`:""}</li>`).join("")}</ol>
      <div class="lad-alert"><span class="la-ic">${icon("i-phone-call")}</span><div><b data-i="st3"></b><span data-i="bxTwo"></span></div></div>`;
      const fill=()=>{ tv.querySelectorAll(".bx-d").forEach(e=>e.textContent=fmt(t("bxDay"),{d:e.dataset.d})); const s=[t("st1"),t("st2")+" · "+t("bxNoAlert"),t("bxAgain")]; tv.querySelectorAll(".bx-s").forEach(e=>e.textContent=s[+e.dataset.k]); };
      fill(); ctx.onLang(fill);
      loopWhenVisible(tv,()=>restart(tv,"play"),9000);
    },
    meds(tv){
      tv.innerHTML=`<div class="med"><div class="lanes" aria-hidden="true">
        <div class="ln"><span class="ln-l" data-i="bmDaily"></span><span class="ln-t daily"><em></em></span></div>
        <div class="ln"><span class="ln-l" data-i="bmWeekly"></span><span class="ln-t weekly"></span></div>
        <div class="ln"><span class="ln-l" data-i="bmHalf"></span><span class="ln-t half"><i></i></span></div>
        <div class="ln-ax"><span data-i="bmToday"></span><span data-i="bm6m"></span></div></div>
        <div class="mnote"><div class="mn-h"><span class="mn-ic">${icon("i-pill")}</span><div><b data-i="bmNotifT"></b><span data-i="doseQ"></span></div></div>
        <div class="mn-acts"><button type="button" class="mn-b yes">${icon("i-check")}<span data-i="taken"></span></button><button type="button" class="mn-b no"><span data-i="bmNot"></span></button></div>
        <p class="mn-res" role="status"></p></div></div>`;
      const note=tv.querySelector(".mnote"), res=tv.querySelector(".mn-res"); let tm=0;
      const answer=yes=>{ clearTimeout(tm); note.classList.remove("done","later"); void note.offsetWidth; note.classList.add(yes?"done":"later"); res.textContent=t(yes?"bmSaved":"bmLater");
        tm=setTimeout(()=>{ note.classList.remove("done","later"); res.textContent=""; },4200); };
      tv.querySelector(".mn-b.yes").addEventListener("click",()=>answer(true));
      tv.querySelector(".mn-b.no").addEventListener("click",()=>answer(false));
    },
    trend(tv){
      const X=i=>8+i*(284/29), Y=v=>104-(v-212)/74*92, P=DAYS.map((v,i)=>[X(i),Y(v)]), d=smooth(P);
      tv.innerHTML=`<span class="tr-l"><span data-i="btTrend"></span></span><svg class="trend" viewBox="0 0 300 116" aria-hidden="true">
        <rect x="${X(13.5).toFixed(1)}" y="${Y(SLOW).toFixed(1)}" width="${(292-X(13.5)).toFixed(1)}" height="${(Y(LO)-Y(SLOW)).toFixed(1)}" rx="6" class="tr-band"/>
        <path d="${d} L${X(29)} 110 L${X(0)} 110Z" class="tr-area"/><path d="${d}" class="tr-line" pathLength="1"/>
        ${P.slice(25).map(p=>`<path class="tr-tri" d="M${p[0].toFixed(1)} ${(p[1]-22).toFixed(1)} l7 11 h-14z"/>`).join("")}<circle class="tr-end" cx="${P[29][0].toFixed(1)}" cy="${P[29][1].toFixed(1)}" r="4.5"/></svg>`;
      loopWhenVisible(tv,()=>restart(tv,"play"),8000);
    },
    ramadan(tv){
      const arc="M84 88 Q150 -26 216 88";
      tv.innerHTML=`<div class="ram"><svg class="ram-svg" viewBox="0 0 300 120" aria-hidden="true">
        <defs><linearGradient id="ramSky" x1="0" x2="1"><stop offset="0" class="rs-n"/><stop offset=".22" class="rs-n"/><stop offset=".3" class="rs-d"/><stop offset=".7" class="rs-d"/><stop offset=".78" class="rs-n"/><stop offset="1" class="rs-n"/></linearGradient></defs>
        <rect x="8" y="92" width="284" height="12" rx="6" fill="url(#ramSky)"/>
        <path d="${arc}" class="ram-arc"/>
        <g class="ram-sun"><circle r="9"/>${ctx.rm||ctx.qa?"":`<animateMotion dur="7s" repeatCount="indefinite" path="${arc}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>`}</g>
        <path class="ram-moon" d="M40 20a14 14 0 1 0 14 22a11 11 0 1 1 -14 -22z"/>
        <g class="ram-pill" transform="translate(40 98)"><rect x="-13" y="-7" width="26" height="14" rx="7"/><line x1="0" x2="0" y1="-7" y2="7"/></g>
        <g class="ram-pill" transform="translate(260 98)"><rect x="-13" y="-7" width="26" height="14" rx="7"/><line x1="0" x2="0" y1="-7" y2="7"/></g>
      </svg><span class="rl" style="--x:13.3%"><span data-i="brSuhoor"></span></span><span class="rl mid" style="--x:50%"><span data-i="brFast"></span></span><span class="rl" style="--x:86.7%"><span data-i="brIftar"></span></span></div>`;
      if(ctx.qa) tv.querySelector(".ram-sun").setAttribute("transform","translate(150 31)");
    },
    hands(tv){
      tv.innerHTML=`<div class="hands"><div class="hb-demo" aria-hidden="true"><span class="hb-ring"></span><span class="hb-btn">${icon("i-check")}<span data-i="taken"></span></span><span class="hb-cap"><span data-i="bhTouch"></span> <span class="num" dir="ltr">≥ 48dp</span></span></div>
        <div class="hb-size"><label class="hb-l" for="hbSize" data-i="bhSize"></label><div class="hb-row"><span class="a1" aria-hidden="true">A</span><input id="hbSize" type="range" min="0" max="3" step="1" value="1"><span class="a2" aria-hidden="true">A</span></div><p class="hb-sample" data-i="bhSample"></p></div></div>`;
      const inp=tv.querySelector("#hbSize"), SZ=[15,18,22,27];
      const set=()=>{ tv.style.setProperty("--hb",SZ[+inp.value]+"px"); inp.setAttribute("aria-valuetext",t("bhS"+inp.value)); };
      inp.addEventListener("input",set); set(); ctx.onLang(set);
    },
    team(tv){
      const S={alert:{ic:"i-alert",k:"btContact",d:"M2 16 L14 15 L26 17 L38 15 L50 16 L62 8 L78 4"},ok:{ic:"i-check",k:"btOk",d:"M2 13 L14 11 L26 14 L38 12 L50 13 L62 11 L78 12"},learn:{ic:"i-clock",k:"btLearn",d:"M2 12 L14 14 L26 11 L38 13"}};
      const P=[["014","ok"],["027","learn"],["033","alert"]];
      tv.innerHTML=`<div class="team"><div class="tm-h"><b data-i="btList"></b><span class="tm-sort">${icon("i-sort")}<span data-i="btSort"></span></span></div>
        <ul class="tm-list">${P.map(([id,k],i)=>`<li class="tm ${k}" style="--pos:${i}"><span class="tm-av num">${id.slice(1)}</span><span class="tm-n"><span data-i="btPt"></span> <bdi class="num" dir="ltr">#${id}</bdi></span><svg class="tm-sp" viewBox="0 0 80 20" aria-hidden="true"><path d="${S[k].d}"/></svg><span class="tm-st">${icon(S[k].ic)}<span data-i="${S[k].k}"></span></span></li>`).join("")}</ul></div>`;
      const team=tv.querySelector(".team");
      loopWhenVisible(tv,first=>{ if(first===true){ team.classList.add("sorted"); return; } team.classList.remove("sorted"); setTimeout(()=>team.classList.add("sorted"),1300); },6500);
    }
  };
  root.querySelectorAll(".tv[data-v]").forEach(tv=>{ const f=V[tv.dataset.v]; if(f) f(tv); });
}

/* =====================================================================
   4. PRIVACY: the on-phone filter and the one daily summary
   ===================================================================== */
function privacy(root,ctx){
  const t=ctx.t, lane=root.querySelector(".pf-lane"), rc=root.querySelector(".receipt");
  rc.innerHTML=`<div class="rc-h"><b data-i="rcT"></b><span data-i="rcDate"></span></div>
    <div class="rc-row r-med"><span data-i="rcMedian"></span><b class="num" dir="ltr">238 ms</b></div>
    <div class="rc-row"><span data-i="rcUsual"></span><b class="num" dir="ltr">${USUAL} ms</b></div>
    <div class="rc-row r-taps"><span data-i="rcTaps"></span><b class="num rc-n">3,912</b></div>
    <div class="rc-row col r-types"><span data-i="rcTypes"></span><div class="rc-bar"><i class="g-s" style="width:34%"></i><i class="g-m" style="width:46%"></i><i class="g-o" style="width:20%"></i></div>
      <div class="rc-leg"><span class="g-s"><i></i><span data-i="grSocial"></span>&nbsp;<span class="num">34%</span></span><span class="g-m"><i></i><span data-i="grMsg"></span>&nbsp;<span class="num">46%</span></span><span class="g-o"><i></i><span data-i="grOther"></span>&nbsp;<span class="num">20%</span></span></div></div>
    <div class="rc-row"><span data-i="rcDoses"></span><b data-i="rcDosesV"></b></div>
    <p class="rc-never">${icon("i-lock")}<span data-i="rcNever"></span></p>`;
  const EV=[
    {ic:"i-clock",txt:"pfTime",fate:"keep"},
    {ic:"i-grid",raw:"WhatsApp",fate:"map",grp:"grMsg",g:"m"},
    {ic:"i-type",txt:"pfText",fate:"drop"},
    {ic:"i-hand",txt:"pfHold",fate:"keep"},
    {ic:"i-target",txt:"pfPos",fate:"drop"},
    {ic:"i-grid",raw:"Instagram",fate:"map",grp:"grSocial",g:"s"},
    {ic:"i-image",txt:"pfPhoto",fate:"drop"},
    {ic:"i-clock",txt:"pfTime2",fate:"keep"},
    {ic:"i-pin",txt:"pfLoc",fate:"drop"},
    {ic:"i-grid",txt:"pfApp3",fate:"map",grp:"grOther",g:"o"}
  ];
  let taps=3912, idx=0, track=0;
  const nEl=rc.querySelector(".rc-n");
  const flash=sel=>{ const e=rc.querySelector(sel); if(e) restart(e,"flash"); };
  function chip(ev){
    const c=document.createElement("div"); c.className="pfc";
    c.innerHTML=`<span class="pi">${icon(ev.ic)}</span><span class="pt">${ev.raw||t(ev.txt)}</span>`; return c;
  }
  function note(c,key){ c.insertAdjacentHTML("beforeend",`<span class="pn">${t(key)}</span>`); }
  function settle(c,ev){
    if(ev.fate==="drop"){ c.classList.add("drop"); note(c,"pfNever"); return; }
    c.classList.add("pass");
    if(ev.fate==="map"){ c.querySelector(".pt").textContent=t(ev.grp); note(c,"pfNameGone"); } else note(c,"pfKept");
  }
  function bump(ev){
    if(ev.fate==="map"){ flash(".r-types"); flash(".rc-leg .g-"+ev.g); }
    else { taps+=1; nEl.textContent=taps.toLocaleString("en-US"); flash(".r-taps"); if(ev.ic==="i-hand") flash(".r-med"); }
  }
  function spawn(){
    const ev=EV[idx++%EV.length], c=chip(ev); c.style.top=(6+(track++%4)*66)+"px"; lane.appendChild(c);
    const dir=ctx.rtl()?-1:1, W=lane.clientWidth, cw=c.offsetWidth, gx=Math.max(10,W-cw-26);
    const a=c.animate([{transform:`translateX(${-24*dir}px)`,opacity:0},{opacity:1,offset:.12},{transform:`translateX(${gx*dir}px)`,opacity:1}],{duration:3300,easing:"cubic-bezier(.25,.1,.25,1)",fill:"forwards"});
    a.onfinish=()=>{
      settle(c,ev);
      if(ev.fate==="drop"){
        setTimeout(()=>{ c.animate([{transform:`translateX(${gx*dir}px)`,opacity:1,filter:"blur(0px)"},{transform:`translateX(${gx*dir}px) translateY(10px) scale(.9)`,opacity:0,filter:"blur(6px)"}],{duration:650,easing:"ease-in",fill:"forwards"}).onfinish=()=>c.remove(); },1150);
      } else {
        setTimeout(()=>{ bump(ev); c.animate([{transform:`translateX(${gx*dir}px)`,opacity:1},{transform:`translateX(${(gx+cw+90)*dir}px)`,opacity:0}],{duration:950,easing:"cubic-bezier(.5,0,.75,0)",fill:"forwards"}).onfinish=()=>c.remove(); },850);
      }
    };
    return 1150;
  }
  if(ctx.rm||!lane.animate){
    lane.classList.add("static");
    EV.slice(0,6).forEach(ev=>{ const c=chip(ev); lane.appendChild(c); settle(c,ev); });
    ctx.onLang(()=>{ lane.querySelectorAll(".pfc").forEach(c=>c.remove()); EV.slice(0,6).forEach(ev=>{ const c=chip(ev); lane.appendChild(c); settle(c,ev); }); });
    return;
  }
  if(ctx.qa){ /* review still: a representative mid-flight frame */
    const plan=[[2,0,1],[7,0,.16],[1,1,1],[6,1,.34],[3,2,.62],[4,3,1],[5,3,.06]];
    const place=()=>{ lane.querySelectorAll(".pfc").forEach(c=>c.remove()); const dir=ctx.rtl()?-1:1, W=lane.clientWidth;
      plan.forEach(([e,tr,f])=>{ const ev=EV[e], c=chip(ev); c.style.top=(6+tr*66)+"px"; lane.appendChild(c); const gx=Math.max(10,W-c.offsetWidth-26); if(f>=1) settle(c,ev); c.style.transform=`translateX(${gx*f*dir}px)`; c.style.opacity=f<.1?.6:1; }); };
    place(); ctx.onLang(place); return;
  }
  const run=runner(spawn);
  onVisible(root,v=>v?run.start(200):run.stop(),"-10% 0px");
}

/* ---------- spotlight hover for cards ---------- */
function spotlight(){
  document.addEventListener("pointermove",e=>{
    const s=e.target.closest&&e.target.closest(".spot"); if(!s) return;
    const r=s.getBoundingClientRect(); s.style.setProperty("--mx",(e.clientX-r.left)+"px"); s.style.setProperty("--my",(e.clientY-r.top)+"px");
  },{passive:true});
}

return {lab,story,bento,privacy,spotlight,data:{USUAL,SLOW,DAYS,status}};
})();
