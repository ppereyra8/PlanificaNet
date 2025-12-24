import axios from "axios";

// ===============================
// CONFIGURACIÓN BASE DE AXIOS
// ===============================
const api = axios.create({
  baseURL: "/api" // React usará el proxy hacia http://localhost:3001
});

// ===============================
// INTERCEPTORES
// ===============================

// Agregar token a cada request si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejo de errores globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// ===============================
// API: AUTENTICACIÓN (clientes)
// ===============================
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData), // crea clientes (rol=1)
};

// ===============================
// API: USUARIOS (técnicos y admin)
// ===============================
export const usuariosAPI = {
  getAll: () => api.get("/usuarios"),
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (data) => api.post("/usuarios", data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  updatePassword: (id, data) => api.put(`/usuarios/${id}/password`, data),
  updateEstado: (id, habilitado) =>
    api.put(`/usuarios/${id}/estado`, { habilitado }),
};

// ===============================
// API: TURNOS
// ===============================
export const turnosAPI = {

  getAll: () => api.get("/turnos"), // Turnos según rol autenticado
  create: (turnData) => api.post("/turnos", turnData), // Crear nuevo turno
  updateStatus: (id, status) =>
    api.put(`/turnos/${id}/status`, { estado: status }), // Actualizar estado
  updateTurno: (id, data) => api.put(`/turnos/${id}`, data),
  getProximoTurno: () => api.get("/turnos/proximo"), // Próximo turno del usuario autenticado
  getByCliente: (idCliente) => api.get(`/clientes/${idCliente}/turnos`), // Historial de turnos de un cliente (solo admin)
  getByTecnico: (idTecnico) => api.get(`/tecnicos/${idTecnico}/turnos`), // Historial de turnos por técnico
  getTurnosDia: (idTecnico) => api.get(`/turnos/tecnico-dia/${idTecnico}`),

  // ===============================
  // REPORTES
  // ===============================
  getVisitasPorTecnico: () => api.get("/reportes/visitas-tecnico"),
  getZonasDemanda: () => api.get("/reportes/zonas-demanda"),
  getVisitasPorMes: () => api.get("/reportes/visitas-mes"),
};


// ===============================
// API: UBICACIONES (ZONAS Y BARRIOS)
// ===============================
export const ubicacionesAPI = {
  getZonas: () => api.get("/zonas"),
  getBarrios: (id_zona) => api.get(`/barrios/${id_zona}`),
};

// ===============================
// API: NOTIFICACIONES
// ===============================
export const notificacionesAPI = {
  getAll: () => api.get("/notificaciones"),
  marcarLeida: (id) => api.put(`/notificaciones/${id}/leida`),
};

// ===============================
// API: SERVICIOS
// ===============================
export const serviciosAPI = {
  getAll: () => api.get("/servicios"),
  create: (data) => api.post("/servicios", data),
  update: (id, data) => api.put(`/servicios/${id}`, data),
  delete: (id) => api.delete(`/servicios/${id}`),
};

// ===============================
// API: CLIENTES
// ===============================
export const clientesAPI = {
  getAll: () => api.get("/clientes"),
  getById: (id) => api.get(`/clientes/${id}`),
  updateEstado: (id, habilitado) =>
    api.put(`/clientes/${id}/estado`, { habilitado }),
  getHistorial: (idCliente) => api.get(`/clientes/${idCliente}/turnos`), // Historial de turnos de un cliente (solo admin)
};

export default api;
