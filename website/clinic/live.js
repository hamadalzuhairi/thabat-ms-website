/* Connects the clinic dashboard to the Firebase test server through thabat-data.js.
   Uses it only when firebase-config.js has a project, and only uses the local emulator when the page itself
   runs on this computer. Otherwise the dashboard stays in demo mode with simulated patients. */
const cfg = window.THABAT_FIREBASE;
const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const usable = !!(cfg && cfg.projectId && (!cfg.emulatorHost || local));
let ok = false, api = null;
if (usable) {
  try { api = await import("./thabat-data.js"); ok = await api.init(cfg); } catch (e) { console.warn("Thabat test server not available:", e); ok = false; }
}
window.THABAT_LIVE = { ok, api: ok ? api : null, emulator: !!(cfg && cfg.emulatorHost), projectId: cfg ? cfg.projectId : null };
window.dispatchEvent(new Event("thabat-live"));
