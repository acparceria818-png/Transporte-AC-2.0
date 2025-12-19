// auth.js
import { db, collection, query, where, getDocs, getDoc, doc } from './firebase.js';
import { UI } from './ui.js';

export const Auth = {
  // --- LOGIN MOTORISTA (Melhorado) ---
  loginMotorista: async (matriculaInput) => {
    if (!matriculaInput) {
      UI.toast('Digite a matrícula', 'error');
      return null;
    }
    
    // Remove espaços e deixa maiúsculo para evitar erro de digitação
    const matricula = matriculaInput.trim().toUpperCase();

    try {
      UI.showLoading('Validando matrícula...');
      
      let dadosMotorista = null;

      // 1. Tenta buscar direto pelo ID do documento (Mais rápido/Comum)
      const docRef = doc(db, 'colaboradores', matricula);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        dadosMotorista = docSnap.data();
      } else {
        // 2. Se não achou pelo ID, tenta fazer uma busca pelo campo 'matricula'
        // Isso ajuda se o ID do documento for automático
        console.log("ID não encontrado, tentando query...");
        const q = query(collection(db, 'colaboradores'), where("matricula", "==", matricula));
        const querySnap = await getDocs(q);
        
        if (!querySnap.empty) {
          dadosMotorista = querySnap.docs[0].data();
        }
      }

      UI.hideLoading();

      // Verifica se encontrou
      if (!dadosMotorista) {
        UI.alert('Não Encontrado', `A matrícula "${matricula}" não consta no sistema.\n\nVerifique se a coleção "colaboradores" existe no banco de dados.`, 'error');
        return null;
      }

      if (!dadosMotorista.ativo) {
        UI.alert('Acesso Negado', 'Este colaborador está inativo.', 'warning');
        return null;
      }

      // Sucesso! Salva no LocalStorage
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
      UI.alert('Erro no Sistema', 'Falha ao conectar com o banco de dados: ' + error.message, 'error');
      return null;
    }
  },

  // --- LOGIN ADMIN ---
  loginAdmin: async (email, senha) => {
    if (!email || !senha) {
      UI.toast('Preencha email e senha', 'error');
      return null;
    }

    // Login Simples Hardcoded (Como estava no seu código original)
    // Para produção, use Firebase Auth de verdade
    const ADMIN_EMAIL = "admin@acparceria.com";
    const ADMIN_PASS = "050370";

    if (email === ADMIN_EMAIL && senha === ADMIN_PASS) {
      const adminUser = {
        nome: "Administrador",
        email: email,
        perfil: 'admin'
      };
      localStorage.setItem('ac_user', JSON.stringify(adminUser));
      return adminUser;
    } else {
      UI.toast('Credenciais inválidas', 'error');
      return null;
    }
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
