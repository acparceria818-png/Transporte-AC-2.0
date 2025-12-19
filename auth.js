// auth.js - Gerenciamento de autenticação
import { estadoApp } from './config.js';
import { 
  getColaborador,
  getRotasDinamicas,
  getOnibusDinamicos 
} from './firebase.js';
import { mostrarTela, showLoading, hideLoading } from './ui.js';
import { iniciarMonitoramentoAvisos, carregarEscalaMotorista } from './admin.js';

export async function confirmarMatriculaMotorista() {
  const input = document.getElementById('matriculaMotorista');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!input) {
    alert('Campo de matrícula não encontrado');
    return;
  }

  const matricula = input.value.trim().toUpperCase();

  if (!matricula) {
    alert('Informe sua matrícula');
    input.focus();
    return;
  }

  try {
    showLoading('🔍 Validando matrícula...');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Validando...';
    
    const snap = await getColaborador(matricula);

    if (!snap.exists()) {
      alert('❌ Matrícula não encontrada');
      input.focus();
      return;
    }

    const dados = snap.data();

    if (!dados.ativo) {
      alert('❌ Colaborador inativo. Contate a administração.');
      return;
    }

    if (dados.perfil !== 'motorista') {
      alert('❌ Este acesso é exclusivo para motoristas');
      return;
    }

    localStorage.setItem('motorista_matricula', matricula);
    localStorage.setItem('motorista_nome', dados.nome);
    localStorage.setItem('motorista_email', dados.email || '');
    localStorage.setItem('perfil_ativo', 'motorista');
    
    estadoApp.motorista = { 
      matricula, 
      nome: dados.nome,
      email: dados.email || ''
    };
    
    // Carregar dados dinâmicos
    await carregarDadosDinamicos();
    
    console.log('✅ Motorista autenticado:', dados.nome);

  } catch (erro) {
    console.error('Erro Firebase:', erro);
    alert('❌ Erro ao validar matrícula. Verifique sua conexão e tente novamente.');
  } finally {
    hideLoading();
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  }
}

async function carregarDadosDinamicos() {
  try {
    // Carregar rotas dinâmicas
    estadoApp.rotasDisponiveis = await getRotasDinamicas();
    
    // Carregar ônibus dinâmicos
    estadoApp.onibusDisponiveis = await getOnibusDinamicos();
    
    // Carregar ônibus na tela
    carregarOnibus();
    
  } catch (error) {
    console.error('Erro ao carregar dados dinâmicos:', error);
    // Usar dados padrão em caso de erro
    carregarOnibusDefault();
  }
}

export function carregarOnibus() {
  const container = document.getElementById('onibusList');
  if (!container) return;
  
  container.innerHTML = estadoApp.onibusDisponiveis.map(onibus => `
    <div class="onibus-card" onclick="selecionarOnibus('${onibus.placa}')">
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

function carregarOnibusDefault() {
  const container = document.getElementById('onibusList');
  if (!container) return;
  
  const onibusDefault = [
    { placa: 'TEZ-2J56', tag_ac: 'AC LO 583', tag_vale: '1JI347', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' },
    { placa: 'TEZ-2J60', tag_ac: 'AC LO 585', tag_vale: '1JI348', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' },
    { placa: 'TEZ-2J57', tag_ac: 'AC LO 584', tag_vale: '1JI349', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' }
  ];
  
  container.innerHTML = onibusDefault.map(onibus => `
    <div class="onibus-card" onclick="selecionarOnibus('${onibus.placa}')">
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

export function selecionarOnibus(placa) {
  const onibus = estadoApp.onibusDisponiveis.find(o => o.placa === placa);
  if (!onibus) {
    alert('Ônibus não encontrado');
    return;
  }
  
  estadoApp.onibusAtivo = onibus;
  localStorage.setItem('onibus_ativo', JSON.stringify(onibus));
  
  // Solicitar permissão de localização
  solicitarPermissaoLocalizacao();
}

function solicitarPermissaoLocalizacao() {
  console.log('📍 Iniciando solicitação de localização...');
  
  if (!navigator.geolocation) {
    console.warn('❌ Geolocation não suportada');
    finalizarLoginSemGPS();
    return;
  }
  
  showLoading('📍 Obtendo localização...');
  
  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('✅ GPS obtido no login:', position.coords);
      hideLoading();
      finalizarLoginComGPS(position);
    },
    (error) => {
      console.warn('⚠️ GPS falhou no login:', error.message);
      hideLoading();
      
      alert('📍 Localização não disponível no momento.\n\nO login será realizado normalmente. Você pode ativar o GPS depois.');
      
      finalizarLoginSemGPS();
    },
    options
  );
  
  function finalizarLoginComGPS(position) {
    if (!estadoApp.motorista || !estadoApp.onibusAtivo) return;
    
    updateUserStatus(estadoApp.motorista.nome, estadoApp.motorista.matricula);
    
    const onibusElement = document.getElementById('motoristaOnibus');
    if (onibusElement) {
      onibusElement.textContent = `${estadoApp.onibusAtivo.placa} (${estadoApp.onibusAtivo.tag_ac})`;
    }
    
    mostrarTela('tela-motorista');
    iniciarMonitoramentoAvisos();
    carregarEscalaMotorista(estadoApp.motorista.matricula);
    
    alert(`✅ Login realizado!\n\n👋 ${estadoApp.motorista.nome}\n🚌 ${estadoApp.onibusAtivo.placa}\n📍 GPS ativo (Precisão: ${position.coords.accuracy.toFixed(0)}m)`);
  }
  
  function finalizarLoginSemGPS() {
    if (!estadoApp.motorista || !estadoApp.onibusAtivo) return;
    
    updateUserStatus(estadoApp.motorista.nome, estadoApp.motorista.matricula);
    
    const onibusElement = document.getElementById('motoristaOnibus');
    if (onibusElement) {
      onibusElement.textContent = `${estadoApp.onibusAtivo.placa} (${estadoApp.onibusAtivo.tag_ac})`;
    }
    
    mostrarTela('tela-motorista');
    iniciarMonitoramentoAvisos();
    carregarEscalaMotorista(estadoApp.motorista.matricula);
    
    alert(`✅ Login realizado!\n\n👋 ${estadoApp.motorista.nome}\n🚌 ${estadoApp.onibusAtivo.placa}\n📍 GPS desativado`);
  }
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

export function verificarSessao() {
  const perfil = localStorage.getItem('perfil_ativo');
  const matricula = localStorage.getItem('motorista_matricula');
  const nome = localStorage.getItem('motorista_nome');
  const adminLogado = localStorage.getItem('admin_logado');
  
  if (perfil === 'motorista' && matricula && nome) {
    estadoApp.motorista = { matricula, nome };
    estadoApp.perfil = 'motorista';
    mostrarTela('tela-motorista');
    updateUserStatus(nome, matricula);
    iniciarMonitoramentoAvisos();
    carregarEscalaMotorista(matricula);
    
    // Carregar ônibus salvo
    const onibusSalvo = localStorage.getItem('onibus_ativo');
    if (onibusSalvo) {
      estadoApp.onibusAtivo = JSON.parse(onibusSalvo);
      atualizarInfoOnibus();
    }
  } else if (perfil === 'passageiro') {
    estadoApp.perfil = 'passageiro';
    mostrarTela('tela-passageiro');
    iniciarMonitoramentoPassageiro();
    iniciarMonitoramentoAvisos();
  } else if (perfil === 'admin' && adminLogado) {
    estadoApp.perfil = 'admin';
    estadoApp.admin = { 
      nome: 'Administrador',
      email: localStorage.getItem('admin_email')
    };
    mostrarTela('tela-admin-dashboard');
    iniciarMonitoramentoAdmin();
    carregarEscalas();
  }
}
