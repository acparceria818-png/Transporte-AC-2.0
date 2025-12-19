// app.js - ARQUIVO PRINCIPAL (REFATORADO)
import { 
  verificarSessao,
  updateUserStatus,
  atualizarInfoOnibus,
  confirmarMatriculaMotorista,
  selecionarOnibus
} from './auth.js';

import {
  iniciarRota,
  pararRota
} from './maps.js';

import {
  mostrarTela,
  showLoading,
  hideLoading,
  mostrarNotificacao,
  initDarkMode,
  initPWA,
  initConnectionMonitor
} from './ui.js';

import {
  iniciarMonitoramentoAdmin,
  iniciarMonitoramentoEmergencias,
  iniciarMonitoramentoFeedbacks,
  iniciarMonitoramentoAvisos,
  carregarEscalas,
  carregarEscalaMotorista
} from './admin.js';

import { estadoApp } from './config.js';

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 AC Transporte Portal - Inicializando...');
  
  // Adicionar rodapé em todas as páginas
  adicionarRodape();
  
  // Verificar sessão existente
  verificarSessao();
  
  // Inicializar funcionalidades
  initDarkMode();
  initPWA();
  initEventListeners();
  initConnectionMonitor();
  initAvisos();
  iniciarMonitoramentoOnline();
  
  console.log('✅ Aplicativo inicializado com sucesso');
});

// ========== FUNÇÕES GLOBAIS ==========
window.entrarNoPortal = function () {
  mostrarTela('telaEscolhaPerfil');
};

window.selecionarPerfil = function (perfil) {
  console.log('👤 Perfil selecionado:', perfil);
  estadoApp.perfil = perfil;
  localStorage.setItem('perfil_ativo', perfil);

  if (perfil === 'motorista') {
    mostrarTela('tela-motorista-login');
  } else if (perfil === 'passageiro') {
    estadoApp.passageiro = { nome: 'Passageiro' };
    mostrarTela('tela-passageiro');
    iniciarMonitoramentoPassageiro();
    iniciarMonitoramentoAvisos();
  } else if (perfil === 'admin') {
    mostrarTela('tela-admin-login');
  }
};

window.logout = function () {
  if (estadoApp.watchId) {
    navigator.geolocation.clearWatch(estadoApp.watchId);
    estadoApp.watchId = null;
  }
  
  if (estadoApp.unsubscribeRotas) estadoApp.unsubscribeRotas();
  if (estadoApp.unsubscribeEmergencias) estadoApp.unsubscribeEmergencias();
  if (estadoApp.unsubscribeFeedbacks) estadoApp.unsubscribeFeedbacks();
  if (estadoApp.unsubscribeAvisos) estadoApp.unsubscribeAvisos();
  
  // Resetar estado
  Object.keys(estadoApp).forEach(key => {
    if (typeof estadoApp[key] === 'function') return;
    estadoApp[key] = null;
  });
  
  estadoApp.isOnline = navigator.onLine;
  estadoApp.perfil = null;
  
  localStorage.clear();
  
  const userStatus = document.getElementById('userStatus');
  if (userStatus) userStatus.style.display = 'none';
  
  const pararRotaBtn = document.getElementById('pararRotaBtn');
  if (pararRotaBtn) pararRotaBtn.style.display = 'none';
  
  const rotaStatus = document.getElementById('rotaStatus');
  if (rotaStatus) rotaStatus.textContent = 'Nenhuma rota ativa';
  
  mostrarTela('welcome');
  
  console.log('👋 Usuário deslogado');
};

// ========== FUNÇÕES DE MAPA ==========
window.abrirRotaNoMaps = function(nomeRota) {
  const rotas = {
    'ROTA ADM 01': 'https://www.google.com/maps/d/u/1/edit?mid=18BCgBpobp1Olzmzy0RnPCUEd7Vnkc5s&usp=sharing',
    'ROTA ADM 02': 'https://www.google.com/maps/d/u/1/edit?mid=1WxbIX8nw0xyGBLMvvi1SF3DRuwmZ5oM&usp=sharing',
    'ROTA 01': 'https://www.google.com/maps/d/u/1/edit?mid=1jCfFxq1ZwecS2IcHy7xGFLLgttsM-RQ&usp=sharing',
    'ROTA 02': 'https://www.google.com/maps/d/u/1/edit?mid=1LCvNJxWBbZ_chpbdn_lk_Dm6NPA194g&usp=sharing',
    'ROTA 03': 'https://www.google.com/maps/d/u/1/edit?mid=1bdwkrClh5AZml0mnDGlOzYcaR4w1BL0&usp=sharing',
    'ROTA 04': 'https://www.google.com/maps/d/u/1/edit?mid=1ejibzdZkhX2QLnP9YgvvHdQpZELFvXo&usp=sharing',
    'ROTA 05': 'https://www.google.com/maps/d/u/1/edit?mid=1L9xjAWFUupMc7eQbqVJz-SNWlYX5SHo&usp=sharing',
    'RETORNO OVERLAND - ROTA 01': 'https://www.google.com/maps/d/u/1/edit?mid=1ClQVIaRLOYYWHU7fvP87r1BVy85a_eg&usp=sharing',
    'RETORNO OVERLAND - ROTA 02': 'https://www.google.com/maps/d/u/1/edit?mid=1WOIMgeLgV01B8yk7HoX6tazdCHXQnok&usp=sharing'
  };
  
  const url = rotas[nomeRota];
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    alert('Rota não encontrada');
  }
};

// ========== FUNÇÕES AUXILIARES ==========
function adicionarRodape() {
  if (document.querySelector('.footer-dev')) return;
  
  const footer = document.createElement('footer');
  footer.className = 'footer-dev';
  footer.innerHTML = `
    <div class="footer-content">
      <span>Desenvolvido por Juan Sales</span>
      <div class="footer-contacts">
        <a href="tel:+5594992233753"><i class="fas fa-phone"></i> (94) 99223-3753</a>
        <a href="mailto:Juansalesadm@gmail.com"><i class="fas fa-envelope"></i> Juansalesadm@gmail.com</a>
      </div>
    </div>
  `;
  document.body.appendChild(footer);
}

function initEventListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
  
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.remove();
  });
}

function initAvisos() {
  const avisosBtn = document.getElementById('avisosBtn');
  if (avisosBtn) {
    avisosBtn.addEventListener('click', mostrarAvisos);
  }
}

// ========== MONITORAMENTO DE USUÁRIOS ONLINE ==========
function iniciarMonitoramentoOnline() {
  setInterval(async () => {
    await atualizarOnlineUsers();
  }, 30000);
  
  atualizarOnlineUsers();
}

async function atualizarOnlineUsers() {
  try {
    const snapshot = await getDocs(collection(db, 'rotas_em_andamento'));
    const onlineUsers = snapshot.docs
      .filter(doc => {
        const data = doc.data();
        return data.online === true && data.ativo !== false;
      })
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    
    estadoApp.onlineUsers = onlineUsers;
    
    const usuariosOnlineElement = document.getElementById('usuariosOnline');
    if (usuariosOnlineElement) {
      usuariosOnlineElement.textContent = onlineUsers.length;
    }
    
    if (document.getElementById('tela-relatorios')?.classList.contains('ativa')) {
      atualizarListaOnlineUsers();
    }
  } catch (error) {
    console.error('Erro ao buscar usuários online:', error);
  }
}

// ========== EXPORTAÇÕES PARA USO GLOBAL ==========
window.confirmarMatriculaMotorista = confirmarMatriculaMotorista;
window.selecionarOnibus = selecionarOnibus;
window.iniciarRota = iniciarRota;
window.pararRota = pararRota;
window.mostrarTela = mostrarTela;
window.carregarEscalaMotorista = carregarEscalaMotorista;
