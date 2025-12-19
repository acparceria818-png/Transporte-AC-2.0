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
    
