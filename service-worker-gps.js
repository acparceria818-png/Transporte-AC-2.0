// service-worker-gps.js
const CACHE_NAME = 'gps-tracker-v1';
const QUEUE_NAME = 'gps-queue';

// Instalação
self.addEventListener('install', (event) => {
  console.log('Service Worker GPS instalado');
  self.skipWaiting();
});

// Ativação
self.addEventListener('activate', (event) => {
  console.log('Service Worker GPS ativado');
  event.waitUntil(clients.claim());
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-trajetos') {
    console.log('Sincronizando trajetos...');
    event.waitUntil(syncTrajetos());
  }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data.type === 'GPS_POSITION') {
    processarPosicaoGPS(event.data);
  }
});

// Processar posição GPS em background
async function processarPosicaoGPS(data) {
  console.log('Processando posição GPS:', data);
  
  // Salvar localmente
  const queue = await getQueue();
  queue.push({
    type: 'gps_position',
    data: data,
    timestamp: Date.now()
  });
  
  await saveQueue(queue);
  
  // Tentar enviar para servidor
  await syncQueue();
}

// Gerenciar fila offline
async function getQueue() {
  const cache = await caches.open(QUEUE_NAME);
  const response = await cache.match('/queue');
  if (response) {
    return await response.json();
  }
  return [];
}

async function saveQueue(queue) {
  const cache = await caches.open(QUEUE_NAME);
  await cache.put('/queue', new Response(JSON.stringify(queue)));
}

// Sincronizar fila com servidor
async function syncQueue() {
  if (!navigator.onLine) return;
  
  const queue = await getQueue();
  if (queue.length === 0) return;
  
  const success = [];
  
  for (const item of queue) {
    try {
      // Enviar para Firebase
      const response = await fetch('https://transporte-f7aea.firebaseio.com/trajetos.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item.data)
      });
      
      if (response.ok) {
        success.push(item);
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    }
  }
  
  // Remover itens sincronizados
  if (success.length > 0) {
    const newQueue = queue.filter(item => !success.includes(item));
    await saveQueue(newQueue);
  }
}

// Sincronizar trajetos
async function syncTrajetos() {
  await syncQueue();
}

// Background Fetch (se suportado)
if ('backgroundFetch' in self) {
  self.addEventListener('backgroundfetchsuccess', (event) => {
    console.log('Background Fetch bem-sucedido:', event.registration.id);
    event.updateUI({ title: 'Trajetos sincronizados' });
  });
}
