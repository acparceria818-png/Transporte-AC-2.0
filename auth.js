// auth.js
import { db, collection, query, where, getDocs } from './firebase.js';
import { UI } from './ui.js';

export const Auth = {
  // Login do motorista via matrícula
  loginMotorista: async (matricula) => {
    if (!matricula) {
      UI.toast('Digite a matrícula', 'error');
      return null;
    }

    try {
      UI.showLoading('Validando...');
      
      // Busca no Firebase (Coleção: colaboradores)
      const q = query(collection(db, 'colaboradores'), where("matricula", "==", matricula.toUpperCase()));
      const snap = await getDocs(q);

      UI.hideLoading();

      if (snap.empty) {
        UI.alert('Erro', 'Matrícula não encontrada', 'error');
        return null;
      }

      const dados = snap.docs[0].data();
      
      if (!dados.ativo) {
        UI.alert('Acesso Negado', 'Colaborador inativo', 'warning');
        return null;
      }

      // Salva sessão
      localStorage.setItem('user_matricula', dados.matricula);
      localStorage.setItem('user_nome', dados.nome);
      localStorage.setItem('user_role', 'motorista');

      return { nome: dados.nome, matricula: dados.matricula };

    } catch (error) {
      UI.hideLoading();
      console.error(error);
      UI.toast('Erro de conexão', 'error');
      return null;
    }
  },

  checkSession: () => {
    const role = localStorage.getItem('user_role');
    if (role === 'motorista') {
      return {
        nome: localStorage.getItem('user_nome'),
        matricula: localStorage.getItem('user_matricula')
      };
    }
    return null;
  },

  logout: () => {
    localStorage.clear();
    location.reload();
  }
};
