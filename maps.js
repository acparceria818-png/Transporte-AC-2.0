// maps.js
import { UI } from './ui.js';

let map = null;
let markers = {}; // Armazena marcadores dos motoristas
let myRoutePolyline = null; // Linha do trajeto do motorista atual
let routePath = []; // Array de coordenadas [lat, lng]
let wakeLock = null; // Para manter a tela ligada

export const Maps = {
  // Inicializa o mapa (Leaflet)
  init: () => {
    if (map) return;
    // Cria o mapa centrado no Brasil (será ajustado depois)
    map = L.map('map').setView([-14.235, -51.925], 4);
    
    // Adiciona camada do OpenStreetMap (Grátis)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
  },

  // Abre o mapa em tela cheia
  abrirMapa: () => {
    document.getElementById('mapaContainer').classList.remove('hidden');
    setTimeout(() => { map.invalidateSize(); }, 300); // Corrige renderização
  },

  fecharMapa: () => {
    document.getElementById('mapaContainer').classList.add('hidden');
  },

  // Atualiza marcador de um motorista no mapa (Para o passageiro)
  atualizarMarcadorMotorista: (id, dados) => {
    const { latitude, longitude, motorista, onibus, rota } = dados;
    
    if (markers[id]) {
      // Atualiza posição com animação suave se possível
      markers[id].setLatLng([latitude, longitude]);
      markers[id].bindPopup(`<b>${motorista}</b><br>${onibus}<br>${rota}`);
    } else {
      // Cria novo ícone de ônibus
      const busIcon = L.divIcon({
        html: '<i class="fas fa-bus" style="font-size:24px;color:#b00000;text-shadow: 2px 2px 2px white;"></i>',
        className: 'custom-bus-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      markers[id] = L.marker([latitude, longitude], { icon: busIcon })
        .addTo(map)
        .bindPopup(`<b>${motorista}</b><br>${onibus}<br>${rota}`);
    }
  },

  // MOTORISTA: Inicia o rastro da rota (Polyline)
  iniciarRastro: (lat, lng) => {
    routePath = [[lat, lng]]; // Reinicia caminho
    if (myRoutePolyline) map.removeLayer(myRoutePolyline);
    
    // Cria a linha azul no mapa
    myRoutePolyline = L.polyline(routePath, { color: 'blue', weight: 4 }).addTo(map);
    map.setView([lat, lng], 16);
    Maps.ativarWakeLock();
  },

  // MOTORISTA: Adiciona ponto ao rastro
  adicionarPontoRastro: (lat, lng) => {
    routePath.push([lat, lng]);
    if (myRoutePolyline) {
      myRoutePolyline.setLatLngs(routePath);
      map.setView([lat, lng]); // Segue o motorista
    }
  },

  // Impede que a tela desligue (Crucial para GPS em background)
  ativarWakeLock: async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('💡 Tela mantida ligada para GPS');
      }
    } catch (err) {
      console.warn('Wake Lock falhou:', err);
    }
  },

  desativarWakeLock: () => {
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
    }
  }
};
