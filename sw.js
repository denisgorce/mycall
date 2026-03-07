// ── NEXUS Service Worker ──
// Gère les notifications push et le cache PWA

const CACHE = 'nexus-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Réception d'une notification push
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? JSON.parse(e.data.text()) : {}; } catch(err) {}

  const title = data.title || '📞 Appel entrant';
  const options = {
    body:    data.body || 'Appuyez pour répondre',
    icon:    './icon-192.png',
    badge:   './icon-192.png',
    tag:     'nexus-call',
    renotify: true,
    requireInteraction: true,        // reste affiché jusqu'à action
    vibrate: [200, 100, 200, 100, 400],
    data:    data.data || {},
    actions: [
      { action: 'accept', title: '✅ Répondre' },
      { action: 'decline', title: '❌ Refuser' },
    ],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if (e.action === 'decline') {
    // Informer la page de refuser (si ouverte)
    e.waitUntil(
      clients.matchAll({ type: 'window' }).then(cs => {
        cs.forEach(c => c.postMessage({ type: 'push_decline', caller: e.notification.data.caller }));
      })
    );
    return;
  }

  // Accepter ou clic simple : ouvrir/focus la page
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const caller = e.notification.data.caller;
      if (cs.length > 0) {
        cs[0].focus();
        cs[0].postMessage({ type: 'push_accept', caller });
      } else {
        clients.openWindow('/mycall/').then(c => {
          if (c) setTimeout(() => c.postMessage({ type: 'push_accept', caller }), 1500);
        });
      }
    })
  );
});
