// modules/location.js - RASTREAMENTO DE LOCALIZAÇÃO EM TEMPO REAL
import { db, updateLocalizacao } from '../firebase.js';
import { getEstadoApp, setEstadoApp } from '../app.js';
import { showLoading, hideLoading, mostrarNotificacao } from './ui.js';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variáveis para rastreamento de trajeto
let historicoTrajeto = [];
let distanciaTotal = 0;
let ultimaLocalizacao = null;
let backgroundTracking = false;
let routePolyline = null;

export function initLocationTracking() {
  console.log('📍 Módulo de localização inicializado');
  
  // Inicializar Service Worker para background tracking
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    initBackgroundSync();
  }
  
  // Iniciar monitoramento de conectividade
  window.addEventListener('online', sincronizarDadosOffline);
  
  // Configurar watchPosition para funcionar em background
  if ('wakeLock' in navigator) {
    requestWakeLock();
  }
}

// Função principal para iniciar rastreamento contínuo
export async function iniciarRastreamentoContinuo(nomeRota) {
  const estado = getEstadoApp();
  
  if (!estado.motorista || !estado.onibusAtivo) {
    mostrarNotificacao('❌ Erro', 'Motorista ou ônibus não configurado');
    return false;
  }
  
  console.log(`🛣️ Iniciando rastreamento contínuo da rota: ${nomeRota}`);
  
  // Solicitar permissões necessárias
  if (!await solicitarPermissoesBackground()) {
    mostrarNotificacao('⚠️ Permissão Necessária', 'Permita o acesso à localização em segundo plano');
    return false;
  }
  
  try {
    // Configurar opções de alta precisão
    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
      distanceFilter: 10 // Atualizar a cada 10 metros
    };
    
    // Iniciar watchPosition
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        processarLocalizacao(position, nomeRota);
      },
      (error) => {
        console.error('Erro no rastreamento:', error);
        tratarErroLocalizacao(error);
      },
      options
    );
    
    // Salvar watchId no estado
    setEstadoApp({ 
      watchId: watchId,
      rotaAtiva: nomeRota 
    });
    
    // Iniciar gravação do histórico
    iniciarGravarHistorico(nomeRota);
    
    // Ativar modo background
    ativarModoBackground();
    
    mostrarNotificacao('✅ Rastreamento Ativado', 'Sua localização está sendo rastreada em tempo real');
    
    return true;
    
  } catch (error) {
    console.error('Erro ao iniciar rastreamento:', error);
    mostrarNotificacao('❌ Erro', 'Não foi possível iniciar o rastreamento');
    return false;
  }
}

// Processar cada atualização de localização
async function processarLocalizacao(position, nomeRota) {
  const estado = getEstadoApp();
  const coords = position.coords;
  
  console.log('📍 Nova localização:', {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy,
    speed: coords.speed,
    timestamp: new Date().toISOString()
  });
  
  // Calcular distância percorrida
  if (ultimaLocalizacao) {
    const distancia = calcularDistancia(
      ultimaLocalizacao.latitude,
      ultimaLocalizacao.longitude,
      coords.latitude,
      coords.longitude
    );
    
    distanciaTotal += distancia;
    
    // Adicionar ao histórico
    historicoTrajeto.push({
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: new Date(),
      accuracy: coords.accuracy,
      speed: coords.speed || 0,
      distancia: distancia
    });
    
    // Limitar histórico a 1000 pontos
    if (historicoTrajeto.length > 1000) {
      historicoTrajeto = historicoTrajeto.slice(-1000);
    }
  }
  
  ultimaLocalizacao = coords;
  
  // Preparar dados para envio
  const dadosLocalizacao = {
    motorista: estado.motorista.nome,
    matricula: estado.motorista.matricula,
    email: estado.motorista.email || '',
    rota: nomeRota,
    onibus: estado.onibusAtivo.placa,
    tag_ac: estado.onibusAtivo.tag_ac,
    tag_vale: estado.onibusAtivo.tag_vale,
    modelo: estado.onibusAtivo.empresa,
    capacidade: 50,
    latitude: coords.latitude,
    longitude: coords.longitude,
    velocidade: coords.speed ? (coords.speed * 3.6).toFixed(1) : '0',
    precisao: coords.accuracy,
    distancia: distanciaTotal.toFixed(2),
    ativo: true,
    timestamp: new Date(),
    online: true,
    ultimaAtualizacao: new Date(),
    historico: historicoTrajeto.slice(-50) // Últimos 50 pontos
  };
  
  try {
    // Tentar enviar para Firebase
    await updateLocalizacao(estado.motorista.matricula, dadosLocalizacao);
    
    // Salvar localmente para backup
    salvarLocalmente(dadosLocalizacao);
    
    // Atualizar UI se visível
    if (document.visibilityState === 'visible') {
      atualizarUIEmTempoReal(dadosLocalizacao);
    }
    
  } catch (error) {
    console.warn('Erro ao enviar localização, salvando localmente:', error);
    salvarLocalmente(dadosLocalizacao);
  }
}

// Função para parar rastreamento
export function pararRastreamento() {
  const estado = getEstadoApp();
  
  if (estado.watchId) {
    navigator.geolocation.clearWatch(estado.watchId);
    setEstadoApp({ watchId: null, rotaAtiva: null });
  }
  
  // Salvar trajeto completo
  salvarTrajetoCompleto();
  
  // Limpar variáveis
  historicoTrajeto = [];
  distanciaTotal = 0;
  ultimaLocalizacao = null;
  
  // Desativar modo background
  desativarModoBackground();
  
  mostrarNotificacao('⏹️ Rastreamento Parado', 'Localização não está mais sendo rastreada');
}

// Calcular distância entre dois pontos (Haversine)
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

// Salvar dados localmente (IndexedDB)
function salvarLocalmente(dados) {
  if (!('indexedDB' in window)) {
    return localStorage.setItem('ultima_localizacao', JSON.stringify(dados));
  }
  
  // Implementação com IndexedDB seria aqui
  const pendingData = JSON.parse(localStorage.getItem('pending_locations') || '[]');
  pendingData.push(dados);
  localStorage.setItem('pending_locations', JSON.stringify(pendingData.slice(-100)));
}

// Sincronizar dados offline quando online
async function sincronizarDadosOffline() {
  const pendingData = JSON.parse(localStorage.getItem('pending_locations') || '[]');
  
  if (pendingData.length === 0) return;
  
  console.log(`📡 Sincronizando ${pendingData.length} localizações pendentes`);
  
  for (const data of pendingData) {
    try {
      await updateLocalizacao(data.matricula, data);
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    }
  }
  
  localStorage.removeItem('pending_locations');
}

// Solicitar permissões para background
async function solicitarPermissoesBackground() {
  if (!('permissions' in navigator)) return true;
  
  try {
    const permissionStatus = await navigator.permissions.query({
      name: 'background-fetch'
    });
    
    if (permissionStatus.state === 'granted') {
      return true;
    } else if (permissionStatus.state === 'prompt') {
      // Solicitar permissão
      return await new Promise((resolve) => {
        mostrarNotificacao('🔔 Permissão', 'Permita o rastreamento em segundo plano');
        setTimeout(() => resolve(true), 1000);
      });
    }
    
    return false;
  } catch (error) {
    console.warn('Permissões API não suportada:', error);
    return true;
  }
}

// Iniciar gravação do histórico
function iniciarGravarHistorico(nomeRota) {
  const estado = getEstadoApp();
  
  const trajeto = {
    motorista: estado.motorista.nome,
    matricula: estado.motorista.matricula,
    onibus: estado.onibusAtivo.placa,
    rota: nomeRota,
    inicio: new Date(),
    pontos: [],
    distanciaTotal: 0
  };
  
  localStorage.setItem('trajeto_ativo', JSON.stringify(trajeto));
}

// Salvar trajeto completo
async function salvarTrajetoCompleto() {
  const trajetoAtivo = JSON.parse(localStorage.getItem('trajeto_ativo') || '{}');
  
  if (!trajetoAtivo.inicio) return;
  
  trajetoAtivo.fim = new Date();
  trajetoAtivo.pontos = historicoTrajeto;
  trajetoAtivo.distanciaTotal = distanciaTotal;
  
  try {
    // Salvar no Firebase
    await addDoc(collection(db, 'historico_trajetos'), {
      ...trajetoAtivo,
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Trajeto salvo no histórico');
  } catch (error) {
    console.error('Erro ao salvar trajeto:', error);
    // Salvar localmente
    const historico = JSON.parse(localStorage.getItem('historico_trajetos') || '[]');
    historico.push(trajetoAtivo);
    localStorage.setItem('historico_trajetos', JSON.stringify(historico.slice(-50)));
  }
  
  localStorage.removeItem('trajeto_ativo');
}

// Ativar modo background
function ativarModoBackground() {
  backgroundTracking = true;
  
  // Request wake lock para manter CPU ativa
  if ('wakeLock' in navigator) {
    requestWakeLock();
  }
  
  // Configurar Service Worker para background sync
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.periodicSync.register('location-sync', {
        minInterval: 5 * 60 * 1000 // 5 minutos
      });
    });
  }
}

// Request wake lock
async function requestWakeLock() {
  try {
    const wakeLock = await navigator.wakeLock.request('screen');
    
    wakeLock.addEventListener('release', () => {
      console.log('Wake Lock foi liberado');
    });
    
    return wakeLock;
  } catch (err) {
    console.error(`${err.name}, ${err.message}`);
  }
}

// Tratar erros de localização
function tratarErroLocalizacao(error) {
  switch(error.code) {
    case error.PERMISSION_DENIED:
      mostrarNotificacao('❌ Permissão Negada', 'Ative a localização para continuar');
      break;
    case error.POSITION_UNAVAILABLE:
      mostrarNotificacao('⚠️ GPS Indisponível', 'Verifique as configurações de localização');
      break;
    case error.TIMEOUT:
      console.warn('Timeout do GPS');
      break;
    default:
      console.error('Erro desconhecido do GPS:', error);
  }
}

// Inicializar background sync
function initBackgroundSync() {
  navigator.serviceWorker.ready.then((registration) => {
    registration.periodicSync.getTags().then((tags) => {
      if (!tags.includes('location-sync')) {
        registration.periodicSync.register('location-sync', {
          minInterval: 5 * 60 * 1000 // 5 minutos
        });
      }
    });
  });
}

// Atualizar UI em tempo real
function atualizarUIEmTempoReal(dados) {
  // Atualizar elementos da UI se existirem
  const distanciaElement = document.getElementById('distanciaTotal');
  const velocidadeElement = document.getElementById('velocidadeAtual');
  
  if (distanciaElement) {
    distanciaElement.textContent = `${parseFloat(dados.distancia).toFixed(1)} km`;
  }
  
  if (velocidadeElement) {
    velocidadeElement.textContent = `${dados.velocidade} km/h`;
  }
}

// Exportar funções para uso global
window.iniciarRastreamentoContinuo = iniciarRastreamentoContinuo;
window.pararRastreamento = pararRastreamento;
