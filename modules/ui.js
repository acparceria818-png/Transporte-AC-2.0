// modules/ui.js - GERENCIAMENTO DE INTERFACE
import { getEstadoApp } from '../app.js';
import { carregarOnibus } from './database.js';

// Dados de exemplo (serão movidos para Firebase)
const ONIBUS_DISPONIVEIS = [
  { placa: 'TEZ-2J56', tag_ac: 'AC LO 583', tag_vale: '1JI347', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' },
  // ... outros ônibus
];

const ROTAS_DISPONIVEIS = [
  { id: 'adm01', nome: 'ROTA ADM 01', tipo: 'adm', desc: 'Rota administrativa 01', mapsUrl: 'https://...' },
  // ... outras rotas
];

export function initUI() {
  console.log('🎨 Módulo de UI inicializado');
  
  // Inicializar funcionalidades
  initDarkMode();
  initPWA();
  initEventListeners();
  initConnectionMonitor();
  
  // Adicionar estilos CSS dinâmicos
  adicionarEstilosDinamicos();
}

// Funções de navegação
export function mostrarTela(id) {
  console.log('🔄 Mostrando tela:', id);
  
  // Esconder todas as telas
  document.querySelectorAll('.tela').forEach(tela => {
    tela.classList.add('hidden');
    tela.classList.remove('ativa');
  });
  
  // Mostrar tela alvo
  const alvo = document.getElementById(id);
  if (!alvo) {
    console.error('Tela não encontrada:', id);
    return;
  }
  
  alvo.classList.remove('hidden');
  alvo.classList.add('ativa');
  
  // Executar ações específicas da tela
  executarAcoesTela(id);
  
  // Scroll para topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function executarAcoesTela(id) {
  switch(id) {
    case 'tela-rotas':
      setTimeout(() => carregarRotas(), 100);
      break;
    case 'tela-rotas-passageiro':
      carregarRotasPassageiro();
      break;
    case 'tela-admin-dashboard':
      iniciarMonitoramentoAdmin();
      break;
    case 'tela-motorista':
      atualizarInfoMotorista();
      break;
    case 'tela-relatorios':
      carregarRelatorios();
      break;
  }
}

// Funções de loading
export function showLoading(message = 'Carregando...') {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');
  
  if (overlay) overlay.style.display = 'flex';
  if (text) text.textContent = message;
}

export function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

// Notificações Toast
export function mostrarNotificacao(titulo, mensagem, tipo = 'info') {
  // Usar SweetAlert2 se disponível
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: titulo,
      text: mensagem,
      icon: tipo,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
    return;
  }
  
  // Fallback para notificações nativas
  criarNotificacaoTela(titulo, mensagem, tipo);
}

function criarNotificacaoTela(titulo, mensagem, tipo) {
  const tipos = {
    success: { bg: '#27ae60', icon: '✅' },
    error: { bg: '#e74c3c', icon: '❌' },
    warning: { bg: '#f39c12', icon: '⚠️' },
    info: { bg: '#3498db', icon: 'ℹ️' }
  };
  
  const config = tipos[tipo] || tipos.info;
  
  const notificacao = document.createElement('div');
  notificacao.className = 'notificacao-tela';
  notificacao.innerHTML = `
    <div class="notificacao-conteudo">
      <strong style="color: ${config.bg}">${config.icon} ${titulo}</strong>
      <p>${mensagem}</p>
    </div>
    <button onclick="this.parentElement.remove()">✕</button>
  `;
  
  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    max-width: 350px;
    border-left: 4px solid ${config.bg};
    animation: slideInRight 0.3s ease;
  `;
  
  document.body.appendChild(notificacao);
  
  setTimeout(() => {
    if (notificacao.parentElement) {
      notificacao.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notificacao.remove(), 300);
    }
  }, 5000);
}

// Modo escuro
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedPreference = localStorage.getItem('ac_dark');
  
  if (savedPreference === '1' || (!savedPreference && prefersDark.matches)) {
    document.body.classList.add('dark');
    updateDarkModeIcon(true);
  }
  
  darkToggle.addEventListener('click', toggleDarkMode);
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('ac_dark', isDark ? '1' : '0');
  updateDarkModeIcon(isDark);
}

function updateDarkModeIcon(isDark) {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  darkToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// PWA
function initPWA() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;
  
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
  });
  
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      installBtn.style.display = 'none';
    }
    
    deferredPrompt = null;
  });
}

// Monitoramento de conexão
function initConnectionMonitor() {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  updateOnlineStatus();
}

function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  const statusElement = document.getElementById('connectionStatus');
  const offlineBanner = document.getElementById('offlineBanner');
  
  if (statusElement) {
    statusElement.style.color = isOnline ? '#4CAF50' : '#FF5722';
    statusElement.title = isOnline ? 'Online' : 'Offline';
  }
  
  if (offlineBanner) {
    offlineBanner.style.display = isOnline ? 'none' : 'block';
  }
  
  if (!isOnline) {
    mostrarNotificacao('📶 Modo Offline', 'Algumas funcionalidades podem não estar disponíveis', 'warning');
  }
}

// Event listeners
function initEventListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.remove();
  });
}

// Estilos dinâmicos
function adicionarEstilosDinamicos() {
  const styles = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    
    .marcador-motorista {
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    .info-badge {
      background: #f0f0f0;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    
    body.dark .info-badge {
      background: #2d2d44;
    }
  `;
  
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Funções auxiliares
function atualizarInfoMotorista() {
  const estado = getEstadoApp();
  if (!estado.motorista) return;
  
  const nomeElement = document.getElementById('motoristaNome');
  const matriculaElement = document.getElementById('motoristaMatricula');
  
  if (nomeElement) nomeElement.textContent = estado.motorista.nome;
  if (matriculaElement) matriculaElement.textContent = estado.motorista.matricula;
}

// Exportar funções globais
window.mostrarTela = mostrarTela;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.mostrarNotificacao = mostrarNotificacao;
