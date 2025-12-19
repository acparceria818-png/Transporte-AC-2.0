// app.js
import { db, collection, getDocs, doc, setDoc, onSnapshot, serverTimestamp } from './firebase.js';
import { UI } from './ui.js';
import { Maps } from './maps.js';
import { Auth } from './auth.js';

let estado = { usuario: null, watchId: null, rotaAtiva: null };

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
  if (user) {
    estado.usuario = user;
    user.perfil === 'motorista' ? prepararTelaMotorista() : prepararTelaAdmin();
  }
}

function initEventListeners() {
  // Navegação
  safeClick('btnEntrarPortal', () => UI.mostrarTela('telaEscolhaPerfil'));
  safeClick('cardMotorista', () => UI.mostrarTela('tela-motorista-login'));
  safeClick('cardPassageiro', iniciarModoPassageiro);
  safeClick('cardAdmin', () => UI.mostrarTela('tela-admin-login'));

  // Logins
  safeClick('btnLoginMotorista', async () => {
    const mat = document.getElementById('matriculaMotorista').value;
    const user = await Auth.loginMotorista(mat);
    if (user) { estado.usuario = user; prepararTelaMotorista(); }
  });

  safeClick('btnLoginAdmin', async () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminSenha').value;
    const user = await Auth.loginAdmin(email, pass);
    if (user) { estado.usuario = user; prepararTelaAdmin(); }
  });

  // Voltar
  safeClick('btnVoltarWelcome', () => UI.mostrarTela('welcome'));
  safeClick('btnVoltarPerfil', () => UI.mostrarTela('telaEscolhaPerfil'));
  safeClick('btnVoltarPerfilAdmin', () => UI.mostrarTela('telaEscolhaPerfil'));
  safeClick('btnVoltarMotorista', () => UI.mostrarTela('tela-motorista'));
  safeClick('btnVoltarPassageiro', () => { UI.mostrarTela('telaEscolhaPerfil'); Maps.fecharMapa(); });

  // Motorista
  safeClick('btnIrParaRotas', carregarRotas);
  safeClick('btnPararRota', pararRastreamento);
  safeClick('logoutBtn', () => { pararRastreamento(); Auth.logout(); });
  safeClick('logoutBtnAdmin', Auth.logout); // Adicionei para o Admin

  // Mapa
  safeClick('fecharMapaBtn', Maps.fecharMapa);
}

function prepararTelaMotorista() {
  document.getElementById('motoristaNomeDisplay').textContent = estado.usuario.nome.split(' ')[0];
  document.getElementById('motoristaMatriculaDisplay').textContent = estado.usuario.matricula;
  document.getElementById('userStatus').style.display = 'flex';
  document.getElementById('userName').textContent = estado.usuario.nome;
  UI.mostrarTela('tela-motorista');
}

function prepararTelaAdmin() {
  document.getElementById('userStatus').style.display = 'flex';
  document.getElementById('userName').textContent = 'Admin';
  getDocs(collection(db, "rotas_em_andamento")).then(snap => {
    document.getElementById('adminTotalRotas').textContent = snap.docs.filter(d => d.data().ativo).length;
  });
  UI.mostrarTela('tela-admin-dashboard');
}

// Rotas
async function carregarRotas() {
  UI.showLoading();
  const div = document.getElementById('listaRotas');
  div.innerHTML = '';
  
  const rotas = [
    { nome: "ROTA ADM 01", desc: "Administrativa" },
    { nome: "ROTA ADM 02", desc: "Administrativa" },
    { nome: "ROTA OPERACIONAL 01", desc: "Transporte" },
    { nome: "ROTA RETORNO", desc: "Overland" }
  ];

  rotas.forEach(r => {
    const item = document.createElement('div');
    item.className = 'route-item';
    item.innerHTML = `<div><h4>${r.nome}</h4><small>${r.desc}</small></div><button class="btn btn-primary" style="width:auto">Iniciar</button>`;
    item.querySelector('button').onclick = () => iniciarRota(r.nome);
    div.appendChild(item);
  });
  
  UI.hideLoading();
  UI.mostrarTela('tela-rotas');
}

async function iniciarRota(nome) {
  if (!await UI.confirm('Iniciar?', `Rota: ${nome}`)) return;
  estado.rotaAtiva = nome;
  
  const status = document.getElementById('rotaStatusTexto');
  status.textContent = `Em trânsito: ${nome}`;
  status.style.color = 'var(--success)';
  status.style.fontWeight = 'bold';
  document.getElementById('btnPararRota').style.display = 'inline-flex';
  
  UI.mostrarTela('tela-motorista');
  iniciarGPS();
}

function iniciarGPS() {
  if (!navigator.geolocation) return UI.alert('Erro', 'GPS off');
  const opts = { enableHighAccuracy: true, timeout: 10000 };
  
  estado.watchId = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude, speed } = pos.coords;
    enviarFirebase(latitude, longitude, speed);
  }, err => console.error(err), opts);
  
  Maps.ativarWakeLock();
}

async function enviarFirebase(lat, lng, speed) {
  if (!estado.rotaAtiva || !estado.usuario) return;
  const dados = {
    motorista: estado.usuario.nome,
    matricula: estado.usuario.matricula,
    rota: estado.rotaAtiva,
    latitude: lat, longitude: lng,
    velocidade: speed ? (speed * 3.6).toFixed(0) : 0,
    ativo: true,
    ultimaAtualizacao: serverTimestamp()
  };
  await setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), dados, { merge: true });
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
  document.getElementById('rotaStatusTexto').style.color = "var(--gray)";
  document.getElementById('btnPararRota').style.display = 'none';
  UI.toast('Rota encerrada');
}

function iniciarModoPassageiro() {
  UI.mostrarTela('tela-passageiro');
  const lista = document.getElementById('listaRotasAtivas');
  
  onSnapshot(collection(db, "rotas_em_andamento"), snap => {
    lista.innerHTML = '';
    const ativos = [];
    snap.forEach(d => { if (d.data().ativo) ativos.push({ id: d.id, ...d.data() }); });

    if (ativos.length === 0) {
      lista.innerHTML = '<div class="loading-state"><p>Nenhum ônibus circulando.</p></div>';
      return;
    }

    ativos.forEach(bus => {
      Maps.atualizarMarcadorMotorista(bus.id, bus);
      const card = document.createElement('div');
      card.className = 'route-item'; // Reutilizando estilo
      card.innerHTML = `
        <div>
          <h4>${bus.rota}</h4>
          <small>${bus.motorista} - ${bus.velocidade} km/h</small>
        </div>
        <button class="btn btn-primary" style="width:auto">Mapa</button>
      `;
      card.querySelector('button').onclick = () => {
        Maps.abrirMapa();
        // Centraliza (simplificado)
      };
      lista.appendChild(card);
    });
  });
}
