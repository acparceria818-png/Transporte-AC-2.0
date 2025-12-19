// app.js
import { db, collection, getDocs, doc, setDoc, onSnapshot, serverTimestamp } from './firebase.js';
import { UI } from './ui.js';
import { Maps } from './maps.js';
import { Auth } from './auth.js';

// Estado Global
let estado = {
  usuario: null,
  watchId: null, // ID do GPS
  rotaAtiva: null
};

document.addEventListener('DOMContentLoaded', () => {
  Maps.init(); // Inicia mapa (invisível)
  verificarLoginAutomatico();
  initEventListeners();
});

function verificarLoginAutomatico() {
  const user = Auth.checkSession();
  if (user) {
    estado.usuario = user;
    prepararTelaMotorista();
  }
}

function initEventListeners() {
  // Navegação Inicial
  document.getElementById('btnEntrarPortal').onclick = () => UI.mostrarTela('telaEscolhaPerfil');
  
  // Seleção de Perfil
  document.querySelectorAll('.profile-card').forEach(card => {
    card.onclick = () => {
      const perfil = card.dataset.perfil;
      if (perfil === 'motorista') UI.mostrarTela('tela-motorista-login');
      if (perfil === 'passageiro') iniciarModoPassageiro();
    };
  });

  // Login Motorista
  document.getElementById('btnLoginMotorista').onclick = async () => {
    const matricula = document.getElementById('matriculaMotorista').value;
    const user = await Auth.loginMotorista(matricula);
    if (user) {
      estado.usuario = user;
      prepararTelaMotorista();
    }
  };

  // Logout
  document.getElementById('logoutBtn').onclick = () => {
    pararRastreamento();
    Auth.logout();
  };

  // Botões de Navegação
  document.getElementById('btnVoltarPerfil').onclick = () => UI.mostrarTela('telaEscolhaPerfil');
  document.getElementById('btnVoltarMotorista').onclick = () => UI.mostrarTela('tela-motorista');
  document.getElementById('btnVoltarPerfilPassageiro').onclick = () => {
    UI.mostrarTela('telaEscolhaPerfil');
    Maps.fecharMapa();
  };

  // Motorista: Selecionar Rota
  document.getElementById('btnSelecionarRota').onclick = carregarRotasDoFirebase;
  
  // Motorista: Parar Rota
  document.getElementById('btnPararRota').onclick = pararRastreamento;
  
  // Mapa
  document.getElementById('fecharMapaBtn').onclick = Maps.fecharMapa;
}

// ================= LÓGICA DO MOTORISTA =================

function prepararTelaMotorista() {
  document.getElementById('motoristaNomeDisplay').textContent = estado.usuario.nome;
  document.getElementById('userStatus').style.display = 'flex';
  document.getElementById('userName').textContent = estado.usuario.nome;
  UI.mostrarTela('tela-motorista');
}

// Carrega rotas do Firestore (Dinâmico)
async function carregarRotasDoFirebase() {
  UI.showLoading('Buscando rotas...');
  const divLista = document.getElementById('listaRotas');
  divLista.innerHTML = '';

  try {
    const querySnapshot = await getDocs(collection(db, "rotas_config")); // Coleção nova
    
    // Se não tiver rotas no banco, usa um fallback ou avisa
    if (querySnapshot.empty) {
      divLista.innerHTML = '<p>Nenhuma rota cadastrada no sistema.</p>';
    }

    querySnapshot.forEach((doc) => {
      const rota = doc.data();
      const item = document.createElement('div');
      item.className = 'route-item';
      item.innerHTML = `
        <div class="route-info">
          <h4>${rota.nome}</h4>
          <small>${rota.descricao || 'Sem descrição'}</small>
        </div>
        <button class="btn btn-primary btn-small">Iniciar</button>
      `;
      // Click no botão Iniciar
      item.querySelector('button').onclick = () => iniciarRota(rota.nome);
      divLista.appendChild(item);
    });

    UI.hideLoading();
    UI.mostrarTela('tela-rotas');
  } catch (e) {
    UI.hideLoading();
    UI.toast('Erro ao carregar rotas', 'error');
    console.error(e);
  }
}

async function iniciarRota(nomeRota) {
  const confirm = await UI.confirm('Iniciar Rota?', `Você vai iniciar a rota: ${nomeRota}`);
  if (!confirm) return;

  estado.rotaAtiva = nomeRota;
  
  // UI Updates
  document.getElementById('rotaStatusTexto').textContent = `Em trânsito: ${nomeRota}`;
  document.getElementById('rotaStatusTexto').style.color = 'green';
  document.getElementById('btnPararRota').style.display = 'inline-flex';
  UI.mostrarTela('tela-motorista');
  UI.toast('Iniciando GPS...', 'success');

  // Iniciar GPS
  iniciarRastreamentoGPS();
}

function iniciarRastreamentoGPS() {
  if (!navigator.geolocation) return UI.alert('Erro', 'GPS não suportado');

  const options = {
    enableHighAccuracy: true, // Força GPS preciso
    timeout: 10000,
    maximumAge: 0
  };

  // WatchPosition roda continuamente
  estado.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, speed, heading } = pos.coords;
      
      // 1. Atualiza mapa local (para o motorista ver se quiser)
      Maps.iniciarRastro(latitude, longitude); // Só na primeira vez idealmente, mas aqui simplifiquei
      Maps.adicionarPontoRastro(latitude, longitude);

      // 2. Envia para o Firebase (Para passageiros verem)
      enviarLocalizacaoFirebase(latitude, longitude, speed, heading);
    },
    (err) => console.error('Erro GPS', err),
    options
  );
}

async function enviarLocalizacaoFirebase(lat, lng, speed, heading) {
  if (!estado.rotaAtiva || !estado.usuario) return;

  const idDoc = estado.usuario.matricula; // Matrícula é a chave
  const dados = {
    motorista: estado.usuario.nome,
    matricula: estado.usuario.matricula,
    rota: estado.rotaAtiva,
    latitude: lat,
    longitude: lng,
    velocidade: speed ? (speed * 3.6).toFixed(0) : 0, // m/s para km/h
    heading: heading || 0,
    ativo: true,
    ultimaAtualizacao: serverTimestamp()
  };

  try {
    await setDoc(doc(db, "rotas_em_andamento", idDoc), dados, { merge: true });
  } catch (e) {
    console.error("Erro upload GPS", e);
  }
}

async function pararRastreamento() {
  if (estado.watchId) {
    navigator.geolocation.clearWatch(estado.watchId);
    estado.watchId = null;
  }
  
  Maps.desativarWakeLock();

  if (estado.usuario && estado.rotaAtiva) {
    // Marca como inativo no banco
    await setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), {
      ativo: false,
      ultimaAtualizacao: serverTimestamp()
    }, { merge: true });
  }

  estado.rotaAtiva = null;
  document.getElementById('rotaStatusTexto').textContent = "Nenhuma rota ativa";
  document.getElementById('rotaStatusTexto').style.color = "var(--text-color)";
  document.getElementById('btnPararRota').style.display = 'none';
  UI.toast('Rota Encerrada', 'info');
}

// ================= LÓGICA DO PASSAGEIRO =================

function iniciarModoPassageiro() {
  UI.mostrarTela('tela-passageiro');
  
  // Monitorar em tempo real (onSnapshot)
  const lista = document.getElementById('listaRotasAtivas');
  
  onSnapshot(collection(db, "rotas_em_andamento"), (snapshot) => {
    lista.innerHTML = '';
    
    // Filtra apenas ativos
    const ativos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.ativo) {
        data.id = doc.id;
        ativos.push(data);
      }
    });

    if (ativos.length === 0) {
      lista.innerHTML = '<div class="empty-state">Nenhum ônibus circulando agora.</div>';
      return;
    }

    ativos.forEach(bus => {
      // Atualiza marcador no mapa (se o mapa estiver aberto ou oculto, mantém atualizado)
      Maps.atualizarMarcadorMotorista(bus.id, bus);

      // Cria card na lista
      const card = document.createElement('div');
      card.className = 'rota-ativa-card';
      card.innerHTML = `
        <div class="rota-ativa-header">
          <strong>${bus.rota}</strong>
          <span class="badge-live">Ao Vivo</span>
        </div>
        <p><i class="fas fa-user"></i> ${bus.motorista}</p>
        <p><i class="fas fa-tachometer-alt"></i> ${bus.velocidade} km/h</p>
        <button class="btn btn-outline btn-block mt-2">Ver no Mapa</button>
      `;
      
      card.querySelector('button').onclick = () => {
        Maps.abrirMapa();
        // Centraliza mapa no ônibus
        const marker = window.markers?.[bus.id]; // Acessa via maps.js (precisa expor ou ajustar escopo)
        // Simplificação: Maps.map.setView([bus.latitude, bus.longitude], 15);
      };

      lista.appendChild(card);
    });
  });
}
