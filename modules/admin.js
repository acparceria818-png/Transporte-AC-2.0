// modules/admin.js
import { 
  getOnibusDisponiveis, 
  getRotasDisponiveis,
  addOnibus,
  addRota,
  deleteDoc,
  doc,
  collection,
  getDocs
} from '../firebase.js';

import { mostrarNotificacao, showLoading, hideLoading } from './ui.js';

// Estado global
export let estadoApp = window.estadoApp || {};

export async function carregarDadosDinamicos() {
  try {
    showLoading('Carregando dados...');
    
    // Carregar ônibus do Firestore
    const onibusSnapshot = await getOnibusDisponiveis();
    estadoApp.onibusDisponiveis = onibusSnapshot;
    
    // Carregar rotas do Firestore
    const rotasSnapshot = await getRotasDisponiveis();
    estadoApp.rotasDisponiveis = rotasSnapshot;
    
    // Atualizar UI se necessário
    if (document.getElementById('tela-selecao-onibus')) {
      renderizarOnibus();
    }
    
    if (document.getElementById('routesContainer')) {
      renderizarRotas();
    }
    
    return { onibus: onibusSnapshot, rotas: rotasSnapshot };
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    mostrarNotificacao('Erro', 'Não foi possível carregar os dados', 'error');
    return { onibus: [], rotas: [] };
  } finally {
    hideLoading();
  }
}

export function renderizarOnibus() {
  const container = document.getElementById('onibusList');
  if (!container || !estadoApp.onibusDisponiveis) return;
  
  container.innerHTML = estadoApp.onibusDisponiveis.map(onibus => `
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

export function renderizarRotas() {
  const container = document.getElementById('routesContainer');
  if (!container || !estadoApp.rotasDisponiveis) return;
  
  const motoristaLogado = !!estadoApp.motorista;
  const onibusSelecionado = !!estadoApp.onibusAtivo;
  
  container.innerHTML = estadoApp.rotasDisponiveis.map(rota => `
    <div class="route-item ${rota.tipo}" data-tipo="${rota.tipo}">
      <div class="route-info">
        <div class="route-header">
          <span class="route-icon">${rota.tipo === 'adm' ? '🏢' : rota.tipo === 'retorno' ? '🔄' : '🚛'}</span>
          <div>
            <div class="route-nome">${rota.nome}</div>
            <small class="route-desc">${rota.desc}</small>
          </div>
        </div>
        <div class="route-status" id="status-${rota.id}">
          <small>🔄 Verificando motoristas...</small>
        </div>
      </div>
      <div class="route-actions">
        ${motoristaLogado && onibusSelecionado ? `
          <button class="btn" onclick="iniciarRota('${rota.nome}', '${rota.id}')">
            ▶️ Iniciar Rota
          </button>
        ` : `
          <button class="btn disabled" disabled title="Selecione um ônibus primeiro">
            ⚠️ Selecione ônibus
          </button>
        `}
        <button class="btn secondary" onclick="abrirRotaNoMaps('${rota.id}')">
          🗺️ Abrir Rota
        </button>
        <button class="btn outline" onclick="verMotoristasNaRota('${rota.nome}')">
          👁️ Ver Motoristas
        </button>
      </div>
    </div>
  `).join('');
}

export async function adicionarNovoOnibus() {
  const { value: formValues } = await Swal.fire({
    title: 'Adicionar Novo Ônibus',
    html: `
      <input id="swal-placa" class="swal2-input" placeholder="Placa">
      <input id="swal-tag_ac" class="swal2-input" placeholder="TAG AC">
      <input id="swal-tag_vale" class="swal2-input" placeholder="TAG Vale">
      <input id="swal-cor" class="swal2-input" placeholder="Cor">
      <input id="swal-empresa" class="swal2-input" placeholder="Empresa">
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      return {
        placa: document.getElementById('swal-placa').value,
        tag_ac: document.getElementById('swal-tag_ac').value,
        tag_vale: document.getElementById('swal-tag_vale').value,
        cor: document.getElementById('swal-cor').value,
        empresa: document.getElementById('swal-empresa').value
      };
    }
  });

  if (formValues) {
    try {
      await addOnibus(formValues);
      await carregarDadosDinamicos();
      mostrarNotificacao('Sucesso', 'Ônibus adicionado com sucesso!', 'success');
    } catch (error) {
      mostrarNotificacao('Erro', 'Não foi possível adicionar o ônibus', 'error');
    }
  }
}

export async function adicionarNovaRota() {
  const { value: formValues } = await Swal.fire({
    title: 'Adicionar Nova Rota',
    html: `
      <input id="swal-nome" class="swal2-input" placeholder="Nome da Rota">
      <input id="swal-tipo" class="swal2-input" placeholder="Tipo (adm/operacional/retorno)">
      <input id="swal-desc" class="swal2-input" placeholder="Descrição">
      <input id="swal-mapsUrl" class="swal2-input" placeholder="URL do Google Maps">
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      return {
        nome: document.getElementById('swal-nome').value,
        tipo: document.getElementById('swal-tipo').value,
        desc: document.getElementById('swal-desc').value,
        mapsUrl: document.getElementById('swal-mapsUrl').value
      };
    }
  });

  if (formValues) {
    try {
      await addRota(formValues);
      await carregarDadosDinamicos();
      mostrarNotificacao('Sucesso', 'Rota adicionada com sucesso!', 'success');
    } catch (error) {
      mostrarNotificacao('Erro', 'Não foi possível adicionar a rota', 'error');
    }
  }
}

export function criarPainelAdminDinamico() {
  const modalHTML = `
    <div class="admin-crud-panel">
      <div class="crud-section">
        <h3><i class="fas fa-bus"></i> Gerenciar Frota</h3>
        <button class="btn btn-primary" onclick="adicionarNovoOnibus()">
          <i class="fas fa-plus"></i> Adicionar Ônibus
        </button>
        <div class="frota-list" id="adminFrotaList">
          <!-- Lista de ônibus será carregada aqui -->
        </div>
      </div>
      
      <div class="crud-section">
        <h3><i class="fas fa-route"></i> Gerenciar Rotas</h3>
        <button class="btn btn-primary" onclick="adicionarNovaRota()">
          <i class="fas fa-plus"></i> Adicionar Rota
        </button>
        <div class="rotas-list" id="adminRotasList">
          <!-- Lista de rotas será carregada aqui -->
        </div>
      </div>
    </div>
  `;

  Swal.fire({
    title: 'Painel Administrativo',
    html: modalHTML,
    width: '800px',
    showConfirmButton: false,
    showCloseButton: true,
    didOpen: () => {
      carregarListaAdmin();
    }
  });
}

async function carregarListaAdmin() {
  try {
    showSkeleton('adminFrotaList', 3);
    showSkeleton('adminRotasList', 3);
    
    const dados = await carregarDadosDinamicos();
    
    // Renderizar frota
    const frotaList = document.getElementById('adminFrotaList');
    if (frotaList) {
      frotaList.innerHTML = dados.onibus.map(onibus => `
        <div class="admin-item">
          <div class="admin-item-info">
            <strong>${onibus.placa}</strong>
            <small>${onibus.tag_ac} • ${onibus.cor}</small>
          </div>
          <div class="admin-item-actions">
            <button class="btn btn-sm btn-warning" onclick="editarOnibus('${onibus.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="excluirOnibus('${onibus.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('');
    }
    
    // Renderizar rotas
    const rotasList = document.getElementById('adminRotasList');
    if (rotasList) {
      rotasList.innerHTML = dados.rotas.map(rota => `
        <div class="admin-item">
          <div class="admin-item-info">
            <strong>${rota.nome}</strong>
            <small>${rota.tipo} • ${rota.desc}</small>
          </div>
          <div class="admin-item-actions">
            <button class="btn btn-sm btn-warning" onclick="editarRota('${rota.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="excluirRota('${rota.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Erro ao carregar lista admin:', error);
  }
}

// Adicionar funções ao window
window.adicionarNovoOnibus = adicionarNovoOnibus;
window.adicionarNovaRota = adicionarNovaRota;
window.criarPainelAdminDinamico = criarPainelAdminDinamico;
