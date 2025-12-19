// app.js - REFATORADO COM MÓDULOS
import { 
  db,
  auth,
  monitorarRotas,
  monitorarEmergencias,
  monitorarFeedbacks,
  monitorarAvisos,
  getEscalas,
  getEstatisticasDashboard
} from './firebase.js';

import { 
  loginMotorista, 
  fazerLogout, 
  verificarSessao,
  estadoApp as authEstado 
} from './modules/auth.js';

import { 
  initMap, 
  clearMap, 
  gpsTracker,
  enviarLocalizacaoTempoReal 
} from './modules/maps.js';

import { 
  mostrarTela, 
  showLoading, 
  hideLoading, 
  mostrarNotificacao,
  adicionarRodape,
  updateUserStatus,
  showSkeleton 
} from './modules/ui.js';

import { 
  carregarDadosDinamicos,
  renderizarOnibus,
  renderizarRotas,
  estadoApp as adminEstado 
} from './modules/admin.js';

import { 
  trajetoHistory,
  iniciarBackgroundTracking 
} from './modules/gps-tracker.js';

// Combinar estados
window.estadoApp = {
  ...authEstado,
  ...adminEstado,
  gpsTracker,
  trajetoHistory
};

// ========== MONITORAMENTO DE USUÁRIOS ONLINE ==========
function iniciarMonitoramentoOnline() {
  console.log('📡 Iniciando monitoramento de usuários online...');
  
  // Função para atualizar contador de usuários online
  async function atualizarContadorOnline() {
    try {
      const q = query(collection(db, 'rotas_em_andamento'), 
        where("ativo", "==", true),
        where("online", "==", true)
      );
      
      const snapshot = await getDocs(q);
      const usuariosOnline = snapshot.docs.length;
      
      // Atualizar no estado global
      estadoApp.onlineUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Atualizar na interface se o elemento existir
      const element = document.getElementById('usuariosOnline');
      if (element) {
        element.textContent = usuariosOnline;
      }
      
      // Se estiver na tela de relatórios, atualizar a lista completa
      if (document.getElementById('tela-relatorios')?.classList.contains('ativa')) {
        atualizarListaOnlineUsers();
      }
      
      console.log(`👥 Usuários online: ${usuariosOnline}`);
      
    } catch (error) {
      console.error('Erro ao contar usuários online:', error);
    }
  }
  
  // Função para atualizar lista completa de usuários online
  function atualizarListaOnlineUsers() {
    const container = document.getElementById('onlineUsersList');
    if (!container) return;
    
    if (estadoApp.onlineUsers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users-slash"></i>
          <h4>Nenhum usuário online</h4>
          <p>Nenhum motorista está ativo no momento.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="online-user-list">
        ${estadoApp.onlineUsers.map(user => `
          <div class="online-user-item">
            <span class="online-dot"></span>
            <div class="user-info">
              <strong>${user.motorista || 'Sem nome'}</strong>
              <small>${user.onibus || ''} ${user.rota ? '• ' + user.rota : ''}</small>
            </div>
            <small>${user.ultimaAtualizacao ? new Date(user.ultimaAtualizacao.toDate()).toLocaleTimeString() : ''}</small>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Atualizar a cada 30 segundos
  const intervalo = setInterval(() => {
    atualizarContadorOnline();
  }, 30000);
  
  // Primeira execução imediata
  setTimeout(() => atualizarContadorOnline(), 1000);
  
  // Guardar intervalo para limpar depois se necessário
  estadoApp.onlineInterval = intervalo;
  
  return intervalo;
}

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
  
  // Iniciar monitoramento online (AGORA A FUNÇÃO JÁ ESTÁ DEFINIDA)
  iniciarMonitoramentoOnline();
  
  console.log('✅ Aplicativo inicializado com sucesso');
});

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 AC Transporte Portal - Inicializando...');
  
  // Adicionar rodapé
  adicionarRodape();
  
  // Verificar sessão existente
  const sessao = verificarSessao();
  
  // Carregar dados dinâmicos
  await carregarDadosDinamicos();
  
  // Inicializar funcionalidades
  initDarkMode();
  initPWA();
  initEventListeners();
  initConnectionMonitor();
  initAvisos();
  iniciarMonitoramentoOnline();
  
  // Iniciar background tracking
  iniciarBackgroundTracking();
  
  console.log('✅ Aplicativo inicializado com sucesso');
});

// ========== FUNÇÕES GLOBAIS ==========
window.entrarNoPortal = function() {
  mostrarTela('telaEscolhaPerfil');
};

window.selecionarPerfil = function(perfil) {
  window.estadoApp.perfil = perfil;
  localStorage.setItem('perfil_ativo', perfil);

  if (perfil === 'motorista') {
    mostrarTela('tela-motorista-login');
  } else if (perfil === 'passageiro') {
    window.estadoApp.passageiro = { nome: 'Passageiro' };
    mostrarTela('tela-passageiro');
    iniciarMonitoramentoPassageiro();
    iniciarMonitoramentoAvisos();
  } else if (perfil === 'admin') {
    mostrarTela('tela-admin-login');
  }
};

window.confirmarMatriculaMotorista = async function() {
  showLoading('🔍 Validando matrícula...');
  
  const input = document.getElementById('matriculaMotorista');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!input) {
    mostrarNotificacao('Erro', 'Campo de matrícula não encontrado', 'error');
    hideLoading();
    return;
  }

  const matricula = input.value.trim().toUpperCase();

  if (!matricula) {
    mostrarNotificacao('Atenção', 'Informe sua matrícula', 'warning');
    input.focus();
    hideLoading();
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Validando...';
    
    const motorista = await loginMotorista(matricula);

    localStorage.setItem('motorista_matricula', matricula);
    localStorage.setItem('motorista_nome', motorista.nome);
    localStorage.setItem('motorista_email', motorista.email || '');
    localStorage.setItem('perfil_ativo', 'motorista');
    
    window.estadoApp.motorista = motorista;
    
    carregarOnibus();
    console.log('✅ Motorista autenticado:', motorista.nome);

  } catch (erro) {
    console.error('Erro Firebase:', erro);
    mostrarNotificacao('Erro', erro.message, 'error');
  } finally {
    hideLoading();
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  }
};

function carregarOnibus() {
  const container = document.getElementById('onibusList');
  if (!container || !window.estadoApp.onibusDisponiveis) return;
  
  container.innerHTML = window.estadoApp.onibusDisponiveis.map(onibus => `
    <div class="onibus-card" onclick="selecionarOnibus('${onibus.id || onibus.placa}')">
      <div class="onibus-icon">
        <i class="fas fa-bus"></i>
      </div>
      <div class="onibus-info">
        <h4>${onibus.placa}</h4>
        <p><strong>TAG AC:</strong> ${onibus.tag_ac}</p>
        <p><strong>TAG VALE:</strong> ${onibus.tag_vale}</p>
        <small><i class="fas fa-paint-brush"></i> ${onibus.cor}</small>
      </div>
      <div class="onibus-select">
        <i class="fas fa-chevron-right"></i>
      </div>
    </div>
  `).join('');
  
  mostrarTela('tela-selecao-onibus');
}

window.selecionarOnibus = function(onibusId) {
  const onibus = window.estadoApp.onibusDisponiveis.find(o => 
    (o.id === onibusId) || (o.placa === onibusId)
  );
  
  if (!onibus) {
    mostrarNotificacao('Erro', 'Ônibus não encontrado', 'error');
    return;
  }
  
  window.estadoApp.onibusAtivo = onibus;
  localStorage.setItem('onibus_ativo', JSON.stringify(onibus));
  
  // Solicitar permissão de localização
  solicitarPermissaoLocalizacao();
};

async function solicitarPermissaoLocalizacao() {
  if (!navigator.geolocation) {
    mostrarNotificacao('Atenção', 'Geolocalização não suportada', 'warning');
    finalizarLoginSemGPS();
    return;
  }
  
  showLoading('📍 Obtendo localização...');
  
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    
    hideLoading();
    finalizarLoginComGPS(position);
  } catch (error) {
    hideLoading();
    
    const confirm = await mostrarNotificacao(
      'Localização não disponível',
      'Deseja continuar sem GPS? Você pode ativá-lo depois.',
      'confirm'
    );
    
    if (confirm.isConfirmed) {
      finalizarLoginSemGPS();
    }
  }
}

function finalizarLoginComGPS(position) {
  if (!window.estadoApp.motorista || !window.estadoApp.onibusAtivo) return;
  
  updateUserStatus(window.estadoApp.motorista.nome, window.estadoApp.motorista.matricula);
  
  const onibusElement = document.getElementById('motoristaOnibus');
  if (onibusElement) {
    onibusElement.textContent = `${window.estadoApp.onibusAtivo.placa} (${window.estadoApp.onibusAtivo.tag_ac})`;
  }
  
  mostrarTela('tela-motorista');
  iniciarMonitoramentoAvisos();
  
  mostrarNotificacao(
    'Login realizado!',
    `👋 ${window.estadoApp.motorista.nome}<br>🚌 ${window.estadoApp.onibusAtivo.placa}<br>📍 GPS ativo`,
    'success'
  );
}

function finalizarLoginSemGPS() {
  if (!window.estadoApp.motorista || !window.estadoApp.onibusAtivo) return;
  
  updateUserStatus(window.estadoApp.motorista.nome, window.estadoApp.motorista.matricula);
  
  const onibusElement = document.getElementById('motoristaOnibus');
  if (onibusElement) {
    onibusElement.textContent = `${window.estadoApp.onibusAtivo.placa} (${window.estadoApp.onibusAtivo.tag_ac})`;
  }
  
  mostrarTela('tela-motorista');
  iniciarMonitoramentoAvisos();
  
  mostrarNotificacao(
    'Login realizado!',
    `👋 ${window.estadoApp.motorista.nome}<br>🚌 ${window.estadoApp.onibusAtivo.placa}`,
    'success'
  );
}

window.loginAdmin = async function() {
  const email = document.getElementById('adminEmail').value;
  const senha = document.getElementById('adminSenha').value;
  
  if (!email || !senha) {
    mostrarNotificacao('Atenção', 'Preencha e-mail e senha', 'warning');
    return;
  }
  
  const ADMIN_CREDENTIALS = {
    email: 'admin@acparceria.com',
    senha: '050370'
  };
  
  if (email === ADMIN_CREDENTIALS.email && senha === ADMIN_CREDENTIALS.senha) {
    localStorage.setItem('admin_logado', 'true');
    localStorage.setItem('admin_email', email);
    localStorage.setItem('perfil_ativo', 'admin');
    
    window.estadoApp.admin = { email, nome: 'Administrador' };
    
    mostrarTela('tela-admin-dashboard');
    iniciarMonitoramentoAdmin();
    iniciarMonitoramentoEmergencias();
    iniciarMonitoramentoFeedbacks();
    iniciarMonitoramentoAvisos();
    carregarEscalas();
    
    console.log('✅ Admin logado com sucesso');
  } else {
    mostrarNotificacao('Erro', 'Credenciais inválidas', 'error');
  }
};

window.logout = fazerLogout;

// ========== SISTEMA DE ROTAS COM RASTREAMENTO ==========
window.iniciarRota = async function(nomeRota, rotaId) {
  if (!window.estadoApp.motorista || !window.estadoApp.onibusAtivo) {
    mostrarNotificacao('Erro', 'Motorista ou ônibus não configurado', 'error');
    mostrarTela('tela-motorista-login');
    return;
  }

  const confirm = await mostrarNotificacao(
    `Iniciar Rota: ${nomeRota}`,
    `Ônibus: ${window.estadoApp.onibusAtivo.placa}<br>Sua localização será compartilhada em tempo real.`,
    'confirm'
  );

  if (!confirm.isConfirmed) return;

  const btn = event?.target;
  const btnOriginalText = btn?.textContent || '▶️ Iniciar Rota';
  if (btn) {
    btn.classList.add('loading');
    btn.textContent = 'Obtendo localização...';
    btn.disabled = true;
  }

  try {
    // Iniciar trajeto no histórico
    await window.estadoApp.trajetoHistory.iniciarTrajeto(
      window.estadoApp.motorista.matricula,
      window.estadoApp.onibusAtivo.id || window.estadoApp.onibusAtivo.placa,
      rotaId
    );

    // Iniciar rastreamento GPS em background
    await window.estadoApp.gpsTracker.startTracking(nomeRota, async (coords) => {
      // Adicionar ponto ao histórico
      await window.estadoApp.trajetoHistory.adicionarPonto(
        coords.latitude,
        coords.longitude,
        coords.speed,
        coords.accuracy
      );
    });

    window.estadoApp.rotaAtiva = nomeRota;
    
    const rotaStatus = document.getElementById('rotaStatus');
    if (rotaStatus) {
      rotaStatus.textContent = `📍 Rota ativa: ${nomeRota}`;
      rotaStatus.classList.remove('simulada');
    }
    
    const pararBtn = document.getElementById('pararRotaBtn');
    if (pararBtn) pararBtn.style.display = 'block';
    
    // Inicializar mapa
    await initMap('mapContainer');
    
    mostrarNotificacao('Rota Iniciada', `Rota "${nomeRota}" iniciada com sucesso!`, 'success');
    
    mostrarTela('tela-motorista');

  } catch (erro) {
    console.error('❌ Erro ao iniciar rota:', erro);
    mostrarNotificacao('Erro', `Não foi possível iniciar a rota: ${erro.message}`, 'error');
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.textContent = btnOriginalText;
      btn.disabled = false;
    }
  }
};

window.pararRota = async function() {
  const confirm = await mostrarNotificacao(
    'Parar Rota',
    'Deseja realmente parar o compartilhamento da rota?',
    'confirm'
  );

  if (!confirm.isConfirmed) return;

  // Parar rastreamento GPS
  window.estadoApp.gpsTracker.stopTracking();
  
  // Finalizar trajeto no histórico
  const trajetoFinalizado = await window.estadoApp.trajetoHistory.finalizarTrajeto();
  
  // Limpar mapa
  clearMap();

  window.estadoApp.rotaAtiva = null;
  window.estadoApp.distanciaTotal = 0;
  window.estadoApp.ultimaLocalizacao = null;

  document.getElementById('rotaStatus').textContent = 'Nenhuma rota ativa';
  document.getElementById('pararRotaBtn').style.display = 'none';

  mostrarNotificacao('Rota Encerrada', 'Localização não está mais sendo compartilhada.', 'success');
  
  // Mostrar resumo do trajeto
  if (trajetoFinalizado) {
    mostrarNotificacao(
      'Trajeto Finalizado',
      `Distância: ${trajetoFinalizado.distanciaTotal.toFixed(2)} km<br>
       Duração: ${formatarDuracao(trajetoFinalizado.duracao)}`,
      'info'
    );
  }
};

function formatarDuracao(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return `${horas}h ${minutos}m`;
}

// ========== MONITORAMENTO ==========
function iniciarMonitoramentoPassageiro() {
  if (window.estadoApp.unsubscribeRotas) return;
  
  window.estadoApp.unsubscribeRotas = monitorarRotas((rotas) => {
    const container = document.getElementById('rotasAtivasList');
    if (!container) return;
    
    const rotasAtivas = rotas.filter(r => r.ativo !== false && r.online !== false);
    
    if (rotasAtivas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-bus-slash"></i></div>
          <h4>Nenhuma rota ativa no momento</h4>
          <p>Não há motoristas compartilhando localização no momento.</p>
        </div>
      `;
      return;
    }
    
    // Agrupar por rota
    const rotasAgrupadas = {};
    rotasAtivas.forEach(rota => {
      if (!rotasAgrupadas[rota.rota]) {
        rotasAgrupadas[rota.rota] = [];
      }
      rotasAgrupadas[rota.rota].push(rota);
    });
    
    // Ordenar rotas: ADM primeiro, depois operacionais, depois retorno
    const rotasOrdenadas = Object.entries(rotasAgrupadas).sort(([a], [b]) => {
      const tipoA = a.includes('ADM') ? 0 : a.includes('RETORNO') ? 2 : 1;
      const tipoB = b.includes('ADM') ? 0 : b.includes('RETORNO') ? 2 : 1;
      return tipoA - tipoB;
    });
    
    container.innerHTML = rotasOrdenadas.map(([nomeRota, motoristas]) => `
      <div class="rota-grupo">
        <h4><i class="fas fa-route"></i> ${nomeRota}</h4>
        ${motoristas.map(motorista => {
          const ultimaAtualizacao = motorista.ultimaAtualizacao ? 
            new Date(motorista.ultimaAtualizacao.toDate()) : 
            new Date();
          
          return `
          <div class="motorista-card">
            <div class="motorista-info">
              <div class="motorista-header">
                <strong><i class="fas fa-user"></i> ${motorista.motorista}</strong>
                <span class="onibus-badge">${motorista.onibus}</span>
              </div>
              <div class="motorista-detalhes">
                <span class="detalhe-item"><i class="fas fa-road"></i> ${motorista.distancia || '0'} km</span>
                <span class="detalhe-item"><i class="fas fa-tachometer-alt"></i> ${motorista.velocidade || '0'} km/h</span>
                <span class="detalhe-item"><i class="fas fa-clock"></i> ${ultimaAtualizacao.toLocaleTimeString()}</span>
                ${motorista.precisao ? `<span class="detalhe-item"><i class="fas fa-crosshairs"></i> ${motorista.precisao.toFixed(0)}m</span>` : ''}
              </div>
            </div>
            <div class="motorista-actions">
              <button class="btn small" onclick="verLocalizacaoMotorista(${motorista.latitude}, ${motorista.longitude}, '${motorista.motorista}', '${motorista.onibus}')">
                <i class="fas fa-map-marker-alt"></i> Mapa
              </button>
              <button class="btn small secondary" onclick="abrirRotaNoMaps('${motorista.rota}')">
                <i class="fas fa-route"></i> Rota
              </button>
            </div>
          </div>
        `}).join('')}
      </div>
    `).join('');
  });
}

function iniciarMonitoramentoAdmin() {
  if (window.estadoApp.unsubscribeRotas) return;
  
  window.estadoApp.unsubscribeRotas = monitorarRotas((rotas) => {
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

function iniciarMonitoramentoAvisos() {
  if (window.estadoApp.unsubscribeAvisos) return;
  
  window.estadoApp.unsubscribeAvisos = monitorarAvisos((avisos) => {
    window.estadoApp.avisosAtivos = avisos;
    
    const avisosCount = document.getElementById('avisosCount');
    if (avisosCount) {
      avisosCount.textContent = avisos.length;
      avisosCount.style.display = avisos.length > 0 ? 'inline' : 'none';
    }
  });
}

// ========== FUNÇÕES AUXILIARES ==========
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

function initPWA() {
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
    } else {
      console.log('❌ Usuário recusou a instalação');
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

function initConnectionMonitor() {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  updateOnlineStatus();
}

function updateOnlineStatus() {
  window.estadoApp.isOnline = navigator.onLine;
  const statusElement = document.getElementById('connectionStatus');
  const offlineBanner = document.getElementById('offlineBanner');
  
  if (statusElement) {
    statusElement.innerHTML = window.estadoApp.isOnline ? '<i class="fas fa-circle"></i>' : '<i class="fas fa-circle"></i>';
    statusElement.style.color = window.estadoApp.isOnline ? '#4CAF50' : '#FF5722';
    statusElement.title = window.estadoApp.isOnline ? 'Online' : 'Offline';
  }
  
  if (offlineBanner) {
    offlineBanner.style.display = window.estadoApp.isOnline ? 'none' : 'block';
  }
  
  if (!window.estadoApp.isOnline) {
    console.warn('📶 Aplicativo offline');
    mostrarNotificacao('Modo Offline', 'Algumas funcionalidades podem não estar disponíveis', 'warning');
  }
}

function initAvisos() {
  const avisosBtn = document.getElementById('avisosBtn');
  if (avisosBtn) {
    avisosBtn.addEventListener('click', mostrarAvisos);
  }
}

window.mostrarAvisos = function() {
  const avisos = window.estadoApp.avisosAtivos || [];
  
  if (avisos.length === 0) {
    mostrarNotificacao('Info', 'Nenhum aviso no momento', 'info');
    return;
  }
  
  const avisosHTML = avisos.filter(aviso => aviso.ativo).map(aviso => `
    <div class="aviso-item">
      <div class="aviso-header">
        <strong>${aviso.titulo}</strong>
        <small>${aviso.timestamp ? new Date(aviso.timestamp.toDate()).toLocaleDateString() : ''}</small>
      </div>
      <p>${aviso.mensagem}</p>
      <small class="aviso-destino">Para: ${aviso.destino || 'Todos'}</small>
    </div>
  `).join('');
  
  const modal = document.createElement('div');
  modal.className = 'modal-back';
  modal.innerHTML = `
    <div class="modal">
      <button class="close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h3>📢 Avisos e Comunicados</h3>
      <div class="avisos-list">
        ${avisosHTML}
      </div>
      <div style="margin-top:12px">
        <button class="btn" onclick="this.parentElement.parentElement.remove()">Fechar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
};

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

// ========== SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('✅ ServiceWorker registrado:', registration.scope);
      })
      .catch(error => {
        console.log('❌ Falha ao registrar ServiceWorker:', error);
      });
  });
}

// ========== SUPPORT - WHATSAPP ==========
window.abrirSuporteWhatsApp = function() {
  const telefone = '5593992059914';
  const mensagem = encodeURIComponent('Olá! Preciso de suporte no Portal de Transporte da AC Parceria.');
  const url = `https://wa.me/${telefone}?text=${mensagem}`;
  
  window.open(url, '_blank', 'noopener,noreferrer');
};

console.log('🚀 app.js carregado com sucesso!');
