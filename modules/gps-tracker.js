// modules/gps-tracker.js
import { 
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp 
} from '../firebase.js';

export class TrajetoHistory {
  constructor() {
    this.pontos = [];
    this.trajetoAtivo = null;
    this.localStorageKey = 'trajeto_pontos';
  }

  async iniciarTrajeto(motoristaId, onibusId, rotaId) {
    this.trajetoAtivo = {
      id: `trajeto_${Date.now()}`,
      motoristaId,
      onibusId,
      rotaId,
      inicio: new Date(),
      pontos: []
    };

    // Salvar no Firebase
    const trajetoRef = await addDoc(collection(db, 'trajetos'), {
      motoristaId,
      onibusId,
      rotaId,
      inicio: serverTimestamp(),
      status: 'ativo',
      pontos: []
    });

    this.trajetoAtivo.firebaseId = trajetoRef.id;
    return this.trajetoAtivo;
  }

  async adicionarPonto(latitude, longitude, velocidade, precisao) {
    if (!this.trajetoAtivo) return;

    const ponto = {
      lat: latitude,
      lng: longitude,
      velocidade: velocidade || 0,
      precisao: precisao || 0,
      timestamp: new Date(),
      timestampServer: serverTimestamp()
    };

    this.pontos.push(ponto);
    this.trajetoAtivo.pontos.push(ponto);

    // Salvar localmente para offline
    this.salvarLocalmente();

    // Salvar no Firebase se online
    if (navigator.onLine && this.trajetoAtivo.firebaseId) {
      try {
        await updateDoc(doc(db, 'trajetos', this.trajetoAtivo.firebaseId), {
          pontos: arrayUnion(ponto),
          ultimaAtualizacao: serverTimestamp()
        });
      } catch (error) {
        console.error('Erro ao salvar ponto:', error);
      }
    }

    return ponto;
  }

  async finalizarTrajeto() {
    if (!this.trajetoAtivo) return;

    const trajeto = {
      ...this.trajetoAtivo,
      fim: new Date(),
      status: 'finalizado',
      distanciaTotal: this.calcularDistanciaTotal(),
      duracao: this.calcularDuracao()
    };

    // Atualizar no Firebase
    if (this.trajetoAtivo.firebaseId) {
      await updateDoc(doc(db, 'trajetos', this.trajetoAtivo.firebaseId), {
        fim: serverTimestamp(),
        status: 'finalizado',
        distanciaTotal: trajeto.distanciaTotal,
        duracao: trajeto.duracao
      });
    }

    // Limpar dados locais
    this.limparLocal();

    this.trajetoAtivo = null;
    return trajeto;
  }

  calcularDistanciaTotal() {
    if (this.pontos.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < this.pontos.length; i++) {
      const p1 = this.pontos[i-1];
      const p2 = this.pontos[i];
      total += this.calcularDistancia(p1.lat, p1.lng, p2.lat, p2.lng);
    }
    return total;
  }

  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  calcularDuracao() {
    if (this.pontos.length < 2) return 0;
    const inicio = new Date(this.pontos[0].timestamp);
    const fim = new Date(this.pontos[this.pontos.length - 1].timestamp);
    return (fim - inicio) / 1000; // segundos
  }

  salvarLocalmente() {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify({
        trajetoAtivo: this.trajetoAtivo,
        pontos: this.pontos
      }));
    } catch (error) {
      console.error('Erro ao salvar localmente:', error);
    }
  }

  carregarLocalmente() {
    try {
      const saved = localStorage.getItem(this.localStorageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.trajetoAtivo = data.trajetoAtivo;
        this.pontos = data.pontos || [];
        return data;
      }
    } catch (error) {
      console.error('Erro ao carregar localmente:', error);
    }
    return null;
  }

  limparLocal() {
    localStorage.removeItem(this.localStorageKey);
    this.pontos = [];
  }

  async sincronizarOffline() {
    const saved = this.carregarLocalmente();
    if (!saved || !saved.trajetoAtivo) return;

    // Sincronizar com Firebase
    if (navigator.onLine) {
      try {
        // Verificar se trajeto já existe
        let trajetoRef;
        if (saved.trajetoAtivo.firebaseId) {
          trajetoRef = doc(db, 'trajetos', saved.trajetoAtivo.firebaseId);
        } else {
          trajetoRef = await addDoc(collection(db, 'trajetos'), {
            motoristaId: saved.trajetoAtivo.motoristaId,
            onibusId: saved.trajetoAtivo.onibusId,
            rotaId: saved.trajetoAtivo.rotaId,
            inicio: serverTimestamp(),
            status: 'ativo',
            pontos: saved.pontos
          });
          saved.trajetoAtivo.firebaseId = trajetoRef.id;
        }

        // Atualizar pontos
        await updateDoc(trajetoRef, {
          pontos: saved.pontos,
          ultimaAtualizacao: serverTimestamp()
        });

        // Limpar após sincronização
        this.limparLocal();
        
        return { success: true, trajetoId: trajetoRef.id };
      } catch (error) {
        console.error('Erro na sincronização:', error);
        return { success: false, error };
      }
    }
  }

  async buscarHistorico(motoristaId, dataInicio, dataFim) {
    const q = query(
      collection(db, 'trajetos'),
      where('motoristaId', '==', motoristaId),
      where('inicio', '>=', dataInicio),
      where('inicio', '<=', dataFim),
      orderBy('inicio', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  gerarRelatorio(trajeto) {
    return {
      id: trajeto.id,
      motoristaId: trajeto.motoristaId,
      onibusId: trajeto.onibusId,
      rotaId: trajeto.rotaId,
      inicio: trajeto.inicio,
      fim: trajeto.fim,
      duracao: trajeto.duracao,
      distanciaTotal: trajeto.distanciaTotal,
      velocidadeMedia: this.calcularVelocidadeMedia(trajeto),
      numeroPontos: trajeto.pontos.length
    };
  }

  calcularVelocidadeMedia(trajeto) {
    if (!trajeto.pontos || trajeto.pontos.length === 0) return 0;
    
    const velocidades = trajeto.pontos
      .filter(p => p.velocidade > 0)
      .map(p => p.velocidade);
    
    if (velocidades.length === 0) return 0;
    
    const soma = velocidades.reduce((a, b) => a + b, 0);
    return soma / velocidades.length;
  }

  exportarGPX(trajeto) {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AC Transporte">
  <trk>
    <name>${trajeto.rotaId}</name>
    <trkseg>`;

    trajeto.pontos.forEach(ponto => {
      gpx += `
      <trkpt lat="${ponto.lat}" lon="${ponto.lng}">
        <time>${new Date(ponto.timestamp).toISOString()}</time>
        <speed>${ponto.velocidade || 0}</speed>
      </trkpt>`;
    });

    gpx += `
    </trkseg>
  </trk>
</gpx>`;

    return gpx;
  }
}

export const trajetoHistory = new TrajetoHistory();

// Service Worker para background sync
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    // Registrar sync para trajetos offline
    if ('sync' in registration) {
      registration.sync.register('sync-trajetos');
    }
  });
}

// Background GPS Tracking
export function iniciarBackgroundTracking() {
  if (!('serviceWorker' in navigator)) return;

  // Registrar Service Worker para background tracking
  navigator.serviceWorker.register('/service-worker-gps.js').then(registration => {
    console.log('Service Worker registrado para background tracking');
    
    // Solicitar permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Iniciar background sync se suportado
    if ('backgroundFetch' in registration) {
      console.log('Background Fetch suportado');
    }
  }).catch(error => {
    console.error('Erro ao registrar Service Worker:', error);
  });
}

// Listener para mudança de conexão
window.addEventListener('online', () => {
  trajetoHistory.sincronizarOffline().then(result => {
    if (result.success) {
      console.log('Trajetos offline sincronizados');
    }
  });
});
