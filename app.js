// app.js - ARQUIVO PRINCIPAL REFATORADO
import { initAuth } from './modules/auth.js';
import { initMaps } from './modules/maps.js';
import { initUI } from './modules/ui.js';
import { initAdmin } from './modules/admin.js';
import { initLocationTracking } from './modules/location.js';
import { initDatabase } from './modules/database.js';
import { initNotifications } from './modules/notifications.js';

// Estado global simplificado
let estadoApp = {
  user: null,
  perfil: null,
  rotaAtiva: null,
  onibusAtivo: null,
  watchId: null,
  isOnline: navigator.onLine
};

// Exportar estado para os módulos
export function getEstadoApp() {
  return estadoApp;
}

export function setEstadoApp(novoEstado) {
  estadoApp = { ...estadoApp, ...novoEstado };
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 AC Transporte Portal - Inicializando...');
  
  try {
    // Inicializar módulos na ordem correta
    await initDatabase();
    initUI();
    initAuth();
    initMaps();
    initAdmin();
    initLocationTracking();
    initNotifications();
    
    // Adicionar rodapé
    adicionarRodape();
    
    console.log('✅ Aplicativo inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
  }
});

// Função de rodapé mantida no principal
function adicionarRodape() {
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

// Exportar funções globais
window.getEstadoApp = getEstadoApp;
window.setEstadoApp = setEstadoApp;
