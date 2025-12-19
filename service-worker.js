// service-worker.js - VERSÃO ATUALIZADA COM BACKGROUND SYNC
const CACHE_NAME = 'ac-transporte-v9-' + new Date().getTime();
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './auth.js',
  './maps.js',
  './ui.js',
  './admin.js',
  './config.js',
  './firebase.js',
  './manifest.json'
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto:', CACHE_NAME);
        
        return Promise.all(
          CORE_ASSETS.map(asset => {
            return cache.add(asset)
              .then(() => {
                console.log('💾 Cacheado:', asset);
                return true;
              })
              .catch(error => {
                console.log('⚠️ Não pôde cachear:', asset, error);
                return false;
              });
          })
        );
      })
      .then(() => {
        console.log('🚀 Instalação completa');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Erro na instalação:', error);
      })
  );
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME) {
              console.log('🗑️ Removendo cache antigo:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        console.log('🎯 Claiming clients');
        return self.clients.claim();
      })
  );
});

// ========== BACKGROUND SYNC ==========
self.addEventListener('sync', event => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sync-rota') {
    event.waitUntil(syncRotaData());
  }
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncRotaData() {
  try {
    // Buscar dados offline do IndexedDB ou localStorage
    const offlineData = await getOfflineData();
    
    if (offlineData.length === 0) {
      console.log('📭 Nenhum dado offline para sincronizar');
      return;
    }
    
    console.log('🔄 Sincronizando', offlineData.length, 'registros offline');
    
    // Enviar dados para o servidor
    for (const data of offlineData) {
      await enviarDadosParaServidor(data);
      await removerDadoOffline(data.id);
    }
    
    console.log('✅ Sincronização completa');
    
    // Enviar notificação
    self.registration.showNotification('AC Transporte', {
      body: 'Dados sincronizados com sucesso!',
      icon: './logo.jpg',
      tag: 'sync-complete'
    });
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

async function syncOfflineData() {
  // Implementar sincronização de dados offline
  console.log('Sincronizando dados offline...');
}

// ========== FETCH COM OFFLINE SUPPORT ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignorar requisições do Firebase
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis')) {
    return event.respondWith(fetch(event.request));
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se tem no cache, retorna
        if (cachedResponse) {
          console.log('📦 Retornando do cache:', url.pathname);
          return cachedResponse;
        }
        
        // Se não tem, busca na rede
        console.log('🌐 Buscando na rede:', url.pathname);
        
        return fetch(event.request)
          .then(networkResponse => {
            // Se resposta inválida, retorna como está
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clona a resposta para cache
            const responseToCache = networkResponse.clone();
            
            // Abre o cache e salva
            caches.open(CACHE_NAME)
              .then(cache => {
                const shouldCache = 
                  url.origin === self.location.origin ||
                  url.href.includes('cdnjs.cloudflare.com');
                
                if (shouldCache) {
                  cache.put(event.request, responseToCache);
                  console.log('💾 Salvo no cache:', url.pathname);
                }
              })
              .catch(cacheError => {
                console.log('⚠️ Erro ao salvar no cache:', cacheError);
              });
            
            return networkResponse;
          })
          .catch(fetchError => {
            console.log('🌐 Offline - Erro na rede:', fetchError);
            
            // Se é uma navegação (página HTML), retorna index.html
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html')
                .then(indexResponse => {
                  return indexResponse || new Response(
                    '<!DOCTYPE html><html><head><title>Offline</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:50px;}</style></head><body><h1>🔌 Você está offline</h1><p>Algumas funcionalidades podem não estar disponíveis.</p><p>Conecte-se à internet para continuar.</p></body></html>',
                    { 
                      headers: { 'Content-Type': 'text/html' } 
                    }
                  );
                });
            }
            
            // Para outros recursos, retorna mensagem de erro
            return new Response(
              'Conteúdo indisponível offline',
              { 
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              }
            );
          });
      })
  );
});

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', event => {
  console.log('📬 Push notification recebida');
  
  let options = {
    body: 'Nova notificação do AC Transporte',
    icon: './logo.jpg',
    badge: './logo.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: './',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'ver',
        title: 'Ver'
      },
      {
        action: 'fechar',
        title: 'Fechar'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.title = data.title || 'AC Transporte';
      options.data = { ...options.data, ...data };
    } catch (e) {
      options.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title || 'AC Transporte', options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('👆 Notificação clicada:', event.action);
  
  event.notification.close();
  
  if (event.action === 'fechar') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || './';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Verificar se já existe uma janela aberta
        for (let client of windowClients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Se não existe, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ========== FUNÇÕES AUXILIARES ==========
async function getOfflineData() {
  // Implementar leitura de dados offline
  return [];
}

async function enviarDadosParaServidor(data) {
  // Implementar envio de dados para servidor
  return Promise.resolve();
}

async function removerDadoOffline(id) {
  // Implementar remoção de dados após sincronização
  return Promise.resolve();
}

console.log('✅ Service Worker carregado com background sync');
