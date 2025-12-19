// modules/database.js - GERENCIAMENTO DE DADOS DINÂMICOS
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from '../firebase.js';
import { getEstadoApp } from '../app.js';
import { mostrarNotificacao } from './ui.js';

let onibusDisponiveis = [];
let rotasDisponiveis = [];

export async function initDatabase() {
  console.log('🗄️ Módulo de banco de dados inicializado');
  
  try {
    // Carregar dados do Firestore
    await carregarOnibusFirestore();
    await carregarRotasFirestore();
    
    console.log('✅ Dados carregados do Firestore');
  } catch (error) {
    console.error('❌ Erro ao carregar dados:', error);
    // Usar dados padrão como fallback
    onibusDisponiveis = getOnibusPadrao();
    rotasDisponiveis = getRotasPadrao();
  }
}

// Carregar ônibus do Firestore
async function carregarOnibusFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, 'frota'));
    onibusDisponiveis = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ ${onibusDisponiveis.length} ônibus carregados`);
  } catch (error) {
    console.error('Erro ao carregar ônibus:', error);
    throw error;
  }
}

// Carregar rotas do Firestore
async function carregarRotasFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, 'rotas_config'));
    rotasDisponiveis = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ ${rotasDisponiveis.length} rotas carregadas`);
  } catch (error) {
    console.error('Erro ao carregar rotas:', error);
    throw error;
  }
}

// Carregar ônibus para seleção
export function carregarOnibus() {
  const container = document.getElementById('onibusList');
  if (!container) return;
  
  container.innerHTML = onibusDisponiveis.map(onibus => `
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
}

// Selecionar ônibus
export function selecionarOnibus(onibusId) {
  const onibus = onibusDisponiveis.find(o => (o.id || o.placa) === onibusId);
  if (!onibus) {
    mostrarNotificacao('❌ Erro', 'Ônibus não encontrado', 'error');
    return;
  }
  
  const estado = getEstadoApp();
  estado.onibusAtivo = onibus;
  localStorage.setItem('onibus_ativo', JSON.stringify(onibus));
  
  // Solicitar permissão de localização
  solicitarPermissaoLocalizacao();
}

// Solicitar permissão de localização
function solicitarPermissaoLocalizacao() {
  if (!navigator.geolocation) {
    mostrarNotificacao('⚠️ Aviso', 'Geolocation não suportada', 'warning');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      mostrarNotificacao('✅ GPS Ativo', 'Localização obtida com sucesso', 'success');
      mostrarTela('tela-motorista');
    },
    (error) => {
      mostrarNotificacao('⚠️ GPS Desativado', 'O login será realizado normalmente', 'warning');
      mostrarTela('tela-motorista');
    }
  );
}

// CRUD para ônibus (Admin)
export async function adicionarOnibus(dados) {
  try {
    const docRef = await addDoc(collection(db, 'frota'), {
      ...dados,
      criadoEm: new Date(),
      ativo: true
    });
    
    mostrarNotificacao('✅ Sucesso', 'Ônibus adicionado com sucesso', 'success');
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar ônibus:', error);
    mostrarNotificacao('❌ Erro', 'Falha ao adicionar ônibus', 'error');
    throw error;
  }
}

export async function atualizarOnibus(id, dados) {
  try {
    await updateDoc(doc(db, 'frota', id), dados);
    mostrarNotificacao('✅ Sucesso', 'Ônibus atualizado com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao atualizar ônibus:', error);
    mostrarNotificacao('❌ Erro', 'Falha ao atualizar ônibus', 'error');
    throw error;
  }
}

export async function removerOnibus(id) {
  try {
    await deleteDoc(doc(db, 'frota', id));
    mostrarNotificacao('✅ Sucesso', 'Ônibus removido com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao remover ônibus:', error);
    mostrarNotificacao('❌ Erro', 'Falha ao remover ônibus', 'error');
    throw error;
  }
}

// CRUD para rotas (Admin)
export async function adicionarRota(dados) {
  try {
    const docRef = await addDoc(collection(db, 'rotas_config'), {
      ...dados,
      criadoEm: new Date(),
      ativo: true
    });
    
    mostrarNotificacao('✅ Sucesso', 'Rota adicionada com sucesso', 'success');
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar rota:', error);
    mostrarNotificacao('❌ Erro', 'Falha ao adicionar rota', 'error');
    throw error;
  }
}

export async function atualizarRota(id, dados) {
  try {
    await updateDoc(doc(db, 'rotas_config', id), dados);
    mostrarNotificacao('✅ Sucesso', 'Rota atualizada com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao atualizar rota:', error);
    mostrarNotificacao('❌ Erro', 'Falha ao atualizar rota', 'error');
    throw error;
  }
}

export async function removerRota(id) {
  try {
    await deleteDoc(doc(db, 'rotas_config', id));
    mostrarNotificacao('✅ Sucesso', 'Rota removida com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao remover rota:', error);
    mostrarNotificacao('❌ Erro', 'Falha ao remover rota', 'error');
    throw error;
  }
}

// Getters
export function getOnibusDisponiveis() {
  return onibusDisponiveis;
}

export function getRotasDisponiveis() {
  return rotasDisponiveis;
}

// Dados padrão (fallback)
function getOnibusPadrao() {
  return [
    { placa: 'TEZ-2J56', tag_ac: 'AC LO 583', tag_vale: '1JI347', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' },
    { placa: 'TEZ-2J60', tag_ac: 'AC LO 585', tag_vale: '1JI348', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' },
    { placa: 'TEZ-2J57', tag_ac: 'AC LO 584', tag_vale: '1JI349', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' },
    { placa: 'SJD5G38', tag_ac: 'AC LO 610', tag_vale: '1JI437', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' },
    { placa: 'SYA5A51', tag_ac: 'AC LO 611', tag_vale: '1JI436', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' },
    { placa: 'TEZ2J58', tag_ac: 'AC LO 609', tag_vale: '1JI420', cor: 'BRANCA', empresa: 'MUNDIAL P E L DE BENS MOVEIS LTDA' },
    { placa: 'PZS6858', tag_ac: 'VL 080', tag_vale: '-', cor: 'BRANCA', empresa: 'A C PARCERIA E TERRAPLENAGEM LTDA' },
    { placa: 'PZW5819', tag_ac: 'VL 083', tag_vale: '-', cor: 'BRANCA', empresa: 'A C PARCERIA E TERRAPLENAGEM LTDA' }
  ];
}

function getRotasPadrao() {
  return [
    { id: 'adm01', nome: 'ROTA ADM 01', tipo: 'adm', desc: 'Rota administrativa 01', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=18BCgBpobp1Olzmzy0RnPCUEd7Vnkc5s&usp=sharing' },
    { id: 'adm02', nome: 'ROTA ADM 02', tipo: 'adm', desc: 'Rota administrativa 02', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1WxbIX8nw0xyGBLMvvi1SF3DRuwmZ5oM&usp=sharing' },
    { id: 'op01', nome: 'ROTA 01', tipo: 'operacional', desc: 'Rota operacional 01', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1jCfFxq1ZwecS2IcHy7xGFLLgttsM-RQ&usp=sharing' },
    { id: 'op02', nome: 'ROTA 02', tipo: 'operacional', desc: 'Rota operacional 02', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1LCvNJxWBbZ_chpbdn_lk_Dm6NPA194g&usp=sharing' },
    { id: 'op03', nome: 'ROTA 03', tipo: 'operacional', desc: 'Rota operacional 03', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1bdwkrClh5AZml0mnDGlOzYcaR4w1BL0&usp=sharing' },
    { id: 'op04', nome: 'ROTA 04', tipo: 'operacional', desc: 'Rota operacional 04', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1ejibzdZkhX2QLnP9YgvvHdQpZELFvXo&usp=sharing' },
    { id: 'op05', nome: 'ROTA 05', tipo: 'operacional', desc: 'Rota operacional 05', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1L9xjAWFUupMc7eQbqVJz-SNWlYX5SHo&usp=sharing' },
    { id: 'ret01', nome: 'RETORNO OVERLAND - ROTA 01', tipo: 'retorno', desc: 'Rota de retorno Overland 01', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1ClQVIaRLOYYWHU7fvP87r1BVy85a_eg&usp=sharing' },
    { id: 'ret02', nome: 'RETORNO OVERLAND - ROTA 02', tipo: 'retorno', desc: 'Rota de retorno Overland 02', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1WOIMgeLgV01B8yk7HoX6tazdCHXQnok&usp=sharing' }
  ];
}

// Exportar funções globais
window.carregarOnibus = carregarOnibus;
window.selecionarOnibus = selecionarOnibus;
window.adicionarOnibus = adicionarOnibus;
window.atualizarOnibus = atualizarOnibus;
window.removerOnibus = removerOnibus;
window.adicionarRota = adicionarRota;
window.atualizarRota = atualizarRota;
window.removerRota = removerRota;
