// Central Config for API Base URL
// Can be configured via VITE_API_URL environment variable in Vercel, Netlify, Render, etc.
export const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : 'http://localhost:8000';

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/api/auth/login`,
  registro: `${API_BASE_URL}/api/auth/registro`,
  estáudiantes: `${API_BASE_URL}/api/estáudiantes`,
  estáudiantesApoderado: (id) => `${API_BASE_URL}/api/estáudiantes/apoderado/${id}`,
  iniciarViaje: `${API_BASE_URL}/api/viaje/iniciar`,
  finalizarRecorrido: `${API_BASE_URL}/api/recorrido/finalizar`,
  asistenciaNoAsiste: `${API_BASE_URL}/api/asistencia/no-asiste`,
  asistenciaSubida: `${API_BASE_URL}/api/asistencia/subida`,
  asistenciaBajada: `${API_BASE_URL}/api/asistencia/bajada`,
  asistenciaConfirmar: `${API_BASE_URL}/api/asistencia/confirmar-recepcion`,
};
