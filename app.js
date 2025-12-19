// app.js - CÓDIGO FINAL
import { db, collection, getDocs, doc, setDoc, addDoc, onSnapshot, serverTimestamp, query, where, orderBy, monitorarRotas } from './firebase.js';
import { UI } from './ui.js';
import { Maps } from './maps.js';
import { Auth } from './auth.js';

// DADOS ESTÁTICOS ORIGINAIS
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
  { id: 'adm01', nome: 'ROTA ADM 01', tipo: 'adm', desc: 'Rota administrativa' },
  { id: 'adm02', nome: 'ROTA ADM 02', tipo: 'adm', desc: 'Rota administrativa' },
  { id: 'op01', nome: 'ROTA 01', tipo: 'operacional', desc: 'Operacional' },
  { id: 'op02', nome: 'ROTA 02', tipo: 'operacional', desc: 'Operacional' },
  { id: 'op03', nome: 'ROTA 03', tipo: 'operacional', desc: 'Operacional' },
  { id: 'op04', nome: 'ROTA 04', tipo: 'operacional', desc: 'Operacional' },
  { id: 'op05', nome: 'ROTA 05', tipo: 'operacional', desc: 'Operacional' },
  { id: 'ret01', nome: 'RETORNO OVERLAND 01', tipo: 'retorno', desc: 'Retorno' },
  { id: 'ret02', nome: 'RETORNO OVERLAND 02', tipo: 'retorno', desc: 'Retorno' }
];

let estado = { usuario: null, onibus: null, watchId: null, rotaAtiva: null };

// Expõe funções para o HTML global (necessário para onclick="window.funcao()")
window.entrarNoPortal = () => UI.mostrarTela('telaEscolhaPerfil');
window.selecionarPerfil = (p) => {
    if(p === 'motorista') UI.mostrarTela('tela-motorista-login');
    if(p === 'passageiro') iniciarPassageiro();
    if(p === 'admin') UI.mostrarTela('tela-admin-login');
};
window.mostrarTela = UI.mostrarTela;
window.logout = () => { window.pararRota(); Auth.logout(); };

// INIT
document.addEventListener('DOMContentLoaded', () => {
    Maps.init();
    
    // Botão mapa
    document.getElementById('fecharMapaBtn').onclick = Maps.fecharMapa;

    // Verifica sessão
    const user = Auth.checkSession();
    if(user) {
        estado.usuario = user;
        if(user.perfil === 'motorista') {
            const bus = localStorage.getItem('ac_onibus');
            if(bus) { estado.onibus = JSON.parse(bus); prepararTelaMotorista(); }
            else UI.mostrarTela('tela-selecao-onibus');
        } else if (user.perfil === 'admin') {
            prepararTelaAdmin();
        }
    }
    
    // Carrega ônibus na lista
    const listaOnibus = document.getElementById('onibusList');
    ONIBUS_DISPONIVEIS.forEach(bus => {
        const div = document.createElement('div');
        div.className = 'onibus-card';
        div.innerHTML = `<div class="onibus-icon"><i class="fas fa-bus"></i></div><div class="onibus-info"><h4>${bus.placa}</h4><p>${bus.empresa}</p></div>`;
        div.onclick = () => {
            estado.onibus = bus;
            localStorage.setItem('ac_onibus', JSON.stringify(bus));
            prepararTelaMotorista();
        };
        listaOnibus.appendChild(div);
    });

    // Carrega rotas na lista
    const listaRotas = document.getElementById('routesContainer');
    ROTAS_DISPONIVEIS.forEach(rota => {
        const div = document.createElement('div');
        div.className = 'route-item';
        div.dataset.tipo = rota.tipo; // Para filtro
        div.innerHTML = `<div class="route-info"><h4>${rota.nome}</h4><small>${rota.desc}</small></div><button class="btn btn-primary btn-small">Iniciar</button>`;
        div.querySelector('button').onclick = () => window.iniciarRota(rota.nome);
        listaRotas.appendChild(div);
    });
});

window.confirmarMatriculaMotorista = async () => {
    const mat = document.getElementById('matriculaMotorista').value;
    const user = await Auth.loginMotorista(mat);
    if(user) { estado.usuario = user; UI.mostrarTela('tela-selecao-onibus'); }
};

window.loginAdmin = async () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminSenha').value;
    const user = await Auth.loginAdmin(email, pass);
    if(user) { estado.usuario = user; prepararTelaAdmin(); }
};

function prepararTelaMotorista() {
    document.getElementById('motoristaNomeDisplay').innerText = estado.usuario.nome.split(' ')[0];
    document.getElementById('motoristaOnibusDisplay').innerText = estado.onibus.placa;
    document.getElementById('userStatus').style.display = 'flex';
    document.getElementById('userName').innerText = estado.usuario.nome;
    UI.mostrarTela('tela-motorista');
}

window.iniciarRota = async (nome) => {
    if(!await UI.confirm('Iniciar?', `Rota: ${nome}`)) return;
    estado.rotaAtiva = nome;
    document.getElementById('rotaStatusTexto').innerText = `Em trânsito: ${nome}`;
    document.getElementById('rotaStatusTexto').style.color = '#27ae60';
    document.getElementById('btnPararRota').style.display = 'inline-flex';
    UI.mostrarTela('tela-motorista');
    
    // Inicia GPS
    const opts = { enableHighAccuracy: true, timeout: 10000 };
    estado.watchId = navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude, speed } = pos.coords;
        
        // Atualiza rastro local
        Maps.atualizarMarcadorMotorista(estado.usuario.matricula, {
            latitude, longitude, motorista: estado.usuario.nome, onibus: estado.onibus.placa, rota: nome
        });

        // Envia
        const dados = {
            motorista: estado.usuario.nome,
            matricula: estado.usuario.matricula,
            onibus: estado.onibus.placa,
            rota: nome,
            latitude, longitude,
            velocidade: speed ? (speed * 3.6).toFixed(0) : 0,
            ativo: true,
            ultimaAtualizacao: serverTimestamp()
        };
        setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), dados, { merge: true });

    }, err => console.error(err), opts);
    Maps.ativarWakeLock();
};

window.pararRota = async () => {
    if(!await UI.confirm('Parar?', 'Deseja encerrar?')) return;
    if(estado.watchId) navigator.geolocation.clearWatch(estado.watchId);
    Maps.desativarWakeLock();
    if(estado.usuario) setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), { ativo: false }, { merge: true });
    
    estado.rotaAtiva = null;
    document.getElementById('rotaStatusTexto').innerText = 'Nenhuma rota ativa';
    document.getElementById('btnPararRota').style.display = 'none';
    UI.toast('Rota encerrada');
};

// PASSAGEIRO
function iniciarPassageiro() {
    UI.mostrarTela('tela-passageiro');
    const lista = document.getElementById('rotasAtivasList');
    
    monitorarRotas(rotas => {
        lista.innerHTML = '';
        if(rotas.length === 0) { lista.innerHTML = '<div class="empty-state"><p>Sem ônibus.</p></div>'; return; }
        
        rotas.forEach(r => {
            const card = document.createElement('div');
            card.className = 'rota-ativa-card';
            card.innerHTML = `
                <div class="rota-ativa-header"><strong>${r.rota}</strong><span class="badge-live">VIVO</span></div>
                <p>${r.motorista} (${r.onibus})</p>
                <button class="btn btn-primary btn-block">Ver Mapa</button>
            `;
            card.querySelector('button').onclick = () => {
                Maps.abrirMapa();
                Maps.atualizarMarcadorMotorista(r.id, r);
                Maps.focarNoOnibus(r.latitude, r.longitude);
            };
            lista.appendChild(card);
            // Atualiza mapa em background
            Maps.atualizarMarcadorMotorista(r.id, r);
        });
    });
}

// ADMIN (Simples para funcionar rápido)
function prepararTelaAdmin() {
    document.getElementById('userStatus').style.display = 'flex';
    document.getElementById('userName').innerText = 'Admin';
    UI.mostrarTela('tela-admin-dashboard');
    
    monitorarRotas(rotas => {
        document.getElementById('adminTotalRotas').innerText = rotas.length;
        const lista = document.getElementById('adminRotasList');
        lista.innerHTML = '';
        rotas.forEach(r => {
            lista.innerHTML += `<div class="rota-admin-card"><p><strong>${r.rota}</strong> - ${r.motorista}</p><button class="btn btn-small" onclick="window.verMapaAdmin(${r.latitude}, ${r.longitude})">Mapa</button></div>`;
        });
    });
}

window.verMapaAdmin = (lat, lng) => {
    Maps.abrirMapa();
    setTimeout(() => Maps.focarNoOnibus(lat, lng), 300);
};

// Outras funções
window.ativarEmergencia = async () => {
    const { value: tipo } = await Swal.fire({ 
        title: 'Emergência', input: 'select', 
        inputOptions: { 'acidente': 'Acidente', 'mecanico': 'Mecânico', 'saude': 'Saúde' },
        showCancelButton: true 
    });
    if(tipo) {
        addDoc(collection(db, 'emergencias'), { 
            tipo, motorista: estado.usuario.nome, matricula: estado.usuario.matricula, 
            status: 'pendente', timestamp: serverTimestamp() 
        });
        UI.alert('Enviado', 'Socorro solicitado!', 'success');
    }
};
