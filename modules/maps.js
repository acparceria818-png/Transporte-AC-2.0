// maps.js - Sistema de GPS e rastreamento de trajetos
import { estadoApp } from './config.js';
import { updateLocalizacao } from './firebase.js';
import { showLoading, hideLoading, mostrarNotificacao } from './ui.js';

// Armazenamento offline
const pontosRota = [];
const ROTA_HISTORY_KEY = 'rota_history';
const MAX_PONTOS_OFFLINE = 1000;

export async function iniciarRota(nomeRota) {
  console.log(`🛣️ Iniciando rota: ${nomeRota}`);
  
  if (!estadoApp.motorista || !estadoApp.onibusAtivo) {
    alert('❌ Motorista ou ônibus não configurado. Faça login novamente.');
    mostrarTela('tela-motorista-login');
    return;
  }

  if (!confirm(`🚀 Iniciar Rota: ${nomeRota}\n\nÔnibus: ${estadoApp.onibusAtivo.placa}\n\nSua localização será compartilhada em tempo real.`)) {
    return;
  }

  const btn = event?.target;
  const btnOriginalText = btn?.textContent || '▶️ Iniciar Rota';
  if (btn) {
    btn.classList.add('loading');
    btn.textContent = 'Obtendo localização...';
    btn.disabled = true;
  }

  try {
    let position;
    
    try {
      position = await obterLocalizacaoTempoReal();
      console.log('📍 Localização obtida:', position.coords);
    } catch (erro) {
      console.warn('❌ GPS falhou:', erro);
      alert('❌ Não foi possível obter localização precisa. Verifique as permissões do GPS e tente novamente.');
      if (btn) {
        btn.classList.remove('loading');
        btn.textContent = btnOriginalText;
        btn.disabled = false;
      }
      return;
    }
    
    // Limpar histórico anterior
    pontosRota.length = 0;
    
    // Enviar primeira localização
    await enviarLocalizacaoTempoReal(nomeRota, position.coords);
    
    // Iniciar monitoramento contínuo em background
    estadoApp.watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        await processarLocalizacao(pos, nomeRota);
      },
      (erro) => {
        console.warn('⚠️ Erro no monitoramento GPS:', erro);
        mostrarNotificacao('⚠️ GPS', 'Problema na obtenção da localização');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000
      }
    );
    
    // Configurar service worker para background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        return registration.sync.register('sync-rota');
      });
    }
    
    estadoApp.rotaAtiva = nomeRota;
    
    const rotaStatus = document.getElementById('rotaStatus');
    if (rotaStatus) {
      rotaStatus.textContent = `📍 Rota ativa: ${nomeRota}`;
      rotaStatus.classList.remove('simulada');
    }
    
    const pararBtn = document.getElementById('pararRotaBtn');
    if (pararBtn) pararBtn.style.display = 'block';
    
    mostrarNotificacao('✅ Rota Iniciada', `Rota "${nomeRota}" iniciada com sucesso!`);
    
    mostrarTela('tela-motorista');
    
    alert(`✅ Rota "${nomeRota}" iniciada com sucesso!\n\n📍 Localização ativa em tempo real\n🚌 Ônibus: ${estadoApp.onibusAtivo.placa}\n🎯 Precisão: ${position.coords.accuracy.toFixed(0)}m`);

  } catch (erro) {
    console.error('❌ Erro ao iniciar rota:', erro);
    alert(`❌ Não foi possível iniciar a rota:\n\n${erro.message || 'Erro desconhecido'}\n\nVerifique sua conexão e tente novamente.`);
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.textContent = btnOriginalText;
      btn.disabled = false;
    }
  }
}

async function processarLocalizacao(pos, nomeRota) {
  try {
    // Salvar ponto na rota
    const ponto = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: new Date().toISOString(),
      velocidade: pos.coords.speed || 0,
      precisao: pos.coords.accuracy
    };
    
    pontosRota.push(ponto);
    
    // Manter máximo de pontos em memória
    if (pontosRota.length > MAX_PONTOS_OFFLINE) {
      pontosRota.shift();
    }
    
    // Salvar no localStorage para histórico
    salvarPontoNoHistorico(ponto);
    
    // Enviar para Firebase
    await enviarLocalizacaoTempoReal(nomeRota, pos.coords);
    
  } catch (error) {
    console.error('Erro ao processar localização:', error);
  }
}

function salvarPontoNoHistorico(ponto) {
  try {
    const historico = JSON.parse(localStorage.getItem(ROTA_HISTORY_KEY) || '[]');
    historico.push(ponto);
    
    // Manter apenas os últimos 5000 pontos
    if (historico.length > 5000) {
      historico.splice(0, historico.length - 5000);
    }
    
    localStorage.setItem(ROTA_HISTORY_KEY, JSON.stringify(historico));
  } catch (error) {
    console.error('Erro ao salvar histórico:', error);
  }
}

async function enviarLocalizacaoTempoReal(nomeRota, coords) {
  if (!estadoApp.motorista || !estadoApp.onibusAtivo) return;

  try {
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
      ultimaAtualizacao: new Date(),
      // Adicionar histórico de pontos
      trajeto: pontosRota.slice(-50) // Últimos 50 pontos
    };
    
    await updateLocalizacao(estadoApp.motorista.matricula, dadosAtualizacao);
    
    console.log('📍 Localização enviada:', new Date().toLocaleTimeString(), 
                'Distância:', estadoApp.distanciaTotal.toFixed(2), 'km',
                'Velocidade:', dadosAtualizacao.velocidade, 'km/h',
                'Precisão:', coords.accuracy.toFixed(0), 'm',
                'Pontos rota:', pontosRota.length);
  } catch (erro) {
    console.error('Erro ao enviar localização:', erro);
    // Salvar localmente para envio posterior
    salvarLocalizacaoOffline(erro, nomeRota, coords);
  }
}

function salvarLocalizacaoOffline(erro, nomeRota, coords) {
  try {
    const dadosOffline = {
      matricula: estadoApp.motorista.matricula,
      nomeRota: nomeRota,
      coords: coords,
      timestamp: new Date().toISOString(),
      erro: erro.message
    };
    
    const offlineData = JSON.parse(localStorage.getItem('offline_gps_data') || '[]');
    offlineData.push(dadosOffline);
    
    // Limitar a 100 registros offline
    if (offlineData.length > 100) {
      offlineData.shift();
    }
    
    localStorage.setItem('offline_gps_data', JSON.stringify(offlineData));
    
    console.log('📴 Dados salvos offline:', offlineData.length, 'registros');
  } catch (error) {
    console.error('Erro ao salvar dados offline:', error);
  }
}

export async function pararRota() {
  if (!estadoApp.watchId) return;
  
  if (!confirm('Deseja realmente parar o compartilhamento da rota?')) {
    return;
  }
  
  navigator.geolocation.clearWatch(estadoApp.watchId);
  estadoApp.watchId = null;
  estadoApp.rotaAtiva = null;
  
  // Salvar rota finalizada no histórico
  salvarRotaCompleta();
  
  estadoApp.distanciaTotal = 0;
  estadoApp.ultimaLocalizacao = null;
  
  if (estadoApp.motorista) {
    try {
      await updateLocalizacao(estadoApp.motorista.matricula, {
        ativo: false,
        online: false,
        timestamp: new Date(),
        trajeto_finalizado: pontosRota
      });
    } catch (error) {
      console.error('Erro ao finalizar rota:', error);
    }
  }
  
  // Limpar pontos da rota atual
  pontosRota.length = 0;
  
  document.getElementById('rotaStatus').textContent = 'Nenhuma rota ativa';
  document.getElementById('pararRotaBtn').style.display = 'none';
  
  mostrarNotificacao('⏹️ Rota Encerrada', 'Localização não está mais sendo compartilhada.');
}

function salvarRotaCompleta() {
  if (pontosRota.length === 0) return;
  
  try {
    const rotaCompleta = {
      motorista: estadoApp.motorista?.nome,
      matricula: estadoApp.motorista?.matricula,
      onibus: estadoApp.onibusAtivo?.placa,
      rota: estadoApp.rotaAtiva,
      inicio: pontosRota[0]?.timestamp,
      fim: new Date().toISOString(),
      pontos: [...pontosRota],
      distancia_total: estadoApp.distanciaTotal
    };
    
    const rotasCompletas = JSON.parse(localStorage.getItem('rotas_completas') || '[]');
    rotasCompletas.push(rotaCompleta);
    
    // Manter apenas as últimas 50 rotas
    if (rotasCompletas.length > 50) {
      rotasCompletas.shift();
    }
    
    localStorage.setItem('rotas_completas', JSON.stringify(rotasCompletas));
    
    console.log('💾 Rota salva no histórico:', rotasCompletas.length, 'rotas salvas');
  } catch (error) {
    console.error('Erro ao salvar rota completa:', error);
  }
}

export function obterLocalizacaoTempoReal() {
  console.log('📍 Sistema GPS Tempo Real iniciado...');
  
  return new Promise((resolve, reject) => {
    const opcoesGPS = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('✅ GPS obtido em tempo real:', pos.coords);
        resolve(pos);
      },
      (err) => {
        console.warn('❌ GPS tempo real falhou:', err.message);
        reject(err);
      },
      opcoesGPS
    );
  });
}

// Exportar funções para uso global
window.iniciarRota = iniciarRota;
window.pararRota = pararRota;
