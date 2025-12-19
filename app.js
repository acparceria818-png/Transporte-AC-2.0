// app.js
import { db, collection, getDocs, doc, setDoc, onSnapshot, serverTimestamp } from './firebase.js';
import { UI } from './ui.js';
import { Maps } from './maps.js';
import { Auth } from './auth.js';

// Estado Global
let estado = {
  usuario: null,
  watchId: null,
  rotaAtiva: null
};

document.addEventListener('DOMContentLoaded', () => {
  Maps.init(); // Inicia configurações do mapa
  verificarSessao();
  initEventListeners();
});

function verificarSessao() {
  const user = Auth.checkSession();
  if (user) {
    estado.usuario = user;
    if (user.perfil === 'motorista') {
      prepararTelaMotorista();
    } else if (user.perfil === 'admin') {
      prepararTelaAdmin();
    }
  }
}

function initEventListeners() {
  // 1. Navegação Inicial
  const btnEntrarPortal = document.getElementById('btnEntrarPortal');
  if(btnEntrarPortal) btnEntrarPortal.onclick = () => UI.mostrarTela('telaEscolhaPerfil');

  // 2. Escolha de Perfil
  document.getElementById('cardMotorista').onclick = () => UI.mostrarTela('tela-motorista-login');
  document.getElementById('cardPassageiro').onclick = iniciarModoPassageiro;
  document.getElementById('cardAdmin').onclick = () => UI.mostrarTela('tela-admin-login');

  // 3. Login Motorista
  document.getElementById('btnLoginMotorista').onclick = async () => {
    const matricula = document.getElementById('matriculaMotorista').value;
    const user = await Auth.loginMotorista(matricula);
    if (user) {
      estado.usuario = user;
      prepararTelaMotorista();
    }
  };

  // 4. Login Admin
  document.getElementById('btnLoginAdmin').onclick = async () => {
    const email = document.getElementById('adminEmail').value;
    const senha = document.getElementById('adminSenha').value;
    const user = await Auth.loginAdmin(email, senha);
    if (user) {
      estado.usuario = user;
      prepararTelaAdmin();
    }
  };

  // 5. Botões de Voltar
  document.getElementById('btnVoltarWelcome').onclick = () => UI.mostrarTela('welcome');
  document.getElementById('btnVoltarPerfil').onclick = () => UI.mostrarTela('telaEscolhaPerfil');
  document.getElementById('btnVoltarPerfilAdmin').onclick = () => UI.mostrarTela('telaEscolhaPerfil');
  document.getElementById('btnVoltarMotorista').onclick = () => UI.mostrarTela('tela-motorista');
  document.getElementById('btnVoltarPassageiro').onclick = () => {
    UI.mostrarTela('telaEscolhaPerfil');
    Maps.fecharMapa(); // Garante que fecha o mapa se estiver aberto
  };

  // 6. Funcionalidades Motorista
  document.getElementById('btnIrParaRotas').onclick = carregarRotasDoFirebase;
  document.getElementById('btnPararRota').onclick = pararRastreamento;
  document.getElementById('logoutBtn').onclick = () => {
    pararRastreamento();
    Auth.logout();
  };

  // 7. Funcionalidades Mapa
  document.getElementById('fecharMapaBtn').onclick = Maps.fecharMapa;
}

// ================= TELAS =================

function prepararTelaMotorista() {
  // Atualiza infos na tela
  document.getElementById('motoristaNomeDisplay').textContent = estado.usuario.nome.split(' ')[0];
  document.getElementById('motoristaMatriculaDisplay').textContent = estado.usuario.matricula;
  document.getElementById('userStatus').style.display = 'flex';
  document.getElementById('userName').textContent = estado.usuario.nome;
  
  UI.mostrarTela('tela-motorista');
}

function prepararTelaAdmin() {
  document.getElementById('userStatus').style.display = 'flex';
  document.getElementById('userName').textContent = 'Admin';
  
  // Atualiza dashboard simples
  getDocs(collection(db, "rotas_em_andamento")).then(snap => {
    const ativos = snap.docs.filter(d => d.data().ativo).length;
    document.getElementById('adminTotalRotas').textContent = ativos;
  });

  UI.mostrarTela('tela-admin-dashboard');
}

// ================= LÓGICA DE ROTAS (MOTORISTA) =================

async function carregarRotasDoFirebase() {
  UI.showLoading('Buscando rotas...');
  const divLista = document.getElementById('listaRotas');
  divLista.innerHTML = '';

  // Lista estática de rotas (Como fallback ou principal se não tiver no banco)
  const rotasPadrao = [
    { nome: "ROTA ADM 01", desc: "Rota administrativa" },
    { nome: "ROTA ADM 02", desc: "Rota administrativa" },
    { nome: "ROTA OPERACIONAL 01", desc: "Rota transporte" },
    { nome: "ROTA RETORNO", desc: "Retorno Overland" }
  ];

  rotasPadrao.forEach(rota => {
    const item = document.createElement('div');
    item.className = 'route-item';
    item.innerHTML = `
      <div class="route-info">
        <h4>${rota.nome}</h4>
        <small>${rota.desc}</small>
      </div>
      <button class="btn btn-primary btn-small" style="width: auto;">Iniciar</button>
    `;
    item.querySelector('button').onclick = () => iniciarRota(rota.nome);
    divLista.appendChild(item);
  });

  UI.hideLoading();
  UI.mostrarTela('tela-rotas');
}

async function iniciarRota(nomeRota) {
  const confirmado = await UI.confirm('Iniciar Viagem?', `Deseja iniciar o rastreamento da ${nomeRota}?`);
  if (!confirmado) return;

  estado.rotaAtiva = nomeRota;
  
  // UI Updates
  document.getElementById('rotaStatusTexto').textContent = `Em trânsito: ${nomeRota}`;
  document.getElementById('rotaStatusTexto').style.color = 'var(--success)';
  document.getElementById('rotaStatusTexto').style.fontWeight = 'bold';
  document.getElementById('btnPararRota').style.display = 'inline-flex';
  
  UI.mostrarTela('tela-motorista');
  UI.toast('Iniciando GPS...', 'success');

  iniciarRastreamentoGPS();
}

function iniciarRastreamentoGPS() {
  if (!navigator.geolocation) return UI.alert('Erro', 'GPS não suportado');

  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

  estado.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, speed } = pos.coords;
      
      // Atualiza banco de dados
      enviarLocalizacaoFirebase(latitude, longitude, speed);
    },
    (err) => console.error('Erro GPS', err),
    options
  );
  
  // Ativa WakeLock para tela não desligar
  Maps.ativarWakeLock();
}

async function enviarLocalizacaoFirebase(lat, lng, speed) {
  if (!estado.rotaAtiva || !estado.usuario) return;

  const dados = {
    motorista: estado.usuario.nome,
    matricula: estado.usuario.matricula,
    rota: estado.rotaAtiva,
    latitude: lat,
    longitude: lng,
    velocidade: speed ? (speed * 3.6).toFixed(0) : 0,
    ativo: true,
    ultimaAtualizacao: serverTimestamp()
  };

  // Salva na coleção 'rotas_em_andamento' usando a matrícula como ID
  try {
    await setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), dados, { merge: true });
  } catch (e) {
    console.error("Erro Firebase", e);
  }
}

async function pararRastreamento() {
  if (!await UI.confirm('Parar Rota?', 'Isso encerrará o compartilhamento de localização.')) return;

  if (estado.watchId) {
    navigator.geolocation.clearWatch(estado.watchId);
    estado.watchId = null;
  }
  
  Maps.desativarWakeLock();

  if (estado.usuario) {
    // Marca como inativo no banco
    await setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), {
      ativo: false
    }, { merge: true });
  }

  estado.rotaAtiva = null;
  document.getElementById('rotaStatusTexto').textContent = "Nenhuma rota ativa";
  document.getElementById('rotaStatusTexto').style.color = "var(--secondary)";
  document.getElementById('btnPararRota').style.display = 'none';
  UI.toast('Rota Encerrada', 'info');
}

// ================= LÓGICA PASSAGEIRO =================

function iniciarModoPassageiro() {
  UI.mostrarTela('tela-passageiro');
  const lista = document.getElementById('listaRotasAtivas');
  
  // Escuta em tempo real
  onSnapshot(collection(db, "rotas_em_andamento"), (snapshot) => {
    lista.innerHTML = '';
    
    const ativos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.ativo) {
        data.id = doc.id;
        ativos.push(data);
      }
    });

    if (ativos.length === 0) {
      lista.innerHTML = '<div class="empty-state"><i class="fas fa-bus-alt" style="font-size:30px;color:#ccc;margin-bottom:10px;"></i><p>Nenhum ônibus circulando agora.</p></div>';
      return;
    }

    ativos.forEach(bus => {
      // Atualiza o mapa interno (invisível até abrir)
      Maps.atualizarMarcadorMotorista(bus.id, bus);

      const card = document.createElement('div');
      card.className = 'rota-ativa-card';
      card.innerHTML = `
        <div class="rota-ativa-header">
          <strong>${bus.rota}</strong>
          <span class="badge-live">AO VIVO</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span><i class="fas fa-user"></i> ${bus.motorista}</span>
            <span><i class="fas fa-tachometer-alt"></i> ${bus.velocidade} km/h</span>
        </div>
        <button class="btn btn-primary btn-block">Acompanhar no Mapa</button>
      `;
      
      card.querySelector('button').onclick = () => {
        Maps.abrirMapa();
        Maps.focarNoOnibus(bus.latitude, bus.longitude);
      };
      
      lista.appendChild(card);
    });
  });
}
