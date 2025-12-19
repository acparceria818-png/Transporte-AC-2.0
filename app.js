// app.js - CÓDIGO COMPLETO RESTAURADO
import { db, collection, getDocs, doc, setDoc, addDoc, onSnapshot, serverTimestamp, query, where, orderBy } from './firebase.js';
import { UI } from './ui.js';
import { Maps } from './maps.js';
import { Auth } from './auth.js';

// === DADOS ESTÁTICOS (Restaurados do seu código original) ===
const ONIBUS_DISPONIVEIS = [
  { placa: 'TEZ-2J56', tag_ac: 'AC LO 583', tag_vale: '1JI347', cor: 'BRANCA', empresa: 'MUNDIAL' },
  { placa: 'TEZ-2J60', tag_ac: 'AC LO 585', tag_vale: '1JI348', cor: 'BRANCA', empresa: 'MUNDIAL' },
  { placa: 'TEZ-2J57', tag_ac: 'AC LO 584', tag_vale: '1JI349', cor: 'BRANCA', empresa: 'MUNDIAL' },
  { placa: 'SJD5G38', tag_ac: 'AC LO 610', tag_vale: '1JI437', cor: 'BRANCA', empresa: 'MUNDIAL' },
  { placa: 'SYA5A51', tag_ac: 'AC LO 611', tag_vale: '1JI436', cor: 'BRANCA', empresa: 'MUNDIAL' },
  { placa: 'TEZ2J58', tag_ac: 'AC LO 609', tag_vale: '1JI420', cor: 'BRANCA', empresa: 'MUNDIAL' },
  { placa: 'PZS6858', tag_ac: 'VL 080', tag_vale: '-', cor: 'BRANCA', empresa: 'AC PARCERIA' },
  { placa: 'PZW5819', tag_ac: 'VL 083', tag_vale: '-', cor: 'BRANCA', empresa: 'AC PARCERIA' }
];

const ROTAS_DISPONIVEIS = [
  { id: 'adm01', nome: 'ROTA ADM 01', tipo: 'adm', desc: 'Rota administrativa 01' },
  { id: 'adm02', nome: 'ROTA ADM 02', tipo: 'adm', desc: 'Rota administrativa 02' },
  { id: 'op01', nome: 'ROTA 01', tipo: 'operacional', desc: 'Rota operacional 01' },
  { id: 'op02', nome: 'ROTA 02', tipo: 'operacional', desc: 'Rota operacional 02' },
  { id: 'op03', nome: 'ROTA 03', tipo: 'operacional', desc: 'Rota operacional 03' },
  { id: 'op04', nome: 'ROTA 04', tipo: 'operacional', desc: 'Rota operacional 04' },
  { id: 'op05', nome: 'ROTA 05', tipo: 'operacional', desc: 'Rota operacional 05' },
  { id: 'ret01', nome: 'RETORNO OVERLAND 01', tipo: 'retorno', desc: 'Retorno' },
  { id: 'ret02', nome: 'RETORNO OVERLAND 02', tipo: 'retorno', desc: 'Retorno' }
];

let estado = {
  usuario: null,
  onibus: null, // Armazena o ônibus selecionado
  watchId: null,
  rotaAtiva: null
};

// Função Segura para Cliques
function safeClick(id, callback) {
  const el = document.getElementById(id);
  if (el) el.onclick = callback;
}

document.addEventListener('DOMContentLoaded', () => {
  Maps.init();
  verificarSessao();
  initEventListeners();
});

function verificarSessao() {
  const user = Auth.checkSession();
  const onibusSalvo = localStorage.getItem('ac_onibus');
  
  if (user) {
    estado.usuario = user;
    if (onibusSalvo) estado.onibus = JSON.parse(onibusSalvo);

    if (user.perfil === 'motorista') {
      if(estado.onibus) prepararTelaMotorista();
      else UI.mostrarTela('tela-selecao-onibus'); // Se logou mas não escolheu ônibus
    } else if (user.perfil === 'admin') {
      prepararTelaAdmin();
    }
  }
}

function initEventListeners() {
  // === NAVEGAÇÃO BÁSICA ===
  safeClick('btnEntrarPortal', () => UI.mostrarTela('telaEscolhaPerfil'));
  safeClick('cardMotorista', () => UI.mostrarTela('tela-motorista-login'));
  safeClick('cardPassageiro', () => UI.mostrarTela('tela-passageiro'));
  safeClick('cardAdmin', () => UI.mostrarTela('tela-admin-login'));

  // === VOLTAR ===
  safeClick('btnVoltarWelcome', () => UI.mostrarTela('welcome'));
  safeClick('btnVoltarPerfil', () => UI.mostrarTela('telaEscolhaPerfil'));
  safeClick('btnVoltarLoginMot', () => UI.mostrarTela('tela-motorista-login'));
  safeClick('btnVoltarPerfilPass', () => UI.mostrarTela('telaEscolhaPerfil'));
  safeClick('btnVoltarPassageiroMenu', () => { UI.mostrarTela('tela-passageiro'); Maps.fecharMapa(); });
  safeClick('btnVoltarPerfilAdmin', () => UI.mostrarTela('telaEscolhaPerfil'));
  safeClick('btnVoltarMotorista', () => UI.mostrarTela('tela-motorista'));
  safeClick('btnCancelarFeedback', () => UI.mostrarTela('tela-motorista'));

  // === LOGIN ===
  safeClick('btnLoginMotorista', async () => {
    const mat = document.getElementById('matriculaMotorista').value;
    const user = await Auth.loginMotorista(mat);
    if (user) {
      estado.usuario = user;
      carregarListaOnibus(); // Fluxo original: Login -> Escolher Ônibus
    }
  });

  safeClick('btnLoginAdmin', async () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminSenha').value;
    const user = await Auth.loginAdmin(email, pass);
    if (user) { estado.usuario = user; prepararTelaAdmin(); }
  });

  // === MOTORISTA ===
  safeClick('btnIrParaRotas', carregarRotas);
  safeClick('btnPararRota', pararRastreamento);
  
  // Botão de Emergência (Lógica original com SweetAlert)
  safeClick('btnEmergencia', async () => {
    const { value: tipo } = await Swal.fire({
      title: 'Selecione a Emergência',
      input: 'select',
      inputOptions: {
        'acidente': 'Acidente',
        'mecanico': 'Problema Mecânico',
        'pneu': 'Pneu Furado',
        'saude': 'Problema de Saúde',
        'panico': 'PÂNICO / SEGURANÇA'
      },
      showCancelButton: true
    });

    if (tipo) {
      await addDoc(collection(db, "emergencias"), {
        tipo: tipo,
        motorista: estado.usuario.nome,
        matricula: estado.usuario.matricula,
        onibus: estado.onibus?.placa || 'N/A',
        lat: estado.lat || 0,
        lng: estado.lng || 0,
        status: 'pendente',
        timestamp: serverTimestamp()
      });
      UI.alert('ALERTA ENVIADO', 'A central foi notificada!', 'success');
    }
  });

  safeClick('btnFeedbackMot', () => UI.mostrarTela('tela-feedback'));
  
  safeClick('btnEnviarFeedbackReal', async () => {
    const tipo = document.getElementById('feedbackTipo').value;
    const msg = document.getElementById('feedbackMsg').value;
    if(!msg) return UI.toast('Escreva uma mensagem', 'warning');
    
    await addDoc(collection(db, "feedbacks"), {
        tipo, mensagem: msg, 
        autor: estado.usuario.nome,
        perfil: estado.usuario.perfil,
        timestamp: serverTimestamp(),
        status: 'pendente'
    });
    UI.toast('Feedback enviado!', 'success');
    UI.mostrarTela('tela-motorista');
  });

  safeClick('logoutBtn', logout);
  safeClick('logoutBtnAdmin', logout);

  // === PASSAGEIRO ===
  safeClick('btnVerRotasPassageiro', iniciarModoPassageiro);

  // === MAPA ===
  safeClick('fecharMapaBtn', Maps.fecharMapa);

  // === ADMIN TABS ===
  document.querySelectorAll('.dashboard-tab').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.dashboard-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        
        // Carrega o conteúdo da aba
        if(btn.dataset.tab === 'tabRotas') carregarRotasAdmin();
        if(btn.dataset.tab === 'tabEmergencias') carregarEmergenciasAdmin();
        if(btn.dataset.tab === 'tabFeedbacks') carregarFeedbacksAdmin();
    };
  });
}

// === LÓGICA DE SELEÇÃO DE ÔNIBUS (RESTAURADA) ===
function carregarListaOnibus() {
  UI.mostrarTela('tela-selecao-onibus');
  const div = document.getElementById('onibusList');
  div.innerHTML = '';

  ONIBUS_DISPONIVEIS.forEach(bus => {
    const el = document.createElement('div');
    el.className = 'onibus-card';
    el.innerHTML = `
      <div class="onibus-icon"><i class="fas fa-bus"></i></div>
      <div class="onibus-info">
        <h4>${bus.placa}</h4>
        <p>${bus.empresa}</p>
        <small>${bus.tag_ac}</small>
      </div>
      <div class="onibus-select"><i class="fas fa-chevron-right"></i></div>
    `;
    el.onclick = () => selecionarOnibus(bus);
    div.appendChild(el);
  });
}

function selecionarOnibus(bus) {
  estado.onibus = bus;
  localStorage.setItem('ac_onibus', JSON.stringify(bus));
  prepararTelaMotorista();
}

function prepararTelaMotorista() {
  document.getElementById('motoristaNomeDisplay').textContent = estado.usuario.nome.split(' ')[0];
  document.getElementById('motoristaOnibusDisplay').textContent = estado.onibus ? estado.onibus.placa : 'Sem Ônibus';
  document.getElementById('userStatus').style.display = 'flex';
  document.getElementById('userName').textContent = estado.usuario.nome;
  UI.mostrarTela('tela-motorista');
}

// === LÓGICA DE ROTAS E GPS ===
async function carregarRotas() {
  UI.showLoading();
  const div = document.getElementById('routesContainer');
  div.innerHTML = '';
  
  // Usa o array local (mais rápido e garantido)
  ROTAS_DISPONIVEIS.forEach(r => {
    const item = document.createElement('div');
    item.className = 'route-item';
    item.innerHTML = `
      <div class="route-info"><h4>${r.nome}</h4><small>${r.desc}</small></div>
      <button class="btn btn-primary btn-small">Iniciar</button>
    `;
    item.querySelector('button').onclick = () => iniciarRota(r.nome);
    div.appendChild(item);
  });
  
  UI.hideLoading();
  UI.mostrarTela('tela-rotas');
}

async function iniciarRota(nome) {
  if (!await UI.confirm('Iniciar Viagem?', `Rota: ${nome}`)) return;
  estado.rotaAtiva = nome;
  
  // UI
  const status = document.getElementById('rotaStatusTexto');
  status.textContent = `Em trânsito: ${nome}`;
  status.style.color = '#27ae60';
  document.getElementById('btnPararRota').style.display = 'inline-flex';
  
  UI.mostrarTela('tela-motorista');
  iniciarGPS();
}

function iniciarGPS() {
  if (!navigator.geolocation) return UI.alert('Erro', 'GPS off');
  const opts = { enableHighAccuracy: true, timeout: 10000 };
  
  estado.watchId = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude, speed } = pos.coords;
    estado.lat = latitude; // Salva para emergência
    estado.lng = longitude;
    
    // Envia ao Firebase
    const dados = {
        motorista: estado.usuario.nome,
        matricula: estado.usuario.matricula,
        onibus: estado.onibus?.placa,
        rota: estado.rotaAtiva,
        latitude, longitude,
        velocidade: speed ? (speed * 3.6).toFixed(0) : 0,
        ativo: true,
        ultimaAtualizacao: serverTimestamp()
    };
    setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), dados, { merge: true });
    
  }, err => console.error(err), opts);
  
  Maps.ativarWakeLock();
}

async function pararRastreamento() {
  if (!await UI.confirm('Parar?', 'Encerrar rota?')) return;
  if (estado.watchId) navigator.geolocation.clearWatch(estado.watchId);
  Maps.desativarWakeLock();
  
  if (estado.usuario) {
    await setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), { ativo: false }, { merge: true });
  }
  
  estado.rotaAtiva = null;
  document.getElementById('rotaStatusTexto').textContent = "Nenhuma rota ativa";
  document.getElementById('btnPararRota').style.display = 'none';
  UI.toast('Rota encerrada');
}

// === ADMIN ===
function prepararTelaAdmin() {
  document.getElementById('userStatus').style.display = 'flex';
  document.getElementById('userName').textContent = 'Admin';
  UI.mostrarTela('tela-admin-dashboard');
  carregarRotasAdmin(); // Carrega aba inicial
}

function carregarRotasAdmin() {
    const div = document.getElementById('adminRotasList');
    onSnapshot(collection(db, "rotas_em_andamento"), snap => {
        div.innerHTML = '';
        let count = 0;
        snap.forEach(d => {
            const data = d.data();
            if(data.ativo) {
                count++;
                div.innerHTML += `
                    <div class="rota-admin-card">
                        <div class="rota-admin-header">
                            <strong>${data.rota}</strong>
                            <span class="status-badge ativo">${data.velocidade} km/h</span>
                        </div>
                        <div class="rota-admin-info">
                            <p>${data.motorista} (${data.onibus})</p>
                        </div>
                        <button class="btn btn-small btn-secondary" onclick="window.verMapaAdmin(${data.latitude}, ${data.longitude})">Ver Mapa</button>
                    </div>
                `;
            }
        });
        document.getElementById('adminTotalRotas').textContent = count;
    });
}

// Expor função para o onclick do HTML gerado dinamicamente
window.verMapaAdmin = (lat, lng) => {
    Maps.abrirMapa();
    // Pequeno delay para o mapa carregar
    setTimeout(() => {
        // Criar marcador temporário
        const marker = L.marker([lat, lng]).addTo(window.mapInstance); // window.mapInstance precisa ser exposto no maps.js
        window.mapInstance.setView([lat, lng], 15);
    }, 300);
};

// === PASSAGEIRO ===
function iniciarModoPassageiro() {
  UI.mostrarTela('tela-rotas-passageiro');
  const div = document.getElementById('rotasPassageiroContainer');
  
  onSnapshot(collection(db, "rotas_em_andamento"), snap => {
    div.innerHTML = '';
    const ativos = [];
    snap.forEach(d => { if (d.data().ativo) ativos.push({id: d.id, ...d.data()}) });

    if(ativos.length === 0) {
        div.innerHTML = '<div class="empty-state"><p>Nenhum ônibus circulando.</p></div>';
        return;
    }

    ativos.forEach(bus => {
        Maps.atualizarMarcadorMotorista(bus.id, bus);
        const el = document.createElement('div');
        el.className = 'rota-passageiro-card';
        el.innerHTML = `
            <div class="rota-passageiro-header">
                <h4>${bus.rota}</h4>
                <span class="status-online">Ao Vivo</span>
            </div>
            <p>Motorista: ${bus.motorista}</p>
            <p>Ônibus: ${bus.onibus}</p>
            <button class="btn btn-primary btn-block">Ver no Mapa</button>
        `;
        el.querySelector('button').onclick = () => {
            Maps.abrirMapa();
            // maps.js cuida de mostrar todos os marcadores
        };
        div.appendChild(el);
    });
  });
}

function logout() {
    pararRastreamento();
    Auth.logout();
}
