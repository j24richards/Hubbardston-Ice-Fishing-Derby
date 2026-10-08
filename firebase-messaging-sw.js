// Firebase Cloud Messaging service worker.
// Handles push notifications when the site tab is closed or the phone is locked.
// Must live at the site root (same folder as index.html) so its scope covers the whole site.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyANrNHmYArhwnz6LcYA8A5kHBWkr2wYHLY",
  authDomain: "hubbardston-ice-fishing-derby.firebaseapp.com",
  projectId: "hubbardston-ice-fishing-derby",
  storageBucket: "hubbardston-ice-fishing-derby.firebasestorage.app",
  messagingSenderId: "127792029163",
  appId: "1:127792029163:web:f2f466dd5b56d892914dae"
});

var messaging = firebase.messaging();

// Activate this worker immediately instead of sitting in "waiting" behind an
// older copy of itself — otherwise a page's first-ever subscribe attempt can
// fail with "no active Service Worker" right after registration, and later
// updates to this file wouldn't take effect until every open tab was closed.
// Offline copy of the site. The same worker also keeps a saved copy of the page
// and its pictures so the site still opens at the pond with weak or no signal.
// Pages are fetched fresh first (falling back to the saved copy after 4 seconds
// or when offline); pictures use the saved copy and refresh in the background.
// Only same-site GET requests are touched: the live leaderboard, banner and
// notifications talk to Google's servers directly and are never cached here.
var SHELL_CACHE = 'derby-shell-v1';
var SHELL_FILES = ['./', 'index.html', 'photos.html', 'manifest.json', 'icon-192.png', 'hero-photo.webp', 'brand-mark.webp', 'bass-flag.webp', 'bass-flag-nopole.webp'];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE).then(function(cache){
    return Promise.all(SHELL_FILES.map(function(f){ return cache.add(f).catch(function(){}); }));
  }).catch(function(){}));
});
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k.indexOf('derby-shell-') === 0 && k !== SHELL_CACHE; })
        .map(function(k){ return caches.delete(k); }));
    }).catch(function(){}).then(function(){ return self.clients.claim(); })
  );
});

function networkFirst(request, fallbackKey){
  return new Promise(function(resolve){
    var settled = false;
    function useCache(){
      return caches.match(request, { ignoreSearch: true }).then(function(hit){
        return hit || (fallbackKey ? caches.match(fallbackKey) : null);
      });
    }
    var timer = setTimeout(function(){
      useCache().then(function(hit){ if (hit && !settled) { settled = true; resolve(hit); } });
    }, 4000);
    fetch(request).then(function(res){
      clearTimeout(timer);
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(SHELL_CACHE).then(function(c){ c.put(request, copy); }).catch(function(){});
      }
      if (!settled) { settled = true; resolve(res); }
    }).catch(function(){
      clearTimeout(timer);
      useCache().then(function(hit){
        if (settled) return;
        settled = true;
        resolve(hit || Response.error());
      });
    });
  });
}
function staleWhileRevalidate(request){
  return caches.match(request).then(function(hit){
    var refresh = fetch(request).then(function(res){
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(SHELL_CACHE).then(function(c){ c.put(request, copy); }).catch(function(){});
      }
      return res;
    });
    if (hit) { refresh.catch(function(){}); return hit; }
    return refresh;
  });
}
self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.slice(-22) === 'firebase-messaging-sw.js') return;
  var isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0;
  if (isPage) {
    event.respondWith(networkFirst(req, 'index.html'));
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});

// Background messages (tab closed / phone locked) show a system notification.
messaging.onBackgroundMessage(function(payload) {
  var title = (payload.notification && payload.notification.title) || 'Hubbardston Ice Fishing Derby';
  var body = (payload.notification && payload.notification.body) || 'The leaderboard just updated.';
  self.registration.showNotification(title, {
    body: body,
    icon: 'apple-touch-icon.png',
    badge: 'apple-touch-icon.png',
    // Big picture shown when the notification is expanded (Android Chrome).
    // Reuses the same bass-on-the-flag graphic that sits behind the
    // "Notify me" banner on the leaderboard, for a consistent look.
    image: 'bass-flag-nopole.webp',
    tag: 'derby-leaderboard'
  });
});

// Tapping the notification opens/focuses the site on the live leaderboard.
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('./#live');
    })
  );
});
