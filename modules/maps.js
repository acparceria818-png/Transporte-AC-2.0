// modules/maps.js
import { updateLocalizacao } from '../firebase.js';

// Estado global
export let estadoApp = window.estadoApp || {};

// Configuração do Leaflet (gratuito)
let map = null;
let routePolyline = null;
let busMarker = null;
let routeHistory = [];

export async function initMap(containerId = 'mapContainer', center = [-3.765, -38.536]) {
  // Criar container se não existir
  if (!document.getElementById(containerId)) {
    const container = document.createElement('div');
    container.id = containerId;
    container.className = 'map-container';
    container.style.cssText = 'width: 100%; height: 400px; border-radius: 12px;';
    document.querySelector('main').appendChild(container);
  }

  // Carregar Leaflet CSS e JS dinamicamente
  if (!document.querySelector('link[href*="leaflet"]')) {
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    const leafletJS = document.createElement('script');
    leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletJS.onload = () => {
      map = L.map(containerId).setView(center, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
    };
    document.head.appendChild(leafletJS);
  } else {
    map = L.map(containerId).setView(center, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  }
}

export function updateBusPosition(lat, lng, rotaNome, onibus) {
  if (!map) return;

  // Atualizar marcador do ônibus
  if (!busMarker) {
    busMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'bus-marker',
        html: '<i class="fas fa-bus" style="color: #b00000; font-size: 24px;"></i>',
        iconSize: [30, 30]
      })
    }).addTo(map);
    
    busMarker.bindPopup(`<strong>${onibus}</strong><br>${rotaNome}`).openPopup();
  } else {
    busMarker.setLatLng([lat, lng]);
  }

  // Adicionar ponto ao histórico
  routeHistory.push([lat, lng]);

  // Atualizar polyline da rota
  if (routePolyline) {
    map.removeLayer(routePolyline);
  }

  routePolyline = L.polyline(routeHistory, {
    color: '#b00000',
    weight: 4,
    opacity: 0.7
  }).addTo(map);

  // Ajustar view do mapa
  map.setView([lat, lng], map.getZoom());
}

export function clearMap() {
  if (map) {
    map.remove();
    map = null;
  }
  routeHistory = [];
  routePolyline = null;
  busMarker = null;
}

export async function enviarLocalizacaoTempoReal(nomeRota, coords) {
  if (!estadoApp.motorista || !estadoApp.onibusAtivo) return;

  // Calcular distância percorrida
  let distanciaKm = 0;
  if (estadoApp.ultimaLocalizacao) {
    const lat1 = estadoApp.ultimaLocalizacao.latitude;
    const lon1 = estadoApp.ultimaLocalizacao.longitude;
    const lat2 = coords.latitude;
    const lon2 = coords.longitude;
    
    distanciaKm = calcularDistancia(lat1, lon1, lat2, lon2);
  }
  
  // Atualizar distância total
  estadoApp.distanciaTotal = (estadoApp.distanciaTotal || 0) + distanciaKm;
  estadoApp.ultimaLocalizacao = coords;

  // Atualizar no mapa
  updateBusPosition(coords.latitude, coords.longitude, nomeRota, estadoApp.onibusAtivo.placa);

  const dadosAtualizacao = {
    motorista: estadoApp.motorista.nome,
    matricula: estadoApp.motorista.matricula,
    email: estadoApp.motorista.email,
    rota: nomeRota,
    onibus: estadoApp.onibusAtivo.placa,
    tag_ac: estadoApp.onibusAtivo.tag_ac,
    tag_vale: estadoApp.onibusAtivo.tag_vale,
    modelo: estadoApp.onibusAtivo.empresa,
    capacidade: 50,
    latitude: coords.latitude,
    longitude: coords.longitude,
    velocidade: coords.speed ? (coords.speed * 3.6).toFixed(1) : '0',
    precisao: coords.accuracy,
    distancia: estadoApp.distanciaTotal.toFixed(2),
    ativo: true,
    timestamp: new Date(),
    online: true,
    ultimaAtualizacao: new Date()
  };
  
  await updateLocalizacao(estadoApp.motorista.matricula, dadosAtualizacao);
  
  console.log('📍 Localização enviada:', new Date().toLocaleTimeString(), 
              'Distância:', estadoApp.distanciaTotal.toFixed(2), 'km',
              'Velocidade:', dadosAtualizacao.velocidade, 'km/h',
              'Precisão:', coords.accuracy.toFixed(0), 'm');
}

// Função para calcular distância entre dois pontos (Haversine formula)
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// GPS Tracker com Background Support
export class GPSTracker {
  constructor() {
    this.watchId = null;
    this.trackPoints = [];
    this.isTracking = false;
    this.backgroundPermission = false;
  }

  async startTracking(rotaNome, onDataUpdate) {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocalização não suportada');
    }

    // Solicitar permissões para background
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        this.backgroundPermission = permission.state === 'granted';
      } catch (error) {
        console.warn('Permissão de background não disponível:', error);
      }
    }

    return new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      };

      this.watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const coords = position.coords;
          this.trackPoints.push({
            lat: coords.latitude,
            lng: coords.longitude,
            timestamp: Date.now(),
            speed: coords.speed,
            accuracy: coords.accuracy
          });

          // Manter apenas últimos 1000 pontos para performance
          if (this.trackPoints.length > 1000) {
            this.trackPoints.shift();
          }

          // Salvar localmente para sincronização offline
          this.saveLocalTrack();

          // Chamar callback com dados
          if (onDataUpdate) {
            onDataUpdate(coords);
          }

          // Atualizar Firebase
          await enviarLocalizacaoTempoReal(rotaNome, coords);

          // Atualizar UI se estiver no foreground
          if (!document.hidden) {
            updateBusPosition(coords.latitude, coords.longitude, rotaNome, estadoApp.onibusAtivo?.placa);
          }
        },
        (error) => {
          console.error('Erro no GPS:', error);
          reject(error);
        },
        options
      );

      this.isTracking = true;
      resolve(this.watchId);
    });
  }

  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  saveLocalTrack() {
    try {
      localStorage.setItem('gps_track', JSON.stringify(this.trackPoints));
    } catch (error) {
      console.error('Erro ao salvar track local:', error);
    }
  }

  loadLocalTrack() {
    try {
      const saved = localStorage.getItem('gps_track');
      if (saved) {
        this.trackPoints = JSON.parse(saved);
        return this.trackPoints;
      }
    } catch (error) {
      console.error('Erro ao carregar track local:', error);
    }
    return [];
  }

  getTrackHistory() {
    return this.trackPoints;
  }

  clearHistory() {
    this.trackPoints = [];
    localStorage.removeItem('gps_track');
  }

  calculateTotalDistance() {
    if (this.trackPoints.length < 2) return 0;
    
    let total = 0;
    for (let i = 1; i < this.trackPoints.length; i++) {
      const p1 = this.trackPoints[i-1];
      const p2 = this.trackPoints[i];
      total += calcularDistancia(p1.lat, p1.lng, p2.lat, p2.lng);
    }
    return total;
  }

  getTrackAsPolyline() {
    return this.trackPoints.map(p => [p.lat, p.lng]);
  }
}

export const gpsTracker = new GPSTracker();
