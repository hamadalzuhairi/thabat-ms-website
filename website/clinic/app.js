/* Thabat MS clinic dashboard demo: rendering, routing and interactions.
   Static page, simulated data. Demo state (acknowledgements, forms, audit log, settings) lives in this browser only. */
(function(){
"use strict";
const D = window.THABAT, L10 = window.I18N;

/* ---------- storage (per-viewer convenience only) ---------- */
const KEY = "thabat-clinic:";
const store = {
  get(k, d){ try{ const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(KEY + k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(KEY + k); }catch(e){} }
};
const urlLang = new URLSearchParams(location.search).get("lang");
const S = {
  lang: urlLang === "ar" || urlLang === "en" ? urlLang : store.get("lang", (() => { try{ return localStorage.getItem("thabat-lang") === "ar" ? "ar" : "en"; }catch(e){ return "en"; } })()),
  theme: store.get("theme", (() => { try{ const v = localStorage.getItem("thabat-theme"); return v === "light" || v === "dark" ? v : "auto"; }catch(e){ return "auto"; } })()), big: store.get("big", false), entered: store.get("entered", false),
  acks: store.get("acks", {}), forms: store.get("forms", []), audit: store.get("audit", null), clock0: store.get("clock0", null),
  filter: null, seg: "all", sort: "attention", q: "", range: {}, table: false, viewed: {}, revealed: {}, alertTab: "open", cursor: null
};
let t = L10[S.lang];

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const fd = d => `${d.getDate()} ${t.months[d.getMonth()]}`;
const fdy = d => `${fd(d)} ${d.getFullYear()}`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fdt = d => `${fd(d)} ${hm(d)}`;
const wd = d => `${t.days[d.getDay()]} ${fd(d)}`;
const ym = s => { const [y, m] = s.split("-").map(Number); return `${t.months[m-1]} ${y}`; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayDiff = (a, b) => Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
function setTheme(v){ S.theme = v; store.set("theme", v); try{ if(v === "auto") localStorage.removeItem("thabat-theme"); else localStorage.setItem("thabat-theme", v); }catch(e){} }
function isDark(){ return S.theme === "auto" ? window.matchMedia("(prefers-color-scheme: dark)").matches : S.theme === "dark"; }
function themeBtn(id){ const d = isDark(), l = d ? t.theme.toLight : t.theme.toDark; return `<button type="button" class="iconbtn" id="${id}" data-k="${id}" aria-label="${esc(l)}" title="${esc(l)}" aria-pressed="${!d}">${I(d ? "sun" : "moon")}</button>`; }
function wireTheme(id){ const b = document.getElementById(id); if(b) b.addEventListener("click", () => { setTheme(isDark() ? "light" : "dark"); rerender(); }); }
function today(){ return MODE === "live" ? new Date() : D.DEMO_NOW; }
function now(){ if(MODE === "live") return new Date(); if(S.clock0 == null){ S.clock0 = Date.now(); store.set("clock0", S.clock0); } return new Date(D.DEMO_NOW.getTime() + Math.max(0, Date.now() - S.clock0)); }
function save(){ store.set("acks", S.acks); store.set("forms", S.forms); store.set("audit", S.audit); }

/* ---------- icons (Lucide paths) ---------- */
const IP = {
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
 cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
 clip:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
 hist:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
 cog:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
 search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 tri:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
 eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
 check:'<path d="M20 6 9 17l-5-5"/>', ccheck:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
 phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
 pill:'<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
 off:'<path d="M12 20h.01M8.5 16.43a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76M16.85 11.25a10 10 0 0 1 2.22 1.68M5 13a10 10 0 0 1 5.24-2.76M2 2l20 20"/>',
 sprout:'<path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
 chev:'<path d="m9 18 6-6-6-6"/>', down:'<path d="m6 9 6 6 6-6"/>',
 print:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
 dl:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
 lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
 unlock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
 pause:'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>', up:'<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
 act:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
 hosp:'<path d="M12 6v4M14 14h-4M14 18h-4M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>',
 zap:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 msg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
 out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
 table:'<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18"/>', moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', staff:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>', table2:'<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18"/>',
 undo:'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
 phoneSm:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
};
const I = (n, c = "") => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${IP[n]}</svg>`;
const STI = { alert:"tri", watch:"eye", none:"off", learn:"sprout", good:"ccheck" };

/* ---------- derived data ---------- */
/* ---------- data source: demo (simulated) or the Firebase test server ---------- */
const LV = { ok:false, api:null, emulator:false, authKnown:false, user:null, pts:[], raw:{}, subs:{}, doctors:[], stopList:null, ready:false, audit:[] };
let MODE = "demo";
let ALL = D.ALL;
const live = () => MODE === "live";
function initials(n){ return String(n || "?").replace(/^(dr\.?|د\.)\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(""); }
function me(){ return live() && LV.user ? { name: LV.user.name || LV.user.email, role: LV.user.role === "admin" ? t.live.admin : t.live.doctorRole, ini: initials(LV.user.name || LV.user.email) } : { name: t.doctor, role: t.role, ini: S.lang === "ar" ? "ن ح" : "NA" }; }
const isAdmin = () => live() && LV.user && LV.user.role === "admin";
const docNameOf = uid => { const d = LV.doctors.find(x => x.uid === uid); return d ? d.name : (LV.user && LV.user.uid === uid ? (LV.user.name || LV.user.email) : null); };
function ackOf(id){ if(!live()) return S.acks[id] || null; const e = byId(id); return (e && e.ack) || null; }
const ackBy = a => (a && a.by) || t.doctor;
function raisedAt(p, s, st){
  if(!st || st.st !== "alert") return null;
  if(s.length >= st.days && st.days >= D.RULE.alertMin) return D.alertRaised(p, s, st);
  const e = byId(p.id); if(e && e.alert && e.alert.startedOn){ const d = D.parse(e.alert.startedOn); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + D.RULE.alertMin, 3, 10); }
  return new Date();
}
function runAt(p, s, st){
  if(st && st.days && s.length >= st.days) return D.runStart(p, s, st);
  const e = byId(p.id); if(e && e.alert && e.alert.startedOn) return D.parse(e.alert.startedOn);
  return s.length ? s[0].d : new Date();
}
function adaptLive(pt, data){
  const v = data ? LV.api.toDashboardShape(data) : { p:null, s:[], st:{ st:"none", days:0, paused:false }, alerts:[] };
  const pd = (data && data.patient) || pt, kinds = pd.treatmentKinds || [];
  const s = (v.s || []).map(x => ({ d: x.d, ms: x.ms == null ? null : x.ms, heat:false, sr: x.sr || null, pv: x.pv || null, taps: x.taps || 0, msByType: x.msByType || {}, tapsByType: x.tapsByType || {} }));
  const seen = pd.lastSeenAt ? new Date(Number(pd.lastSeenAt)) : null;
  let nd = 0; for(let i = s.length - 1; i >= 0 && s[i].ms == null; i--) nd++;
  const st = { st: (v.st && v.st.st) || "none", days: (v.st && v.st.days) || 0, paused: pd.monitoring === false };
  if(st.st === "none") st.days = s.length ? nd : 0;
  if(st.st === "learn") st.days = Math.max(1, Math.min(14, s.filter(x => x.ms != null).length));
  const withMs = s.filter(x => x.ms != null);
  const p = { id: pd.code || pt.uid.slice(0, 8), uid: pt.uid, code: pd.code, live:true, name: pd.displayName || null, usual: v.p ? v.p.usual : null,
    base: withMs.length ? withMs[withMs.length - 1].ms : 240, seed:7, hist: s.length, doc: pd.doctorId || null, status: pd.status || "unassigned",
    prev: kinds.includes("PREVENTIVE") ? "daily" : null, sr: kinds.includes("SYMPTOM_RELIEF") ? "twice" : null, kinds, lastVisit:null, nextVisit:null, app: pd.appVersion || "—",
    paused: pd.monitoring === false && seen ? D.iso(seen) : null, lastSync: seen ? `${D.iso(seen)}T${pad(seen.getHours())}:${pad(seen.getMinutes())}` : null, simulated: !!pd.simulated };
  const alerts = (v.alerts || []).slice().sort((a, b) => String(b.startedOn).localeCompare(String(a.startedOn)));
  const cur = alerts.find(a => a.state === "open") || alerts[0] || null;
  const ack = st.st === "alert" && cur && cur.state === "acknowledged" ? { at: Number(cur.ackAt) || Date.now(), by: docNameOf(cur.acknowledgedBy) || t.live.doctorRole, note: cur.note || "", found: [] } : null;
  return { p, s, st, alerts, alert: cur, ack };
}
function startLive(){
  stopLive(true); MODE = "live"; ALL = []; S.viewed = {}; S.revealed = {}; LV.audit = []; const app = $("#app"); if(app) app.remove();   // each signed-in person gets their own view log
  const api = LV.api;
  api.listDoctors().then(d => { LV.doctors = d; rebuildLive(); }).catch(() => {});
  LV.stopList = api.watchPatients(list => {
    LV.pts = list; const ids = new Set(list.map(x => x.uid));
    Object.keys(LV.subs).forEach(uid => { if(!ids.has(uid)){ LV.subs[uid](); delete LV.subs[uid]; delete LV.raw[uid]; } });
    list.forEach(pt => { if(!LV.subs[pt.uid]) LV.subs[pt.uid] = api.watchPatient(pt.uid, data => { LV.raw[pt.uid] = data; rebuildLive(); }, { audit:false }); });
    LV.ready = true; rebuildLive();
  });
}
function stopLive(keepMode){
  if(LV.stopList){ LV.stopList(); LV.stopList = null; }
  Object.values(LV.subs).forEach(f => f()); LV.subs = {}; LV.raw = {}; LV.pts = []; LV.ready = false;
  if(!keepMode){ MODE = "demo"; ALL = D.ALL; const app = $("#app"); if(app) app.remove(); }
}
let rbTimer = null, pendingRender = false;
function rebuildLive(){
  ALL = LV.pts.map(pt => { const d = LV.raw[pt.uid]; return adaptLive(pt, d ? Object.assign({}, d, { patient: d.patient || pt }) : null); });
  clearTimeout(rbTimer); rbTimer = setTimeout(() => { if(!live()) return; if($("#overlay") && $("#overlay").innerHTML){ pendingRender = true; return; } if($("#app")) rerender(); }, 150);
}
const byId = id => ALL.find(e => e.p.id === id);
const docName = c => c === "RQ" ? t.otherDoc : t.doctor;
const isAcked = e => e.st.st === "alert" && !!ackOf(e.p.id);
const unackedAlerts = () => ALL.filter(e => e.st.st === "alert" && !ackOf(e.p.id));
function latest(e){ const x = e.s[e.s.length-1]; return x ? x.ms : null; }
function pct(e){ const v = latest(e); return v != null && e.p.usual ? Math.round((v / e.p.usual - 1) * 100) : null; }
const pctTxt = p => p == null ? "" : `${p > 0 ? "↑+" : p < 0 ? "↓−" : "±"}${Math.abs(p)}%`;
function lastDataDate(e){ for(let i = e.s.length-1; i >= 0; i--) if(e.s[i].ms != null) return e.s[i].d; return null; }
function lastDataTxt(e){
  if(e.p.lastSync){ const d = D.parse(e.p.lastSync); return fdt(d); }
  const d = lastDataDate(e); if(!d) return "—";
  const sync = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 3, (e.p.seed * 7) % 28);
  return sameDay(sync, D.DEMO_NOW) ? `${t.today} ${hm(sync)}` : fdt(sync);
}
function visitTxt(e){ return e.p.nextVisit ? fd(D.parse(e.p.nextVisit)) : t.notBooked; }
function agoTxt(from){ const ms = now() - from; const h = Math.max(0, Math.floor(ms / 36e5)); return t.ago(Math.floor(h / 24), h % 24); }
function heatInRun(e){ const r = e.s.slice(-e.st.days); return { a: r.filter(x => x.heat).length, b: r.length }; }
function srTaken7(e){ const c = D.doseCounts(e.p, e.s.slice(-7), "sr"); return { t: c.taken + c.late, a: c.asked, late: c.late }; }
function pvTaken7(e){ return e.s.slice(-7).filter(x => x.pv === "T" || x.pv === "L").length; }
function waitingLive(main){ if(!live() || (LV.ready && Object.keys(LV.raw).length >= LV.pts.length)) return false; main.innerHTML = `<p class="note card cpad" role="status">${I("clock","sm")}${esc(t.live.connecting)}</p>`; return true; }
function answered7(e){ const k = e.p.prev === "daily" ? "pv" : e.p.sr ? "sr" : null; if(!k) return 7; return e.s.slice(-7).filter(x => x[k] === "T" || x[k] === "L").length; }
function lastGiven(p){ return p.prevGiven ? D.parse(p.prevGiven[p.prevGiven.length-1]) : null; }
function avgTaps(e, k = 5){ const r = e.s.slice(-k).filter(x => x.ms != null); return { taps: r.length ? Math.round(r.reduce((a, x) => a + x.taps, 0) / r.length / 10) * 10 : 0, days: r.length, of: Math.min(k, e.s.length) }; }

/* short reading for the list */
function readingShort(e){
  const { p, st } = e;
  if(st.st === "alert"){
    const m = D.missedPrev7(p, e.s);
    const text = m >= 2 ? t.read.adherence(m) : answered7(e) >= 4 ? t.read.despite : t.read.slow;
    const a = ackOf(p.id);
    return { text, tag: a ? t.read.tag.acked(ackBy(a)) : t.read.tag.open(agoTxt(raisedAt(p, e.s, st))), ic: a ? "ccheck" : "clock" };
  }
  if(st.st === "watch"){ const h = heatInRun(e); return h.a === h.b ? { text: t.read.heat(h.a, h.b), tag: t.read.tag.heat, ic:"sun" } : { text: t.read.watch(st.days) }; }
  if(st.st === "none") return p.paused ? { text: t.read.paused(fd(D.parse(p.paused))), tag: t.read.tag.paused, ic:"info" } : (st.days ? { text: t.read.nodata(st.days), tag: t.read.tag.phone, ic:"info" } : { text: t.live.noDays });
  if(st.st === "learn") return { text: t.read.learn, tag: t.read.tag.learn, ic:"info" };
  const c = D.srCheck(p, e.s);
  if(c && c.res === "yes") return { text: t.read.resp(c.pct) };
  if(c && c.res === "no") return { text: t.read.noresp };
  return { text: t.read.steady };
}

/* reading items for the detail page and report */
function readingItems(e){
  const { p, st } = e, out = [];
  const q = avgTaps(e);
  if(st.st === "alert"){
    const m = D.missedPrev7(p, e.s);
    if(m >= 2) out.push({ c:"o", i:"up", h: t.ri.adherence(m) });
    else {
      const bits = [];
      if(p.sr){ const s7 = srTaken7(e); bits.push(t.ri.srTaken(s7.t, s7.a)); }
      if(p.prev === "hospital" && lastGiven(p)) bits.push(t.ri.prevGiven(fd(lastGiven(p))));
      if(p.prev === "daily") bits.push(t.ri.prevDaily(pvTaken7(e)));
      out.push({ c:"o", i:"up", h: answered7(e) >= 4 ? t.ri.despite(bits.join(" ")) : `<b>${esc(t.read.slow)}.</b> ${bits.join(" ")}` });
      out.push({ c:"n", i:"info", h: esc(t.ri.causes) });
    }
    if(!p.live){ const h = heatInRun(e); out.push({ c: h.a ? "w" : "n", i:"sun", h: esc(h.a ? t.ri.heat(h.a, h.b) : t.ri.noheat) }); }
    out.push({ c:"g", i:"ccheck", h: esc(t.ri.quality(q.taps.toLocaleString("en"), q.days, q.of)) });
  } else if(st.st === "watch"){
    const h = heatInRun(e);
    out.push({ c:"w", i: h.a ? "sun" : "eye", h: esc(h.a ? t.ri.watchHeat(h.a, h.b) : t.det.watchText) });
    out.push({ c:"g", i:"ccheck", h: esc(t.ri.quality(q.taps.toLocaleString("en"), q.days, q.of)) });
  } else if(st.st === "none"){
    out.push({ c:"n", i: p.paused ? "pause" : "off", h: esc(p.paused ? t.ri.paused(fd(D.parse(p.paused))) : st.days ? t.ri.nd(st.days) : t.live.noDays) });
  } else if(st.st === "learn"){
    out.push({ c:"n", i:"sprout", h: esc(t.ri.learn(st.days)) });
  } else {
    out.push({ c:"g", i:"ccheck", h: esc(t.ri.steady) });
    const c = D.srCheck(p, e.s); if(c && c.res === "yes") out.push({ c:"g", i:"zap", h: esc(t.ri.resp(c.pct)) });
  }
  return out;
}

function events(e){
  const { p, s, st } = e, ev = [];
  if(st.st === "alert"){ ev.push({ d: raisedAt(p, s, st), k: t.ev.alert, c:"o" }); const a = ackOf(p.id); if(a) ev.push({ d: new Date(a.at), k: t.ev.ack(ackBy(a)), c:"g" }); }
  if(st.st === "alert" || st.st === "watch") ev.push({ d: runAt(p, s, st), k: t.ev.watch, c:"w" });
  const runFrom = (st.st === "alert" || st.st === "watch") ? s.length - st.days : s.length;
  let singles = 0;
  for(let i = runFrom - 1; i > Math.max(0, s.length - 150) && singles < 2; i--){
    if(D.slower(p, s[i]) && !D.slower(p, s[i-1] || {}) && !D.slower(p, s[i+1] || {})){ ev.push({ d: s[i].d, k: t.ev.single, c:"" }); singles++; }
  }
  if(p.paused) ev.push({ d: D.parse(p.paused), k: t.ev.paused, c:"" });
  if(st.st === "none" && !p.paused){ const d = lastDataDate(e); if(d) ev.push({ d, k: t.ev.nodata, c:"" }); }
  for(let i = s.length - 1; i > Math.max(0, s.length - 150); i--){ if(s[i].ms == null && s[i-1] && s[i-1].ms != null && !(p.paused && D.iso(s[i].d) >= p.paused) && !(st.st === "none" && i >= s.length - st.days)){ ev.push({ d: s[i].d, k: t.ev.gap, c:"" }); break; } }
  if(p.lastVisit) ev.push({ d: D.parse(p.lastVisit), k: t.ev.visit, c:"b" });
  (p.prevGiven || []).forEach(g => { const d = D.parse(g); if(dayDiff(d, D.END) < 365) ev.push({ d, k: t.ev.given, c:"b" }); });
  if(st.st === "learn" && s[0]) ev.push({ d: s[0].d, k: t.ev.learn, c:"" });
  if(p.live) (e.alerts || []).slice(1, 3).forEach(a => { if(a.startedOn) ev.push({ d: D.parse(a.startedOn), k: t.ev.watch, c:"" }); });
  return ev.filter(x => x.d).sort((a, b) => b.d - a.d).slice(0, 5);
}

/* ---------- small components ---------- */
function chip(e){
  const { st } = e; const c = t.chip;
  const txt = st.st === "alert" ? c.alert(st.days) : st.st === "watch" ? c.watch(st.days) : st.st === "none" ? (st.paused ? c.paused : c.none(st.days)) : st.st === "learn" ? c.learn(st.days) : c.good;
  const ic = st.st === "none" && st.paused ? "pause" : STI[st.st];
  if(st.st === "none" && !st.paused && !st.days) return `<span class="chip none">${I("off","sm")}${esc(t.st.none)}</span>`;
  return `<span class="chip ${st.st}">${I(ic, "sm")}${esc(txt)}</span>`;
}
function msCell(e){
  const v = latest(e), u = e.p.usual;
  if(e.st.st === "learn") return `<div class="msv"><b>${v} <em>ms</em></b><small>${esc(t.ms.learning)}</small></div>`;
  if(v == null) return `<div class="msv"><b class="faint">—</b><small>${esc(t.ms.nodata)}${u ? ` · ${esc(t.ms.usual)} <bdi>${u} ms</bdi>` : ""}</small></div>`;
  const p = pct(e), cls = e.st.st === "alert" ? "up" : e.st.st === "watch" ? "wup" : "flat";
  return `<div class="msv"><b>${v} <em>ms</em><span class="delta ${cls}">${pctTxt(p)}</span></b><small>${esc(t.ms.usual)} <bdi>${u} ms</bdi></small></div>`;
}
function spark(e, w = 128, h = 34){
  const { p } = e; const s = e.s.slice(-30); const n = s.length;
  const c = p.usual || p.base, lo = c - 32, hi = c + 46;
  const X = i => 2 + (30 - n + i) * (w - 4) / 29, Y = v => h - 3 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (h - 6);
  let path = "", pen = false;
  s.forEach((x, i) => { if(x.ms == null){ pen = false; return; } path += (pen ? "L" : "M") + X(i).toFixed(1) + " " + Y(x.ms).toFixed(1) + " "; pen = true; });
  let g = "";
  if(p.usual){ const pl = Y(D.pilotLine(p)); g += `<line x1="0" x2="${w}" y1="${pl}" y2="${pl}" stroke="var(--alert-fill)" stroke-opacity=".6" stroke-dasharray="3 3"/><line x1="0" x2="${w}" y1="${Y(p.usual)}" y2="${Y(p.usual)}" stroke="var(--ink-3)" stroke-dasharray="2 3"/>`; }
  s.forEach((x, i) => { if(x.ms == null && e.st.st !== "learn") g += `<rect x="${X(i)-2}" y="2" width="4.4" height="${h-4}" fill="url(#sph)"/>`; });
  g += `<path d="${path}" fill="none" stroke="${e.st.st === "none" ? "var(--ink-3)" : "var(--brand)"}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  s.forEach((x, i) => { if(D.slower(p, x)) g += `<path d="M${X(i)} ${Y(x.ms)-4} l3.4 6 h-6.8z" fill="var(--alert-fill)"/>`; });
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${g}</svg>`;
}
const DZ = { T: I("check"), L:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2"/></svg>', N: I("x"), O:"" };
function doseCell(e){
  const { p } = e;
  if(p.live && !p.sr && p.prev !== "daily") return `<span class="faint small">${esc(t.live.noKinds)}</span>`;
  if(!p.sr && p.prev !== "daily") return `<div class="dosecol"><span class="chip plain">${I("hosp","sm")}${esc(t.dose.prev)}</span><small>${esc(t.dose.hosp(ym(p.prevNext)))}</small></div>`;
  const k = p.prev === "daily" ? "pv" : "sr";
  const cells = e.s.slice(-7).map(x => x[k] || "O"); while(cells.length < 7) cells.unshift("O");
  const lbl = cells.map(c => t.dose[c]).join(", ");
  let note;
  if(k === "pv"){ const un = cells.filter(c => c === "O").length; note = un ? `${t.dose.prev} · ${t.dose.unans(un)}` : `${t.dose.prev} · ${cells.filter(c => c === "T" || c === "L").length}/7`; }
  else { const s7 = srTaken7(e); note = `${t.dose.sr} · ${s7.t}/${s7.a}`; }
  return `<div class="dosecol"><div class="doses" role="img" aria-label="${esc(lbl)}">${cells.map(c => `<span class="dz ${c}">${DZ[c]}</span>`).join("")}</div><small>${esc(note)}</small></div>`;
}
function metaLine(e){
  const p = e.p;
  if(p.live) return `${esc(p.simulated ? t.sim : t.live.testData)} · ${esc(p.doc ? (docNameOf(p.doc) || t.live.doctorRole) : t.live.unassigned)}`;
  return `${esc(t.sex[p.sex])} · ${p.age} · ${esc(t.city[p.city])}`; }
function identName(e){ if(e.p.live) return e.p.name || e.p.code || "—"; const i = ALL.indexOf(e); return `${t.ident.name} ${pad(i + 1)} · ${t.ident.mrn} DEMO-${1001 + i}`; }

/* ---------- chart ---------- */
function chartSVG(e, { from = 0, compact = false, uid = "c" } = {}){
  const { p, s, st } = e; const seg = s.slice(from), n = seg.length;
  const W = compact ? 780 : 900, padL = 82, padR = compact ? 16 : 122, top = 16, plotH = compact ? 150 : 172, rowH = 18;
  const rows = [!p.live && "heat", p.sr && "sr", p.prev && "pv", !compact && p.lastVisit && "visit"].filter(Boolean);
  const c = p.usual || p.base, pilot = D.pilotLine(p);
  const vals = seg.map(x => x.ms).filter(v => v != null);
  const lo = Math.floor((Math.min(c - 26, ...vals) - 4) / 10) * 10;
  const hi = Math.ceil((Math.max(pilot ? pilot + 12 : c + 30, ...vals) + 6) / 10) * 10;
  const PW = W - padL - padR, cw = PW / n, X = i => padL + (i + .5) * cw, Y = v => top + plotH - (v - lo) / (hi - lo) * plotH;
  let g = "";
  const step = hi - lo > 90 ? 20 : 10;
  for(let v = Math.ceil(lo / step) * step; v <= hi; v += step) g += `<line x1="${padL}" x2="${padL + PW}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line-2)"/><text x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)" font-family="IBM Plex Mono,monospace">${v}</text>`;
  // current run
  if((st.st === "alert" || st.st === "watch") && st.days <= n){
    const x0 = X(n - st.days) - cw / 2;
    g += `<rect x="${x0}" y="${top}" width="${cw * st.days}" height="${plotH}" fill="${st.st === "alert" ? "var(--alert-soft)" : "var(--watch-soft)"}"/>`;
    if(st.st === "alert" && !compact) g += `<text x="${x0 - 6}" y="${top + 12}" text-anchor="end" font-size="11" font-weight="600" fill="var(--alert)">${esc(t.det.alertRaised(fd(raisedAt(p, s, st))))}</text>`;
  }
  if(p.usual){
    g += `<rect x="${padL}" y="${Y(p.usual * 1.042)}" width="${PW}" height="${Y(p.usual * 0.958) - Y(p.usual * 1.042)}" fill="var(--band)"/>`;
    g += `<line x1="${padL}" x2="${padL + PW}" y1="${Y(p.usual)}" y2="${Y(p.usual)}" stroke="var(--brand)" stroke-opacity=".55" stroke-dasharray="4 4"/>`;
    g += `<line x1="${padL}" x2="${padL + PW}" y1="${Y(pilot)}" y2="${Y(pilot)}" stroke="var(--alert-fill)" stroke-width="1.5" stroke-dasharray="6 4"/>`;
  }
  // no data
  let ndLabel = false;
  seg.forEach((x, i) => { if(x.ms == null){ g += `<rect x="${X(i) - cw / 2}" y="${top}" width="${cw + .3}" height="${plotH}" fill="url(#h-${uid})"/>`; if(!ndLabel && !compact && (i + 1 >= n || seg[i+1].ms != null || i === n - 1)){ g += `<text x="${X(i)}" y="${top + plotH - 6}" text-anchor="middle" font-size="10.5" fill="var(--ink-3)">${esc(t.det.nodataL)}</text>`; ndLabel = true; } } });
  // line
  let path = "", pen = false;
  seg.forEach((x, i) => { if(x.ms == null){ pen = false; return; } path += (pen ? "L" : "M") + X(i).toFixed(1) + " " + Y(x.ms).toFixed(1) + " "; pen = true; });
  g += `<path d="${path}" fill="none" stroke="var(--brand)" stroke-width="${compact ? 1.6 : 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
  if(n <= 31) seg.forEach((x, i) => { if(x.ms != null && !D.slower(p, x)) g += `<circle cx="${X(i)}" cy="${Y(x.ms)}" r="2.4" fill="var(--brand)"/>`; });
  seg.forEach((x, i) => { if(D.slower(p, x)) g += `<path d="M${X(i)} ${Y(x.ms) - 6} l5 8.5 h-10z" fill="var(--alert-fill)" stroke="var(--surface)" stroke-width="1"/>`; });
  // right labels
  if(!compact){
    const R = padL + PW + 8;
    if(p.usual){
      let yu = Y(p.usual) + 4, yp = Y(pilot) - 2; if(yu - yp < 30) yp = yu - 30;
      g += `<text x="${R}" y="${yu}" font-size="11" fill="var(--brand)" font-weight="600">${esc(t.det.usualL(p.usual))}</text>`;
      g += `<text x="${R}" y="${yp}" font-size="11" fill="var(--alert)" font-weight="600">${esc(t.det.pilotL)}</text><text x="${R}" y="${yp + 13}" font-size="10.5" fill="var(--ink-3)">${esc(t.det.pilotSub(pilot))}</text>`;
      const lv = seg[n-1].ms; if(lv != null && Y(lv) < yp - 16) g += `<text x="${R}" y="${Y(lv) + 4}" font-size="12" fill="var(--ink)" font-weight="600" font-family="IBM Plex Mono,monospace">${lv} ms</text>`;
    } else g += `<text x="${R}" y="${Y(c) + 4}" font-size="11" fill="var(--learn)" font-weight="600">${esc(t.det.learningL)}</text>`;
  }
  // event rows
  const ry = top + plotH + 22;
  rows.forEach((r, k) => { const y = ry + k * rowH; g += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="var(--ink-2)">${esc(t.det.rows[r])}</text>`; if(k < rows.length - 1) g += `<line x1="${padL}" x2="${padL + PW}" y1="${y + rowH / 2}" y2="${y + rowH / 2}" stroke="var(--line-2)"/>`; });
  const rowY = r => ry + rows.indexOf(r) * rowH;
  const mark = (v, cx, y) => v === "T" ? `<circle cx="${cx}" cy="${y}" r="${n > 120 ? 1.8 : 2.6}" fill="var(--good)"/>` : v === "L" ? `<rect x="${cx - 2.6}" y="${y - 2.6}" width="5.2" height="5.2" fill="var(--watch-fill)" transform="rotate(45 ${cx} ${y})"/>` : v === "N" ? `<path d="M${cx - 3} ${y - 3}l6 6M${cx + 3} ${y - 3}l-6 6" stroke="var(--alert)" stroke-width="1.8"/>` : "";
  seg.forEach((x, i) => {
    const cx = X(i);
    if(x.heat && rows.includes("heat")) g += `<circle cx="${cx}" cy="${rowY("heat")}" r="${n > 120 ? 1.8 : 2.6}" fill="var(--watch-fill)"/>`;
    if(p.sr) g += mark(x.sr, cx, rowY("sr"));
    if(p.prev === "daily") g += mark(x.pv, cx, rowY("pv"));
  });
  const idxOf = d => seg.findIndex(x => sameDay(x.d, d));
  if(p.prev === "hospital"){
    const given = (p.prevGiven || []).map(D.parse).map(idxOf).filter(i => i >= 0);
    given.forEach((i, k) => { const y = rowY("pv"); g += `<rect x="${X(i) - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="var(--brand)"/>`; if(k === given.length - 1 && X(i) + 200 < padL + PW) g += `<text x="${X(i) + 9}" y="${y + 4}" font-size="10.5" fill="var(--ink-2)">${esc(t.det.lg.given)} · ${esc(t.det.nextDue(ym(p.prevNext)))}</text>`; });
  }
  if(rows.includes("visit") && p.lastVisit){ const i = idxOf(D.parse(p.lastVisit)); if(i >= 0){ const y = rowY("visit"); g += `<path d="M${X(i)} ${y - 6}l5 6-5 6-5-6z" fill="var(--ink)"/>`; if(X(i) + 90 < padL + PW) g += `<text x="${X(i) + 9}" y="${y + 4}" font-size="10.5" fill="var(--ink-2)">${esc(t.det.lg.visit)}</text>`; } }
  // x axis
  const ax = ry + rows.length * rowH + 4; const ticks = [];
  if(n > 45){ seg.forEach((x, i) => { if(x.d.getDate() === 1 && i > 3 && i < n - 8) ticks.push(i); }); }
  else { for(let i = n - 8; i > 3; i -= 7) ticks.push(i); }
  ticks.forEach(i => g += `<line x1="${X(i)}" x2="${X(i)}" y1="${top}" y2="${top + plotH}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${X(i)}" y="${ax + 10}" text-anchor="middle" font-size="11" fill="var(--ink-3)">${esc(fd(seg[i].d))}</text>`);
  g += `<text x="${padL}" y="${ax + 10}" font-size="11" fill="var(--ink-3)">${esc(fd(seg[0].d))}</text><text x="${padL + PW}" y="${ax + 10}" text-anchor="end" font-size="11" fill="var(--ink-3)">${esc(fd(seg[n-1].d))}</text>`;
  if(!compact) g += `<line class="cur" x1="-10" x2="-10" y1="${top}" y2="${top + plotH}" stroke="var(--ink)" stroke-width="1" opacity="0"/>`;
  const H = ax + 18;
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t.det.chart)}, ${n} ${S.lang === "ar" ? "يومًا" : "days"}"><defs><pattern id="h-${uid}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="var(--hatch)" stroke-width="2"/></pattern></defs>${g}</svg>`;
  return { svg, meta: { W, padL, PW, n, from } };
}
function legendHTML(p){
  const L = t.det.lg;
  return `<div class="legend"><span><i class="lg-line"></i>${esc(L.median)}</span>${p.usual ? `<span><i class="lg-band"></i>${esc(L.band)}</span><span><i class="lg-pilot"></i>${esc(L.pilot)}</span><span><svg width="12" height="11" aria-hidden="true"><path d="M6 1l5 9H1z" fill="#F5821F"/></svg>${esc(L.slow)}</span>` : ""}
   <span><i class="lg-nd"></i>${esc(L.nd)}</span>${p.live ? "" : `<span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" fill="#E2A11B"/></svg>${esc(L.heat)}</span>`}
   ${p.sr || p.prev === "daily" ? `<span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" fill="var(--good)"/></svg>${esc(L.T)}</span><span><svg width="10" height="10" aria-hidden="true"><rect x="2" y="2" width="6" height="6" fill="#E2A11B" transform="rotate(45 5 5)"/></svg>${esc(L.L)}</span><span><svg width="10" height="10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="var(--alert)" stroke-width="1.8"/></svg>${esc(L.N)}</span>` : ""}
   ${p.prev === "hospital" ? `<span><svg width="10" height="10" aria-hidden="true"><rect x="1" y="1" width="8" height="8" rx="2" fill="var(--brand)"/></svg>${esc(L.given)}</span>` : ""}</div>`;
}
function rangeFrom(e, r){
  const n = e.s.length;
  if(r === "visit" && e.p.lastVisit){ const i = e.s.findIndex(x => sameDay(x.d, D.parse(e.p.lastVisit))); if(i >= 0) return i; }
  const k = r === "visit" ? 90 : Number(r); return Math.max(0, n - k);
}

/* ---------- shell ---------- */
function applyPrefs(){
  const h = document.documentElement;
  h.lang = S.lang; h.dir = t.dir;
  if(S.theme === "auto") h.removeAttribute("data-theme"); else h.setAttribute("data-theme", S.theme);
  h.classList.toggle("big", !!S.big);
  $("#skip").textContent = t.skip;
}
function navHTML(route){
  const n = unackedAlerts().length;
  const it = (k, ic, ct) => `<a href="#/${k}" ${route === k ? 'aria-current="page"' : ""}>${I(ic)}<span>${esc(k === "staff" ? t.live.staff : t.nav[k])}</span>${ct ? `<span class="ct" aria-label="${ct}">${ct}</span>` : ""}</a>`;
  return `<div class="lbl">${esc(t.work)}</div>${it("patients","users")}${it("alerts","bell", n)}${it("visits","cal")}${it("forms","clip")}${it("reports","file")}
   <div class="lbl">${esc(t.admin)}</div>${isAdmin() ? it("staff","staff") : ""}${it("audit","hist")}${it("settings","cog")}`;
}
function shell(){
  const root = $("#root");
  root.innerHTML = `<div class="app" id="app">
   <aside class="side" id="side" aria-label="${esc(t.appSub)}">
    <a class="slogo" href="#/patients"><img src="logo.png" alt="" width="36" height="36"><div><strong>Thabat MS</strong><small>${esc(t.appSub)}</small></div></a>
    <nav class="nav" id="nav" aria-label="${esc(t.appSub)}"></nav>
    <div class="sfoot"><div class="who"><div class="av" aria-hidden="true">${esc(me().ini)}</div><div><strong>${esc(me().name)}</strong><small>${esc(me().role)}</small></div></div>
     <a href="../">${I("home","sm")}${esc(t.site)}</a><a href="#" id="leave">${I("out","sm")}${esc(live() ? t.live.signOut : t.signout)}</a></div>
   </aside>
   <div class="main">
    <header class="top">
     <button class="iconbtn menu" id="menuBtn" aria-label="${esc(t.menu)}" aria-expanded="false" aria-controls="side">${I("menu")}</button>
     <label class="search"><span class="vh">${esc(t.search)}</span>${I("search","sm")}<input id="q" type="search" autocomplete="off" placeholder="${esc(t.search)}" value="${esc(S.q)}"><kbd aria-hidden="true">/</kbd></label>
     <span class="clinicname">${I("hosp","sm")}${esc(t.clinic)}</span><span class="sp"></span>
     ${live() ? `<span class="modechip"><i></i><span>${esc(LV.emulator ? t.live.emu : t.live.server)}</span></span>` : ""}<span class="sim" id="simChip" title="${esc(live() ? t.live.signinSub : t.demoClock)}">${I("info","sm")}<span>${esc(t.sim)}</span></span>
     <span id="themeSlot"></span>
     <a class="iconbtn" href="#/alerts" id="bell" aria-label="${esc(t.alertsBtn)}">${I("bell")}<span class="dot" hidden></span></a>
    </header>
    <main class="content" id="main" tabindex="-1"></main>
   </div></div><div id="overlay"></div>`;
  $("#leave").addEventListener("click", ev => { ev.preventDefault(); if(live()){ LV.api.signOut(); return; } S.entered = false; store.set("entered", false); location.hash = ""; render(); });
  $("#menuBtn").addEventListener("click", () => { const a = $("#app"); const open = !a.classList.contains("navopen"); a.classList.toggle("navopen", open); $("#menuBtn").setAttribute("aria-expanded", String(open)); if(open) $("#nav a").focus(); });
  $("#app").addEventListener("click", ev => { const a = $("#app"); if(a && a.classList.contains("navopen") && (ev.target === a || ev.target.closest(".nav a"))){ a.classList.remove("navopen"); $("#menuBtn").setAttribute("aria-expanded","false"); } });
  $("#q").addEventListener("input", ev => { S.q = ev.target.value.trim(); if(route().r !== "patients"){ location.hash = "#/patients"; } else renderTable(); });
}
function refreshChrome(r){
  $("#nav").innerHTML = navHTML(r);
  $("#themeSlot").innerHTML = themeBtn("themeTop"); wireTheme("themeTop");
  $("#simChip").hidden = live() && !ALL.some(e => e.p.simulated);
  const n = unackedAlerts().length; $("#bell .dot").hidden = !n;
}

/* ---------- gate ---------- */
function gate(){
  const Lv = t.live, focusEmail = document.activeElement && document.activeElement.id === "lgEmail";
  let block;
  if(!LV.ok) block = `<p class="note">${I("info","sm")}${esc(Lv.notReady)}</p>`;
  else if(!LV.authKnown) block = `<p class="note" role="status">${I("clock","sm")}${esc(Lv.connecting)}</p>`;
  else if(LV.user && !LV.user.role) block = `<div class="errsum" role="alert">${esc(Lv.noRole)}</div><div><button class="btn" id="lgOut">${esc(Lv.signOut)}</button></div>`;
  else block = `<form class="loginform" id="login" novalidate>
     <h2 style="margin:0;font-size:17px">${esc(Lv.signinT)} <span class="modechip" style="margin-inline-start:6px"><i></i>${esc(LV.emulator ? Lv.emu : Lv.server)}</span></h2>
     <p class="faint small" style="margin:0">${esc(Lv.signinSub)}</p>
     <div id="lgErr"></div>
     <div class="row"><label for="lgEmail">${esc(Lv.email)}</label><input class="txt" id="lgEmail" type="email" autocomplete="username" required></div>
     <div class="row"><label for="lgPw">${esc(Lv.password)}</label><input class="txt" id="lgPw" type="password" autocomplete="current-password" required></div>
     <div><button class="btn pri" type="submit" id="lgGo">${esc(Lv.signin)}</button></div></form>
    <div class="divider">${esc(Lv.or)}</div>`;
  $("#root").innerHTML = `<div class="gate"><main class="gatecard" id="main" tabindex="-1">
   <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><img src="logo.png" alt="" width="56" height="56">
    <div style="display:flex;gap:8px;align-items:center"><span class="seg" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="${S.lang === "en"}">English</button><button type="button" data-lang="ar" aria-pressed="${S.lang === "ar"}">العربية</button></span>${themeBtn("themeGate")}</div></div>
   <h1>${esc(t.gate.title)}</h1><p class="muted" style="margin:0;font-size:15px">${esc(t.gate.lead)}</p>
   ${LV.ok ? block : ""}
   ${LV.ok ? "" : `<div><span class="sim">${I("info","sm")}${esc(t.sim)}</span></div>
   <ul><li>${I("ccheck")}<span>${esc(t.gate.b1)}</span></li><li>${I("lock")}<span>${esc(t.gate.b2)}</span></li><li>${I("info")}<span>${esc(t.gate.b3)}</span></li></ul>`}
   <div class="gaterow"><button class="btn ${LV.ok ? "" : "pri"}" id="enter">${esc(LV.ok ? Lv.demo : t.gate.enter)}${I("chev","sm chev")}</button><a class="btn ghost" href="../">${esc(t.gate.back)}</a></div>
   ${LV.ok ? "" : block}
   <p class="note">${I("info","sm")}${esc(t.gate.foot)}</p></main></div><div id="overlay"></div>`;
  $("#enter").addEventListener("click", () => {
    if(live()) stopLive();
    S.entered = true; store.set("entered", true); now();
    if(!S.audit || !S.audit.some(a => a.k === "signin" && a.who === "me")) logAudit("signin", "");
    location.hash = "#/patients"; render();
  });
  $$("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
  wireTheme("themeGate");
  const out = $("#lgOut"); if(out) out.addEventListener("click", () => LV.api.signOut());
  const f = $("#login");
  if(f){
    if(focusEmail) $("#lgEmail").focus();
    f.addEventListener("submit", ev => {
      ev.preventDefault();
      const email = $("#lgEmail").value.trim(), pw = $("#lgPw").value, go = $("#lgGo"), err = $("#lgErr");
      if(!email || !pw){ err.innerHTML = `<div class="errsum" role="alert">${esc(Lv.errCred)}</div>`; return; }
      go.disabled = true; go.textContent = Lv.signing; err.innerHTML = "";
      LV.api.signIn(email, pw).catch(e => {
        const code = (e && e.code) || "";
        const msg = /invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(code) ? Lv.errCred : Lv.errNet;
        err.innerHTML = `<div class="errsum" role="alert">${esc(msg)}</div>`;
        go.disabled = false; go.textContent = Lv.signin; $("#lgPw").focus();
      });
    });
  }
}

/* ---------- audit ---------- */
function seedAudit(){
  const a = [];
  D.ALL.forEach(e => { if(e.st.st === "alert") a.push({ at: D.alertRaised(e.p, e.s, e.st).getTime(), who:"sys", k:"alert", pid:e.p.id }); });
  a.push({ at: new Date(2026, 8, 30, 0, 5).getTime(), who:"sys", k:"paused", pid:"P-Z8E5" });
  a.push({ at: new Date(2026, 9, 1, 11, 40).getTime(), who:"rq", k:"view", pid:"P-K4D1" });
  a.push({ at: new Date(2026, 9, 1, 11, 52).getTime(), who:"rq", k:"report", pid:"P-5TQR" });
  return a;
}
if(!S.audit){ S.audit = seedAudit(); save(); }
const SERVER_ACTION = { signin:"sign_in", view:"view_patient", report:"open_report", ident:"show_identity", form:"open_relapse_form", export:"export_list", unack:"undo_acknowledge", reset:"reset_demo" };
function logAudit(k, pid){
  if(live()){
    LV.audit.push({ at: Date.now(), who:"me", k, pid });
    const e = pid ? byId(pid) : null; if(SERVER_ACTION[k]) LV.api.logAudit(SERVER_ACTION[k], e ? e.p.uid : null);
    return;
  }
  S.audit.push({ at: now().getTime(), who:"me", k, pid }); save(); }

/* ---------- routing ---------- */
function route(){ const parts = location.hash.replace(/^#\/?/, "").split("/"); return { r: parts[0] || "patients", a: parts[1] ? decodeURIComponent(parts[1]) : null }; }
let lastRoute = "";
function render(){
  applyPrefs();
  closeOverlay(true);
  const inApp = live() ? !!(LV.user && LV.user.role) : S.entered;
  if(!inApp){ gate(); lastRoute = ""; return; }
  if(!$("#app")) shell();
  const { r, a } = route();
  refreshChrome(r === "p" || r === "report" ? (r === "report" ? "reports" : "patients") : r);
  const main = $("#main");
  if(r === "staff" && !isAdmin()){ location.hash = "#/patients"; return; }
  const views = { staff: viewStaff, patients: viewPatients, p: viewPatient, alerts: viewAlerts, visits: viewVisits, reports: viewReports, report: viewReport, forms: viewForms, audit: viewAudit, settings: viewSettings };
  (views[r] || viewPatients)(main, a);
  const key = location.hash;
  if(key !== lastRoute){ window.scrollTo(0, 0); const h = main.querySelector("h1"); if(h){ h.setAttribute("tabindex", "-1"); if(lastRoute) h.focus({ preventScroll:true }); } lastRoute = key; }
  document.title = `${(main.querySelector("h1") || {}).textContent || "Thabat"} · Thabat Clinic`;
}
function rerender(){ const f = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null; render(); if(f){ const el = document.querySelector(`[data-k="${CSS.escape(f)}"]`); if(el) el.focus({ preventScroll:true }); } }
window.addEventListener("hashchange", render);
document.addEventListener("keydown", ev => {
  if(ev.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && $("#q")){ ev.preventDefault(); $("#q").focus(); }
  if(ev.key === "Escape" && $("#overlay") && $("#overlay").innerHTML) closeOverlay();
});

/* ---------- patients ---------- */
function listData(){
  let rows = ALL.slice();
  if(S.seg === "mine") rows = rows.filter(e => e.p.doc === "NA");
  if(S.seg === "unack") rows = rows.filter(e => e.st.st === "alert" && !ackOf(e.p.id));
  if(S.filter) rows = rows.filter(e => e.st.st === S.filter);
  if(S.q) rows = rows.filter(e => e.p.id.toLowerCase().includes(S.q.toLowerCase().replace(/^p-?/, "p-").replace(/^p-$/, "p-")) || e.p.id.toLowerCase().replace("-", "").includes(S.q.toLowerCase().replace("-", "")));
  const att = e => D.RANK[e.st.st] * 1000 + (isAcked(e) ? 500 : 0) - (e.st.days || 0);
  const sorters = {
    attention: (a, b) => att(a) - att(b) || a.p.id.localeCompare(b.p.id),
    code: (a, b) => a.p.id.localeCompare(b.p.id),
    visit: (a, b) => (a.p.nextVisit || "9999").localeCompare(b.p.nextVisit || "9999"),
    change: (a, b) => (pct(b) == null ? -999 : pct(b)) - (pct(a) == null ? -999 : pct(a))
  };
  return rows.sort(sorters[S.sort]);
}
function viewPatients(main){
  const cnt = s => ALL.filter(e => e.st.st === s).length;
  const soon = ALL.filter(e => e.p.nextVisit && dayDiff(today(), D.parse(e.p.nextVisit)) >= 0 && dayDiff(today(), D.parse(e.p.nextVisit)) <= 7).length;
  const kpi = s => `<button type="button" class="kpi ${s}" data-k="kpi-${s}" data-f="${s}" aria-pressed="${S.filter === s}"><span class="k">${I(STI[s], "sm")}${esc(t.st[s])}</span><span class="v">${cnt(s)}</span><span class="s">${esc(t.stSub[s])}</span></button>`;
  const L = t.list;
  main.innerHTML = `<div class="ph"><div><h1>${esc(L.title)}</h1><p>${esc(live() ? t.live.patientsOnServer(ALL.length) : L.sub)}</p></div><div class="acts"><button class="btn" id="csv" data-k="csv">${I("dl","sm")}${esc(L.export)}</button><button class="btn pri" id="invite" data-k="invite">${I("plus","sm")}${esc(L.invite)}</button></div></div>
   <div class="kpis" role="group" aria-label="${esc(L.title)}">${["alert","watch","none","learn","good"].map(kpi).join("")}<a class="kpi visit" href="#/visits"><span class="k">${I("cal","sm")}${esc(t.visitsWeek)}</span><span class="v">${soon}</span><span class="s">${esc(t.visitsWeekSub)}</span></a></div>
   <section class="card tablecard" aria-label="${esc(L.title)}">
    <div class="tbar"><div class="seg" role="group"><button type="button" data-seg="all" data-k="seg-all" aria-pressed="${S.seg === "all"}">${esc(L.all(ALL.length))}</button><button type="button" data-seg="mine" data-k="seg-mine" aria-pressed="${S.seg === "mine"}">${esc(L.mine)}</button><button type="button" data-seg="unack" data-k="seg-unack" aria-pressed="${S.seg === "unack"}">${esc(L.unack(unackedAlerts().length))}</button></div>
     <span style="flex:1"></span><span class="faint small" style="display:inline-flex;gap:6px;align-items:center">${I("lock","sm")}${esc(L.names)}</span>
     <label class="small" style="display:inline-flex;gap:8px;align-items:center;font-weight:600"><span>${esc(L.sortL)}</span><select class="sel" id="sort" data-k="sort">${Object.entries(L.sort).map(([k, v]) => `<option value="${k}" ${S.sort === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label></div>
    <div id="tablewrap"></div>
   </section>`;
  renderTable();
  $$("[data-f]", main).forEach(b => b.addEventListener("click", () => { S.filter = S.filter === b.dataset.f ? null : b.dataset.f; rerender(); }));
  $$("[data-seg]", main).forEach(b => b.addEventListener("click", () => { S.seg = b.dataset.seg; rerender(); }));
  $("#sort").addEventListener("change", ev => { S.sort = ev.target.value; rerender(); });
  $("#csv").addEventListener("click", exportCSV);
  $("#invite").addEventListener("click", () => toast(t.toast.invite));
}
function renderTable(){
  const wrap = $("#tablewrap"); if(!wrap) return;
  const rows = listData(), L = t.list, th = L.th;
  if(!rows.length){ wrap.innerHTML = `<div class="empty"><span class="ic">${I("search")}</span><p style="margin:0">${esc(L.none)}</p><button class="btn" id="clr">${esc(L.clear)}</button></div><div class="tfoot"><span>${esc(L.showing(0, ALL.length))}</span></div>`;
    $("#clr").addEventListener("click", () => { S.filter = null; S.seg = "all"; S.q = ""; $("#q").value = ""; rerender(); }); return; }
  wrap.innerHTML = `<table class="resp"><thead><tr>${th.map(h => `<th scope="col">${esc(h)}</th>`).join("")}<th scope="col"><span class="vh">${esc(L.open(""))}</span></th></tr></thead><tbody>${rows.map(e => {
    const r = readingShort(e);
    return `<tr class="row ${e.st.st === "alert" && !isAcked(e) ? "alertrow" : ""}" data-href="#/p/${e.p.id}">
     <td class="c-chip">${chip(e)}${e.p.live && e.p.status === "unassigned" ? ` <span class="chip unassigned">${esc(t.live.unassigned)}</span>` : ""}${isAcked(e) ? ` <span class="chip ack">${I("check","sm")}${esc(t.chip.ack)}</span>` : ""}</td>
     <td class="pid"><a href="#/p/${e.p.id}">${e.p.id} ${I("lock","sm")}</a><small>${metaLine(e)}</small></td>
     <td data-l="${esc(th[2])}">${msCell(e)}</td>
     <td class="c-spark">${spark(e)}</td>
     <td data-l="${esc(th[4])}">${doseCell(e)}</td>
     <td class="c-read"><div class="reading">${esc(r.text)}${r.tag ? `<div class="tag">${I(r.ic || "info","sm")}${esc(r.tag)}</div>` : ""}</div></td>
     <td class="when c-when" data-l="${esc(th[6])}">${esc(lastDataTxt(e))}</td>
     <td class="when c-when" data-l="${esc(th[7])}">${esc(visitTxt(e))}</td>
     <td class="c-go faint">${I("chev","chev")}</td></tr>`; }).join("")}</tbody></table>
   <div class="tfoot"><span>${esc(L.showing(rows.length, ALL.length))}</span><span style="display:inline-flex;gap:6px;align-items:center">${I("info","sm")}${esc(L.rule)}</span></div>`;
  $$("tr.row", wrap).forEach(tr => tr.addEventListener("click", ev => { if(!ev.target.closest("a")) location.hash = tr.dataset.href; }));
}
function exportCSV(){
  const rows = listData();
  const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const lines = [t.csv.join(",")].concat(rows.map(e => [e.p.id, e.st.st, e.st.days || "", latest(e) == null ? "" : latest(e), e.p.usual || "", readingShort(e).text, e.p.nextVisit ? e.p.nextVisit.split("T")[0] : ""].map(q).join(",")));
  const blob = new Blob(["﻿" + lines.join("\n")], { type:"text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "thabat-patients-simulated.csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  logAudit("export", ""); toast(t.toast.exported);
}

/* ---------- patient detail ---------- */
function viewPatient(main, id){
  const e = byId(id); if(!e){ if(waitingLive(main)) return; location.hash = "#/patients"; return; }
  const { p, s, st } = e, T = t.det;
  if(!S.viewed[id]){ S.viewed[id] = true; logAudit("view", id); }
  const r = S.range[id] || (s.length > 90 ? "90" : "30");
  const from = rangeFrom(e, r);
  const hasData = s.length > 0;
  const ch = hasData ? chartSVG(e, { from, uid: "d" }) : { svg:"", meta:null };
  const last5 = s.slice(-5).map(x => x.ms == null ? "—" : x.ms);
  const m30 = D.median(s.slice(-30).map(x => x.ms)), d30 = s.slice(-30).filter(x => x.ms != null).length;
  const meds = []; if(p.prev === "hospital") meds.push(`${I("shield","sm")}${esc(T.meds.hospital)}`); if(p.prev === "daily") meds.push(`${I("shield","sm")}${esc(T.meds.daily)}`); if(p.sr) meds.push(`${I("zap","sm")}${esc(T.meds.twice)}`);
  if(p.live){ meds.length = 0; p.kinds.forEach(k => meds.push(`${I(k === "PREVENTIVE" ? "shield" : "zap","sm")}${esc(t.live.meds[k] || k)}`)); }
  const ranges = ["30","90","visit","365"].filter(k => k !== "365" || s.length > 120).filter(k => k !== "visit" || p.lastVisit);
  const ack = ackOf(id);
  main.innerHTML = `<nav class="crumb" aria-label="Breadcrumb"><a href="#/patients">${esc(T.back)}</a>${I("chev","sm")}<span aria-current="page">${p.id}</span></nav>
   <div class="phead"><div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h1 class="idbig" style="margin:0">${p.id}</h1>${chip(e)}${ack ? `<span class="chip ack">${I("check","sm")}${esc(t.chip.ack)}</span>` : ""}</div>
     <div class="meta">${S.revealed[id] ? `<span class="id">${I("unlock","sm")}${esc(identName(e))}</span>` : ""}<span>${metaLine(e)}</span>${meds.map(m => `<span>${m}</span>`).join("")}<span>${I("phoneSm","sm")}${esc(T.androidApp(p.app))}</span></div></div>
     <span style="flex:1"></span><div class="acts">
      ${isAdmin() ? `<button class="btn" id="assignBtn" data-k="assign">${I("staff","sm")}${esc(t.live.assign)}</button>` : ""}
      <button class="btn" id="identBtn" data-k="ident">${I(S.revealed[id] ? "lock" : "unlock","sm")}${esc(S.revealed[id] ? T.hide : T.show)}</button>
      <a class="btn" href="#/report/${p.id}">${I("file","sm")}${esc(T.report)}</a>
      ${st.st === "alert" && !ack ? `<button class="btn alert" data-ack data-k="ackTop">${I("check","sm")}${esc(T.ack)}</button>` : ""}</div></div>
   <div class="dgrid"><div class="dcol">
    ${hasData ? "" : `<section class="card cpad"><div class="empty"><span class="ic">${I("off")}</span><p style="margin:0">${esc(t.live.noDays)}</p></div></section>`}
    <section class="card" aria-labelledby="chT" ${hasData ? "" : "hidden"}>
     <div class="cpad chead"><h2 id="chT">${I("act","sm")}${esc(T.chart)} <span class="faint" style="font-weight:500">· ${esc(T.chartSub)}</span></h2>
      <div class="seg" role="group" aria-label="${esc(T.chart)}">${ranges.map(k => `<button type="button" data-range="${k}" data-k="r-${k}" aria-pressed="${r === k}">${esc(T.ranges[k])}</button>`).join("")}</div></div>
     <div class="chartwrap" id="chartwrap" tabindex="0" aria-describedby="chHelp">${ch.svg}<div class="tip" id="tip" aria-hidden="true"></div></div>
     <p class="vh" id="chHelp">${S.lang === "ar" ? "استخدم الأسهم لاستعراض الأيام." : "Use the arrow keys to step through the days."}</p>
     ${legendHTML(p)}
     <div class="stat4"><div><small>${esc(T.stats.last5)}</small><b>${last5.join(" ")} <em>ms</em></b></div><div><small>${esc(T.stats.usual)}</small><b>${p.usual ? `${p.usual} <em>ms</em>` : `<em>${esc(T.learningL)}</em>`}</b></div><div><small>${esc(T.stats.med30)}</small><b>${m30 == null ? "—" : `${m30} <em>ms</em>`}</b></div><div><small>${esc(T.stats.days30)}</small><b>${d30}<em>/${Math.min(30, s.length)}</em></b></div></div>
     <div style="padding:8px 16px;border-top:1px solid var(--line-2)"><button class="btn ghost" id="tblBtn" data-k="tbl" aria-expanded="${S.table}" aria-controls="dtable">${I("table","sm")}${esc(S.table ? T.hideTable : T.table)}</button></div>
     <div class="dtable" id="dtable" ${S.table ? "" : "hidden"}>${S.table ? dayTable(e, from) : ""}</div>
    </section>
    <div class="row2">${groupsCard(e)}${srCard(e)}</div>
   </div><div class="dcol">${statusCard(e)}
    <section class="card cpad" aria-labelledby="rdT"><h2 id="rdT">${I("file","sm")}${esc(T.reading)}</h2><div class="readbox">${readingItems(e).map(x => `<div class="ri"><span class="b ${x.c}">${I(x.i,"sm")}</span><span>${x.h}</span></div>`).join("")}</div>
     <p class="note" style="margin-top:12px">${I("info","sm")}${esc(T.support)}</p></section>
    <section class="card cpad" aria-labelledby="evT"><h2 id="evT">${I("hist","sm")}${esc(T.events)}</h2><div class="events">${events(e).map(x => `<div class="ev"><i class="${x.c}"></i><span>${esc(x.k)}</span><time datetime="${D.iso(x.d)}">${esc(fd(x.d))}</time></div>`).join("")}</div></section>
   </div></div>`;
  $$("[data-range]", main).forEach(b => b.addEventListener("click", () => { S.range[id] = b.dataset.range; S.cursor = null; rerender(); }));
  $$("[data-ack]", main).forEach(b => b.addEventListener("click", () => openAck(id, b)));
  $("#identBtn").addEventListener("click", ev => { if(S.revealed[id]){ delete S.revealed[id]; rerender(); } else openIdent(id, ev.currentTarget); });
  $("#tblBtn").addEventListener("click", () => { S.table = !S.table; rerender(); });
  const undo = $("#undoAck"); if(undo) undo.addEventListener("click", () => undoAck(id));
  const form = $("#formBtn"); if(form) form.addEventListener("click", () => { openForm(id); });
  if(ch.meta) wireChart(e, ch.meta);
  const asg = $("#assignBtn"); if(asg) asg.addEventListener("click", ev => openAssign(id, ev.currentTarget));
}
function dayTable(e, from){
  const T = t.det, seg = e.s.slice(from).slice().reverse();
  const dz = v => v ? t.dose[v] : "—";
  return `<table><thead><tr>${T.tth.map(h => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${seg.map(x => `<tr><td>${esc(wd(x.d))}</td><td class="num">${x.ms == null ? esc(T.nodataL) : x.ms + " ms"}</td><td>${D.slower(e.p, x) ? esc(T.yes) : ""}</td><td>${e.p.sr ? esc(dz(x.sr)) : "—"}</td><td>${e.p.prev === "daily" ? esc(dz(x.pv)) : "—"}</td><td>${x.heat ? esc(T.yes) : ""}</td></tr>`).join("")}</tbody></table>`;
}
function wireChart(e, meta){
  const wrap = $("#chartwrap"), tip = $("#tip"); if(!wrap) return;
  const svg = wrap.querySelector("svg"), cur = svg.querySelector(".cur");
  const seg = e.s.slice(meta.from); const cw = meta.PW / meta.n;
  function show(i, clientX){
    if(i < 0 || i >= meta.n){ hide(); return; }
    const x = seg[i], cx = meta.padL + (i + .5) * cw;
    cur.setAttribute("x1", cx); cur.setAttribute("x2", cx); cur.setAttribute("opacity", ".35");
    const lines = [`<div style="font-weight:600">${esc(wd(x.d))}</div>`, x.ms == null ? `<div>${esc(t.det.nodataL)}</div>` : `<div><b>${x.ms} ms</b>${D.slower(e.p, x) ? ` · ${esc(t.det.lg.slow)}` : ""}</div>`];
    if(e.p.sr && x.sr) lines.push(`<div>${esc(t.det.rows.sr)}: ${esc(t.dose[x.sr])}</div>`);
    if(e.p.prev === "daily" && x.pv) lines.push(`<div>${esc(t.det.rows.pv)}: ${esc(t.dose[x.pv])}</div>`);
    if(x.heat) lines.push(`<div>${esc(t.det.lg.heat)}</div>`);
    tip.innerHTML = lines.join("");
    const r = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), scale = r.width / meta.W;
    let left = (r.left - wr.left) + cx * scale + 14; if(left + 180 > wr.width) left = (r.left - wr.left) + cx * scale - 180 - 14;
    tip.style.left = Math.max(4, left) + "px"; tip.style.top = "24px"; tip.classList.add("on");
  }
  function hide(){ tip.classList.remove("on"); cur.setAttribute("opacity", "0"); }
  svg.addEventListener("pointermove", ev => { const r = svg.getBoundingClientRect(); const vx = (ev.clientX - r.left) / (r.width / meta.W); show(Math.floor((vx - meta.padL) / cw), ev.clientX); });
  svg.addEventListener("pointerleave", hide);
  wrap.addEventListener("keydown", ev => {
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(ev.key)) return; ev.preventDefault();
    let i = S.cursor == null ? meta.n - 1 : S.cursor;
    if(ev.key === "ArrowLeft") i--; if(ev.key === "ArrowRight") i++; if(ev.key === "Home") i = 0; if(ev.key === "End") i = meta.n - 1;
    S.cursor = Math.max(0, Math.min(meta.n - 1, i)); show(S.cursor);
  });
  wrap.addEventListener("blur", hide);
}
function groupsCard(e){
  const T = t.det;
  if(!e.p.usual || e.st.st === "none") return `<section class="card cpad"><h2>${I("grid","sm")}${esc(T.groups)}</h2><p class="note" style="margin-top:10px">${I("info","sm")}${esc(e.st.st === "none" ? T.ndText : T.learnText)}</p></section>`;
  const g = e.p.live ? groupsLive(e) : D.groups(e.p, e.s);
  if(!g) return `<section class="card cpad"><h2>${I("grid","sm")}${esc(T.groups)}</h2><p class="note" style="margin-top:10px">${I("info","sm")}${esc(t.live.noDays)}</p></section>`;
  const row = (k, ic) => { const x = g[k]; if(x.ms == null) return `<span class="ic">${I(ic,"sm")}</span><span>${esc(T[k])}</span><b>—</b><span></span>`; const pc = Math.round((x.ms / x.usual - 1) * 100); const cls = pc >= 9 ? "up" : pc >= 5 ? "wup" : "flat";
    return `<span class="ic">${I(ic,"sm")}</span><span>${esc(T[k])} <span class="faint small">· ${esc(T.taps(x.taps.toLocaleString("en")))}</span></span><b>${x.ms} ms</b><span class="delta ${cls}">${pctTxt(pc)}</span>`; };
  return `<section class="card cpad" aria-labelledby="grT"><h2 id="grT">${I("grid","sm")}${esc(T.groups)} <span class="faint" style="font-weight:500">· ${esc(T.groupsSub)}</span></h2>
   <div class="grp">${row("social","users")}${row("messaging","msg")}${row("other","grid")}</div><p class="note" style="margin-top:10px">${I("lock","sm")}${esc(T.groupsNote)}</p></section>`;
}
function srCard(e){
  const T = t.det, c = D.srCheck(e.p, e.s);
  if(!c) return `<section class="card cpad"><h2>${I("zap","sm")}${esc(T.sr)}</h2><p class="note" style="margin-top:10px">${I("info","sm")}${esc(T.srNone)}</p></section>`;
  const cls = c.res === "yes" ? "good" : c.res === "no" ? "watch" : "plain";
  return `<section class="card cpad" aria-labelledby="srT"><h2 id="srT">${I("zap","sm")}${esc(T.sr)} <span class="faint" style="font-weight:500">· ${esc(T.srSub)}</span></h2>
   <div style="margin-top:10px"><span class="chip ${cls}">${I(c.res === "yes" ? "ccheck" : "info","sm")}${esc(T.srRes[c.res])}${c.res !== "unknown" ? ` · ${c.pct}%` : ""}</span></div>
   <dl class="kv"><dt>${esc(T.srDose)}</dt><dd class="num">${c.doseDays}</dd><dt>${esc(T.srMiss)}</dt><dd class="num">${c.missDays}${c.missDays < 3 ? ` <span class="faint">${esc(T.srNeeds)}</span>` : ""}</dd><dt>${esc(T.srLate)}</dt><dd class="num">${c.late}</dd></dl>
   <p class="note" style="margin-top:10px">${I("info","sm")}${esc(T.srNote)}</p></section>`;
}
function statusCard(e){
  const { p, s, st } = e, T = t.det, K = T.kv;
  if(st.st === "alert"){
    const a = ackOf(p.id), raised = raisedAt(p, s, st), start = runAt(p, s, st);
    const kv = `<dl class="kv"><dt>${esc(K.raised)}</dt><dd>${esc(fdt(raised))}</dd><dt>${esc(K.run)}</dt><dd>${esc(fd(start))} – ${esc(fd(s[s.length-1].d))}</dd><dt>${esc(K.latest)}</dt><dd>${esc(T.vs(latest(e), p.usual, pctTxt(pct(e))))}</dd><dt>${esc(K.saw)}</dt><dd>${esc(T.sawAlert)}</dd>
      <dt>${esc(K.acked)}</dt><dd ${a ? "" : 'style="color:var(--alert)"'}>${a ? esc(`${ackBy(a)} · ${fdt(new Date(a.at))}`) : esc(K.notYet)}</dd>${a ? `<dt>${esc(K.found)}</dt><dd>${esc(a.found && a.found.length ? a.found.map(f => t.drawer.foundO[f]).join(", ") : (a.note || "—"))}</dd>` : ""}</dl>`;
    const acts = a ? `<div class="cardacts"><a class="btn" href="#/forms">${I("clip","sm")}${esc(t.nav.forms)}</a>${live() ? "" : `<button class="btn" id="undoAck" data-k="undoAck">${I("undo","sm")}${esc(T.undoAck)}</button>`}</div>`
      : `<div class="cardacts"><button class="btn alert" data-ack data-k="ackCard">${I("phone","sm")}${esc(T.logCall)}</button><button class="btn" id="formBtn" data-k="formBtn" style="background:var(--surface)">${I("clip","sm")}${esc(T.openForm)}</button></div>`;
    return `<section class="card cpad statuscard alert ${a ? "acked" : ""}" aria-labelledby="scT"><h2 id="scT">${I(a ? "ccheck" : "tri","sm")}${esc(a ? T.sc.acked : T.sc.alert(st.days))}</h2>${kv}${acts}</section>`;
  }
  if(st.st === "watch") return `<section class="card cpad statuscard watch" aria-labelledby="scT"><h2 id="scT">${I("eye","sm")}${esc(T.sc.watch(st.days))}</h2><dl class="kv"><dt>${esc(K.run)}</dt><dd>${esc(fd(runAt(p, s, st)))} – ${esc(fd(s[s.length-1].d))}</dd><dt>${esc(K.latest)}</dt><dd>${esc(T.vs(latest(e), p.usual, pctTxt(pct(e))))}</dd><dt>${esc(K.saw)}</dt><dd>${esc(T.sawWatch)}</dd></dl><p class="note" style="margin-top:10px">${I("info","sm")}${esc(T.watchText)}</p></section>`;
  if(st.st === "none") return `<section class="card cpad statuscard none" aria-labelledby="scT"><h2 id="scT">${I(p.paused ? "pause" : "off","sm")}${esc(p.paused ? T.sc.paused : T.sc.none)}</h2><dl class="kv"><dt>${esc(K.lastData)}</dt><dd>${esc(lastDataTxt(e))}</dd>${p.paused ? `<dt>${esc(K.since)}</dt><dd>${esc(fd(D.parse(p.paused)))}</dd>` : ""}</dl><p class="note" style="margin-top:10px">${I("info","sm")}${esc(p.paused ? T.pausedText : T.ndText)}</p></section>`;
  if(st.st === "learn") return `<section class="card cpad statuscard learn" aria-labelledby="scT"><h2 id="scT">${I("sprout","sm")}${esc(T.sc.learn)}</h2><dl class="kv"><dt>${esc(K.day)}</dt><dd class="num">${st.days} / 14</dd><dt>${esc(K.next)}</dt><dd>${esc(fd(new Date(D.END.getFullYear(), D.END.getMonth(), D.END.getDate() + (14 - st.days) + 1)))}</dd></dl><p class="note" style="margin-top:10px">${I("info","sm")}${esc(T.learnText)}</p></section>`;
  return `<section class="card cpad statuscard good" aria-labelledby="scT"><h2 id="scT">${I("ccheck","sm")}${esc(T.sc.good)}</h2><dl class="kv"><dt>${esc(K.latest)}</dt><dd>${esc(T.vs(latest(e), p.usual, pctTxt(pct(e))))}</dd><dt>${esc(K.lastData)}</dt><dd>${esc(lastDataTxt(e))}</dd></dl><p class="note" style="margin-top:10px">${I("info","sm")}${esc(T.goodText)}</p></section>`;
}

/* ---------- overlays ---------- */
let returnFocus = null;
function openOverlay(html, trigger){
  returnFocus = trigger || document.activeElement;
  const o = $("#overlay"); o.innerHTML = `<div class="scrim" data-close></div>${html}`;
  $$("[data-close]", o).forEach(b => b.addEventListener("click", () => closeOverlay()));
  const dlg = o.querySelector("[role=dialog]");
  const first = dlg.querySelector("input,button:not([data-close]),textarea,select"); if(first) first.focus(); else dlg.focus();
  dlg.addEventListener("keydown", ev => {
    if(ev.key !== "Tab") return;
    const f = $$("a[href],button:not([disabled]),input,textarea,select", dlg).filter(x => x.offsetParent !== null);
    if(!f.length) return; const a = f[0], b = f[f.length-1];
    if(ev.shiftKey && document.activeElement === a){ ev.preventDefault(); b.focus(); } else if(!ev.shiftKey && document.activeElement === b){ ev.preventDefault(); a.focus(); }
  });
}
function closeOverlay(silent){ const o = $("#overlay"); if(!o || !o.innerHTML) return; o.innerHTML = ""; if(pendingRender){ pendingRender = false; setTimeout(rerender, 0); } if(!silent && returnFocus && document.contains(returnFocus)) returnFocus.focus(); }

function openAck(id, trigger){
  const e = byId(id), { p, s, st } = e, Dr = t.drawer;
  const sum = Dr.summary(st.days, latest(e), p.usual, pctTxt(pct(e)), fdt(raisedAt(p, s, st)));
  openOverlay(`<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dwT" tabindex="-1">
   <div class="dh"><div style="flex:1"><div class="faint small" style="font-weight:600">${p.id} · ${metaLine(e)}</div><h2 id="dwT">${esc(Dr.title)}</h2></div><button class="iconbtn" data-close aria-label="${esc(Dr.close)}">${I("x")}</button></div>
   <form class="db" id="ackForm" novalidate>
    <div id="errsum" tabindex="-1"></div>
    <div class="card cpad statuscard alert" style="padding:12px 14px"><div style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--alert)">${I("tri")}</span><div><b>${esc(Dr.sumT(st.days))}</b><div class="small muted">${esc(sum)}</div></div></div></div>
    <fieldset id="f-did" aria-describedby="e-did"><legend>${esc(Dr.did)} <span class="req" aria-hidden="true">*</span></legend>
     <div class="opts">${[["call","phone"],["msg","msg"],["noreach","clock"]].map(([k, ic]) => `<label class="opt"><input type="radio" name="did" value="${k}"><span class="radio" aria-hidden="true"></span>${I(ic,"sm")}${esc(Dr.didO[k])}</label>`).join("")}</div><div class="err" id="e-did" hidden></div></fieldset>
    <fieldset id="f-found" aria-describedby="e-found"><legend>${esc(Dr.found)} <span class="req" aria-hidden="true">*</span></legend>
     <div class="chips">${["worse","nonew","other","phone","ed"].map(k => `<label class="pill ${k === "ed" ? "danger" : ""}"><input type="checkbox" name="found" value="${k}"><span class="tick">${I("check","sm")}</span>${k === "ed" ? I("tri","sm") : ""}${esc(Dr.foundO[k])}</label>`).join("")}</div><div class="err" id="e-found" hidden></div></fieldset>
    <div><label class="fl" for="note">${esc(Dr.note)} <span class="req" aria-hidden="true">*</span></label><textarea id="note" name="note" maxlength="1000" placeholder="${esc(Dr.ph)}" aria-describedby="noteHelp e-note"></textarea>
     <div class="helper"><span id="noteHelp">${esc(Dr.noteHelp)}</span><span class="num" id="noteCt">0/1000</span></div><div class="err" id="e-note" hidden></div></div>
    <fieldset><legend>${esc(Dr.steps)}</legend><div class="checks">
     <label class="ck"><input type="checkbox" name="form" checked>${esc(Dr.stepForm)}<span class="sub">${esc(Dr.stepFormSub)}</span></label>
     <label class="ck"><input type="checkbox" name="visit">${esc(Dr.stepVisit)}<span class="sub">${p.nextVisit ? esc(wd(D.parse(p.nextVisit))) : ""}</span></label>
     <label class="ck"><input type="checkbox" name="remind">${esc(Dr.stepRemind)}<span class="sub">${esc(Dr.stepRemindSub)}</span></label></div></fieldset>
   </form>
   <div class="df"><span class="note">${I("hist","sm")}${esc(Dr.audit)}</span><button class="btn" type="button" data-close>${esc(Dr.cancel)}</button><button class="btn pri" type="submit" form="ackForm" id="ackSave">${I("check","sm")}${esc(Dr.save)}</button></div>
  </aside>`, trigger);
  const f = $("#ackForm");
  $("#note").addEventListener("input", ev => { $("#noteCt").textContent = `${ev.target.value.length}/1000`; });
  f.addEventListener("submit", ev => {
    ev.preventDefault();
    const did = (f.querySelector("input[name=did]:checked") || {}).value, found = $$("input[name=found]:checked", f).map(x => x.value), note = $("#note").value.trim();
    const errs = [];
    const setErr = (k, msg, target) => { const el = $("#e-" + k); el.hidden = !msg; el.innerHTML = msg ? `${I("info","sm")}${esc(msg)}` : ""; if(msg) errs.push({ msg, target }); };
    setErr("did", did ? "" : Dr.errDid, "f-did"); setErr("found", found.length ? "" : Dr.errFound, "f-found"); setErr("note", note.length >= 10 ? "" : Dr.errNote, "note");
    if(errs.length){
      const box = $("#errsum"); box.className = "errsum"; box.setAttribute("role", "alert");
      box.innerHTML = `<b>${esc(Dr.errTitle)}</b><ul style="margin:6px 0 0;padding-inline-start:18px">${errs.map(x => `<li><a href="#${x.target}" data-go="${x.target}">${esc(x.msg)}</a></li>`).join("")}</ul>`;
      $$("[data-go]", box).forEach(a => a.addEventListener("click", ev2 => { ev2.preventDefault(); const t2 = document.getElementById(a.dataset.go); const inp = t2.matches("textarea") ? t2 : t2.querySelector("input"); inp.focus(); }));
      box.focus(); return;
    }
    const steps = { form: f.form.checked, visit: f.visit.checked, remind: f.remind.checked };
    if(live()){
      const box = $("#errsum"), go = $("#ackSave");
      const fail = msg => { box.className = "errsum"; box.setAttribute("role", "alert"); box.innerHTML = esc(msg); box.focus(); go.disabled = false; };
      if(!e.alert || e.alert.state !== "open"){ fail(t.live.noAlertDoc); return; }
      const parts = [Dr.didO[did], `${t.live.noteFound}: ${found.map(k => Dr.foundO[k]).join(", ")}`];
      const nx = [steps.form && Dr.stepForm, steps.visit && Dr.stepVisit, steps.remind && Dr.stepRemind].filter(Boolean);
      if(nx.length) parts.push(`${t.live.noteSteps}: ${nx.join(", ")}`);
      parts.push(note);
      go.disabled = true;
      LV.api.acknowledgeAlert(e.p.uid, e.alert.id, parts.join(" · ")).then(() => {
        LV.audit.push({ at: Date.now(), who:"me", k:"ack", pid:id });
        if(steps.form) addForm(id, true);
        closeOverlay(true); toast(t.toast.acked(id)); rerender();
      }).catch(() => fail(t.live.saveErr));
      return;
    }
    S.acks[id] = { at: now().getTime(), did, found, note, steps };
    logAudit("ack", id);
    if(steps.form) addForm(id, true);
    save(); closeOverlay(true); rerender();
    toast(t.toast.acked(id), { label: t.det.undoAck, fn: () => undoAck(id) });
    const h = $("#scT"); if(h){ h.setAttribute("tabindex", "-1"); h.focus(); }
  });
}
function addForm(id, quiet){
  const e = byId(id); if(S.forms.some(x => x.pid === id && x.open)) return;
  S.forms.push({ pid:id, at: now().getTime(), from: D.iso(runAt(e.p, e.s, e.st) || D.END), open:true, by: me().name });
  logAudit("form", id); save(); if(!quiet) toast(t.nav.forms + " · " + id);
}
function openForm(id){ addForm(id); location.hash = "#/forms"; }
function undoAck(id){
  if(!S.acks[id]) return;
  const at = S.acks[id].at; delete S.acks[id];
  S.forms = S.forms.filter(x => !(x.pid === id && Math.abs(x.at - at) < 2000));
  logAudit("unack", id); save(); rerender(); toast(t.toast.undone);
}
function openIdent(id, trigger){
  const I2 = t.ident;
  openOverlay(`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="idT" tabindex="-1"><div class="dh"><div style="flex:1"><div class="faint small" style="font-weight:600">${id}</div><h2 id="idT">${esc(I2.title)}</h2></div><button class="iconbtn" data-close aria-label="${esc(t.drawer.close)}">${I("x")}</button></div>
   <div class="db"><p class="muted" style="margin:0">${esc(I2.body)}</p><div><label class="fl" for="reason">${esc(I2.reason)}</label><select class="txt" id="reason">${Object.entries(I2.reasons).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div></div>
   <div class="df"><span style="flex:1"></span><button class="btn" data-close>${esc(t.drawer.cancel)}</button><button class="btn pri" id="identGo">${I("unlock","sm")}${esc(I2.show)}</button></div></div>`, trigger);
  $("#identGo").addEventListener("click", () => { S.revealed[id] = true; logAudit("ident", id); closeOverlay(true); rerender(); toast(t.toast.shown(id)); const b = $("#identBtn"); if(b) b.focus(); });
}
function toast(msg, action){
  const box = $("#toasts"); const el = document.createElement("div"); el.className = "toast";
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
  if(action) el.querySelector("button").addEventListener("click", () => { el.remove(); action.fn(); });
  box.appendChild(el); setTimeout(() => el.remove(), action ? 6000 : 3500);
}

/* ---------- other pages ---------- */
function pageHead(title, sub, acts = ""){ return `<div class="ph"><div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>${acts}</div>`; }
function linkId(id){ return `<a href="#/p/${id}" class="mono" style="font-weight:600;color:var(--ink)">${id}</a>`; }
function viewAlerts(main){
  const A = t.alerts;
  const all = ALL.filter(e => e.st.st === "alert").sort((a, b) => raisedAt(b.p, b.s, b.st) - raisedAt(a.p, a.s, a.st));
  const rows = all.filter(e => S.alertTab === "all" || (S.alertTab === "open" ? !ackOf(e.p.id) : !!ackOf(e.p.id)));
  main.innerHTML = pageHead(A.title, A.sub) + `<section class="card tablecard"><div class="tbar"><div class="seg" role="group">${["open","acked","all"].map(k => `<button type="button" data-tab="${k}" data-k="tab-${k}" aria-pressed="${S.alertTab === k}">${esc(A[k])} · ${k === "all" ? all.length : all.filter(e => (k === "open") !== !!ackOf(e.p.id)).length}</button>`).join("")}</div></div>
   ${rows.length ? `<table class="resp"><thead><tr>${A.th.map(h => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(e => { const a = ackOf(e.p.id);
     return `<tr class="${a ? "" : "alertrow"}"><td class="c-chip">${chip(e)}</td><td class="pid">${linkId(e.p.id)}<small>${metaLine(e)}</small></td><td data-l="${esc(A.th[2])}" class="when">${esc(fdt(raisedAt(e.p, e.s, e.st)))}</td><td data-l="${esc(A.th[3])}" class="when">${esc(fd(runAt(e.p, e.s, e.st)))} – ${esc(fd(D.END))}</td><td data-l="${esc(A.th[4])}">${msCell(e)}</td>
      <td data-l="${esc(A.th[5])}">${a ? `<span class="chip ack">${I("check","sm")}${esc(ackBy(a))}</span><div class="tiny faint">${esc(fdt(new Date(a.at)))}</div>` : `<span style="color:var(--alert);font-weight:600">${esc(A.notYet)}</span>`}</td>
      <td><a class="btn ${a ? "" : "alert"}" href="#/p/${e.p.id}">${esc(A.review)}</a></td></tr>`; }).join("")}</tbody></table>` : `<div class="empty"><span class="ic">${I("bell")}</span><p style="margin:0">${esc(A.none)}</p></div>`}</section>`;
  $$("[data-tab]", main).forEach(b => b.addEventListener("click", () => { S.alertTab = b.dataset.tab; rerender(); }));
}
function viewVisits(main){
  const V = t.visits;
  const list = ALL.filter(e => e.p.nextVisit && dayDiff(today(), D.parse(e.p.nextVisit)) >= 0 && dayDiff(today(), D.parse(e.p.nextVisit)) <= 14).sort((a, b) => a.p.nextVisit.localeCompare(b.p.nextVisit));
  main.innerHTML = pageHead(V.title, V.sub) + `<section class="card tablecard">${list.length ? `<table class="resp"><thead><tr>${V.th.map(h => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${list.map(e => { const d = D.parse(e.p.nextVisit);
    return `<tr><td class="c-chip" style="font-weight:600">${esc(wd(d))}</td><td data-l="${esc(V.th[1])}" class="num">${hm(d)}</td><td class="pid">${linkId(e.p.id)}<small>${metaLine(e)}</small></td><td data-l="${esc(V.th[3])}">${chip(e)}</td><td data-l="${esc(V.th[4])}" class="when">${e.p.lastVisit ? esc(V.days(dayDiff(D.parse(e.p.lastVisit), D.END) + 1)) : "—"}</td><td><a class="btn" href="#/report/${e.p.id}">${I("file","sm")}${esc(V.report)}</a></td></tr>`; }).join("")}</tbody></table>`
    : `<div class="empty"><span class="ic">${I("cal")}</span><p style="margin:0">${esc(V.none)}</p></div>`}</section>`;
}
function viewReports(main){
  const R = t.reports;
  const list = ALL.slice().sort((a, b) => (a.p.nextVisit || "9999").localeCompare(b.p.nextVisit || "9999"));
  main.innerHTML = pageHead(R.title, R.sub) + `<section class="card tablecard"><table class="resp"><thead><tr>${R.th.map(h => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${list.map(e =>
    `<tr><td class="pid">${linkId(e.p.id)}<small>${metaLine(e)}</small></td><td data-l="${esc(R.th[1])}">${chip(e)}</td><td data-l="${esc(R.th[2])}" class="when">${e.p.lastVisit ? esc(fd(D.parse(e.p.lastVisit))) : "—"}</td><td data-l="${esc(R.th[3])}" class="when">${esc(visitTxt(e))}</td><td><a class="btn" href="#/report/${e.p.id}">${I("file","sm")}${esc(R.open)}</a></td></tr>`).join("")}</tbody></table></section>`;
}
function viewForms(main){
  const F = t.forms;
  const rows = S.forms.slice().sort((a, b) => b.at - a.at);
  main.innerHTML = pageHead(F.title, F.sub) + `<p class="note card cpad" style="font-size:13px">${I("info","sm")}${esc(F.pending)}${live() ? " " + esc(t.live.formsNote) : ""}</p><section class="card tablecard">${rows.length ? `<table class="resp"><thead><tr>${F.th.map(h => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(x =>
    `<tr><td class="when c-chip">${esc(fdt(new Date(x.at)))}</td><td class="pid">${linkId(x.pid)}</td><td data-l="${esc(F.th[2])}" class="when">${esc(fd(D.parse(x.from)))}</td><td data-l="${esc(F.th[3])}"><span class="chip plain">${I("clip","sm")}${esc(F.draft)}</span></td><td data-l="${esc(F.th[4])}">${esc(x.by || t.doctor)}</td></tr>`).join("")}</tbody></table>`
    : `<div class="empty"><span class="ic">${I("clip")}</span><p style="margin:0">${esc(F.none)}</p><a class="btn" href="#/alerts">${esc(t.nav.alerts)}</a></div>`}</section>`;
}
function viewAudit(main){
  const A = t.audit; const who = w => w === "sys" ? A.system : w === "rq" ? t.otherDoc : me().name;
  const rows = (live() ? LV.audit : S.audit).slice().sort((a, b) => b.at - a.at);
  main.innerHTML = pageHead(A.title, A.sub) + (live() ? `<p class="note card cpad" style="font-size:13px">${I("info","sm")}${esc(t.live.auditNote)}</p>` : "") + `<section class="card tablecard"><table class="resp"><thead><tr>${A.th.map(h => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(x =>
    `<tr><td class="when num c-chip">${esc(fdt(new Date(x.at)))}</td><td data-l="${esc(A.th[1])}">${esc(who(x.who))}</td><td data-l="${esc(A.th[2])}">${esc(A.k[x.k] || x.k)}</td><td data-l="${esc(A.th[3])}">${x.pid ? linkId(x.pid) : "—"}</td></tr>`).join("")}</tbody></table></section>`;
}
function viewSettings(main){
  const St = t.settings;
  const seg = (name, opts, cur) => `<div class="seg" role="group" aria-label="${esc(name)}">${opts.map(([v, l]) => `<button type="button" data-set="${name}" data-v="${v}" data-k="set-${name}-${v}" aria-pressed="${cur === v}">${esc(l)}</button>`).join("")}</div>`;
  main.innerHTML = pageHead(St.title, St.sub) + `<div class="setgrid">
   <section class="card cpad"><h2>${I("eye","sm")}${esc(St.display)}</h2>
    <div class="setrow"><span>${esc(St.lang)}</span>${seg("lang", [["en","English"],["ar","العربية"]], S.lang)}</div>
    <div class="setrow"><span>${esc(St.theme)}</span>${seg("theme", [["auto",St.themes.auto],["light",St.themes.light],["dark",St.themes.dark]], S.theme)}</div>
    <div class="setrow"><span>${esc(St.big)}<small>${esc(St.bigSub)}</small></span><button type="button" class="switch" role="switch" id="bigSw" data-k="bigSw" aria-checked="${!!S.big}" aria-label="${esc(St.big)}"></button></div></section>
   <section class="card cpad"><h2>${I("info","sm")}${esc(St.rules)}</h2><dl class="kv" style="grid-template-columns:auto 1fr;gap:8px 16px;font-size:13px">${St.rulesL.map((l, i) => `<dt>${esc(l)}</dt><dd>${esc(St.rulesV[i])}</dd>`).join("")}</dl><p class="note" style="margin-top:12px">${I("info","sm")}${esc(St.rulesNote)}</p></section>
   <section class="card cpad"><h2>${I("undo","sm")}${esc(St.demo)}</h2><div class="setrow"><span>${esc(St.reset)}<small>${esc(St.resetSub)}</small></span><button class="btn danger" id="reset" data-k="reset">${esc(St.reset)}</button></div>
    <p class="note">${I("clock","sm")}${esc(t.demoClock)}</p></section></div>`;
  $$("[data-set]", main).forEach(b => b.addEventListener("click", () => { if(b.dataset.set === "lang") setLang(b.dataset.v); else { setTheme(b.dataset.v); rerender(); } }));
  $("#bigSw").addEventListener("click", () => { S.big = !S.big; store.set("big", S.big); rerender(); });
  $("#reset").addEventListener("click", () => { S.acks = {}; S.forms = []; S.audit = seedAudit(); S.revealed = {}; S.viewed = {}; logAudit("reset", ""); save(); rerender(); toast(t.toast.reset); });
}
function setLang(l){ S.lang = l; t = L10[l]; store.set("lang", l); const app = $("#app"); if(app) app.remove(); const o = $("#overlay"); if(o) o.remove(); lastRoute = location.hash; render(); }

/* ---------- pre-visit report ---------- */
function viewReport(main, id){
  const e = byId(id); if(!e){ if(waitingLive(main)) return; location.hash = "#/reports"; return; }
  const { p, s, st } = e, R = t.rep;
  if(!S.viewed["r" + id]){ S.viewed["r" + id] = true; logAudit("report", id); }
  let from = rangeFrom(e, "visit"); if(!p.lastVisit) from = Math.max(0, s.length - 90);
  const per = s.slice(from), n = per.length;
  const withD = per.filter(x => x.ms != null).length, med = D.median(per.map(x => x.ms)), slow = per.filter(x => D.slower(p, x)).length;
  const sr = D.doseCounts(p, per, "sr"), pv = D.doseCounts(p, per, "pv"), chk = D.srCheck(p, s);
  const ch = chartSVG(e, { from, compact:true, uid:"r" });
  const kinds = p.live ? (p.kinds.map(k => t.live.meds[k] || k).join(" · ") || t.live.noKinds) : [p.prev === "hospital" ? t.det.meds.hospital : p.prev === "daily" ? t.det.meds.daily : null, p.sr ? t.det.meds.twice : null].filter(Boolean).join(" · ");
  const doseRows = [];
  if(!per.length){ main.innerHTML = `<div class="empty card">${esc(t.live.noDays)}</div>`; return; }
  if(p.sr) doseRows.push(`<tr><td>${esc(t.dose.sr)}</td><td class="n">${sr.asked}</td><td class="n">${sr.taken}</td><td class="n">${sr.late}</td><td class="n">${sr.not}</td><td>${esc(chk ? (chk.res === "yes" ? R.notesSr.yes(chk.pct) : R.notesSr[chk.res]) : "")}</td></tr>`);
  if(p.prev === "daily") doseRows.push(`<tr><td>${esc(t.dose.prev)}</td><td class="n">${pv.asked}</td><td class="n">${pv.taken}</td><td class="n">${pv.late}</td><td class="n">${pv.not}</td><td>${pv.unanswered ? esc(t.dose.unans(pv.unanswered)) : ""}</td></tr>`);
  if(p.prev === "hospital"){ const g = (p.prevGiven || []).map(D.parse).filter(d => d >= per[0].d); doseRows.push(`<tr><td>${esc(t.dose.prev)}</td><td class="n">${g.length}</td><td class="n">${g.length}</td><td class="n">0</td><td class="n">0</td><td>${esc(R.notesHosp(g.length ? fd(g[g.length-1]) : "—", ym(p.prevNext)))}</td></tr>`); }
  const acts = [];
  if(st.st === "alert"){ acts.push([fdt(raisedAt(p, s, st)), t.ev.alert, t.audit.system]); const a = ackOf(id); if(a) acts.push([fdt(new Date(a.at)), (a.did ? `${t.drawer.didO[a.did]} · ${a.found.map(f => t.drawer.foundO[f]).join(", ")}${a.steps && a.steps.form ? " · " + t.audit.k.form : ""}` : (a.note || t.audit.k.ack)), t.doctor]); }
  if(p.paused) acts.push([fd(D.parse(p.paused)), t.ev.paused, t.audit.system]);
  const visitD = p.nextVisit ? R.visit(wd(D.parse(p.nextVisit)) + " " + D.parse(p.nextVisit).getFullYear()) : R.noVisit;
  main.innerHTML = `<div class="ph noprint"><div><nav class="crumb"><a href="#/p/${id}">${esc(R.back)}</a></nav></div><div class="acts"><button class="btn pri" id="print">${I("print","sm")}${esc(R.print)}</button></div></div>
  <article class="sheet" aria-labelledby="rpT">
   <div class="rh"><div class="l"><img src="logo.png" alt="" width="44" height="44"><div><h1 id="rpT">${esc(R.title)}</h1><p>${esc(t.clinic)} · ${esc(visitD)}</p></div></div>
    <div class="rid"><b>${p.id}</b><span style="color:#465873">${metaLine(e)}</span>${S.revealed[id] ? `<div class="small">${esc(identName(e))}</div>` : ""}<div style="margin-top:6px"><span class="sim">${esc(t.sim)}</span></div></div></div>
   <div class="rmeta"><span><b>${esc(R.period)}:</b> ${esc(R.since(fd(per[0].d), fdy(per[n-1].d), n))}</span><span><b>${esc(R.kinds)}:</b> ${esc(kinds)}</span></div>
   <section class="rsec"><h2>${I("act","sm")}${esc(R.summary)}</h2><div class="rtiles">
    <div class="rtile"><small>${esc(R.daysData)}</small><b>${withD}<em>/${n}</em></b></div>
    <div class="rtile"><small>${esc(R.median)}</small><b>${med == null ? "—" : med} <em>ms${p.usual ? ` · ${esc(t.ms.usual)} ${p.usual}` : ""}</em></b></div>
    <div class="rtile"><small>${esc(R.slowDays)}</small><b>${p.usual ? slow : "—"}</b></div>
    <div class="rtile ${st.st === "alert" ? "o" : ""}"><small>${esc(R.alerts)}</small><b>${st.st === "alert" ? 1 : 0} <em>${esc(st.st === "alert" ? R.open(fd(raisedAt(p, s, st))) : R.noneOpen)}</em></b></div></div></section>
   <section class="rsec"><h2>${I("up","sm")}${esc(R.trend)}</h2><div style="border:1px solid #D5DEEC;border-radius:10px;padding:8px 6px 2px;direction:ltr">${ch.svg}</div>${legendHTML(p).replace('class="legend"', 'class="legend" style="padding:6px 0 0"')}</section>
   <section class="rsec"><h2>${I("pill","sm")}${esc(R.doses)}</h2><table class="rtable"><thead><tr>${R.th.map((h, i) => `<th scope="col" class="${i && i < 5 ? "n" : ""}">${esc(h)}</th>`).join("")}</tr></thead><tbody>${doseRows.join("")}</tbody></table>
    <p class="note" style="margin-top:6px">${esc(R.names)}</p></section>
   <section class="rsec"><h2>${I("file","sm")}${esc(R.reading)}</h2><div class="rread">${readingItems(e).map(x => `<span>${x.h}</span>`).join("")}</div></section>
   <section class="rsec"><h2>${I("hist","sm")}${esc(R.actions)}</h2>${acts.length ? `<table class="rtable"><thead><tr>${R.ath.map(h => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${acts.map(a => `<tr><td class="mono">${esc(a[0])}</td><td>${esc(a[1])}</td><td>${esc(a[2])}</td></tr>`).join("")}</tbody></table>` : `<p class="note">${esc(R.noActions)}</p>`}</section>
   <div class="rlim"><b>${esc(R.limits)}.</b><ul>${R.lim.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>
   <div class="sign"><div>${esc(R.reviewed)}</div><div>${esc(R.date)}</div></div>
   <div class="rfoot"><span>${esc(R.gen(fdt(now())))}</span><span>${esc(R.page)}</span></div>
  </article>`;
  $("#print").addEventListener("click", () => window.print());
}

/* ---------- admin: staff and assignment (test server only) ---------- */
function viewStaff(main){
  const Lv = t.live;
  const docs = LV.doctors.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const count = uid => ALL.filter(e => e.p.doc === uid).length;
  main.innerHTML = pageHead(Lv.staff, Lv.staffSub) + `<div class="dgrid"><section class="card tablecard">${docs.length ? `<table class="resp"><thead><tr><th scope="col">${esc(Lv.docName)}</th><th scope="col">${esc(Lv.email)}</th><th scope="col">${esc(t.nav.patients)}</th></tr></thead><tbody>${docs.map(d =>
    `<tr><td class="c-chip" style="font-weight:600">${esc(d.name)}</td><td data-l="${esc(Lv.email)}">${esc(d.email || "")}</td><td data-l="${esc(t.nav.patients)}" class="num">${count(d.uid)}</td></tr>`).join("")}</tbody></table>`
    : `<div class="empty"><span class="ic">${I("staff")}</span><p style="margin:0">${esc(Lv.noDocs)}</p></div>`}</section>
   <section class="card cpad"><h2>${I("plus","sm")}${esc(Lv.addDoc)}</h2>
    <form id="addDoc" class="loginform" style="border:0;padding-top:8px" novalidate><div id="adErr"></div>
     <div class="row"><label for="adName">${esc(Lv.docName)}</label><input class="txt" id="adName" autocomplete="off"></div>
     <div class="row"><label for="adEmail">${esc(Lv.email)}</label><input class="txt" id="adEmail" type="email" autocomplete="off"></div>
     <div class="row"><label for="adPw">${esc(Lv.tempPw)}</label><input class="txt" id="adPw" type="password" autocomplete="new-password" aria-describedby="adPwHelp"><span class="helper" id="adPwHelp">${esc(Lv.tempHelp)}</span></div>
     <div><button class="btn pri" type="submit" id="adGo">${I("plus","sm")}${esc(Lv.addDoc)}</button></div></form></section></div>`;
  $("#addDoc").addEventListener("submit", ev => {
    ev.preventDefault();
    const name = $("#adName").value.trim(), email = $("#adEmail").value.trim(), pw = $("#adPw").value, err = $("#adErr"), go = $("#adGo");
    const errs = []; if(!name) errs.push(Lv.errName); if(!/^\S+@\S+\.\S+$/.test(email)) errs.push(Lv.errEmail); if(pw.length < 6) errs.push(Lv.errPw);
    if(errs.length){ err.innerHTML = `<div class="errsum" role="alert" tabindex="-1">${errs.map(esc).join("<br>")}</div>`; err.firstChild.focus(); return; }
    go.disabled = true; err.innerHTML = "";
    LV.api.addDoctor(name, email, pw).then(() => LV.api.listDoctors()).then(d => { LV.doctors = d; toast(Lv.added(name)); rerender(); })
      .catch(e => { go.disabled = false; err.innerHTML = `<div class="errsum" role="alert">${esc(/email-already/.test((e && e.code) || "") ? Lv.errExists : Lv.saveErr)}</div>`; });
  });
}
function openAssign(id, trigger){
  const e = byId(id), Lv = t.live;
  const docs = LV.doctors.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  openOverlay(`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="asT" tabindex="-1"><div class="dh"><div style="flex:1"><div class="faint small" style="font-weight:600">${esc(e.p.id)}</div><h2 id="asT">${esc(Lv.assignT)}</h2></div><button class="iconbtn" data-close aria-label="${esc(t.drawer.close)}">${I("x")}</button></div>
   <form class="db" id="asForm" novalidate><div id="asErr"></div>
    <div><label class="fl" for="asDoc">${esc(Lv.doctorL)}</label><select class="txt" id="asDoc"><option value="">${esc(Lv.chooseDoc)}</option>${docs.map(d => `<option value="${esc(d.uid)}" ${d.uid === e.p.doc ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select>
     ${docs.length ? "" : `<p class="note" style="margin-top:6px">${esc(Lv.noDocs)} <a href="#/staff">${esc(Lv.staff)}</a></p>`}</div>
    <div><label class="fl" for="asName">${esc(Lv.nameL)}</label><input class="txt" id="asName" value="${esc(e.p.name || "")}" autocomplete="off" aria-describedby="asHelp"><div class="helper"><span id="asHelp">${esc(Lv.nameHelp)}</span></div></div></form>
   <div class="df"><span style="flex:1"></span><button class="btn" type="button" data-close>${esc(t.drawer.cancel)}</button><button class="btn pri" type="submit" form="asForm" id="asGo">${I("check","sm")}${esc(Lv.save)}</button></div></div>`, trigger);
  $("#asForm").addEventListener("submit", ev => {
    ev.preventDefault();
    const doc = $("#asDoc").value, name = $("#asName").value.trim(), err = $("#asErr"), go = $("#asGo");
    if(!doc){ err.innerHTML = `<div class="errsum" role="alert" tabindex="-1">${esc(Lv.errDoc)}</div>`; $("#asDoc").focus(); return; }
    go.disabled = true;
    LV.api.assignDoctor(e.p.uid, doc, name || null).then(() => { closeOverlay(); toast(Lv.assigned(e.p.id)); })
      .catch(() => { go.disabled = false; err.innerHTML = `<div class="errsum" role="alert">${esc(Lv.saveErr)}</div>`; });
  });
}
function groupsLive(e){
  const r = e.s.slice(-5).filter(x => x.ms != null);
  const med = k => D.median(r.map(x => x.msByType[k]).filter(v => v != null));
  const taps = k => r.reduce((a, x) => a + (x.tapsByType[k] || 0), 0);
  const mk = k => ({ ms: med(k), usual: e.p.usual, taps: taps(k) });
  return r.length ? { social: mk("social"), messaging: mk("messaging"), other: mk("other") } : null;
}

/* ---------- start: demo, or the test server when firebase-config.js has a project ---------- */
function boot(){
  const L = window.THABAT_LIVE || {};
  LV.ok = !!L.ok; LV.api = L.api || null; LV.emulator = !!L.emulator;
  if(LV.ok){
    LV.api.onAuth(user => {
      LV.authKnown = true; LV.user = user;
      if(user && user.role){ if(!live()){ startLive(); logAudit("signin", ""); } }
      else if(live()) stopLive();
      lastRoute = ""; render();
    });
  }
  render();
}
if(window.THABAT_LIVE) boot();
else { let done = false; const go = () => { if(!done){ done = true; boot(); } }; window.addEventListener("thabat-live", go, { once:true }); setTimeout(go, 6000); }
})();
