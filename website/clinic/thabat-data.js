/*
 * Thabat MS clinic data layer: Firebase (TEST DATA ONLY until hosting in Saudi Arabia is approved).
 * The phone app writes patients/{uid}, days, doses and alerts; staff read them here.
 * Access is enforced by firestore.rules (C:\dev\thabat-ms\firebase): an admin sees every patient and
 * assigns doctors; a doctor sees only their own patients. Nothing in this file is secret: the Firebase
 * web config is public by design, and the rules are what protect the data.
 *
 * Usage (ES module):
 *   import * as Thabat from "./thabat-data.js";
 *   await Thabat.init(window.THABAT_FIREBASE);   // from firebase-config.js; returns false if no config
 *   Thabat.onAuth(user => ...);                   // user = {uid, email, role, name} or null
 *   await Thabat.signIn(email, password);
 *   const stop = Thabat.watchPatients(list => ...);         // admin: all; doctor: own
 *   const stop2 = Thabat.watchPatient(uid, data => ...);    // {patient, days, doses, alerts}
 *   await Thabat.assignDoctor(uid, doctorUid, displayName); // admin only
 *   await Thabat.acknowledgeAlert(uid, startedOn, note);
 *   Thabat.toDashboardShape(data)                            // → the {p, s, st} shape of website/clinic/data.js
 *
 * toDashboardShape returns:
 *   p  = {id, code, name, doctorId, status, language, kinds, lastSeenAt, simulated, appVersion, usual}
 *   s  = [{d: Date, day: "yyyy-mm-dd", ms|null, usual, line, state, pv, sr, taps, tapsByType, msByType, monitoredMinutes, doses}]
 *        pv / sr = preventive / symptom-relief dose mark for the day: "T" taken, "L" late, "N" not taken, null no answer
 *   st = {st: "alert|watch|good|learn|none", days, paused}
 *   alerts = [{id, startedOn, days, state: "open|acknowledged", acknowledgedBy, ackAt, note, simulated}]
 * Anything shown with simulated = true must carry the "Simulated data" label (CLAUDE.md rule 6).
 */

const V = "12.19.0";
let app, auth, db, F, A, me = null;

/** Loads Firebase and connects. Returns false when there is no config (the dashboard then uses its mock data). */
export async function init(config) {
  if (!config || !config.projectId) return false;
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  A = authMod; F = fsMod;
  app = initializeApp(config, "thabat-clinic");
  auth = A.getAuth(app);
  db = F.getFirestore(app);
  if (config.emulatorHost) {
    A.connectAuthEmulator(auth, `http://${config.emulatorHost}:9099`, { disableWarnings: true });
    F.connectFirestoreEmulator(db, config.emulatorHost, 8080);
  }
  return true;
}

/** Calls back with the signed-in staff member ({uid, email, role, name}) or null. Phones (anonymous) are refused. */
export function onAuth(cb) {
  return A.onAuthStateChanged(auth, async (u) => {
    if (!u || u.isAnonymous) { me = null; cb(null); return; }
    const s = await F.getDoc(F.doc(db, "staff", u.uid)).catch(() => null);
    if (!s || !s.exists()) { me = { uid: u.uid, email: u.email, role: null, name: u.email }; cb(me); return; }
    me = { uid: u.uid, email: u.email, ...s.data() };
    cb(me);
  });
}

export const signIn = (email, password) => A.signInWithEmailAndPassword(auth, email, password);
export const signOut = () => A.signOut(auth);
export const currentUser = () => me;

/** Live list of patients this staff member may see. Admin: all, newest first. Doctor: assigned to them. */
export function watchPatients(cb) {
  const col = F.collection(db, "patients");
  const q = me && me.role === "doctor" ? F.query(col, F.where("doctorId", "==", me.uid)) : col;
  return F.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))));
}

/** Live data for one patient: the record plus days (oldest first), doses and alerts. */
export function watchPatient(uid, cb, opts = {}) {
  const data = { patient: null, days: [], doses: [], alerts: [] };
  const push = () => cb({ ...data });
  const base = F.doc(db, "patients", uid);
  const stops = [
    F.onSnapshot(base, (d) => { data.patient = d.exists() ? { uid, ...d.data() } : null; push(); }),
    F.onSnapshot(F.collection(base, "days"), (s) => { data.days = s.docs.map((d) => d.data()).sort((a, b) => a.day.localeCompare(b.day)); push(); }),
    F.onSnapshot(F.collection(base, "doses"), (s) => { data.doses = s.docs.map((d) => d.data()); push(); }),
    F.onSnapshot(F.collection(base, "alerts"), (s) => { data.alerts = s.docs.map((d) => ({ id: d.id, ...d.data() })); push(); }),
  ];
  if (opts.audit !== false) logAudit("view_patient", uid);   // the clinic list subscribes with {audit:false}; opening a patient logs the view
  return () => stops.forEach((f) => f());
}

/** Admin: every doctor, for the assign menu. */
export async function listDoctors() {
  const s = await F.getDocs(F.query(F.collection(db, "staff"), F.where("role", "==", "doctor")));
  return s.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/**
 * Admin: creates a doctor login without signing the admin out (uses a second Firebase app instance),
 * then records the role. Returns the new doctor's uid.
 */
export async function addDoctor(name, email, password, role = "doctor") {
  const { initializeApp, deleteApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const second = initializeApp(app.options, "thabat-add-staff-" + Date.now());
  const secondAuth = A.getAuth(second);
  if (auth.emulatorConfig) A.connectAuthEmulator(secondAuth, auth.emulatorConfig.url, { disableWarnings: true });
  try {
    const cred = await A.createUserWithEmailAndPassword(secondAuth, email, password);
    await F.setDoc(F.doc(db, "staff", cred.user.uid), { role, name, email });
    await logAudit("add_staff", null, { role });
    return cred.user.uid;
  } finally {
    await deleteApp(second);
  }
}

/** Admin: links a phone (found by its code) to a doctor. displayName is optional and for TEST data only. */
export async function assignDoctor(uid, doctorUid, displayName) {
  const change = { doctorId: doctorUid, status: "active", assignedAt: Date.now() };
  if (displayName != null) change.displayName = displayName;
  await F.updateDoc(F.doc(db, "patients", uid), change);
  await logAudit("assign_doctor", uid, { doctorUid });
}

/** Admin: find a patient by the code shown on their phone (e.g. "TH-7K3F"). */
export async function findByCode(code) {
  const s = await F.getDocs(F.query(F.collection(db, "patients"), F.where("code", "==", code.trim().toUpperCase())));
  return s.docs.map((d) => ({ uid: d.id, ...d.data() }))[0] || null;
}

/** Doctor or admin: acknowledge an alert episode with a note. */
export async function acknowledgeAlert(uid, startedOn, note) {
  await F.updateDoc(F.doc(db, "patients", uid, "alerts", startedOn), {
    state: "acknowledged", acknowledgedBy: me.uid, ackAt: Date.now(), note: note || "",
  });
  await logAudit("acknowledge_alert", uid, { startedOn });
}

/** Every view and action is logged (README section 7.2). Failures never block the screen. */
export async function logAudit(action, patientId, extra) {
  if (!me) return;
  try {
    await F.addDoc(F.collection(db, "audit"), { uid: me.uid, action, patientId: patientId || null, at: Date.now(), ...(extra || {}) });
  } catch (e) { /* offline or not staff */ }
}

/**
 * Turns one patient's Firestore data into the shape website/clinic/data.js uses:
 *   p  = profile, s = daily rows {d, ms, taps, ...}, st = {st: "alert|watch|none|learn|good", days, paused}
 * Days with no data have ms = null ("No data", never normal).
 */
export function toDashboardShape({ patient, days, doses, alerts }) {
  const last = days[days.length - 1];
  const map = { ALERT: "alert", WATCH: "watch", STEADY: "good", LEARNING: "learn", NO_DATA: "none" };
  const st = {
    st: last ? map[last.state] || "none" : "none",
    days: last ? (last.state === "ALERT" || last.state === "WATCH" ? last.slowRun : 0) : 0,
    paused: patient ? patient.monitoring === false : false,
  };
  const dosesByDay = {};
  for (const d of doses) (dosesByDay[d.day] = dosesByDay[d.day] || []).push(d);
  // One mark per day per treatment kind, like the dose row on the patient's chart: T taken, L late, N not taken.
  const mark = (list, kind) => {
    const xs = list.filter((x) => x.kind === kind).map((x) => x.status);
    return xs.includes("NOT_TAKEN") ? "N" : xs.includes("LATE") ? "L" : xs.includes("TAKEN") ? "T" : null;
  };
  const s = days.map((d) => ({
    d: new Date(d.day + "T00:00:00"),
    day: d.day,
    pv: mark(dosesByDay[d.day] || [], "PREVENTIVE"),
    sr: mark(dosesByDay[d.day] || [], "SYMPTOM_RELIEF"),
    ms: d.medianGapMs ?? null,
    usual: d.usualMs ?? null,
    line: d.lineMs ?? null,
    state: d.state,
    taps: d.tapCount,
    tapsByType: { social: d.tapsSocial, messaging: d.tapsMessaging, other: d.tapsOther },
    msByType: { social: d.medianSocialMs ?? null, messaging: d.medianMessagingMs ?? null, other: d.medianOtherMs ?? null },
    monitoredMinutes: d.monitoredMinutes,
    doses: (dosesByDay[d.day] || []).map((x) => ({ kind: x.kind, status: x.status, time: x.time })),
  }));
  const p = patient ? {
    id: patient.uid, code: patient.code, name: patient.displayName || patient.code,
    doctorId: patient.doctorId || null, status: patient.status, language: patient.language,
    kinds: patient.treatmentKinds || [], lastSeenAt: patient.lastSeenAt, simulated: !!patient.simulated,
    appVersion: patient.appVersion,
    usual: [...days].reverse().find((d) => d.usualMs != null)?.usualMs ?? null,
  } : null;
  return { p, s, st, alerts };
}
