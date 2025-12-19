// modules/admin.js - PAINEL ADMINISTRATIVO
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from '../firebase.js';
import { getEstadoApp } from '../app.js';
import { showLoading, hideLoading, mostrarNotificacao } from './ui.js';
import { getRotasDisponiveis, getOnibusDisponiveis } from './database.js';

export function initAdmin() {
  console.log('👨‍💼 Módulo administrativo inicializado');
  
  // Verificar se é admin
  const perfil = localStorage.getItem('perfil_ativo');
  const adminLogado = localStorage.getItem('admin_logado');
  
  if (perfil === 'admin' && adminLogado) {
    iniciarMonitoramentoAdmin();
  }
}

// Login admin
export function loginAdmin() {
  const email = document.getElementById('adminEmail').value;
  const senha = document.getElementById('adminSenha').value;
  
  // Credenciais temporárias (deveriam estar no Firebase)
  const ADMIN_CREDENTIALS = {
    email: 'admin@acparceria.com',
    senha: '050370'
  };
  
  if (email === ADMIN_CREDENTIALS.email && senha === ADMIN_CREDENTIALS.senha) {
    localStorage.setItem('admin_logado', 'true');
    localStorage.setItem('admin_email', email);
    localStorage.setItem('perfil_ativo', 'admin');
    
    const estado = getEstadoApp();
    estado.admin = { email, nome: 'Administrador' };
    
    mostrarTela('tela-admin-dashboard');
    iniciarMonitoramentoAdmin();
    
    mostrarNotificacao('✅ Sucesso', 'Login administrativo realizado', 'success');
    return true;
  } else {
    mostrarNotificacao('❌ Erro', 'Credenciais inválidas', 'error');
    return false;
  }
}

// Monitoramento admin
export function iniciarMonitoramentoAdmin() {
  // Monitorar rotas ativas
  monitorarRotasAtivas();
  
  // Monitorar emergências
  monitorarEmergencias();
  
  // Monitorar feedbacks
  monitorarFeedbacks();
}

function monitorarRotasAtivas() {
  const q = query(
    collection(db, 'rotas_em_andamento'),
    where("ativo", "==", true)
  );
  
  return onSnapshot(q, (snapshot) => {
    const rotasAtivas = [];
    snapshot.forEach((doc) => {
      rotasAtivas.push({ id: doc.id, ...doc.data() });
    });
    
    atualizarDashboardRotas(rotasAtivas);
  });
}

function atualizarDashboardRotas(rotasAtivas) {
  const container = document.getElementById('adminRotasList');
  const countElement = document.getElementById('rotasAtivasCount');
  
  if (!container) return;
  
  if (countElement) {
    countElement.textContent = rotasAtivas.length;
  }
  
  if (rotasAtivas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bus-slash"></i>
        <h4>Nenhuma rota ativa</h4>
        <p>Nenhum motorista está compartilhando localização no momento.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = rotasAtivas.map(rota => `
    <div class="rota-admin-card">
      <div class="rota-admin-header">
        <div>
          <strong>${rota.rota}</strong>
          <span class="onibus-tag">${rota.onibus}</span>
        </div>
        <span class="status-badge ativo">
          <i class="fas fa-circle"></i> Ativo
        </span>
      </div>
      
      <div class="rota-admin-info">
        <div class="info-row">
          <span>Motorista:</span>
          <span>${rota.motorista}</span>
        </div>
        <div class="info-row">
          <span>Localização:</span>
          <span>${rota.latitude?.toFixed(6)}, ${rota.longitude?.toFixed(6)}</span>
        </div>
        <div class="info-row">
          <span>Velocidade:</span>
          <span>${rota.velocidade || '0'} km/h</span>
        </div>
        <div class="info-row">
          <span>Última atualização:</span>
          <span>${rota.ultimaAtualizacao ? new Date(rota.ultimaAtualizacao.toDate()).toLocaleTimeString() : '--:--'}</span>
        </div>
      </div>
      
      <div class="rota-admin-actions">
        <button class="btn small" onclick="verDetalhesRota('${rota.id}')">
          <i class="fas fa-info-circle"></i> Detalhes
        </button>
        <button class="btn small warning" onclick="enviarNotificacaoMotorista('${rota.matricula}')">
          <i class="fas fa-bell"></i> Notificar
        </button>
      </div>
    </div>
  `).join('');
}

function monitorarEmergencias() {
  const q = query(
    collection(db, 'emergencias'),
    where("status", "==", "pendente"),
    orderBy("timestamp", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const emergencias = [];
    snapshot.forEach((doc) => {
      emergencias.push({ id: doc.id, ...doc.data() });
    });
    
    atualizarDashboardEmergencias(emergencias);
  });
}

function atualizarDashboardEmergencias(emergencias) {
  const container = document.getElementById('emergenciasList');
  const countElement = document.getElementById('emergenciasCount');
  
  if (!container) return;
  
  if (countElement) {
    countElement.textContent = emergencias.length;
  }
  
  if (emergencias.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle"></i>
        <h4>Nenhuma emergência</h4>
        <p>Todas as situações estão sob controle.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = emergencias.map(emergencia => `
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
          <span>Motorista:</span>
          <span>${emergencia.motorista}</span>
        </div>
        <div class="info-row">
          <span>Ônibus:</span>
          <span>${emergencia.onibus}</span>
        </div>
        <div class="info-row">
          <span>Descrição:</span>
          <span>${emergencia.descricao}</span>
        </div>
      </div>
      
      <div class="emergencia-actions">
        <button class="btn small success" onclick="resolverEmergencia('${emergencia.id}')">
          <i class="fas fa-check"></i> Resolver
        </button>
        <button class="btn small" onclick="contatarMotorista('${emergencia.matricula}')">
          <i class="fas fa-phone"></i> Contatar
        </button>
      </div>
    </div>
  `).join('');
}

// Funções auxiliares
function calcularTempoDecorrido(timestamp) {
  if (!timestamp) return 'Agora mesmo';
  
  const agora = new Date();
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = agora - data;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `${diffMins} min atrás`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

// Exportar funções globais
window.loginAdmin = loginAdmin;
window.iniciarMonitoramentoAdmin = iniciarMonitoramentoAdmin;
