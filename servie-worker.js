// service-worker.js - ATUALIZADO PARA BACKGROUND SYNC
const CACHE_NAME = 'ac-transporte-v9' + new Date().getTime();
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase.js',
  './modules/auth.js',
  './modules/maps.js',
  './modules/ui.js',
  './modules/admin.js',
  './modules/location.js',
  './modules/database.js',
  './modules/notifications.js',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalação
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativação
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch com background sync
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Ignorar requisições não GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar Firebase e analytics
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('google-analytics')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Background sync para localizações
self.addEventListener('sync', event => {
  if (event.tag === 'sync-locations') {
    event.waitUntil(syncPendingLocations());
  }
});

// Sincronizar localizações pendentes
async function syncPendingLocations() {
  const pendingLocations = await getPendingLocations();
  
  for (const location of pendingLocations) {
    try {
      // Enviar para Firebase
      await sendLocationToFirebase(location);
      // Remover do armazenamento local
      await removePendingLocation(location.id);
    } catch (error) {
      console.error('Erro ao sincronizar localização:', error);
    }
  }
}

// Periodic sync para manter ativo
self.addEventListener('periodicsync', event => {
  if (event.tag === 'location-sync') {
    event.waitUntil(syncLocationData());
  }
});

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data?.text() || 'Nova notificação do AC Transporte',
    icon: './logo.jpg',
    badge: './logo.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: './'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('AC Transporte', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url.includes('./') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});

// Funções auxiliares para background sync
async function getPendingLocations() {
  // Implementar lógica para buscar localizações pendentes
  return [];
}

async function sendLocationToFirebase(location) {
  // Implementar envio para Firebase
  return Promise.resolve();
}

async function removePendingLocation(id) {
  // Implementar remoção de localização pendente
  return Promise.resolve();
}

async function syncLocationData() {
  // Sincronizar dados de localização
  console.log('🔄 Sincronizando dados de localização');
  return Promise.resolve();
}
