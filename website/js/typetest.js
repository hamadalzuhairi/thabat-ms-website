/* Thabat MS website: "Try it yourself" typing test (for visitors and judges).
   The visitor copies a short passage for 20 or 30 seconds, in Arabic or English. We time every key press
   (each input event) on this page only, then show:
     - speed: words per minute (1 word = 5 correct characters), characters per minute and accuracy
     - the median time between key presses, the same kind of number Thabat watches
       (gaps over 2 s are left out as thinking pauses)
     - the same typing replayed with every gap made a chosen % longer, to show what a relapse that slows
       the hands could look like.
   Why 20% by default: a 15-20% slowing on the Nine-Hole Peg Test is the accepted meaningful worsening of hand
   function (Feys 2017; research/alert-rule-validation.md). Published MS typing studies (Neurokeys) report
   z-scores, not raw milliseconds, so there is no published "relapse ms" to copy: this is an illustration
   built from the visitor's own typing, and the page says so.
   Nothing typed leaves the page and nothing is stored.
   ctx = same as js/visuals.js: {t(key), lang(), rtl(), rm (reduced motion), qa, onLang(fn)}
   QA: ?qa=test&tt=done shows a simulated result without typing. */
window.ThabatTypeTest=(function(){
"use strict";

const TEXTS={
 en:[
  "Every morning I make a cup of tea, check the weather and read a few messages from my family. Then I walk to work, answer my emails and plan the week with my team. In the evening I call a friend, cook something simple and read a good book before I sleep. Small habits like these make a busy day feel calm and steady.",
  "The best part of a long weekend is the slow start. We sit by the window, share breakfast and talk about nothing in particular. Later we visit the market, buy fresh fruit and warm bread, and meet old friends for coffee. By sunset the phone is full of photos and the heart is full of good memories.",
  "Last winter we drove to the mountains with a car full of snacks and blankets. The road was long, but the music was good and the view kept getting better. At night we sat around a small fire, looked up at the stars and told stories until we were too tired to talk. It was the kind of trip you remember for years."],
 ar:[
  "في كل صباح أشرب كوبا من الشاي وأتابع حالة الطقس وأقرأ بعض الرسائل من عائلتي. ثم أذهب إلى العمل وأرد على الرسائل وأخطط للأسبوع مع فريقي. وفي المساء أتصل بصديق وأطبخ شيئا بسيطا وأقرأ كتابا جميلا قبل النوم. هذه العادات الصغيرة تجعل اليوم المزدحم هادئا وثابتا.",
  "أجمل ما في عطلة نهاية الأسبوع هو البداية الهادئة. نجلس قرب النافذة ونتناول الفطور معا ونتحدث عن أشياء بسيطة. بعد ذلك نزور السوق ونشتري الفاكهة والخبز الطازج ثم نلتقي بالأصدقاء لشرب القهوة. وعندما تغيب الشمس يكون الهاتف مليئا بالصور والقلب مليئا بالذكريات الجميلة.",
  "في الشتاء الماضي سافرنا بالسيارة إلى الجبال ومعنا الكثير من الطعام والبطانيات. كان الطريق طويلا لكن الأغاني كانت جميلة والمنظر يزداد روعة. وفي الليل جلسنا حول نار صغيرة ننظر إلى النجوم ونتبادل القصص حتى غلبنا النعاس. كانت رحلة لا تنسى."]
};
const PAUSE=2000, MIN_GAPS=10, DEF_PCT=20, RING=2*Math.PI*28;

/* ---------- helpers ---------- */
const fmt=(s,o)=>String(s==null?"":s).replace(/\{(\w+)\}/g,(m,k)=>o&&o[k]!=null?o[k]:m);
const icon=(id,c)=>`<svg class="ic${c?" "+c:""}" aria-hidden="true"><use href="#${id}"/></svg>`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=v=>Math.round(v).toLocaleString("en-US");
function median(a){ if(!a.length) return 0; const s=[...a].sort((x,y)=>x-y), m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; }
/* forgiving letter match: alef forms and alef maqsura count as the same letter, curly quotes as straight */
const MAP={"أ":"ا","إ":"ا","آ":"ا","ٱ":"ا","ى":"ي","’":"'","‘":"'"};
const same=(a,b)=>(MAP[a]||a)===(MAP[b]||b);
function correct(v,target){ let ok=0; const n=Math.min(v.length,target.length); for(let i=0;i<n;i++) if(same(v[i],target[i])) ok++; return ok; }
function rng(a){ return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

function mount(root,ctx){
  const t=k=>ctx.t(k), q=s=>root.querySelector(s);
  const S={tl:ctx.lang(), chosen:false, dur:30, pick:{en:0,ar:0}, phase:"ready", ev:[], t0:0, raf:0, to:0, pct:DEF_PCT, res:null, play:0, tau:0};
  S.pick.en=Math.floor(Math.random()*TEXTS.en.length); S.pick.ar=Math.floor(Math.random()*TEXTS.ar.length);
  const target=()=>TEXTS[S.tl][S.pick[S.tl]];

  root.innerHTML=`
  <div class="tt-bar">
    <div class="tt-opts">
      <div class="tt-opt"><span class="tt-ol" id="ttLangL" data-k="ttLang"></span><div class="tt-seg" role="group" aria-labelledby="ttLangL"><button type="button" data-tl="ar" lang="ar">العربية</button><button type="button" data-tl="en" lang="en">English</button></div></div>
      <div class="tt-opt"><span class="tt-ol" id="ttDurL" data-k="ttTime"></span><div class="tt-seg" role="group" aria-labelledby="ttDurL"><button type="button" data-dur="20"></button><button type="button" data-dur="30"></button></div></div>
    </div>
    <div class="tt-clock"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="tc-bg" cx="32" cy="32" r="28"/><circle class="tc-fg" cx="32" cy="32" r="28"/></svg><b class="num tt-sec"></b><span class="tt-cl"></span></div>
  </div>
  <div class="tt-type">
    <p class="tt-text"></p>
    <textarea class="tt-in" rows="3" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
    <div class="tt-tape" aria-hidden="true"><svg viewBox="0 0 1000 36" preserveAspectRatio="none"><path class="tk"/></svg></div>
    <div class="tt-meta">
      <span><span data-k="ttKeys"></span> <b class="num tt-kn">0</b></span>
      <span><span data-k="ttGapLive"></span> <b class="num tt-gn">—</b> <span class="tt-gu"></span></span>
      <button type="button" class="tt-restart">${icon("i-refresh")}<span data-k="ttRestart"></span></button>
    </div>
    <p class="tt-notes"><span>${icon("i-lock")}<span data-k="ttPrivacy"></span></span><span class="tt-arkb">${icon("i-type")}<span data-k="ttArKb"></span></span></p>
  </div>
  <div class="tt-res" hidden></div>
  <p class="tt-sr" aria-live="polite"></p>`;

  const inp=q(".tt-in"), txt=q(".tt-text"), res=q(".tt-res"), sr=q(".tt-sr");

  /* ---------- the passage, coloured as you type (runs of spans so Arabic letters stay joined) ---------- */
  function drawText(v){
    const tg=target(); let html="", run="", cls=null;
    const push=()=>{ if(run) html+=`<span class="${cls}">${esc(run)}</span>`; run=""; };
    for(let i=0;i<tg.length;i++){
      const c=i<v.length?(same(v[i],tg[i])?"c-ok":"c-bad"):(i===v.length?"c-cur":"c-rest");
      if(c!==cls){ push(); cls=c; } run+=tg[i];
    }
    push(); txt.innerHTML=html;
    const cur=txt.querySelector(".c-cur");
    if(cur){ const lh=parseFloat(getComputedStyle(txt).lineHeight)||30;
      if(cur.offsetTop>txt.scrollTop+txt.clientHeight-lh*1.5||cur.offsetTop<txt.scrollTop) txt.scrollTop=Math.max(0,cur.offsetTop-lh); }
  }
  function clock(left){
    const d=S.dur, l=left==null?d:Math.max(0,left);
    q(".tt-sec").textContent=l>=10||S.phase!=="run"?String(Math.ceil(l)):l.toFixed(1);
    q(".tc-fg").style.strokeDashoffset=String(RING*(1-l/d));
    root.classList.toggle("low",S.phase==="run"&&l<=5);
  }
  function tape(){
    const w=S.dur*1000;
    q(".tt-tape .tk").setAttribute("d",S.ev.map(e=>`M${(e.t/w*1000).toFixed(1)} 6V30`).join(""));
  }
  function live(){
    q(".tt-kn").textContent=num(S.ev.length);
    const g=gapsOf(S.ev); const has=g.length>=3; q(".tt-gn").textContent=has?num(median(g)):"—"; q(".tt-gu").textContent=has?t("msUnit"):"";
  }
  function gapsOf(ev){ const g=[]; for(let i=1;i<ev.length;i++){ const d=ev[i].t-ev[i-1].t; if(d>0&&d<=PAUSE) g.push(d); } return g; }

  /* ---------- states ---------- */
  function setPhase(p){ S.phase=p; root.dataset.phase=p; root.querySelectorAll(".tt-seg button").forEach(b=>b.disabled=p==="run"); }
  function reset(next){
    cancelAnimationFrame(S.raf); clearTimeout(S.to); cancelAnimationFrame(S.play);
    if(next) S.pick[S.tl]=(S.pick[S.tl]+1)%TEXTS[S.tl].length;
    S.ev=[]; S.res=null; inp.value=""; inp.readOnly=false; res.hidden=true; res.innerHTML="";
    setPhase("ready"); paint();
  }
  function start(now){
    S.t0=now; setPhase("run");
    if(matchMedia("(max-width:520px)").matches) root.scrollIntoView({block:"start"});   /* phones: keep the text above the keyboard */
    const tick=()=>{ const left=S.dur-(performance.now()-S.t0)/1000; clock(left); if(left<=0) finish(false); else S.raf=requestAnimationFrame(tick); };
    S.raf=requestAnimationFrame(tick);
    S.to=setTimeout(()=>finish(false),S.dur*1000+50);
  }
  function finish(full){
    if(S.phase!=="run") return;
    cancelAnimationFrame(S.raf); clearTimeout(S.to);
    inp.readOnly=true; setPhase("done"); clock(full?S.dur-(S.ev.at(-1).t/1000):0);
    S.res=compute(S.ev,full); S.pct=DEF_PCT;
    renderRes();
    sr.textContent=S.res.few?t("ttTooFew"):fmt(t("ttSum"),{wpm:S.res.wpm,ms:S.res.med,rms:Math.round(S.res.medRaw*(1+S.pct/100))});
    if(!ctx.qa) setTimeout(()=>root.scrollIntoView({behavior:ctx.rm?"auto":"smooth",block:"start"}),60);
    if(!ctx.qa) setTimeout(replay,ctx.rm?0:500);   /* QA stills show the finished replay */
  }
  function compute(ev,full){
    const tg=target(), gaps=gapsOf(ev);
    if(gaps.length<MIN_GAPS) return {few:true};
    const last=ev.at(-1), win=full?Math.max(last.t,1000):S.dur*1000, mins=win/60000;
    const ok=correct(last.v,tg), medRaw=median(gaps);
    /* the comparison runs over the time they were actually typing (first to last key), so stopping early still shows the gap */
    return {few:false, ev, tg, tl:S.tl, full, win, cw:Math.max(1000,last.t), mins, medRaw, med:Math.round(medRaw), ok,
      wpm:Math.round(ok/5/mins), cpm:Math.round(ok/mins), acc:last.v.length?Math.round(100*ok/last.v.length):0, keys:ev.length};
  }
  /* the text typed by time tau, with every gap stretched by k */
  function valueAt(r,tau,k){ let v=""; for(const e of r.ev){ if(e.t*k<=tau) v=e.v; else break; } return v; }
  function rel(r){
    const k=1+S.pct/100, v=valueAt(r,r.cw,k), ok=correct(v,r.tg);
    let fit=0; for(const e of r.ev) if(e.t*k<=r.cw) fit++;
    return {k, med:Math.round(r.medRaw*k), ok, wpm:r.ok?Math.round(r.wpm*ok/r.ok):0, cut:r.ev.length-fit};
  }

  /* ---------- results ---------- */
  function renderRes(){
    const r=S.res; if(!r){ res.hidden=true; return; }
    res.hidden=false;
    if(r.few){ res.innerHTML=`<div class="tt-few"><p>${t("ttTooFew")}</p><button type="button" class="btn btn-primary btn-sm tt-again">${icon("i-refresh")}<span>${t("ttAgain")}</span></button></div>`; return; }
    const ar=r.tl==="ar", sec=Math.round(r.cw/1000), ms=`<small>${t("msUnit")}</small>`, arrow=icon("i-arrow","flip");
    res.innerHTML=`
    <div class="tt-rhead"><span class="tt-badge">${icon("i-check")}<span>${t(r.full?"ttFinished":"ttDone")}</span></span></div>
    <div class="tt-kpis">
      <div class="kpi kpi-main"><span class="kl">${t("ttSpeed")}</span><span class="kv"><b class="num">${r.wpm}</b><small>${t("ttWpm")}</small></span><span class="kn">${t("ttWordNote")}</span></div>
      <div class="kpi"><span class="kl">${t("ttCpm")}</span><span class="kv"><b class="num">${num(r.cpm)}</b></span></div>
      <div class="kpi"><span class="kl">${t("ttAcc")}</span><span class="kv"><b class="num">${r.acc}%</b></span></div>
      <div class="kpi kpi-ms"><span class="kl">${t("ttMed")}</span><span class="kv"><b class="num">${r.med}</b>${ms}</span><span class="kn">${t("ttMedNote")}</span></div>
    </div>
    <div class="tt-cmp">
      <div class="tt-ch"><span class="kicker">${t("ttCmpK")}</span><h3>${t("ttCmpT")}</h3><p class="tt-cs"></p></div>
      <div class="tt-bars">
        <div class="tb you"><span class="who"><i></i>${t("ttYou")}</span><span class="tr"><span class="tf"></span></span><b class="num"><span class="v">${r.med}</span> ${ms}</b></div>
        <div class="tb rel"><span class="who"><i></i>${t("ttRel")}</span><span class="tr"><span class="tf"></span></span><b class="num"><span class="v"></span> ${ms}</b></div>
        <p class="tt-plus"></p>
      </div>
      <div class="tt-vs">
        <div class="vs"><span class="vl">${t("ttWpmL")}</span><span class="vv"><b class="num you">${r.wpm}</b>${arrow}<b class="num rel vs-wpm"></b></span></div>
        <div class="vs"><span class="vl">${fmt(t("ttCharsIn"),{s:sec})}</span><span class="vv"><b class="num you">${num(r.ok)}</b>${arrow}<b class="num rel vs-ok"></b></span></div>
      </div>
      <div class="tt-replay">
        <div class="tt-tl" aria-hidden="true">
          <div class="tl-row you"><span class="tl-who">${t("ttYou")}</span><div class="tl-track"><svg viewBox="0 0 1000 32" preserveAspectRatio="none"><path class="tk"/></svg></div></div>
          <div class="tl-row rel"><span class="tl-who">${t("ttRel")}</span><div class="tl-track"><svg viewBox="0 0 1000 32" preserveAspectRatio="none"><path class="tk"/></svg></div></div>
          <div class="tl-ax"><span>0 s</span><span class="tl-cap">${t("ttTl")}</span><span>${sec} s</span></div>
          <i class="tl-head"></i>
        </div>
        <p class="tt-cut"></p>
        <div class="tt-lanes">
          <div class="lane you"><span class="lane-h"><i></i><span>${t("ttYou")}</span><b class="lane-n"></b></span><p class="lane-t" dir="${ar?"rtl":"ltr"}" lang="${r.tl}"></p></div>
          <div class="lane rel"><span class="lane-h"><i></i><span>${t("ttRel")}</span><b class="lane-n"></b></span><p class="lane-t" dir="${ar?"rtl":"ltr"}" lang="${r.tl}"><span class="got"></span><span class="miss"></span></p></div>
        </div>
      </div>
      <div class="tt-slider"><label for="ttPct">${t("ttSlide")}</label><input id="ttPct" type="range" min="10" max="40" step="5" value="${S.pct}"><output class="num" for="ttPct" dir="ltr"></output></div>
      <p class="tt-why">${t("ttWhy")}</p>
      <p class="tt-thabat">${icon("i-shield")}<span>${t("ttThabat")}</span></p>
    </div>
    <div class="tt-acts"><button type="button" class="btn btn-ghost btn-sm tt-replay-b">${icon("i-play")}<span>${t("ttReplay")}</span></button><button type="button" class="btn btn-primary btn-sm tt-again">${icon("i-refresh")}<span>${t("ttAgain")}</span></button></div>`;
    upd(); frame(r.cw);
  }
  /* numbers that depend on the slider */
  function upd(){
    const r=S.res; if(!r||r.few) return; const R=rel(r);
    q(".tt-cs").textContent=fmt(t("ttCmpS"),{p:S.pct});
    const max=R.med*1.08;
    q(".tb.you .tf").style.width=(r.med/max*100).toFixed(1)+"%";
    q(".tb.rel .tf").style.width=(R.med/max*100).toFixed(1)+"%";
    q(".tb.rel .v").textContent=R.med;
    q(".tt-plus").textContent=fmt(t("ttPlus"),{ms:R.med-r.med});
    q(".vs-wpm").textContent=R.wpm; q(".vs-ok").textContent=num(R.ok);
    q(".tt-cut").textContent=R.cut>0?fmt(t("ttCut"),{n:R.cut,s:Math.round(r.cw/1000)}):"";
    q(".tt-slider output").textContent=`+${S.pct}%`;
    q("#ttPct").setAttribute("aria-valuetext",`+${S.pct}%`);
  }
  /* one replay frame at time tau (ms on the visitor's own clock) */
  function frame(tau){
    const r=S.res; if(!r||r.few) return; S.tau=tau; const k=1+S.pct/100, w=r.cw;
    let dy="", dr="";
    for(const e of r.ev){ if(e.t<=tau) dy+=`M${(e.t/w*1000).toFixed(1)} 4V28`; const x=e.t*k; if(x<=tau&&x<=w) dr+=`M${(x/w*1000).toFixed(1)} 4V28`; }
    q(".tl-row.you .tk").setAttribute("d",dy); q(".tl-row.rel .tk").setAttribute("d",dr);
    q(".tl-head").style.setProperty("--p",(Math.min(1,tau/w)).toFixed(4));
    const vy=valueAt(r,tau,1), vr=valueAt(r,tau,k);
    q(".lane.you .lane-t").textContent=vy;
    q(".lane.rel .got").textContent=vr;
    q(".lane.rel .miss").textContent=vy.startsWith(vr)?vy.slice(vr.length):"";
    q(".lane.you .lane-n").textContent=fmt(t("ttChars"),{n:num(correct(vy,r.tg))});
    q(".lane.rel .lane-n").textContent=fmt(t("ttChars"),{n:num(correct(vr,r.tg))});
  }
  function replay(){
    const r=S.res; if(!r||r.few) return; cancelAnimationFrame(S.play);
    if(ctx.rm){ frame(r.cw); return; }
    const D=Math.min(9000,Math.max(4000,r.cw/3.5)), t0=performance.now();
    res.classList.add("playing");
    const step=now=>{ const p=Math.min(1,(now-t0)/D); frame(p*r.cw); if(p<1) S.play=requestAnimationFrame(step); else res.classList.remove("playing"); };
    S.play=requestAnimationFrame(step);
  }

  /* ---------- labels (site language) ---------- */
  function paint(){
    root.querySelectorAll("[data-k]").forEach(el=>{ el.textContent=t(el.dataset.k); });
    root.querySelectorAll("[data-tl]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.tl===S.tl)));
    root.querySelectorAll("[data-dur]").forEach(b=>{ b.textContent=fmt(t("ttSec"),{s:b.dataset.dur}); b.setAttribute("aria-pressed",String(+b.dataset.dur===S.dur)); });
    const ar=S.tl==="ar";
    for(const el of [txt,inp]){ el.dir=ar?"rtl":"ltr"; el.lang=S.tl; }
    inp.placeholder=t("ttPh"); inp.setAttribute("aria-label",t("ttInL")); inp.maxLength=target().length+20;
    q(".tt-arkb").hidden=!ar;
    q(".tt-cl").textContent=t("ttLeft");
    if(S.phase!=="done"){ drawText(inp.value); clock(S.phase==="run"?S.dur-(performance.now()-S.t0)/1000:null); }
    tape(); live();
    if(S.res){ renderRes(); frame(S.tau||S.res.cw); }
  }

  /* ---------- events ---------- */
  inp.addEventListener("input",()=>{
    if(S.phase==="done") return;
    const now=performance.now();
    if(S.phase==="ready"){ if(!inp.value) return; start(now); }
    S.ev.push({t:now-S.t0, v:inp.value});
    drawText(inp.value); tape(); live();
    const tg=target(); if(inp.value.length>=tg.length&&same(inp.value[tg.length-1],tg[tg.length-1])) finish(true);
  });
  for(const ev of ["paste","drop"]) inp.addEventListener(ev,e=>e.preventDefault());
  root.addEventListener("click",e=>{
    const b=e.target.closest("button"); if(!b||b.disabled) return;
    if(b.dataset.tl){ S.tl=b.dataset.tl; S.chosen=true; reset(false); inp.focus({preventScroll:true}); }
    else if(b.dataset.dur){ S.dur=+b.dataset.dur; reset(false); inp.focus({preventScroll:true}); }
    else if(b.classList.contains("tt-restart")||b.classList.contains("tt-again")){ reset(true); root.scrollIntoView({behavior:ctx.rm?"auto":"smooth",block:"start"}); inp.focus({preventScroll:true}); }
    else if(b.classList.contains("tt-replay-b")) replay();
  });
  root.addEventListener("input",e=>{ if(e.target.id!=="ttPct") return; S.pct=+e.target.value; cancelAnimationFrame(S.play); res.classList.remove("playing"); upd(); frame(S.res.cw); });
  ctx.onLang(()=>{ if(!S.chosen&&S.phase==="ready"&&S.tl!==ctx.lang()){ S.tl=ctx.lang(); inp.value=""; S.ev=[]; } paint(); });

  setPhase("ready"); paint();

  /* QA screenshots: a simulated 30-second result (?qa=test&tt=done) */
  if(ctx.qa&&new URLSearchParams(location.search).get("tt")==="done"){
    const r=rng(7), tg=target(); let tm=0, v="";
    S.ev=[]; S.t0=0;
    while(true){ const g=Math.max(70,175+(r()-.5)*120+(r()<.04?900:0)); if(tm+g>S.dur*1000) break; tm+=g; v=tg.slice(0,v.length+1); if(r()<.03&&v.length>2) v=v.slice(0,-1)+"x"; S.ev.push({t:S.ev.length?tm:0,v}); if(v.length>=tg.length) break; }
    inp.value=v; drawText(v); tape(); live(); setPhase("run"); finish(false);
  }
}

return {mount};
})();
