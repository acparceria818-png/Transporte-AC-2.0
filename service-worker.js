/* ========== ESTILOS PARA MAPA INTEGRADO ========== */
.mapa-container {
  width: 100%;
  height: 400px;
  border-radius: var(--radius-md);
  overflow: hidden;
  margin: var(--space-md) 0;
  box-shadow: var(--shadow-sm);
}

#map {
  width: 100%;
  height: 100%;
}

/* ========== ESTILOS PARA SWEETALERT2 ========== */
.swal2-popup {
  font-family: var(--font-family) !important;
}

.swal2-title {
  color: var(--secondary) !important;
}

.swal2-confirm {
  background-color: var(--primary) !important;
}

/* ========== ESTILOS PARA TOASTS ========== */
.toastify {
  font-family: var(--font-family) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--shadow-lg) !important;
}

/* ========== ESTILOS PARA HISTÓRICO DE ROTA ========== */
.historico-rota-container {
  background: var(--white);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin: var(--space-md) 0;
  box-shadow: var(--shadow-sm);
}

.historico-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.historico-lista {
  max-height: 300px;
  overflow-y: auto;
}

.historico-item {
  padding: var(--space-sm);
  border-bottom: 1px solid var(--gray-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.historico-item:last-child {
  border-bottom: none;
}

.historico-hora {
  color: var(--gray);
  font-size: var(--font-size-sm);
}

.historico-coords {
  font-family: monospace;
  font-size: var(--font-size-sm);
  color: var(--secondary);
}

.historico-distancia {
  color: var(--primary);
  font-weight: 600;
}

/* Modo escuro */
body.dark .mapa-container {
  background: #2d2d44;
}

body.dark .historico-rota-container {
  background: #2d2d44;
}

body.dark .historico-item {
  border-bottom-color: #3d3d5a;
}

body.dark .historico-coords {
  color: #e0e0e0;
}
