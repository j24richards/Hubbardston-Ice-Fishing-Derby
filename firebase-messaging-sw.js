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

// Background messages (tab closed / phone locked) show a system notification.
messaging.onBackgroundMessage(function(payload) {
  var title = (payload.notification && payload.notification.title) || 'Hubbardston Ice Fishing Derby';
  var body = (payload.notification && payload.notification.body) || 'The leaderboard just updated.';
  self.registration.showNotification(title, {
    body: body,
    icon: 'apple-touch-icon.png',
    badge: 'apple-touch-icon.png',
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
