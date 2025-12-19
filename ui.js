// ui.js - Funções de interface do usuário
import { estadoApp } from './config.js';

// SweetAlert2 para modais profissionais
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js';

export function mostrarTela(id) {
  console.log('🔄 Mostrando tela:', id);
  
  document.querySelectorAll('.tela').forEach(tela => {
    tela.classList.add('hidden');
    tela.classList.remove('ativa');
  });
  
  const alvo = document.getElementById(id);
  if (!alvo) {
    console.error('Tela não encontrada:', id);
    return;
  }
  
  alvo.classList.remove('hidden');
  alvo.classList.add('ativa');
  
  switch(id) {
    case 'tela-rotas':
      setTimeout(() => carregarRotas(), 100);
      break;
    case 'tela-passageiro':
      iniciarMonitoramentoPassageiro();
      break;
    case 'tela-admin-dashboard':
      iniciarMonitoramentoAdmin();
      break;
    case 'tela-motorista':
      atualizarInfoMotorista();
      break;
    case 'tela-rotas-passageiro':
      carregarRotasPassageiro();
      break;
    case 'tela-relatorios':
      carregarRelatorios();
      atualizarListaOnlineUsers();
      break;
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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

export function mostrarNotificacao(titulo, mensagem, tipo = 'info') {
  // SweetAlert2 para notificações
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  Toast.fire({
    icon: tipo,
    title: titulo,
    text: mensagem
  });

  // Também mostrar notificação do navegador se permitido
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(titulo, {
      body: mensagem,
      icon: 'logo.jpg'
    });
  }
}

export function mostrarConfirmacao(titulo, texto, tipo = 'question') {
  return Swal.fire({
    title: titulo,
    text: texto,
    icon: tipo,
    showCancelButton: true,
    confirmButtonText: 'Sim',
    cancelButtonText: 'Não',
    confirmButtonColor: '#b00000',
    cancelButtonColor: '#6c757d'
  });
}

export function mostrarInput(titulo, texto, placeholder = '', tipo = 'text') {
  return Swal.fire({
    title: titulo,
    text: texto,
    input: tipo,
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#b00000',
    showLoaderOnConfirm: true,
    preConfirm: (value) => {
      if (!value) {
        Swal.showValidationMessage('Por favor, preencha este campo');
      }
      return value;
    }
  });
}

// Funções de tema
export function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedPreference = localStorage.getItem('ac_dark');
  
  if (savedPreference === '1' || (!savedPreference && prefersDark.matches)) {
    document.body.classList.add('dark');
    updateDarkModeIcon(true);
  }
  
  darkToggle.addEventListener('click', toggleDarkMode);
  
  prefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('ac_dark')) {
      if (e.matches) {
        document.body.classList.add('dark');
        updateDarkModeIcon(true);
      } else {
        document.body.classList.remove('dark');
        updateDarkModeIcon(false);
      }
    }
  });
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('ac_dark', isDark ? '1' : '0');
  updateDarkModeIcon(isDark);
  
  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    darkToggle.style.transform = 'scale(0.95)';
    setTimeout(() => {
      darkToggle.style.transform = '';
    }, 150);
  }
}

function updateDarkModeIcon(isDark) {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  darkToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  darkToggle.setAttribute('title', isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro');
}

// PWA
export function initPWA() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;
  
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
    console.log('📱 PWA pode ser instalado');
  });
  
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      mostrarNotificacao('Info', 'Este aplicativo já está instalado ou não pode ser instalado.', 'info');
      return;
    }
    
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('✅ Usuário aceitou a instalação');
      installBtn.style.display = 'none';
      mostrarNotificacao('Sucesso', 'Aplicativo instalado com sucesso!', 'success');
    } else {
      console.log('❌ Usuário recusou a instalação');
      mostrarNotificacao('Info', 'Instalação cancelada.', 'info');
    }
    
    deferredPrompt = null;
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA instalado com sucesso');
    installBtn.style.display = 'none';
  });
  
  if (window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.style.display = 'none';
  }
}

// Skeleton loading
export function showSkeleton(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const skeletonHTML = `
    <div class="skeleton-container">
      ${Array(count).fill(0).map(() => `
        <div class="skeleton-card">
          <div class="skeleton-line" style="width: 70%; height: 20px;"></div>
          <div class="skeleton-line" style="width: 50%; height: 16px;"></div>
          <div class="skeleton-line" style="width: 30%; height: 14px;"></div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = skeletonHTML;
}

// Adicionar estilos de skeleton dinamicamente
const skeletonStyles = `
  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .skeleton-card {
    background: #f0f0f0;
    border-radius: 8px;
    padding: 16px;
    animation: pulse 1.5s infinite;
  }
  
  .skeleton-line {
    background: #e0e0e0;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  body.dark .skeleton-card {
    background: #2d2d44;
  }
  
  body.dark .skeleton-line {
    background: #3d3d5a;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = skeletonStyles;
document.head.appendChild(styleSheet);

// Exportar funções para uso global
window.mostrarTela = mostrarTela;
