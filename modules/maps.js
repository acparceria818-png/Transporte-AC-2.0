// modules/maps.js - INTEGRAÇÃO COM MAPAS (Leaflet)
import { getEstadoApp } from '../app.js';
import { mostrarNotificacao } from './ui.js';

let mapa = null;
let marcadores = {};
let polylines = {};

export function initMaps() {
  console.log('🗺️ Módulo de mapas inicializado');
  
  // Carregar Leaflet CSS e JS dinamicamente
  if (!document.querySelector('#leaflet-css')) {
    const leafletCSS = document.createElement('link');
    leafletCSS.id = 'leaflet-css';
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);
    
    const leafletJS = document.createElement('script');
    leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletJS.onload = () => console.log('✅ Leaflet carregado');
    document.head.appendChild(leafletJS);
  }
}

// Inicializar mapa embutido
export function inicializarMapa(containerId, options = {}) {
  if (typeof L === 'undefined') {
    console.error('Leaflet não carregado');
    return null;
  }
  
  const defaultOptions = {
    center: [-5.09, -42.80], // Centro de Teresina
    zoom: 13,
    zoomControl: true,
    attributionControl: true,
    ...options
  };
  
  mapa = L.map(containerId, defaultOptions);
  
  // Adicionar tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(mapa);
  
  return mapa;
}

// Adicionar marcador de motorista
export function adicionarMarcadorMotorista(matricula, dados) {
  if (!mapa || !dados.latitude || !dados.longitude) return;
  
  // Remover marcador anterior se existir
  if (marcadores[matricula]) {
    mapa.removeLayer(marcadores[matricula]);
  }
  
  // Criar ícone personalizado
  const iconeMotorista = L.divIcon({
    className: 'marcador-motorista',
    html: `
      <div style="
        background: #b00000;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        <i class="fas fa-bus"></i>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
  
  // Adicionar marcador
  const marcador = L.marker([dados.latitude, dados.longitude], {
    icon: iconeMotorista,
    title: `${dados.motorista} - ${dados.onibus}`
  }).addTo(mapa);
  
  // Adicionar popup
  marcador.bindPopup(`
    <div style="min-width: 200px;">
      <strong>${dados.motorista}</strong><br>
      <small>Matrícula: ${dados.matricula}</small><br>
      <small>Ônibus: ${dados.onibus}</small><br>
      <small>Rota: ${dados.rota}</small><br>
      <small>Velocidade: ${dados.velocidade} km/h</small><br>
      <small>Distância: ${dados.distancia} km</small><br>
      <small>Atualizado: ${new Date(dados.ultimaAtualizacao).toLocaleTimeString()}</small>
    </div>
  `);
  
  marcadores[matricula] = marcador;
  
  // Centralizar no marcador se for o usuário atual
  const estado = getEstadoApp();
  if (estado.motorista && estado.motorista.matricula === matricula) {
    mapa.setView([dados.latitude, dados.longitude], 15);
  }
}

// Atualizar posição do marcador
export function atualizarMarcadorMotorista(matricula, novosDados) {
  if (!marcadores[matricula]) {
    adicionarMarcadorMotorista(matricula, novosDados);
    return;
  }
  
  const marcador = marcadores[matricula];
  marcador.setLatLng([novosDados.latitude, novosDados.longitude]);
  
  // Atualizar popup
  marcador.getPopup().setContent(`
    <div style="min-width: 200px;">
      <strong>${novosDados.motorista}</strong><br>
      <small>Matrícula: ${novosDados.matricula}</small><br>
      <small>Ônibus: ${novosDados.onibus}</small><br>
      <small>Rota: ${novosDados.rota}</small><br>
      <small>Velocidade: ${novosDados.velocidade} km/h</small><br>
      <small>Distância: ${novosDados.distancia} km</small><br>
      <small>Atualizado: ${new Date().toLocaleTimeString()}</small>
    </div>
  `);
}

// Adicionar linha de rota (polyline)
export function adicionarLinhaRota(rotaId, pontos, options = {}) {
  if (!mapa) return;
  
  const defaultOptions = {
    color: '#b00000',
    weight: 4,
    opacity: 0.7,
    ...options
  };
  
  // Converter pontos para formato [lat, lng]
  const latLngs = pontos.map(p => [p.latitude, p.longitude]);
  
  // Remover linha anterior se existir
  if (polylines[rotaId]) {
    mapa.removeLayer(polylines[rotaId]);
  }
  
  // Adicionar nova linha
  const polyline = L.polyline(latLngs, defaultOptions).addTo(mapa);
  polylines[rotaId] = polyline;
  
  return polyline;
}

// Mostrar histórico de trajeto
export function mostrarHistoricoTrajeto(trajetoId, dados) {
  if (!dados || !dados.pontos || dados.pontos.length === 0) {
    mostrarNotificacao('ℹ️ Informação', 'Nenhum histórico disponível');
    return;
  }
  
  // Criar container para o mapa
  const modal = document.createElement('div');
  modal.className = 'modal-back';
  modal.innerHTML = `
    <div class="modal xlarge">
      <button class="close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h3><i class="fas fa-history"></i> Histórico de Trajeto</h3>
      <div style="margin: 10px 0; display: flex; gap: 10px; flex-wrap: wrap;">
        <div class="info-badge">
          <i class="fas fa-user"></i> ${dados.motorista}
        </div>
        <div class="info-badge">
          <i class="fas fa-bus"></i> ${dados.onibus}
        </div>
        <div class="info-badge">
          <i class="fas fa-route"></i> ${dados.rota}
        </div>
        <div class="info-badge">
          <i class="fas fa-road"></i> ${parseFloat(dados.distanciaTotal || 0).toFixed(2)} km
        </div>
        <div class="info-badge">
          <i class="fas fa-clock"></i> ${new Date(dados.inicio).toLocaleString()}
        </div>
      </div>
      <div id="mapaHistorico" style="height: 400px; border-radius: 8px; margin: 15px 0;"></div>
      <div style="margin-top: 15px; display: flex; gap: 10px;">
        <button class="btn btn-primary" onclick="playbackTrajeto('${trajetoId}')">
          <i class="fas fa-play"></i> Playback
        </button>
        <button class="btn btn-secondary" onclick="exportarTrajeto('${trajetoId}')">
          <i class="fas fa-download"></i> Exportar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  
  // Inicializar mapa depois que o modal for exibido
  setTimeout(() => {
    const mapaHistorico = inicializarMapa('mapaHistorico', {
      center: [dados.pontos[0].latitude, dados.pontos[0].longitude],
      zoom: 13
    });
    
    // Adicionar linha do trajeto
    if (mapaHistorico) {
      adicionarLinhaRota('historico', dados.pontos, {
        color: '#3498db',
        weight: 3,
        opacity: 0.6
      });
      
      // Adicionar marcadores de início e fim
      const inicio = dados.pontos[0];
      const fim = dados.pontos[dados.pontos.length - 1];
      
      L.marker([inicio.latitude, inicio.longitude], {
        icon: L.divIcon({
          html: '<div style="background: #27ae60; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;"><i class="fas fa-play"></i></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(mapaHistorico).bindPopup('<strong>Início do trajeto</strong>');
      
      L.marker([fim.latitude, fim.longitude], {
        icon: L.divIcon({
          html: '<div style="background: #e74c3c; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;"><i class="fas fa-stop"></i></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(mapaHistorico).bindPopup('<strong>Fim do trajeto</strong>');
    }
  }, 100);
}

// Playback do trajeto
export function playbackTrajeto(trajetoId, dados) {
  if (!dados || !dados.pontos || dados.pontos.length === 0) return;
  
  // Implementar animação do playback
  console.log('Iniciando playback do trajeto:', trajetoId);
  // Implementação da animação seria aqui
}

// Exportar trajeto
export function exportarTrajeto(trajetoId, dados) {
  if (!dados) return;
  
  // Converter para GPX
  const gpx = converterParaGPX(dados);
  
  // Criar blob e download
  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trajeto-${trajetoId}-${new Date().toISOString().split('T')[0]}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  mostrarNotificacao('✅ Exportado', 'Trajeto exportado com sucesso');
}

// Converter para GPX
function converterParaGPX(dados) {
  const waypoints = dados.pontos.map((p, i) => `
    <trkpt lat="${p.latitude}" lon="${p.longitude}">
      <time>${new Date(p.timestamp).toISOString()}</time>
      <ele>0</ele>
      <speed>${p.speed || 0}</speed>
      <course>0</course>
      <name>Ponto ${i + 1}</name>
    </trkpt>
  `).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AC Transporte">
  <metadata>
    <name>Trajeto ${dados.rota}</name>
    <desc>${dados.motorista} - ${dados.onibus}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${dados.rota}</name>
    <trkseg>
      ${waypoints}
    </trkseg>
  </trk>
</gpx>`;
}

// Limpar mapa
export function limparMapa() {
  if (!mapa) return;
  
  // Remover todos os marcadores
  Object.values(marcadores).forEach(marcador => {
    mapa.removeLayer(marcador);
  });
  marcadores = {};
  
  // Remover todas as linhas
  Object.values(polylines).forEach(line => {
    mapa.removeLayer(line);
  });
  polylines = {};
}

// Exportar funções globais
window.inicializarMapa = inicializarMapa;
window.mostrarHistoricoTrajeto = mostrarHistoricoTrajeto;
window.playbackTrajeto = playbackTrajeto;
window.exportarTrajeto = exportarTrajeto;
window.limparMapa = limparMapa;
