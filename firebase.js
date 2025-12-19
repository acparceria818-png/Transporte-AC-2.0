// firebase.js - CONFIGURAÇÃO FIREBASE ATUALIZADA
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

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA5KEaKntt9wPYcy60DutrqvIH34piXsXk",
  authDomain: "transporte-f7aea.firebaseapp.com",
  databaseURL: "https://transporte-f7aea-default-rtdb.firebaseio.com",
  projectId: "transporte-f7aea",
  storageBucket: "transporte-f7aea.firebasestorage.app",
  messagingSenderId: "551406731008",
  appId: "1:551406731008:web:90855ffcd9ac0ef1d93de5"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================= FUNÇÕES DE AUTENTICAÇÃO =================
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

// ================= FUNÇÕES DO BANCO DE DADOS =================

// Colaboradores
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

// Localização
async function updateLocalizacao(matricula, dados) {
  const docRef = doc(db, 'rotas_em_andamento', matricula);
  return await setDoc(
    docRef,
    { ...dados, ultimaAtualizacao: serverTimestamp() },
    { merge: true }
  );
}

// Registros
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

// Histórico de trajetos
async function registrarTrajeto(dados) {
  return await addDoc(collection(db, 'historico_trajetos'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

// ================= MONITORAMENTO EM TEMPO REAL =================
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

// ================= FUNÇÕES DE ADMIN =================

// Avisos
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

// Escalas
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

// Resolver emergências e feedbacks
async function resolverEmergencia(emergenciaId) {
  const docRef = doc(db, 'emergencias', emergenciaId);
  return await updateDoc(docRef, {
    status: 'resolvida',
    resolvidaEm: serverTimestamp()
  });
}

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

// ================= RELATÓRIOS =================
async function getEstatisticasDashboard() {
  const [rotasSnapshot, emergenciasSnapshot, feedbacksSnapshot] = await Promise.all([
    getDocs(collection(db, 'rotas_em_andamento')),
    getDocs(query(collection(db, 'emergencias'), where('status', '==', 'pendente'))),
    getDocs(query(collection(db, 'feedbacks'), where('status', '==', 'pendente')))
  ]);

  return {
    totalRotasAtivas: rotasSnapshot.docs.filter(doc => doc.data().ativo !== false).length,
    totalEmergencias: emergenciasSnapshot.docs.length,
    totalFeedbacks: feedbacksSnapshot.docs.length
  };
}

// ================= EXPORTAÇÕES =================
export {
  // Firebase instances
  db,
  auth,
  
  // Firestore functions
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
  
  // Authentication
  loginEmailSenha,
  
  // Database operations
  getColaborador,
  getColaboradorByEmail,
  updateLocalizacao,
  registrarEmergencia,
  registrarFeedback,
  registrarAviso,
  registrarTrajeto,
  
  // Real-time monitoring
  monitorarRotas,
  monitorarEmergencias,
  monitorarFeedbacks,
  monitorarAvisos,
  
  // Admin functions
  getAvisos,
  updateAviso,
  deleteAviso,
  getEscalas,
  addEscala,
  updateEscala,
  deleteEscala,
  resolverEmergencia,
  resolverFeedback,
  responderFeedback,
  
  // Reports
  getEstatisticasDashboard
};
