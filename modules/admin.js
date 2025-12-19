// admin.js - Painel administrativo e gestão
import { estadoApp } from './config.js';
import {
  monitorarRotas,
  monitorarEmergencias,
  monitorarFeedbacks,
  monitorarAvisos,
  getEscalas,
  getEstatisticasDashboard,
  registrarAviso,
  updateAviso,
  deleteAviso,
  addEscala,
  updateEscala,
  deleteEscala,
  resolverEmergencia,
  resolverFeedback,
  responderFeedback,
  getRotasDinamicas,
  getOnibusDinamicos
} from './firebase.js';
import { mostrarNotificacao, mostrarConfirmacao, mostrarInput, showLoading, hideLoading } from './ui.js';

export function iniciarMonitoramentoAdmin() {
  if (estadoApp.unsubscribeRotas) return;
  
  estadoApp.unsubscribeRotas = monitorarRotas((rotas) => {
    const container = document.getElementById('adminRotasList');
    const countElement = document.getElementById('rotasAtivasCount');
    const motoristasAtivosElement = document.getElementById('motoristasAtivosCount');
    
    if (!container) return;
    
    const rotasAtivas = rotas.filter(r => r.ativo !== false && r.online !== false);
    
    if (countElement) {
      countElement.textContent = rotasAtivas.length;
    }
    
    if (motoristasAtivosElement) {
      const motoristasUnicos = [...new Set(rotasAtivas.map(r => r.matricula))];
      motoristasAtivosElement.textContent = motoristasUnicos.length;
    }
    
    if (rotasAtivas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚛</div>
          <h4>Nenhuma rota ativa</h4>
          <p>Nenhum motorista está compartilhando localização no momento.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = rotasAtivas.map(rota => `
      <div class="rota-admin-card ${rota.velocidade > 100 ? 'velocidade-alta' : ''}">
        <div class="rota-admin-header">
          <div>
            <strong>${rota.rota}</strong>
            <span class="onibus-tag">${rota.onibus} (${rota.tag_ac})</span>
          </div>
          <span class="status-badge ${rota.velocidade > 100 ? 'alerta' : 'ativo'}">
            ${rota.velocidade > 100 ? '⚡' : '✅'} ${rota.velocidade ? rota.velocidade + ' km/h' : 'Ativo'}
          </span>
        </div>
        
        <div class="rota-admin-info">
          <div class="info-row">
            <span>👤 Motorista:</span>
            <span>${rota.motorista} (${rota.matricula})</span>
          </div>
          <div class="info-row">
            <span>📍 Localização:</span>
            <span>${rota.latitude?.toFixed(6)}, ${rota.longitude?.toFixed(6)}</span>
          </div>
          <div class="info-row">
            <span>📏 Distância:</span>
            <span>${rota.distancia || '0'} km rodados</span>
          </div>
          <div class="info-row">
            <span>⏱️ Última atualização:</span>
            <span>${rota.ultimaAtualizacao ? new Date(rota.ultimaAtualizacao.toDate()).toLocaleTimeString() : '--:--'}</span>
          </div>
          <div class="info-row">
            <span>🎯 Precisão:</span>
            <span>${rota.precisao ? rota.precisao.toFixed(0) + 'm' : '--'}</span>
          </div>
        </div>
        
        <div class="rota-admin-actions">
          <button class="btn small" onclick="verMapaAdmin(${rota.latitude}, ${rota.longitude})">
            🗺️ Ver Mapa
          </button>
          <button class="btn small secondary" onclick="verDetalhesRota('${rota.matricula}')">
            📊 Detalhes
          </button>
          <button class="btn small warning" onclick="enviarNotificacaoMotorista('${rota.matricula}')">
            📢 Notificar
          </button>
        </div>
      </div>
    `).join('');
  });
}

export function iniciarMonitoramentoEmergencias() {
  if (estadoApp.unsubscribeEmergencias) return;
  
  estadoApp.unsubscribeEmergencias = monitorarEmergencias((emergencias) => {
    const container = document.getElementById('emergenciasList');
    const countElement = document.getElementById('emergenciasCount');
    
    if (!container) return;
    
    const emergenciasAtivas = emergencias.filter(e => e.status === 'pendente');
    
    if (countElement) {
      countElement.textContent = emergenciasAtivas.length;
    }
    
    if (emergenciasAtivas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <h4>Nenhuma emergência ativa</h4>
          <p>Todas as situações estão sob controle.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = emergenciasAtivas.map(emergencia => `
      <div class="emergencia-card">
        <div class="emergencia-header">
          <div class="emergencia-titulo">
            <span class="emergencia-icon">🚨</span>
            <strong>${emergencia.tipo}</strong>
          </div>
          <span class="tempo-decorrido">${calcularTempoDecorrido(emergencia.timestamp)}</span>
        </div>
        
        <div class="emergencia-info">
          <div class="info-row">
            <span>👤 Motorista:</span>
            <span>${emergencia.motorista} (${emergencia.matricula})</span>
          </div>
          <div class="info-row">
            <span>🚌 Ônibus:</span>
            <span>${emergencia.onibus}</span>
          </div>
          <div class="info-row">
            <span>🗺️ Rota:</span>
            <span>${emergencia.rota}</span>
          </div>
          <div class="info-row">
            <span>📝 Descrição:</span>
            <span>${emergencia.descricao}</span>
          </div>
        </div>
        
        <div class="emergencia-actions">
          <button class="btn small success" onclick="resolverEmergenciaAdmin('${emergencia.id}')">
            ✅ Resolver
          </button>
          <button class="btn small" onclick="contatarMotoristaAdmin('${emergencia.matricula}')">
            📞 Contatar
          </button>
          <button class="btn small warning" onclick="verLocalizacaoEmergencia('${emergencia.id}')">
            📍 Localização
          </button>
        </div>
      </div>
    `).join('');
  });
}

export function iniciarMonitoramentoFeedbacks() {
  if (estadoApp.unsubscribeFeedbacks) return;
  
  estadoApp.unsubscribeFeedbacks = monitorarFeedbacks((feedbacks) => {
    const container = document.getElementById('feedbacksList');
    const countElement = document.getElementById('feedbacksCount');
    
    if (!container) return;
    
    const feedbacksPendentes = feedbacks.filter(f => f.status === 'pendente');
    
    if (countElement) {
      countElement.textContent = feedbacksPendentes.length;
    }
    
    if (feedbacksPendentes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💭</div>
          <h4>Nenhum feedback pendente</h4>
          <p>Todos os feedbacks foram revisados.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = feedbacksPendentes.map(feedback => `
      <div class="feedback-card">
        <div class="feedback-header">
          <div>
            <span class="feedback-perfil">${feedback.perfil === 'motorista' ? '👤 Motorista' : '🧍 Passageiro'}</span>
            <span class="feedback-tipo ${feedback.tipo}">${feedback.tipo}</span>
          </div>
          <span class="tempo-decorrido">${calcularTempoDecorrido(feedback.timestamp)}</span>
        </div>
        
        <div class="feedback-mensagem">
          <p>${feedback.mensagem}</p>
        </div>
        
        ${feedback.motorista ? `
        <div class="feedback-info">
          <small>👤 ${feedback.motorista} ${feedback.matricula ? `(${feedback.matricula})` : ''}</small>
        </div>
        ` : ''}
        
        <div class="feedback-actions">
          <button class="btn small success" onclick="resolverFeedbackAdmin('${feedback.id}')">
            ✅ Resolver
          </button>
          <button class="btn small" onclick="responderFeedbackAdmin('${feedback.id}')">
            💬 Responder
          </button>
        </div>
      </div>
    `).join('');
  });
}

export function iniciarMonitoramentoAvisos() {
  if (estadoApp.unsubscribeAvisos) return;
  
  estadoApp.unsubscribeAvisos = monitorarAvisos((avisos) => {
    estadoApp.avisosAtivos = avisos;
    
    const avisosCount = document.getElementById('avisosCount');
    if (avisosCount) {
      avisosCount.textContent = avisos.length;
      avisosCount.style.display = avisos.length > 0 ? 'inline' : 'none';
    }
  });
}

// Gerenciamento de escalas
export async function carregarEscalas() {
  try {
    const escalas = await getEscalas();
    estadoApp.escalas = escalas;
  } catch (erro) {
    console.error('Erro ao carregar escalas:', erro);
  }
}

export async function carregarEscalaMotorista(matricula) {
  try {
    console.log('Buscando escala para matrícula:', matricula);
    
    const escalas = await getEscalas();
    console.log('Todas as escalas carregadas:', escalas);
    
    const escalaMotorista = escalas.find(escala => {
      const match = escala.matricula && escala.matricula.toString() === matricula.toString();
      if (match) {
        console.log('Escala encontrada:', escala);
      }
      return match;
    });
    
    if (escalaMotorista) {
      console.log('Escala encontrada para matrícula:', matricula);
      estadoApp.escalaMotorista = escalaMotorista;
      atualizarTelaEscala(escalaMotorista);
      
      mostrarNotificacao('✅ Escala Carregada', 'Sua escala foi carregada com sucesso!');
      
      return escalaMotorista;
    } else {
      console.log('Nenhuma escala encontrada para matrícula:', matricula);
      
      const container = document.querySelector('.escala-dias');
      if (container) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <i class="fas fa-calendar-times" style="font-size: 48px; color: #ff6b6b; margin-bottom: 16px;"></i>
            <h4>Nenhuma escala encontrada</h4>
            <p>Não foi encontrada uma escala para a matrícula <strong>${matricula}</strong>.</p>
            <p>Entre em contato com a administração para cadastrar sua escala.</p>
            <button class="btn btn-secondary" onclick="location.reload()">
              <i class="fas fa-redo"></i> Tentar Novamente
            </button>
          </div>
        `;
      }
      
      mostrarNotificacao('⚠️ Escala não encontrada', `Matrícula ${matricula} não possui escala cadastrada.`);
      
      return null;
    }
  } catch (erro) {
    console.error('Erro ao carregar escala do motorista:', erro);
    
    const container = document.querySelector('.escala-dias');
    if (container) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff6b6b; margin-bottom: 16px;"></i>
          <h4>Erro ao carregar escala</h4>
          <p>Ocorreu um erro ao carregar sua escala. Tente novamente.</p>
          <p><small>Erro: ${erro.message}</small></p>
          <button class="btn btn-secondary" onclick="location.reload()">
            <i class="fas fa-redo"></i> Tentar Novamente
          </button>
        </div>
      `;
    }
    
    mostrarNotificacao('❌ Erro', 'Não foi possível carregar sua escala. Tente novamente.');
    
    return null;
  }
}

function atualizarTelaEscala(escala) {
  const container = document.querySelector('.escala-dias');
  if (!container) {
    console.error('Container .escala-dias não encontrado');
    return;
  }
  
  if (!escala) {
    console.error('Escala é undefined ou null');
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-exclamation-circle"></i>
        <h4>Escala não disponível</h4>
        <p>Dados da escala não puderam ser carregados.</p>
      </div>
    `;
    return;
  }

  console.log('Atualizando tela com escala:', escala);
  
  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  
  if (!escala.dias || !Array.isArray(escala.dias)) {
    console.warn('Escala sem dias definidos ou estrutura inválida:', escala);
    escala.dias = [];
  }
  
  container.innerHTML = diasSemana.map(dia => {
    const diaEscala = escala.dias.find(d => {
      return d && d.dia && d.dia.trim().toLowerCase() === dia.toLowerCase();
    });
    
    console.log(`Dia ${dia}:`, diaEscala);
    
    return `
      <div class="dia-escala ${diaEscala ? '' : 'folga'}">
        <div class="dia-nome">${dia}</div>
        <div class="dia-info">
          ${diaEscala ? `
            <span class="turno ${getTurnoClass(diaEscala.horario)}">${diaEscala.horario || '00:00 - 00:00'}</span>
            <span class="rota">${diaEscala.rota || 'Sem rota'}</span>
            ${diaEscala.onibus ? `<small class="onibus-escala">${diaEscala.onibus}</small>` : ''}
          ` : `
            <span class="folga-text">FOLGA</span>
          `}
        </div>
      </div>
    `;
  }).join('');
  
  const infoHeader = document.querySelector('.escala-info');
  if (infoHeader && !infoHeader.querySelector('.escala-motorista-info')) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'escala-motorista-info';
    infoDiv.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Motorista:</strong> ${escala.motorista || 'Não informado'}
      </div>
      <div style="margin-bottom: 10px;">
        <strong>Matrícula:</strong> ${escala.matricula || 'Não informada'}
      </div>
      ${escala.periodo ? `
        <div>
          <strong>Período:</strong> ${escala.periodo}
        </div>
      ` : ''}
    `;
    infoHeader.appendChild(infoDiv);
  }
}

function getTurnoClass(horario) {
  if (!horario) return 'manha';
  if (horario.includes('06:00')) return 'manha';
  if (horario.includes('14:00')) return 'tarde';
  if (horario.includes('22:00')) return 'noite';
  return 'manha';
}

// Exportar funções para uso global
window.gerenciarAvisos = gerenciarAvisos;
window.gerenciarEscalas = gerenciarEscalas;
window.resolverEmergenciaAdmin = resolverEmergenciaAdmin;
window.resolverFeedbackAdmin = resolverFeedbackAdmin;
window.responderFeedbackAdmin = responderFeedbackAdmin;
