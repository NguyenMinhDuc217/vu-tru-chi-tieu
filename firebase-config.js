// Firebase web config for the public site (https://vu-tru-chi-tieu.pages.dev).
// These values identify the Firebase project; they are not secrets. Access to data is
// protected by firestore.rules (each signed-in user can only read/write vutru_chitieu/<their uid>/).
// Set to null to run without sign-in (data stays in the browser only).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC9uaEJKQLJMNYrsQzbZN-VA7Oo2vxVfLE",
  authDomain: "python-chat-7e32a.firebaseapp.com",
  projectId: "python-chat-7e32a",
  storageBucket: "python-chat-7e32a.firebasestorage.app",
  messagingSenderId: "459422323839",
  appId: "1:459422323839:web:a1b9c9501a3ff013eb1b4a"
};

// Hosts that serve Firebase's sign-in handler themselves at /__/auth/ (functions/__/[[path]].js).
// The installed app (PWA) signs in through it with a redirect. Each host needs
// https://<host>/__/auth/handler in the OAuth client's "Authorized redirect URIs" (Google Cloud Console).
window.FIREBASE_AUTH_PROXY_HOSTS = ['vu-tru-chi-tieu.pages.dev'];
