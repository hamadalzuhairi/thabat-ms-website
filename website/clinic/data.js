/* Thabat MS clinic demo: simulated patients and the stand-in rules.
   Everything here is invented for the demo. The rules match README section 10 (placeholders, not clinically derived):
   usual = learned over the first 14 days, slower = above usual x 1.09, Watch = 1-3 slower days, Alert = 4+,
   a no-data day ends a run, adherence = 2+ missed preventive doses in 7 days,
   symptom relief needs 3+ missed-dose days and 3+ dose days in 30, "responding" if dose days are 4%+ faster. */
(function(){
const DEMO_NOW = new Date(2026, 9, 3, 10, 30);   // demo clock: Sat 3 Oct 2026, 10:30
const END = new Date(2026, 9, 2);                 // latest nightly summary: Fri 2 Oct
const RULE = { factor: 1.09, watchMin: 1, alertMin: 4, learnDays: 14 };

function rng(s){ return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const day = (n, i) => new Date(END.getFullYear(), END.getMonth(), END.getDate() - (n - 1 - i));
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parse = s => { const [y,m,d] = s.split("T")[0].split("-").map(Number); const t = s.split("T")[1]; const [hh,mm] = t ? t.split(":").map(Number) : [0,0]; return new Date(y, m-1, d, hh, mm); };
function median(a){ const b = a.filter(x => x != null).sort((x,y) => x-y); if(!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : Math.round((b[m-1] + b[m]) / 2); }

/* Offsets are counted from the last day: -1 = 2 Oct, -2 = 1 Oct ... */
const PATIENTS = [
 { id:"P-7F3K", sex:"F", age:29, city:"riyadh", usual:240, seed:7, hist:365, doc:"NA",
   tail:[266,271,279,283,286], heatTail:[0,0,1,0,0], gaps:[-52,-51], spikes:{"-38":265,"-20":264},
   prev:"hospital", prevGiven:["2026-01-14","2026-07-14"], prevNext:"2027-01",
   sr:"twice", srLast7:"TTLTTLT", srMiss:[-70,-43,-24,-11], srLate:[-81,-66,-58,-33,-19],
   lastVisit:"2026-07-14", nextVisit:"2026-10-14T10:00", app:"0.2" },
 { id:"P-2M9Q", sex:"M", age:34, city:"jeddah", usual:228, seed:21, hist:210, doc:"NA",
   tail:[251,256,262,259], gaps:[-90],
   prev:"daily", prevLast7:"TNTNTNT",
   lastVisit:"2026-05-20", nextVisit:null, app:"0.2" },
 { id:"P-K4D1", sex:"F", age:41, city:"dammam", usual:251, seed:33, hist:300, doc:"RQ",
   tail:[249,null,null,null], gaps:[],
   prev:"daily", prevLast7:"TTTT---",
   lastVisit:"2026-06-02", nextVisit:"2026-10-21T09:00", lastSync:"2026-09-29T22:40", app:"0.2" },
 { id:"P-91XA", sex:"F", age:26, city:"riyadh", usual:233, seed:44, hist:150, doc:"NA",
   tail:[255,258], heatTail:[1,1], gaps:[],
   prev:"daily", prevLast7:"TTTTTTT",
   lastVisit:"2026-08-11", nextVisit:"2026-11-09T11:30", app:"0.2" },
 { id:"P-5TQR", sex:"M", age:38, city:"madinah", usual:262, seed:55, hist:240, doc:"RQ",
   tail:[290], gaps:[-31],
   prev:"hospital", prevGiven:["2026-04-02"], prevNext:"2026-10",
   sr:"twice", srLast7:"TTTTTLT", srMiss:[-55,-29],
   lastVisit:"2026-04-02", nextVisit:"2026-10-06T08:30", app:"0.2" },
 { id:"P-Z8E5", sex:"F", age:33, city:"riyadh", usual:245, seed:66, hist:280, doc:"NA",
   tail:[246,null,null,null], paused:"2026-09-30", gaps:[],
   prev:"hospital", prevGiven:["2026-02-18","2026-08-18"], prevNext:"2027-02",
   lastVisit:"2026-08-18", nextVisit:"2026-10-18T12:00", lastSync:"2026-09-29T23:10", app:"0.2" },
 { id:"P-0C7B", sex:"M", age:24, city:"riyadh", usual:null, base:231, seed:77, hist:9, doc:"NA",
   tail:[], gaps:[],
   prev:"daily", prevLast7:"TTTTTTT",
   lastVisit:"2026-09-22", nextVisit:"2026-10-30T09:30", app:"0.2" },
 { id:"P-HH20", sex:"F", age:31, city:"khobar", usual:238, seed:88, hist:330, doc:"NA",
   tail:[], gaps:[-140,-139,-138],
   sr:"twice", srLast7:"TTTNTTT", srMiss:[-12,-19,-25,-48], srEffect:13,
   prev:"daily", prevLast7:"TTTTTTT",
   lastVisit:"2026-08-30", nextVisit:"2026-10-07T13:00", app:"0.2" },
 { id:"P-L3W8", sex:"F", age:45, city:"riyadh", usual:255, seed:99, hist:365, doc:"RQ",
   tail:[], gaps:[-200],
   prev:"daily", prevLast7:"TTTTTTT",
   lastVisit:"2026-07-28", nextVisit:"2026-10-08T10:30", app:"0.2" },
];

function heatP(m, city){ const humid = city === "jeddah" || city === "dammam" || city === "khobar";
  const base = [0,0,0.02,0.08,0.25,0.42,0.5,0.48,0.3,0.12,0.02,0][m]; return Math.min(0.7, base + (humid ? 0.05 : 0)); }

function series(p){
  const r = rng(p.seed), n = p.hist, out = [];
  const at = off => n + off;
  const center = p.usual || p.base, cap = Math.round(center * 1.08);
  const tailStart = n - p.tail.length;
  for(let i = 0; i < n; i++){
    const d = day(n, i);
    let ms = Math.round(center + (r() + r() + r() - 1.5) * 8.4);
    ms = Math.min(ms, cap);
    const sp = p.spikes && p.spikes[String(i - n)]; if(sp) ms = sp;
    if(p.gaps.some(g => at(g) === i)) ms = null;
    let heat = r() < heatP(d.getMonth(), p.city);
    // doses: day-level status. T taken, L late, N not taken, - not answered
    let sr = null, pv = null;
    if(p.sr){
      sr = r() < 0.035 ? "L" : "T";
      if(p.srMiss && p.srMiss.some(g => at(g) === i)) sr = "N";
      if(p.srLate && p.srLate.some(g => at(g) === i)) sr = "L";
      const k = i - (n - 7); if(k >= 0 && p.srLast7) sr = p.srLast7[k];
    }
    if(p.prev === "daily"){
      const x = r(); pv = x < 0.03 ? "N" : x < 0.07 ? "L" : "T";
      const k = i - (n - 7); if(k >= 0 && p.prevLast7) pv = p.prevLast7[k] === "-" ? null : p.prevLast7[k];
    }
    if(p.srEffect && sr === "N" && ms != null) ms = Math.min(ms + p.srEffect, Math.round(center * 1.08));
    const ti = i - tailStart; if(ti >= 0){ ms = p.tail[ti]; heat = !!(p.heatTail && p.heatTail[ti]); }
    if(p.paused && iso(d) >= p.paused) ms = null;
    const taps = ms == null ? 0 : Math.round(1250 + r() * 600);
    out.push({ d, ms, heat, sr, pv, taps });
  }
  return out;
}

/* ----- stand-in rules ----- */
function pilotLine(p){ return p.usual ? Math.round(p.usual * RULE.factor) : null; }
function slower(p, x){ return p.usual && x.ms != null && x.ms > p.usual * RULE.factor; }
function status(p, s){
  const n = s.length;
  if(!p.usual || n < RULE.learnDays) return { st:"learn", days:n };
  let nd = 0; for(let i = n-1; i >= 0 && s[i].ms == null; i--) nd++;
  if(nd > 0) return { st:"none", days:nd, paused:!!p.paused };
  let run = 0; for(let i = n-1; i >= 0 && slower(p, s[i]); i--) run++;
  if(run >= RULE.alertMin) return { st:"alert", days:run };
  if(run >= RULE.watchMin) return { st:"watch", days:run };
  return { st:"good" };
}
function last7(p, s){ const k = p.prev === "daily" ? "pv" : p.sr ? "sr" : "pv"; return s.slice(-7).map(x => x[k] || (p.prev === "hospital" && !p.sr ? "T" : "O")); }
function doseCounts(p, s, kind){
  let asked = 0, taken = 0, late = 0, not = 0, unanswered = 0;
  s.forEach(x => {
    const v = kind === "sr" ? x.sr : x.pv; const per = kind === "sr" ? 2 : 1;
    if(kind === "sr" && !p.sr) return; if(kind === "pv" && p.prev !== "daily") return;
    asked += per;
    if(v === "T") taken += per; else if(v === "L"){ taken += per - 1; late++; } else if(v === "N"){ taken += per - 1; not++; } else unanswered += per;
  });
  return { asked, taken, late, not, unanswered };
}
function missedPrev7(p, s){ return p.prev === "daily" ? s.slice(-7).filter(x => x.pv === "N").length : 0; }
function srCheck(p, s){
  if(!p.sr) return null;
  const w = s.slice(-30); const doseDays = w.filter(x => x.sr === "T" && x.ms != null), miss = w.filter(x => x.sr === "N" && x.ms != null);
  const late = w.filter(x => x.sr === "L").length;
  if(miss.length < 3 || doseDays.length < 3) return { res:"unknown", doseDays:doseDays.length, missDays:miss.length, late };
  const a = median(doseDays.map(x => x.ms)), b = median(miss.map(x => x.ms));
  const pct = Math.round((1 - a / b) * 100);
  return { res: pct >= 4 ? "yes" : "no", pct, doseDays:doseDays.length, missDays:miss.length, late };
}
function runStart(p, s, st){ if(st.st !== "alert" && st.st !== "watch") return null; return s[s.length - st.days].d; }
function alertRaised(p, s, st){ if(st.st !== "alert") return null; const d4 = s[s.length - st.days + RULE.alertMin - 1].d; return new Date(d4.getFullYear(), d4.getMonth(), d4.getDate() + 1, 3, 10); }
function groups(p, s){
  const recent = median(s.slice(-5).map(x => x.ms)) || p.usual; const r = rng(p.seed * 3);
  const mk = (f, fu) => ({ ms: Math.round(recent * f), usual: Math.round(p.usual * fu), taps: Math.round(5 * (900 + r() * 900)) });
  const st = status(p, s).st;
  return st === "alert" || st === "watch"
    ? { social: mk(0.916, 0.985), messaging: mk(1.017, 1.004), other: mk(0.944, 0.995) }
    : { social: mk(0.985, 0.985), messaging: mk(1.004, 1.004), other: mk(0.995, 0.995) };
}

const ALL = PATIENTS.map(p => { const s = series(p); const st = status(p, s); return { p, s, st }; });
const RANK = { alert:0, watch:1, none:2, learn:3, good:4 };

window.THABAT = { DEMO_NOW, END, RULE, PATIENTS, ALL, RANK, iso, parse, median, pilotLine, slower, status, last7, doseCounts, missedPrev7, srCheck, runStart, alertRaised, groups };
})();
