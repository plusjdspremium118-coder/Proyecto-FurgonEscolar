// Central Config for API Base URL
// In production (Netlify), it connects directly to Render: https://proyecto-furgonescolar.onrender.com
// In local development, it connects to: http://localhost:8000

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const PROD_URL = 'https://proyecto-furgonescolar.onrender.com';
const LOCAL_URL = 'http://localhost:8000';

const ENV_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : null;

export const API_BASE_URL = ENV_URL || (isLocalhost ? LOCAL_URL : PROD_URL);

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/api/auth/login`,
  registro: `${API_BASE_URL}/api/auth/registro`,
  estudiantes: `${API_BASE_URL}/api/estudiantes`,
  estudiantesApoderado: (id) => `${API_BASE_URL}/api/estudiantes/apoderado/${id}`,
  iniciarViaje: `${API_BASE_URL}/api/viaje/iniciar`,
  finalizarRecorrido: `${API_BASE_URL}/api/recorrido/finalizar`,
  asistenciaNoAsiste: `${API_BASE_URL}/api/asistencia/no-asiste`,
  asistenciaSubida: `${API_BASE_URL}/api/asistencia/subida`,
  asistenciaBajada: `${API_BASE_URL}/api/asistencia/bajada`,
  asistenciaConfirmar: `${API_BASE_URL}/api/asistencia/confirmar-recepcion`,
};
