/*
 * Firebase web config for the clinic dashboard. This is NOT a secret: Firebase web keys are public by design,
 * and firestore.rules (C:\dev\thabat-ms\firebase) decide who can read what.
 * Right now this points at the local Firebase EMULATOR for testing. Replace it with the real
 * test project's config (Firebase console → Project settings → Your apps → Web app) when Hamad creates it.
 */
window.THABAT_FIREBASE = {
  apiKey: "fake-emulator-key",
  authDomain: "demo-thabat.firebaseapp.com",
  projectId: "demo-thabat",
  appId: "demo",
  emulatorHost: "127.0.0.1",
};
