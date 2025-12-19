// modules/auth.js - GERENCIAMENTO DE AUTENTICAÇÃO
import { db, getColaborador, updateLocalizacao } from '../firebase.js';
import { getEstadoApp, setEstadoApp } from '../app.js';
import { showLoading, hideLoading, mostrarTela, mostrarNotificacao } from './ui.js';
import { iniciarMonitoramentoAvisos } from './notifications.js';
import { carregarEscalaMotorista } from './admin.js';

export function initAuth() {
  console.log('🔐 Módulo de autenticação inicializado');
  verificarSessao();
}

function verificarSessao() {
  const perfil = localStorage.getItem('perfil_ativo');
  const matricula = localStorage.getItem('motorista_matricula');
  const nome = localStorage.getItem('motorista_nome');
  const adminLogado = localStorage.getItem('admin_logado');
  
  if (perfil === 'motorista' && matricula && nome) {
    setEstadoApp({
      motorista: { matricula, nome },
      perfil: 'motorista'
    });
    updateUserStatus(nome, matricula);
    mostrarTela('tela-motorista');
    iniciarMonitoramentoAvisos();
    carregarEscalaMotorista(matricula);
    
    const onibusSalvo = localStorage.getItem('onibus_ativo');
    if (onibusSalvo) {
      setEstadoApp({ onibusAtivo: JSON.parse(onibusSalvo) });
      atualizarInfoOnibus();
    }
  } else if (perfil === 'passageiro') {
    setEstadoApp({ perfil: 'passageiro' });
    mostrarTela('tela-passageiro');
    iniciarMonitoramentoAvisos();
  } else if (perfil === 'admin' && adminLogado) {
    setEstadoApp({
      perfil: 'admin',
      admin: { 
        nome: 'Administrador',
        email: localStorage.getItem('admin_email')
      }
    });
    mostrarTela('tela-admin-dashboard');
    iniciarMonitoramentoAvisos();
  }
}

export async function confirmarMatriculaMotorista() {
  showLoading('🔍 Validando matrícula...');
  
  const input = document.getElementById('matriculaMotorista');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!input) {
    alert('Campo de matrícula não encontrado');
    hideLoading();
    return;
  }

  const matricula = input.value.trim().toUpperCase();

  if (!matricula) {
    alert('Informe sua matrícula');
    input.focus();
    hideLoading();
    return;
  }

  try {
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
    
    setEstadoApp({ 
      motorista: { 
        matricula, 
        nome: dados.nome,
        email: dados.email || ''
      }
    });
    
    mostrarTela('tela-selecao-onibus');
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

export function updateUserStatus(nome, matricula) {
  const userStatus = document.getElementById('userStatus');
  const userName = document.getElementById('userName');
  const motoristaNome = document.getElementById('motoristaNome');
  const motoristaMatricula = document.getElementById('motoristaMatricula');
  
  if (userStatus) userStatus.style.display = 'flex';
  if (userName) userName.textContent = nome;
  if (motoristaNome) motoristaNome.textContent = nome;
  if (motoristaMatricula) motoristaMatricula.textContent = matricula;
}

export function atualizarInfoOnibus() {
  const estado = getEstadoApp();
  if (!estado.motorista || !estado.onibusAtivo) return;
  
  const userTags = document.querySelector('.user-tags');
  if (!userTags) return;
  
  userTags.innerHTML = `
    <span class="user-tag"><i class="fas fa-bus"></i> ${estado.onibusAtivo.placa}</span>
    <span class="user-tag"><i class="fas fa-tag"></i> ${estado.onibusAtivo.tag_ac}</span>
    <span class="user-tag"><i class="fas fa-id-card"></i> ${estado.onibusAtivo.tag_vale}</span>
  `;
}

export function logout() {
  const estado = getEstadoApp();
  
  if (estado.watchId) {
    navigator.geolocation.clearWatch(estado.watchId);
  }
  
  if (estado.motorista) {
    updateLocalizacao(estado.motorista.matricula, {
      ativo: false,
      online: false,
      timestamp: new Date()
    });
  }
  
  setEstadoApp({
    motorista: null,
    passageiro: null,
    admin: null,
    rotaAtiva: null,
    onibusAtivo: null,
    watchId: null,
    perfil: null
  });
  
  localStorage.removeItem('perfil_ativo');
  localStorage.removeItem('motorista_matricula');
  localStorage.removeItem('motorista_nome');
  localStorage.removeItem('motorista_email');
  localStorage.removeItem('onibus_ativo');
  localStorage.removeItem('admin_logado');
  localStorage.removeItem('admin_email');
  
  const userStatus = document.getElementById('userStatus');
  if (userStatus) userStatus.style.display = 'none';
  
  mostrarTela('welcome');
  console.log('👋 Usuário deslogado');
}

// Exportar para uso global
window.confirmarMatriculaMotorista = confirmarMatriculaMotorista;
window.logout = logout;
