// maps.js
import { UI } from './ui.js';

let map = null;
let markers = {};
let routePolylines = {}; // Para armazenar as linhas de trajeto de cada motorista
let wakeLock = null;

export const Maps = {
  init: () => {
    if (map) return;
    map = L.map('map').setView([-14.235, -51.925], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    
    // Expõe a instância do mapa globalmente para ser acessada por onclicks no HTML
    window.mapInstance = map;
  },

  abrirMapa: () => {
    document.getElementById('mapaContainer').classList.remove('hidden');
    setTimeout(() => map.invalidateSize(), 300);
  },

  fecharMapa: () => {
    document.getElementById('mapaContainer').classList.add('hidden');
  },

  atualizarMarcadorMotorista: (id, dados) => {
    const { latitude, longitude, motorista, onibus, rota } = dados;
    
    // Atualiza ou cria marcador
    if (markers[id]) {
      markers[id].setLatLng([latitude, longitude]);
      markers[id].setPopupContent(`<b>${rota}</b><br>${motorista}<br>${onibus}`);
    } else {
      const busIcon = L.divIcon({
        html: '<i class="fas fa-bus" style="font-size:24px;color:#b00000;text-shadow:1px 1px 2px white"></i>',
        className: 'custom-bus-icon',
        iconSize: [30, 30], iconAnchor: [15, 15]
      });
      markers[id] = L.marker([latitude, longitude], { icon: busIcon })
        .addTo(map)
        .bindPopup(`<b>${rota}</b><br>${motorista}<br>${onibus}`);
    }

    // Desenha o rastro (Polyline)
    if (!routePolylines[id]) {
      routePolylines[id] = L.polyline([], { color: 'blue', weight: 4 }).addTo(map);
    }
    routePolylines[id].addLatLng([latitude, longitude]);
  },

  focarNoOnibus: (lat, lng) => {
    map.setView([lat, lng], 16);
  },

  ativarWakeLock: async () => {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
  },

  desativarWakeLock: () => {
    if (wakeLock) { wakeLock.release(); wakeLock = null; }
  }
};
