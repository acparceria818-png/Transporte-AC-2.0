import { db, collection, query, where, getDocs, getDoc, doc } from './firebase.js';
import { UI } from './ui.js';

export const Auth = {
  loginMotorista: async (matriculaInput) => {
    if (!matriculaInput) { UI.toast('Digite a matrícula', 'error'); return null; }
    const matricula = matriculaInput.trim().toUpperCase();
    try {
      UI.showLoading('Validando...');
      let dados = null;
      // Tenta ID direto
      const docSnap = await getDoc(doc(db, 'colaboradores', matricula));
      if (docSnap.exists()) dados = docSnap.data();
      else {
        // Tenta query
        const qs = await getDocs(query(collection(db, 'colaboradores'), where("matricula", "==", matricula)));
        if (!qs.empty) dados = qs.docs[0].data();
      }
      UI.hideLoading();
      if (!dados) { UI.alert('Erro', 'Não encontrado', 'error'); return null; }
      if (dados.ativo === false) { UI.alert('Erro', 'Inativo', 'error'); return null; }
      const user = { nome: dados.nome, matricula: matricula, perfil: 'motorista' };
      localStorage.setItem('ac_user', JSON.stringify(user));
      return user;
    } catch (e) { UI.hideLoading(); UI.toast('Erro conexão', 'error'); return null; }
  },
  loginAdmin: async (email, senha) => {
    if (email === 'admin@acparceria.com' && senha === '050370') {
      const user = { nome: 'Admin', email, perfil: 'admin' };
      localStorage.setItem('ac_user', JSON.stringify(user));
      return user;
    }
    UI.toast('Dados incorretos', 'error'); return null;
  },
  checkSession: () => JSON.parse(localStorage.getItem('ac_user')),
  logout: () => { localStorage.clear(); window.location.reload(); }
};
