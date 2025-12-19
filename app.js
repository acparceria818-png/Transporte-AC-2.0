// app.js
import { 
    db, collection, getDocs, doc, setDoc, addDoc, onSnapshot, serverTimestamp, query, where, orderBy, 
    updateDoc, deleteDoc, getDoc, monitorarRotas, monitorarAvisos 
} from './firebase.js';
import { UI } from './ui.js';
import { Maps } from './maps.js';
import { Auth } from './auth.js';

// === DADOS ESTÁTICOS ===
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

document.addEventListener('DOMContentLoaded', () => {
    Maps.init();
    
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
    
    // Carrega ônibus
    const listaOnibus = document.getElementById('onibusList');
    if(listaOnibus) {
        listaOnibus.innerHTML = '';
        ONIBUS_DISPONIVEIS.forEach(bus => {
            const div = document.createElement('div');
            div.className = 'onibus-card';
            div.innerHTML = `<div class="onibus-icon"><i class="fas fa-bus"></i></div><div class="onibus-info"><h4>${bus.placa}</h4><p>${bus.empresa}</p><small>${bus.tag_ac}</small></div>`;
            div.onclick = () => {
                estado.onibus = bus;
                localStorage.setItem('ac_onibus', JSON.stringify(bus));
                prepararTelaMotorista();
            };
            listaOnibus.appendChild(div);
        });
    }

    // Botão mapa
    document.getElementById('fecharMapaBtn').onclick = Maps.fecharMapa;
});

// === EXPOSIÇÃO GLOBAL (PARA O HTML FUNCIONAR) ===
window.entrarNoPortal = () => UI.mostrarTela('telaEscolhaPerfil');
window.mostrarTela = UI.mostrarTela;
window.selecionarPerfil = (p) => {
    if(p === 'motorista') UI.mostrarTela('tela-motorista-login');
    if(p === 'passageiro') UI.mostrarTela('tela-passageiro');
    if(p === 'admin') UI.mostrarTela('tela-admin-login');
};

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

window.logout = () => { window.pararRota(); Auth.logout(); };

// === LÓGICA MOTORISTA ===
function prepararTelaMotorista() {
    document.getElementById('motoristaNomeDisplay').innerText = estado.usuario.nome.split(' ')[0];
    document.getElementById('motoristaOnibusDisplay').innerText = estado.onibus ? estado.onibus.placa : '';
    document.getElementById('userStatus').style.display = 'flex';
    document.getElementById('userName').innerText = estado.usuario.nome;
    
    // Carrega avisos ativos
    monitorarAvisos(avisos => {
        const badge = document.getElementById('avisosCount');
        if(avisos.length > 0) {
            badge.innerText = avisos.length;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    });
    
    UI.mostrarTela('tela-motorista');
}

window.carregarRotas = () => {
    UI.mostrarTela('tela-rotas');
    const div = document.getElementById('routesContainer');
    div.innerHTML = '';
    
    ROTAS_DISPONIVEIS.forEach(r => {
        const item = document.createElement('div');
        item.className = 'route-item';
        item.dataset.tipo = r.tipo;
        item.innerHTML = `<div><h4>${r.nome}</h4><small>${r.desc}</small></div><button class="btn btn-primary btn-small">Iniciar</button>`;
        item.querySelector('button').onclick = () => window.iniciarRota(r.nome);
        div.appendChild(item);
    });
};

window.searchRoutes = () => {
    const term = document.getElementById('routeSearch').value.toLowerCase();
    document.querySelectorAll('.route-item').forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
    });
};

window.iniciarRota = async (nome) => {
    if(!await UI.confirm('Iniciar?', `Rota: ${nome}`)) return;
    
    estado.rotaAtiva = nome;
    document.getElementById('rotaStatusTexto').innerText = `Em trânsito: ${nome}`;
    document.getElementById('rotaStatusTexto').style.color = 'var(--success)';
    document.getElementById('btnPararRota').style.display = 'inline-flex';
    UI.mostrarTela('tela-motorista');
    
    // GPS + Polyline + WakeLock
    if(navigator.geolocation) {
        Maps.init();
        const opts = { enableHighAccuracy: true, timeout: 10000 };
        estado.watchId = navigator.geolocation.watchPosition(pos => {
            const { latitude, longitude, speed } = pos.coords;
            
            // Atualiza local e Firebase
            const dados = {
                motorista: estado.usuario.nome, matricula: estado.usuario.matricula,
                onibus: estado.onibus.placa, rota: nome, latitude, longitude,
                velocidade: speed ? (speed * 3.6).toFixed(0) : 0,
                ativo: true, timestamp: serverTimestamp()
            };
            setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), dados, { merge: true });
            
            // Rastro local
            Maps.atualizarMarcadorMotorista(estado.usuario.matricula, dados);
            
        }, err => console.error(err), opts);
        Maps.ativarWakeLock();
    }
};

window.pararRota = async () => {
    if(!await UI.confirm('Parar?', 'Encerrar rota?')) return;
    if(estado.watchId) navigator.geolocation.clearWatch(estado.watchId);
    Maps.desativarWakeLock();
    if(estado.usuario) await setDoc(doc(db, "rotas_em_andamento", estado.usuario.matricula), { ativo: false }, { merge: true });
    estado.rotaAtiva = null;
    document.getElementById('rotaStatusTexto').innerText = 'Nenhuma rota ativa';
    document.getElementById('btnPararRota').style.display = 'none';
    UI.toast('Rota encerrada');
};

window.ativarEmergencia = async () => {
    const { value: tipo } = await Swal.fire({
        title: 'EMERGÊNCIA', input: 'select',
        inputOptions: { 'acidente': 'Acidente', 'mecanico': 'Mecânico', 'saude': 'Saúde', 'panico': 'PÂNICO' },
        showCancelButton: true, confirmButtonColor: '#d33'
    });
    if(tipo) {
        await addDoc(collection(db, "emergencias"), {
            tipo, motorista: estado.usuario.nome, matricula: estado.usuario.matricula,
            onibus: estado.onibus?.placa, status: 'pendente', timestamp: serverTimestamp()
        });
        UI.alert('ALERTA ENVIADO', 'Equipe notificada!', 'success');
    }
};

window.mostrarAvisos = async () => {
    const snap = await getDocs(collection(db, 'avisos'));
    if(snap.empty) return UI.alert('Avisos', 'Nenhum aviso no momento.');
    let msg = '';
    snap.forEach(d => { if(d.data().ativo) msg += `• ${d.data().titulo}: ${d.data().mensagem}\n\n`; });
    UI.alert('Avisos', msg);
};

// === ADMIN E GESTÃO ===
function prepararTelaAdmin() {
    document.getElementById('userStatus').style.display = 'flex';
    document.getElementById('userName').innerText = 'Admin';
    UI.mostrarTela('tela-admin-dashboard');
    window.mostrarTab('rotas');
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

// --- GESTÃO DE ESCALAS (LÓGICA COMPLEXA RESTAURADA) ---
window.gerenciarEscalas = async () => {
    UI.showLoading('Carregando...');
    const snap = await getDocs(collection(db, 'escalas'));
    const escalas = snap.docs.map(d => ({id: d.id, ...d.data()}));
    UI.hideLoading();

    const html = `
        <div style="text-align:left; max-height:400px; overflow-y:auto">
            <button class="btn btn-primary btn-block mb-2" onclick="window.criarNovaEscala()">+ Nova Escala</button>
            ${escalas.map(e => `
                <div class="escala-admin-item">
                    <b>${e.motorista}</b> (${e.matricula})<br>Período: ${e.periodo}
                    <button class="btn btn-danger btn-small" style="margin-top:5px" onclick="window.excluirEscala('${e.id}')">Excluir</button>
                </div>
            `).join('')}
        </div>
    `;
    Swal.fire({ title: 'Gerenciar Escalas', html: html, showConfirmButton: false, showCloseButton: true });
};

window.criarNovaEscala = () => {
    Swal.close();
    // HTML complexo para os dias da semana
    const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    let formHtml = `
        <input id="escMotorista" class="swal2-input" placeholder="Nome Motorista">
        <input id="escMatricula" class="swal2-input" placeholder="Matrícula">
        <input id="escPeriodo" class="swal2-input" placeholder="Período (Ex: 01/01 a 07/01)">
        <div style="text-align:left; margin-top:10px; height:200px; overflow-y:auto;">
    `;
    
    dias.forEach(dia => {
        formHtml += `
            <div style="border:1px solid #eee; padding:5px; margin-bottom:5px;">
                <label><input type="checkbox" id="check-${dia}"> ${dia}</label><br>
                <input id="rota-${dia}" placeholder="Rota" style="width:100%; margin-bottom:5px;">
                <select id="horario-${dia}" style="width:100%">
                    <option value="06:00 - 14:00">06:00 - 14:00</option>
                    <option value="14:00 - 22:00">14:00 - 22:00</option>
                    <option value="22:00 - 06:00">22:00 - 06:00</option>
                </select>
            </div>
        `;
    });
    formHtml += '</div>';

    Swal.fire({
        title: 'Nova Escala',
        html: formHtml,
        confirmButtonText: 'Salvar',
        preConfirm: async () => {
            const motorista = document.getElementById('escMotorista').value;
            const matricula = document.getElementById('escMatricula').value;
            const periodo = document.getElementById('escPeriodo').value;
            if(!motorista || !matricula) return Swal.showValidationMessage('Preencha nome e matrícula');
            
            const diasSelecionados = [];
            dias.forEach(dia => {
                if(document.getElementById(`check-${dia}`).checked) {
                    diasSelecionados.push({
                        dia: dia,
                        rota: document.getElementById(`rota-${dia}`).value,
                        horario: document.getElementById(`horario-${dia}`).value
                    });
                }
            });

            await addDoc(collection(db, 'escalas'), { motorista, matricula, periodo, dias: diasSelecionados, timestamp: serverTimestamp() });
        }
    }).then((res) => { if(res.isConfirmed) { UI.toast('Escala Salva!'); window.gerenciarEscalas(); } });
};

window.excluirEscala = async (id) => {
    if(await UI.confirm('Excluir?', 'Tem certeza?')) {
        await deleteDoc(doc(db, 'escalas', id));
        UI.toast('Excluído');
        window.gerenciarEscalas();
    }
};

// --- GESTÃO DE AVISOS ---
window.gerenciarAvisos = async () => {
    UI.showLoading();
    const snap = await getDocs(collection(db, 'avisos'));
    const avisos = snap.docs.map(d => ({id: d.id, ...d.data()}));
    UI.hideLoading();

    let html = `
        <div style="text-align:left; max-height:300px; overflow-y:auto;">
            ${avisos.map(a => `
                <div style="border:1px solid #ddd; padding:10px; margin-bottom:5px; border-radius:5px;">
                    <strong>${a.titulo}</strong><p>${a.mensagem}</p>
                    <button class="btn btn-small btn-danger" onclick="window.excluirAviso('${a.id}')">Excluir</button>
                </div>
            `).join('')}
        </div>
        <hr>
        <h4>Novo Aviso</h4>
        <input id="newAvisoTitulo" class="swal2-input" placeholder="Título">
        <textarea id="newAvisoMsg" class="swal2-textarea" placeholder="Mensagem"></textarea>
    `;

    Swal.fire({
        title: 'Gerenciar Avisos', html: html, showCancelButton: true, confirmButtonText: 'Salvar Novo',
        preConfirm: async () => {
            const titulo = document.getElementById('newAvisoTitulo').value;
            const mensagem = document.getElementById('newAvisoMsg').value;
            if(!titulo) return Swal.showValidationMessage('Preencha o título');
            await addDoc(collection(db, 'avisos'), { titulo, mensagem, ativo: true, timestamp: serverTimestamp() });
        }
    }).then((res) => { if(res.isConfirmed) { UI.toast('Salvo!'); window.gerenciarAvisos(); } });
};

window.excluirAviso = async (id) => {
    await deleteDoc(doc(db, 'avisos', id));
    UI.toast('Excluído');
    setTimeout(() => window.gerenciarAvisos(), 500);
};

// LISTAS ADMIN
function carregarRotasAdmin() {
    const div = document.getElementById('adminRotasList');
    monitorarRotas(rotas => {
        div.innerHTML = '';
        let count = 0;
        rotas.forEach(r => {
            count++;
            div.innerHTML += `
                <div class="rota-admin-card">
                    <p><strong>${r.rota}</strong> - ${r.motorista} (${r.velocidade}km/h)</p>
                    <button class="btn btn-small" onclick="window.verMapaAdmin(${r.latitude}, ${r.longitude})">Mapa</button>
                </div>`;
        });
        document.getElementById('adminTotalRotas').innerText = count;
    });
}

function carregarEmergenciasAdmin() {
    const div = document.getElementById('emergenciasList');
    onSnapshot(query(collection(db, "emergencias"), orderBy('timestamp', 'desc')), snap => {
        div.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            div.innerHTML += `<div class="emergencia-card"><strong>${data.tipo}</strong> - ${data.motorista}<br>Status: ${data.status}</div>`;
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

window.notificarGeral = async () => {
    const { value: formValues } = await Swal.fire({
        title: 'Enviar Notificação',
        html: '<input id="swal-input1" class="swal2-input" placeholder="Título"><input id="swal-input2" class="swal2-input" placeholder="Mensagem">',
        focusConfirm: false,
        preConfirm: () => [document.getElementById('swal-input1').value, document.getElementById('swal-input2').value]
    });
    if (formValues) {
        await addDoc(collection(db, "avisos"), { titulo: formValues[0], mensagem: formValues[1], ativo: true, timestamp: serverTimestamp() });
        UI.toast('Enviado!');
    }
};

// === ESCALAS (MOTORISTA) ===
window.carregarEscalaMotorista = async () => {
    UI.showLoading();
    const q = query(collection(db, 'escalas'), where("matricula", "==", estado.usuario.matricula));
    const snap = await getDocs(q);
    const div = document.getElementById('escalaConteudo');
    if(snap.empty) div.innerHTML = '<div class="empty-state">Sem escala.</div>';
    else {
        const d = snap.docs[0].data();
        let html = `<div class="escala-card"><h4>${d.periodo}</h4>`;
        d.dias.forEach(dia => html += `<div class="dia-escala"><strong>${dia.dia}</strong>: ${dia.rota} (${dia.horario})</div>`);
        html += '</div>';
        div.innerHTML = html;
    }
    UI.hideLoading();
    UI.mostrarTela('tela-escala');
};

// === FEEDBACK ===
window.abrirFeedback = (p) => { estado.perfilFeedback = p; UI.mostrarTela('tela-feedback'); };
window.cancelarFeedback = () => UI.mostrarTela(estado.perfilFeedback === 'motorista' ? 'tela-motorista' : 'tela-passageiro');
window.enviarFeedbackReal = async () => {
    const msg = document.getElementById('feedbackMsg').value;
    const tipo = document.getElementById('feedbackTipo').value;
    if(msg) {
        await addDoc(collection(db, 'feedbacks'), { mensagem: msg, tipo, autor: estado.usuario.nome, timestamp: serverTimestamp(), status: 'pendente' });
        UI.toast('Enviado!'); window.cancelarFeedback();
    }
};

// === PASSAGEIRO ===
window.iniciarModoPassageiro = () => {
    UI.mostrarTela('tela-rotas-passageiro');
    const div = document.getElementById('rotasPassageiroContainer');
    monitorarRotas(rotas => {
        div.innerHTML = '';
        if(rotas.length === 0) { div.innerHTML = '<div class="empty-state">Nenhum ônibus ativo.</div>'; return; }
        rotas.forEach(r => {
            Maps.atualizarMarcadorMotorista(r.id, r);
            const el = document.createElement('div');
            el.className = 'rota-passageiro-card';
            el.innerHTML = `
                <div class="rota-passageiro-header"><h4>${r.rota}</h4><span class="status-online">VIVO</span></div>
                <p>${r.motorista} (${r.onibus})</p>
                <button class="btn btn-primary btn-block">Ver no Mapa</button>
            `;
            el.querySelector('button').onclick = () => { Maps.abrirMapa(); Maps.focarNoOnibus(r.latitude, r.longitude); };
            div.appendChild(el);
        });
    });
};

// EXTRAS
window.verFormsControle = () => window.open('https://forms.gle/UDniKxPqcMKGUhFQA', '_blank');
window.abrirSuporteWhatsApp = () => window.open('https://wa.me/5593992059914', '_blank');
