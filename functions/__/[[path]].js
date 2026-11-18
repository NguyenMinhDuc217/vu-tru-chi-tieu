// /__/* → Firebase Hosting of the Firebase project, so Google sign-in runs on this site's own domain.
// The installed app (PWA) signs in with a redirect. Safari, and Chrome on iOS, block the third-party
// storage that a redirect through <project>.firebaseapp.com relies on, so the sign-in result would be
// lost. Serving the Firebase auth handler from our own origin avoids that (Firebase's documented
// "proxy auth requests" option). The client uses this domain as authDomain only on the production host.
const FIREBASE_HOSTING = 'https://python-chat-7e32a.firebaseapp.com';

export async function onRequest({request}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/__/auth/') && !url.pathname.startsWith('/__/firebase/')) return new Response('Not found', {status: 404});
  const headers = new Headers(request.headers);
  headers.delete('host');
  const init = {method: request.method, headers, redirect: 'manual'};
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;
  return fetch(FIREBASE_HOSTING + url.pathname + url.search, init);
}
