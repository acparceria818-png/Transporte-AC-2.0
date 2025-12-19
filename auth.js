// auth.js
import { db, collection, query, where, getDocs, getDoc, doc } from './firebase.js';
import { UI } from './ui.js';

export const Auth = {
  loginMotorista: async (matriculaInput) => {
    if (!matriculaInput) { UI.toast('Digite a matrícula', 'error'); return null; }
    const matricula = matriculaInput.trim().toUpperCase();
    
    try {
      UI.showLoading('Validando...');
      let dados = null;
      
      // Tenta pelo ID direto
      const docRef = doc(db, 'colaboradores', matricula);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        dados = docSnap.data();
      } else {
        // Tenta por query
        const q = query(collection(db, 'colaboradores'), where("matricula", "==", matricula));
        const qs = await getDocs(q);
        if (!qs.empty) dados = qs.docs[0].data();
      }

      UI.hideLoading();

      if (!dados) { UI.alert('Erro', 'Matrícula não encontrada', 'error'); return null; }
      if (!dados.ativo) { UI.alert('Acesso Negado', 'Colaborador inativo', 'warning'); return null; }

      const user = { nome: dados.nome, matricula: matricula, perfil: 'motorista' };
      localStorage.setItem('ac_user', JSON.stringify(user));
      return user;
    } catch (e) {
      UI.hideLoading();
      console.error(e);
      UI.alert('Erro', 'Falha na conexão', 'error');
      return null;
    }
  },

  loginAdmin: async (email, senha) => {
    // Validação simples (Substitua por Auth real em produção)
    if (email === 'admin@acparceria.com' && senha === '050370') {
      const user = { nome: 'Admin', email, perfil: 'admin' };
      localStorage.setItem('ac_user', JSON.stringify(user));
      return user;
    }
    UI.toast('Credenciais inválidas', 'error');
    return null;
  },

  checkSession: () => {
    const s = localStorage.getItem('ac_user');
    return s ? JSON.parse(s) : null;
  },

  logout: () => {
    localStorage.removeItem('ac_user');
    localStorage.removeItem('ac_onibus');
    window.location.reload();
  }
};
