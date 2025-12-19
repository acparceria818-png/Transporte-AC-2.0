// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, 
  getDocs, query, where, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5KEaKntt9wPYcy60DutrqvIH34piXsXk",
  authDomain: "transporte-f7aea.firebaseapp.com",
  databaseURL: "https://transporte-f7aea-default-rtdb.firebaseio.com",
  projectId: "transporte-f7aea",
  storageBucket: "transporte-f7aea.firebasestorage.app",
  messagingSenderId: "551406731008",
  appId: "1:551406731008:web:90855ffcd9ac0ef1d93de5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helpers
async function getColaborador(matricula) {
  const docRef = doc(db, 'colaboradores', matricula);
  return await getDoc(docRef);
}

// Wrapper para monitoramento
function monitorarRotas(callback) {
  return onSnapshot(collection(db, 'rotas_em_andamento'), snapshot => {
    const rotas = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.ativo !== false) rotas.push({ id: docSnap.id, ...data });
    });
    callback(rotas);
  });
}

// Exportações
export {
  db, auth, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, 
  query, where, orderBy, onSnapshot, serverTimestamp, 
  getColaborador, monitorarRotas
};
