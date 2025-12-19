// modules/notifications.js - GERENCIAMENTO DE NOTIFICAÇÕES
import { db, collection, onSnapshot, query, where, addDoc } from '../firebase.js';
import { mostrarNotificacao } from './ui.js';

export function initNotifications() {
  console.log('🔔 Módulo de notificações inicializado');
  
  // Solicitar permissão para notificações
  solicitarPermissaoNotificacoes();
}

// Solicitar permissão para notificações
function solicitarPermissaoNotificacoes() {
  if (!("Notification" in window)) {
    console.log("Este navegador não suporta notificações desktop");
    return;
  }
  
  if (Notification.permission === "granted") {
    console.log("✅ Permissão de notificações concedida");
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        console.log("✅ Permissão concedida pelo usuário");
      }
    });
  }
}

// Criar notificação
export function criarNotificacao(titulo, mensagem, options = {}) {
  const defaultOptions = {
    body: mensagem,
    icon: './logo.jpg',
    badge: './logo.jpg',
    tag: 'ac-transporte',
    requireInteraction: false,
    ...options
  };
  
  if (Notification.permission === "granted") {
    const notification = new Notification(titulo, defaultOptions);
    
    notification.onclick = function() {
      window.focus();
      this.close();
    };
    
    return notification;
  }
  
  return null;
}

// Monitorar avisos
export function iniciarMonitoramentoAvisos() {
  const q = query(
    collection(db, 'avisos'),
    where("ativo", "==", true)
  );
  
  return onSnapshot(q, (snapshot) => {
    snapshot.forEach((doc) => {
      const aviso = doc.data();
      // Verificar se o aviso é para o perfil atual
      const perfil = localStorage.getItem('perfil_ativo');
      
      if (aviso.destino === 'todos' || aviso.destino === perfil) {
        mostrarNotificacaoAviso(aviso);
      }
    });
  });
}

function mostrarNotificacaoAviso(aviso) {
  // Evitar mostrar o mesmo aviso múltiplas vezes
  const avisosVistos = JSON.parse(localStorage.getItem('avisos_vistos') || '[]');
  
  if (avisosVistos.includes(aviso.id)) {
    return;
  }
  
  // Adicionar à lista de avisos vistos
  avisosVistos.push(aviso.id);
  localStorage.setItem('avisos_vistos', JSON.stringify(avisosVistos.slice(-100)));
  
  // Mostrar notificação
  criarNotificacao(
    `📢 ${aviso.titulo}`,
    aviso.mensagem,
    {
      requireInteraction: true
    }
  );
}

// Função para enviar notificação geral (Admin)
export async function enviarNotificacaoGeral(titulo, mensagem, destino = 'todos') {
  try {
    await addDoc(collection(db, 'avisos'), {
      titulo: titulo,
      mensagem: mensagem,
      destino: destino,
      ativo: true,
      timestamp: new Date(),
      enviadoPor: localStorage.getItem('admin_email') || 'Admin'
    });
    
    mostrarNotificacao('✅ Sucesso', 'Notificação enviada com sucesso', 'success');
    return true;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    mostrarNotificacao('❌ Erro', 'Falha ao enviar notificação', 'error');
    return false;
  }
}

// Notificações push via Service Worker
export function enviarNotificacaoPush(titulo, mensagem, data = {}) {
  if (!('serviceWorker' in navigator)) return;
  
  navigator.serviceWorker.ready.then((registration) => {
    registration.showNotification(titulo, {
      body: mensagem,
      icon: './logo.jpg',
      badge: './logo.jpg',
      data: data,
      vibrate: [200, 100, 200]
    });
  });
}

// Exportar funções globais
window.enviarNotificacaoGeral = enviarNotificacaoGeral;
window.criarNotificacao = criarNotificacao;
