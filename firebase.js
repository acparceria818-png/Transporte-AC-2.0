// firebase.js - CONFIGURAÇÃO COMPLETA COM TODAS AS FUNÇÕES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ================= CONFIGURAÇÃO FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyA5KEaKntt9wPYcy60DutrqvIH34piXsXk",
  authDomain: "transporte-f7aea.firebaseapp.com",
  databaseURL: "https://transporte-f7aea-default-rtdb.firebaseio.com",
  projectId: "transporte-f7aea",
  storageBucket: "transporte-f7aea.firebasestorage.app",
  messagingSenderId: "551406731008",
  appId: "1:551406731008:web:90855ffcd9ac0ef1d93de5"
};

// ================= INICIALIZAÇÃO =================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================= AUTENTICAÇÃO =================
async function loginEmailSenha(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    return userCredential.user;
  } catch (error) {
    throw new Error(getErrorMessage(error.code));
  }
}

function getErrorMessage(errorCode) {
  const messages = {
    'auth/invalid-email': 'E-mail inválido',
    'auth/user-disabled': 'Usuário desativado',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde'
  };
  return messages[errorCode] || 'Erro ao fazer login';
}

// ================= COLABORADORES =================
async function getColaborador(matricula) {
  const docRef = doc(db, 'colaboradores', matricula);
  return await getDoc(docRef);
}

async function getColaboradorByEmail(email) {
  const q = query(
    collection(db, 'colaboradores'),
    where("email", "==", email)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : querySnapshot.docs[0];
}

// ================= ROTAS =================
async function updateLocalizacao(matricula, dados) {
  const docRef = doc(db, 'rotas_em_andamento', matricula);
  return await setDoc(
    docRef,
    { ...dados, ultimaAtualizacao: serverTimestamp() },
    { merge: true }
  );
}

// ================= REGISTROS =================
async function registrarEmergencia(dados) {
  return await addDoc(collection(db, 'emergencias'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function registrarFeedback(dados) {
  return await addDoc(collection(db, 'feedbacks'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function registrarAviso(dados) {
  return await addDoc(collection(db, 'avisos'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

// ================= FUNÇÕES AVANÇADAS (NOVAS) =================

// AVISOS - CRUD completo
async function getAvisos() {
  const q = query(collection(db, 'avisos'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function updateAviso(avisoId, dados) {
  const docRef = doc(db, 'avisos', avisoId);
  return await updateDoc(docRef, {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function deleteAviso(avisoId) {
  const docRef = doc(db, 'avisos', avisoId);
  return await deleteDoc(docRef);
}

// ESCALAS - CRUD completo
async function getEscalas() {
  const snapshot = await getDocs(collection(db, 'escalas'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addEscala(dados) {
  return await addDoc(collection(db, 'escalas'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function updateEscala(escalaId, dados) {
  const docRef = doc(db, 'escalas', escalaId);
  return await updateDoc(docRef, {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function deleteEscala(escalaId) {
  const docRef = doc(db, 'escalas', escalaId);
  return await deleteDoc(docRef);
}

// ================= MONITORAMENTO =================
function monitorarRotas(callback) {
  return onSnapshot(collection(db, 'rotas_em_andamento'), snapshot => {
    const rotas = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.ativo !== false && data.latitude && data.longitude) {
        rotas.push({ id: docSnap.id, ...data });
      }
    });
    callback(rotas);
  });
}

function monitorarEmergencias(callback) {
  return onSnapshot(collection(db, 'emergencias'), snapshot => {
    const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(dados);
  });
}

function monitorarFeedbacks(callback) {
  return onSnapshot(collection(db, 'feedbacks'), snapshot => {
    const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(dados);
  });
}

function monitorarAvisos(callback) {
  const q = query(collection(db, 'avisos'), where("ativo", "==", true));
  return onSnapshot(q, snapshot => {
    const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(dados);
  });
}

// ================= RELATÓRIOS =================
async function getRelatorios() {
  const snapshot = await getDocs(collection(db, 'relatorios'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ================= ADMIN - FUNÇÕES DE EMERGÊNCIA =================
async function resolverEmergencia(emergenciaId) {
  const docRef = doc(db, 'emergencias', emergenciaId);
  return await updateDoc(docRef, {
    status: 'resolvida',
    resolvidaEm: serverTimestamp()
  });
}

// ================= ADMIN - FUNÇÕES DE FEEDBACK =================
async function resolverFeedback(feedbackId) {
  const docRef = doc(db, 'feedbacks', feedbackId);
  return await updateDoc(docRef, {
    status: 'resolvido',
    resolvidoEm: serverTimestamp()
  });
}

async function responderFeedback(feedbackId, resposta) {
  const docRef = doc(db, 'feedbacks', feedbackId);
  return await updateDoc(docRef, {
    status: 'respondido',
    resposta: resposta,
    respondidoEm: serverTimestamp()
  });
}

// ================= DASHBOARD =================
async function getEstatisticasDashboard() {
  const [rotasSnapshot, emergenciasSnapshot, feedbacksSnapshot] = await Promise.all([
    getDocs(collection(db, 'rotas_em_andamento')),
    getDocs(query(collection(db, 'emergencias'), where('status', '==', 'pendente'))),
    getDocs(query(collection(db, 'feedbacks'), where('status', '==', 'pendente')))
  ]);

  return {
    totalRotasAtivas: rotasSnapshot.docs.filter(doc => doc.data().ativo !== false).length,
    totalEmergencias: emergenciasSnapshot.docs.length,
    totalFeedbacks: feedbacksSnapshot.docs.length,
    rotasPorTipo: await getRotasPorTipo(),
    motoristasAtivos: await getMotoristasAtivos()
  };
}

async function getRotasPorTipo() {
  const snapshot = await getDocs(collection(db, 'rotas_em_andamento'));
  const rotas = snapshot.docs.filter(doc => doc.data().ativo !== false);
  
  const tipos = {
    'adm': 0,
    'operacional': 0,
    'retorno': 0
  };
  
  rotas.forEach(rota => {
    const nomeRota = rota.data().rota || '';
    if (nomeRota.includes('ADM')) tipos.adm++;
    else if (nomeRota.includes('RETORNO')) tipos.retorno++;
    else tipos.operacional++;
  });
  
  return tipos;
}

async function getMotoristasAtivos() {
  const snapshot = await getDocs(collection(db, 'rotas_em_andamento'));
  const rotas = snapshot.docs.filter(doc => doc.data().ativo !== false);
  return rotas.length;
}

// ================= NOVAS FUNÇÕES PARA DADOS DINÂMICOS =================
async function getOnibusDisponiveis() {
  const snapshot = await getDocs(collection(db, 'frota'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getRotasDisponiveis() {
  const snapshot = await getDocs(collection(db, 'rotas_config'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addOnibus(dados) {
  return await addDoc(collection(db, 'frota'), dados);
}

async function addRota(dados) {
  return await addDoc(collection(db, 'rotas_config'), dados);
}

// ================= EXPORTAÇÕES =================
export {
  db,
  auth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  getColaborador,
  getColaboradorByEmail,
  updateLocalizacao,
  registrarEmergencia,
  registrarFeedback,
  registrarAviso,
  monitorarRotas,
  monitorarEmergencias,
  monitorarFeedbacks,
  monitorarAvisos,
  getAvisos,
  updateAviso,
  deleteAviso,
  getEscalas,
  addEscala,
  updateEscala,
  deleteEscala,
  // Novas funções
  resolverEmergencia,
  resolverFeedback,
  responderFeedback,
  getRelatorios,
  getEstatisticasDashboard,
  getRotasPorTipo,
  getMotoristasAtivos,
  // Novas funções para dados dinâmicos
  getOnibusDisponiveis,
  getRotasDisponiveis,
  addOnibus,
  addRota
};
