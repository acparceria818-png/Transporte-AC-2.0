// ui.js
export const UI = {
  toast: (msg, type = 'info') => {
    let bg = type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#3498db');
    Toastify({ text: msg, duration: 3000, gravity: "top", position: "right", style: { background: bg } }).showToast();
  },
  alert: (title, text, icon = 'info') => Swal.fire({ title, text, icon, confirmButtonColor: '#b00000' }),
  confirm: async (title, text) => {
    const result = await Swal.fire({ 
        title, text, icon: 'question', 
        showCancelButton: true, confirmButtonColor: '#b00000', confirmButtonText: 'Sim' 
    });
    return result.isConfirmed;
  },
  showLoading: (msg = 'Carregando...') => Swal.fire({ title: msg, allowOutsideClick: false, didOpen: () => Swal.showLoading() }),
  hideLoading: () => Swal.close(),
  mostrarTela: (id) => {
    document.querySelectorAll('.tela').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    const tela = document.getElementById(id);
    if(tela) { tela.classList.remove('hidden'); tela.classList.add('ativa'); window.scrollTo(0,0); }
  }
};
