// firebase-messaging-sw.js
// Service Worker pour les notifications push Firebase (app en arrière-plan)
// Ce fichier DOIT être à la racine du site web (www/)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ⚠️ Même config que dans index.html — sera injectée par GitHub Actions
firebase.initializeApp({
  apiKey:            "VOTRE_API_KEY",
  authDomain:        "VOTRE_PROJECT.firebaseapp.com",
  databaseURL:       "https://VOTRE_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "VOTRE_PROJECT",
  storageBucket:     "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId:             "VOTRE_APP_ID"
});

const messaging = firebase.messaging();

// Affiche la notification quand l'app est en arrière-plan
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification || {};

  self.registration.showNotification(title || '📞 mycall', {
    body:    body || 'Nouveau message',
    icon:    icon || '/icons/icon-192.png',
    badge:   '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data:    payload.data || {},
    actions: payload.data?.type === 'call' ? [
      { action: 'accept',  title: '✓ Répondre' },
      { action: 'decline', title: '✕ Refuser'  },
    ] : [],
  });
});

// Clic sur la notification → ouvre/focus l'app
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'decline') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
