// config.js - Configurações globais e estado da aplicação
export const estadoApp = {
  motorista: null,
  passageiro: null,
  admin: null,
  rotaAtiva: null,
  onibusAtivo: null,
  watchId: null,
  isOnline: navigator.onLine,
  perfil: null,
  unsubscribeRotas: null,
  unsubscribeEmergencias: null,
  unsubscribeFeedbacks: null,
  unsubscribeAvisos: null,
  emergenciaAtiva: false,
  avisosAtivos: [],
  escalas: [],
  estatisticas: null,
  ultimaLocalizacao: null,
  distanciaTotal: 0,
  onlineUsers: [],
  rotasDisponiveis: [],
  onibusDisponiveis: []
};

// Configurações de URLs de mapas
export const MAPAS_ROTAS = {
  'ROTA ADM 01': 'https://www.google.com/maps/d/u/1/edit?mid=18BCgBpobp1Olzmzy0RnPCUEd7Vnkc5s&usp=sharing',
  'ROTA ADM 02': 'https://www.google.com/maps/d/u/1/edit?mid=1WxbIX8nw0xyGBLMvvi1SF3DRuwmZ5oM&usp=sharing',
  'ROTA 01': 'https://www.google.com/maps/d/u/1/edit?mid=1jCfFxq1ZwecS2IcHy7xGFLLgttsM-RQ&usp=sharing',
  'ROTA 02': 'https://www.google.com/maps/d/u/1/edit?mid=1LCvNJxWBbZ_chpbdn_lk_Dm6NPA194g&usp=sharing',
  'ROTA 03': 'https://www.google.com/maps/d/u/1/edit?mid=1bdwkrClh5AZml0mnDGlOzYcaR4w1BL0&usp=sharing',
  'ROTA 04': 'https://www.google.com/maps/d/u/1/edit?mid=1ejibzdZkhX2QLnP9YgvvHdQpZELFvXo&usp=sharing',
  'ROTA 05': 'https://www.google.com/maps/d/u/1/edit?mid=1L9xjAWFUupMc7eQbqVJz-SNWlYX5SHo&usp=sharing',
  'RETORNO OVERLAND - ROTA 01': 'https://www.google.com/maps/d/u/1/edit?mid=1ClQVIaRLOYYWHU7fvP87r1BVy85a_eg&usp=sharing',
  'RETORNO OVERLAND - ROTA 02': 'https://www.google.com/maps/d/u/1/edit?mid=1WOIMgeLgV01B8yk7HoX6tazdCHXQnok&usp=sharing'
};

// Credenciais do admin
export const ADMIN_CREDENTIALS = {
  email: 'admin@acparceria.com',
  senha: '050370'
};

// Funções utilitárias
export function calcularTempoDecorrido(timestamp) {
  if (!timestamp) return 'Agora mesmo';
  
  const agora = new Date();
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = agora - data;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `${diffMins} min atrás`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
