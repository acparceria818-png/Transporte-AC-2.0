// modules/auth.js
import { getColaborador, getColaboradorByEmail } from '../firebase.js';

// Estado global (será importado/gerenciado pelo app.js)
export let estadoApp = window.estadoApp || {};

export async function loginMotorista(matricula) {
  const snap = await getColaborador(matricula);

  if (!snap.exists()) {
    throw new Error('Matrícula não encontrada');
  }

  const dados = snap.data();

  if (!dados.ativo) {
    throw new Error('Colaborador inativo');
  }

  if (dados.perfil !== 'motorista') {
    throw new Error('Acesso exclusivo para motoristas');
  }

  return {
    matricula,
    nome: dados.nome,
    email: dados.email || ''
  };
}

export function fazerLogout() {
  if (estadoApp.watchId) {
    navigator.geolocation.clearWatch(estadoApp.watchId);
    estadoApp.watchId = null;
  }

  // Limpar listeners do Firebase
  if (estadoApp.unsubscribeRotas) estadoApp.unsubscribeRotas();
  if (estadoApp.unsubscribeEmergencias) estadoApp.unsubscribeEmergencias();
  if (estadoApp.unsubscribeFeedbacks) estadoApp.unsubscribeFeedbacks();
  if (estadoApp.unsubscribeAvisos) estadoApp.unsubscribeAvisos();

  // Resetar estado
  estadoApp = {
    motorista: null,
    passageiro: null,
    admin: null,
    rotaAtiva: null,
    onibusAtivo: null,
    watchId: null,
    isOnline: navigator.onLine,
    perfil: null,
    unsubscribeRotas: null,
    unsubscribeEmergencias: null,
    unsubscribeFeedbacks: null,
    unsubscribeAvisos: null,
    emergenciaAtiva: false,
    avisosAtivos: [],
    escalas: [],
    estatisticas: null,
    ultimaLocalizacao: null,
    distanciaTotal: 0,
    onlineUsers: []
  };

  // Limpar localStorage
  localStorage.removeItem('perfil_ativo');
  localStorage.removeItem('motorista_matricula');
  localStorage.removeItem('motorista_nome');
  localStorage.removeItem('motorista_email');
  localStorage.removeItem('onibus_ativo');
  localStorage.removeItem('admin_logado');
  localStorage.removeItem('admin_email');

  return true;
}

export function verificarSessao() {
  const perfil = localStorage.getItem('perfil_ativo');
  const matricula = localStorage.getItem('motorista_matricula');
  const nome = localStorage.getItem('motorista_nome');
  const adminLogado = localStorage.getItem('admin_logado');

  if (perfil === 'motorista' && matricula && nome) {
    estadoApp.motorista = { matricula, nome };
    estadoApp.perfil = 'motorista';
    return { perfil: 'motorista', dados: { matricula, nome } };
  } else if (perfil === 'passageiro') {
    estadoApp.perfil = 'passageiro';
    return { perfil: 'passageiro' };
  } else if (perfil === 'admin' && adminLogado) {
    estadoApp.perfil = 'admin';
    estadoApp.admin = { 
      nome: 'Administrador',
      email: localStorage.getItem('admin_email')
    };
    return { perfil: 'admin', dados: estadoApp.admin };
  }

  return { perfil: null };
}
