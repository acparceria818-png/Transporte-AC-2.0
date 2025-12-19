// modules/ui.js
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';

// Estado global
export let estadoApp = window.estadoApp || {};

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
  // SweetAlert2 para modais
  if (tipo === 'confirm') {
    return Swal.fire({
      title: titulo,
      text: mensagem,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#b00000',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sim',
      cancelButtonText: 'Cancelar'
    });
  }

  // Toastify para notificações rápidas
  if (typeof Toastify !== 'undefined') {
    Toastify({
      text: `${titulo}: ${mensagem}`,
      duration: 3000,
      gravity: 'top',
      position: 'right',
      backgroundColor: tipo === 'error' ? '#e74c3c' : 
                     tipo === 'success' ? '#27ae60' : 
                     tipo === 'warning' ? '#f39c12' : '#3498db',
      stopOnFocus: true
    }).showToast();
  } else {
    // Fallback para notificação nativa
    criarNotificacaoTela(titulo, mensagem, tipo);
  }
}

function criarNotificacaoTela(titulo, mensagem, tipo) {
  const notificacao = document.createElement('div');
  notificacao.className = `notificacao-tela notificacao-${tipo}`;
  notificacao.innerHTML = `
    <div class="notificacao-conteudo">
      <strong>${titulo}</strong>
      <p>${mensagem}</p>
    </div>
    <button onclick="this.parentElement.remove()">✕</button>
  `;
  
  document.body.appendChild(notificacao);
  
  setTimeout(() => {
    if (notificacao.parentElement) {
      notificacao.remove();
    }
  }, 5000);
}

export function adicionarRodape() {
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

export function atualizarInfoOnibus() {
  if (!estadoApp.motorista || !estadoApp.onibusAtivo) return;
  
  const userTags = document.querySelector('.user-tags');
  if (!userTags) return;
  
  userTags.innerHTML = `
    <span class="user-tag"><i class="fas fa-bus"></i> ${estadoApp.onibusAtivo.placa}</span>
    <span class="user-tag"><i class="fas fa-tag"></i> ${estadoApp.onibusAtivo.tag_ac}</span>
    <span class="user-tag"><i class="fas fa-id-card"></i> ${estadoApp.onibusAtivo.tag_vale}</span>
  `;
}

export function updateUserStatus(nome, matricula) {
  const userStatus = document.getElementById('userStatus');
  const userName = document.getElementById('userName');
  const motoristaNome = document.getElementById('motoristaNome');
  const motoristaMatricula = document.getElementById('motoristaMatricula');
  
  if (userStatus) userStatus.style.display = 'flex';
  if (userName) userName.textContent = nome;
  if (motoristaNome) motoristaNome.textContent = nome;
  if (motoristaMatricula) motoristaMatricula.textContent = matricula;
  
  atualizarInfoOnibus();
}

// Skeleton Loading
export function showSkeleton(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let skeletonHTML = '';
  for (let i = 0; i < count; i++) {
    skeletonHTML += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
      </div>
    `;
  }
  
  container.innerHTML = skeletonHTML;
}

// Adicionar CSS para skeleton
const skeletonCSS = `
.skeleton-card {
  background: #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  animation: pulse 1.5s infinite;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-title {
  height: 20px;
  width: 60%;
  margin-bottom: 12px;
}

.skeleton-text {
  height: 12px;
  width: 90%;
  margin-bottom: 8px;
}

.skeleton-text:last-child {
  width: 70%;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

body.dark .skeleton-card {
  background: #2d2d44;
}

body.dark .skeleton {
  background: linear-gradient(90deg, #2d2d44 25%, #3d3d5a 50%, #2d2d44 75%);
}
`;

// Adicionar CSS ao documento
if (!document.querySelector('#skeleton-css')) {
  const style = document.createElement('style');
  style.id = 'skeleton-css';
  style.textContent = skeletonCSS;
  document.head.appendChild(style);
}
