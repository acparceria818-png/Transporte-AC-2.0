// auth.js
import { db, collection, query, where, getDocs, getDoc, doc } from './firebase.js';
import { UI } from './ui.js';

export const Auth = {
  loginMotorista: async (matriculaInput) => {
    if (!matriculaInput) {
      UI.toast('Digite a matrícula', 'error');
      return null;
    }
    const matricula = matriculaInput.trim().toUpperCase();

    try {
      UI.showLoading('Validando...');
      let dadosMotorista = null;

      // 1. Tenta pelo ID do documento
      const docRef = doc(db, 'colaboradores', matricula);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        dadosMotorista = docSnap.data();
      } else {
        // 2. Tenta pelo campo 'matricula'
        const q = query(collection(db, 'colaboradores'), where("matricula", "==", matricula));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) dadosMotorista = querySnap.docs[0].data();
      }

      UI.hideLoading();

      if (!dadosMotorista) {
        UI.alert('Erro', `Matrícula "${matricula}" não encontrada.`, 'error');
        return null;
      }

      if (dadosMotorista.ativo === false) { // Verifica explícito false
        UI.alert('Acesso Negado', 'Colaborador inativo.', 'warning');
        return null;
      }

      const usuario = {
        nome: dadosMotorista.nome || 'Motorista',
        matricula: matricula,
        perfil: 'motorista'
      };
      localStorage.setItem('ac_user', JSON.stringify(usuario));
      return usuario;

    } catch (error) {
      UI.hideLoading();
      console.error(error);
      UI.alert('Erro', 'Falha na conexão: ' + error.message, 'error');
      return null;
    }
  },

  loginAdmin: async (email, senha) => {
    if (email === "admin@acparceria.com" && senha === "050370") {
      const user = { nome: "Admin", email, perfil: 'admin' };
      localStorage.setItem('ac_user', JSON.stringify(user));
      return user;
    }
    UI.toast('Credenciais inválidas', 'error');
    return null;
  },

  checkSession: () => {
    const saved = localStorage.getItem('ac_user');
    return saved ? JSON.parse(saved) : null;
  },

  logout: () => {
    localStorage.removeItem('ac_user');
    window.location.reload();
  }
};
