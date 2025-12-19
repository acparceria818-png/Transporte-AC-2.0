// app.js - COMPLETO E RESTAURADO
import { 
    db, collection, getDocs, doc, setDoc, addDoc, onSnapshot, serverTimestamp, query, where, orderBy, 
    updateDoc, deleteDoc, getDoc 
} from './firebase.js';
import { UI } from './ui.js';
import { Maps } from './maps.js';
import { Auth } from './auth.js';

// === DADOS ESTÁTICOS (RESTAURADOS) ===
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

let estado = { usuario: null, onibus: null, watchId: null, rotaAtiva: null, perfilFeedback: null };

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
    Maps.init();
    
    // Recupera sessão
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
    
    // Carrega ônibus na lista (Para não perder a lógica original)
    const listaOnibus = document.getElementById('onibusList');
    if(listaOnibus) {
        ONIBUS_DISPONIVEIS.forEach(bus => {
            const div = document.createElement('div');
            div.className = 'onibus-card';
            div.innerHTML = `<div class="onibus-icon"><i class="fas fa-bus"></i></div><div class="onibus-info"><h4>${bus.placa}</h4><p>${bus.tag_ac}</p></div>`;
            div.onclick = () => {
                estado.onibus = bus;
                localStorage.setItem('ac_onibus', JSON.stringify(bus));
                prepararTelaMotorista();
            };
            listaOnibus.appendChild(div);
        });
    }
});

// === FUNÇÕES EXPOSTAS PARA O HTML (window.funcao) ===

window.entrarNoPortal = () => UI.mostrarTela('telaEscolhaPerfil');
window.mostrarTela = UI.mostrarTela;

window.selecionarPerfil = (perfil) => {
    if(perfil === 'motorista') UI.mostrarTela('tela-motorista-login');
    if(perfil === 'passageiro') UI.mostrarTela('tela-passageiro');
    if(perfil === 'admin') UI.mostrarTela('tela-admin-login');
};

// LOGIN MOTORISTA
window.confirmarMatriculaMotorista = async () => {
    const mat = document.getElementById('matriculaMotorista').value;
    const user = await Auth.loginMotorista(mat);
    if(user) {
        estado.usuario = user;
        // Depois do login, vai selecionar ônibus (Lógica original)
        UI.mostrarTela('tela-selecao-onibus');
    }
};

// LOGIN ADMIN
window.loginAdmin = async () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminSenha').value;
    const user = await Auth.loginAdmin(email, pass);
    if(user) { estado.usuario = user; prepararTelaAdmin(); }
};

window.logout = () => {
    window.pararRota();
    Auth.logout();
};

// === LÓGICA DO MOTORISTA ===

function prepararTelaMotorista() {
    document.getElementById('motoristaNomeDisplay').innerText = estado.usuario.nome.split(' ')[0];
    document.getElementById('motoristaOnibusDisplay').innerText = estado.onibus ? estado.onibus.placa : '';
    document.getElementById('userStatus').style.display = 'flex';
    document.getElementById('userName').innerText = estado.usuario.nome;
    UI.mostrarTela('tela-motorista');
}

window.carregarRotas = () => {
    UI.mostrarTela('tela-rotas');
    const div = document.getElementById('routesContainer');
    div.innerHTML = '';
    
    ROTAS_DISPONIVEIS.forEach(r => {
        const item = document.createElement('div');
        item.className = 'route-item';
        item.innerHTML = `<div><h4>${r.nome}</h4><small>${r.desc}</small></div><button class="btn btn-primary btn-small">Iniciar</button>`;
        item.querySelector('button').onclick = () => window.iniciarRota(r.nome);
        div.appendChild(item);
    });
};

window.iniciarRota = async (nome) => {
    if(!await UI.confirm('Iniciar Viagem?', `Rota: ${nome}`)) return;
    
    estado.rotaAtiva = nome;
    document.getElementById('rotaStatusTexto').innerText = `Em trânsito: ${nome}`;
    document.getElementById('rotaStatusTexto').style.color = 'var(--success)';
    document.getElementById('btnPararRota').style.display = 'inline-flex';
    
    UI.mostrarTela('tela-motorista');
    
    // === RASTREAMENTO NOVO COM POLYLINE ===
    if(navigator.geolocation) {
        Maps.init(); // Garante mapa iniciado
        const opts = { enableHighAccuracy: true, timeout: 10000 };
        
        estado.watchId = navigator.geolocation.watchPosition(pos => {
            const { latitude, longitude, speed } = pos.coords;
            
            // 1. Atualiza Polyline e Mapa (Localmente)
            Maps.atualizarMarcadorMotorista(estado.usuario.matricula, {
                latitude, longitude, motorista: estado.usuario.nome, 
                onibus: estado.onibus.placa, rota: nome
            });

            // 2. Envia para Firebase
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
    }
};

window.pararRota = async () => {
    if(estado.rotaAtiva) {
        if(!await UI.confirm('Parar?', 'Encerrar rota atual?')) return;
        if(estado.watchId) navigator.geolocation.clearWatch(estado.watchId);
        Maps.desativarWakeLock();
        
        // Atualiza banco
        await setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), { ativo: false }, { merge: true });
        
        estado.rotaAtiva = null;
        document.getElementById('rotaStatusTexto').innerText = 'Nenhuma rota ativa';
        document.getElementById('rotaStatusTexto').style.color = 'var(--dark)';
        document.getElementById('btnPararRota').style.display = 'none';
        UI.toast('Rota encerrada');
    }
};

window.ativarEmergencia = async () => {
    const { value: tipo } = await Swal.fire({
        title: 'EMERGÊNCIA',
        input: 'select',
        inputOptions: {
            'acidente': 'Acidente',
            'mecanico': 'Problema Mecânico',
            'saude': 'Problema de Saúde',
            'panico': 'PÂNICO'
        },
        showCancelButton: true,
        confirmButtonColor: '#d33'
    });

    if(tipo) {
        await addDoc(collection(db, "emergencias"), {
            tipo,
            motorista: estado.usuario.nome,
            matricula: estado.usuario.matricula,
            onibus: estado.onibus?.placa,
            status: 'pendente',
            timestamp: serverTimestamp()
        });
        UI.alert('ALERTA ENVIADO', 'Equipe notificada!', 'success');
    }
};

// === FEEDBACK ===
window.abrirFeedback = (perfil) => {
    estado.perfilFeedback = perfil;
    UI.mostrarTela('tela-feedback');
};

window.enviarFeedbackReal = async () => {
    const tipo = document.getElementById('feedbackTipo').value;
    const msg = document.getElementById('feedbackMsg').value;
    if(!msg) return UI.toast('Escreva algo...', 'warning');
    
    await addDoc(collection(db, "feedbacks"), {
        tipo, mensagem: msg, 
        perfil: estado.perfilFeedback,
        autor: estado.usuario ? estado.usuario.nome : 'Anônimo',
        status: 'pendente',
        timestamp: serverTimestamp()
    });
    
    UI.toast('Enviado com sucesso!', 'success');
    window.cancelarFeedback();
};

window.cancelarFeedback = () => {
    document.getElementById('feedbackMsg').value = '';
    UI.mostrarTela(estado.perfilFeedback === 'motorista' ? 'tela-motorista' : 'tela-passageiro');
};

// === ESCALAS ===
window.carregarEscalaMotorista = async () => {
    UI.showLoading('Buscando escala...');
    // Lógica simplificada de busca
    const q = query(collection(db, 'escalas'), where("matricula", "==", estado.usuario.matricula));
    const snap = await getDocs(q);
    const div = document.getElementById('escalaConteudo');
    
    if(snap.empty) {
        div.innerHTML = '<div class="empty-state">Nenhuma escala encontrada.</div>';
    } else {
        // Exibe a escala (Adaptado do seu código original)
        const dados = snap.docs[0].data();
        let html = '<div class="escala-card">';
        if(dados.dias) {
            dados.dias.forEach(d => {
                html += `<div class="dia-escala"><strong>${d.dia}</strong>: ${d.rota || 'Folga'} (${d.horario || '-'})</div>`;
            });
        }
        html += '</div>';
        div.innerHTML = html;
    }
    UI.hideLoading();
    UI.mostrarTela('tela-escala');
};

// === PASSAGEIRO ===
window.iniciarModoPassageiro = () => {
    UI.mostrarTela('tela-rotas-passageiro');
    const div = document.getElementById('rotasPassageiroContainer');
    
    onSnapshot(collection(db, "rotas_em_andamento"), snap => {
        div.innerHTML = '';
        const ativos = [];
        snap.forEach(d => { if(d.data().ativo) ativos.push({id: d.id, ...d.data()}) });

        if(ativos.length === 0) {
            div.innerHTML = '<div class="empty-state"><p>Sem ônibus ativos.</p></div>';
            return;
        }

        ativos.forEach(bus => {
            // Atualiza Mapa (Rastro + Marcador)
            Maps.atualizarMarcadorMotorista(bus.id, bus);
            
            const el = document.createElement('div');
            el.className = 'rota-passageiro-card';
            el.innerHTML = `
                <div class="rota-passageiro-header"><h4>${bus.rota}</h4><span class="status-online">Ao Vivo</span></div>
                <p>${bus.motorista}</p>
                <button class="btn btn-primary btn-block">Ver no Mapa</button>
            `;
            el.querySelector('button').onclick = () => {
                Maps.abrirMapa();
                Maps.focarNoOnibus(bus.latitude, bus.longitude);
            };
            div.appendChild(el);
        });
    });
};

// === ADMIN E TABS ===
function prepararTelaAdmin() {
    document.getElementById('userStatus').style.display = 'flex';
    document.getElementById('userName').innerText = 'Admin';
    UI.mostrarTela('tela-admin-dashboard');
    window.mostrarTab('rotas'); // Inicia na aba rotas
}

window.mostrarTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`).classList.add('active');
    event.target.classList.add('active');
    
    if(tabId === 'rotas') carregarRotasAdmin();
    if(tabId === 'emergencias') carregarEmergenciasAdmin();
    if(tabId === 'feedbacks') carregarFeedbacksAdmin();
};

function carregarRotasAdmin() {
    const div = document.getElementById('adminRotasList');
    onSnapshot(collection(db, "rotas_em_andamento"), snap => {
        div.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            if(data.ativo) {
                div.innerHTML += `
                    <div class="rota-admin-card">
                        <p><strong>${data.rota}</strong> - ${data.motorista}</p>
                        <button class="btn btn-small" onclick="window.verMapaAdmin(${data.latitude}, ${data.longitude})">Mapa</button>
                    </div>
                `;
            }
        });
    });
}

function carregarEmergenciasAdmin() {
    const div = document.getElementById('emergenciasList');
    onSnapshot(query(collection(db, "emergencias"), orderBy('timestamp', 'desc')), snap => {
        div.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            div.innerHTML += `<div class="emergencia-card"><strong>${data.tipo}</strong><br>${data.motorista}</div>`;
        });
    });
}

function carregarFeedbacksAdmin() {
    const div = document.getElementById('feedbacksList');
    onSnapshot(query(collection(db, "feedbacks"), orderBy('timestamp', 'desc')), snap => {
        div.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            div.innerHTML += `<div class="feedback-card"><strong>${data.tipo}</strong><br>${data.mensagem}</div>`;
        });
    });
}

window.verMapaAdmin = (lat, lng) => {
    Maps.abrirMapa();
    setTimeout(() => Maps.focarNoOnibus(lat, lng), 300);
};

// Funções Extras do seu original
window.verFormsControle = () => window.open('https://forms.gle/UDniKxPqcMKGUhFQA', '_blank');
window.abrirSuporteWhatsApp = () => window.open('https://wa.me/5593992059914', '_blank');
window.mostrarAvisos = async () => {
    const snap = await getDocs(collection(db, 'avisos'));
    if(snap.empty) return UI.alert('Avisos', 'Nenhum aviso no momento.');
    let msg = '';
    snap.forEach(d => msg += `• ${d.data().mensagem}\n\n`);
    UI.alert('Avisos', msg);
};
