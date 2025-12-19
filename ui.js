// ui.js
export const UI = {
  // Mostra notificação tipo "Toast" (canto superior)
  toast: (msg, type = 'info') => {
    let bg = type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#3498db');
    Toastify({
      text: msg,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: bg }
    }).showToast();
  },

  // Alerta modal bonito (SweetAlert2)
  alert: (title, text, icon = 'info') => {
    return Swal.fire({
      title: title,
      text: text,
      icon: icon,
      confirmButtonColor: '#b00000'
    });
  },

  confirm: async (title, text) => {
    const result = await Swal.fire({
      title: title,
      text: text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#b00000',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sim',
      cancelButtonText: 'Cancelar'
    });
    return result.isConfirmed;
  },

  showLoading: (msg = 'Carregando...') => {
    Swal.fire({
      title: msg,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
  },

  hideLoading: () => {
    Swal.close();
  },

  // Troca de telas (SPA)
  mostrarTela: (idTela) => {
    document.querySelectorAll('.tela').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    const tela = document.getElementById(idTela);
    if(tela) {
        tela.classList.remove('hidden');
        tela.classList.add('ativa');
    }
  }
};
