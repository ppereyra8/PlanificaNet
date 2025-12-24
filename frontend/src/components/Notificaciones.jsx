import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { notificacionesAPI } from "../services/api";

const Notificaciones = ({ user, onLogout }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const porPagina = 15; // cantidad de notificaciones por página

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await notificacionesAPI.getAll();
        setNotificaciones(response.data);
      } catch (error) {
        console.error("Error obteniendo notificaciones:", error);
      }
    };

    fetchData();
  }, []);

  const marcarComoLeida = async (id) => {
    try {
      await notificacionesAPI.marcarLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) =>
          n.id_notif === id ? { ...n, leida: 1 } : n
        )
      );
    } catch (error) {
      console.error("Error marcando como leída:", error);
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const formatearFecha = (fecha) => {
    const d = new Date(fecha);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // Paginación
  const totalPaginas = Math.ceil(notificaciones.length / porPagina);
  const inicio = (paginaActual - 1) * porPagina;
  const fin = inicio + porPagina;
  const notificacionesPagina = notificaciones
    .sort((a, b) => new Date(b.fecha_envio) - new Date(a.fecha_envio))
    .slice(inicio, fin);

  return (
    <div className="min-vh-100 bg-transparent">

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div className="container">
          <span className="navbar-brand fw-bold">PlanificaNet</span>

          <div className="navbar-nav ms-auto align-items-center">
            {(user.rol === 1 || user.rol === 2) && (
              <div className="me-3 position-relative">
                <span 
                  className="text-white fs-5"
                  style={{ cursor: "pointer" }}
                  onClick={() => setMostrarDropdown(!mostrarDropdown)}
                >
                  🔔
                </span>

                {noLeidas > 0 && (
                  <span 
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: "0.7rem" }}
                  >
                    {noLeidas}
                  </span>
                )}

                {mostrarDropdown && (
                  <div 
                    className="notif-dropdown position-absolute"
                    style={{ top: "35px", right: "0", zIndex: 999 }}
                  >
                    <h6 className="border-bottom pb-2 mb-2">Notificaciones</h6>

                    {notificaciones.length === 0 ? (
                      <p className="text-muted small mb-0">No tenés notificaciones.</p>
                    ) : (
                      notificacionesPagina.map((notif) => (
                        <div 
                          key={notif.id_notif}
                          className={`d-flex justify-content-between align-items-center mb-2 
                            ${notif.leida ? "text-muted" : "fw-bold"}`}
                        >
                          <span className="small">{notif.mensaje}</span>

                          {!notif.leida && (
                            <button
                              className="btn btn-sm btn-secondary-custom"
                              onClick={() => marcarComoLeida(notif.id_notif)}
                            >
                              ✓
                            </button>
                          )}
                        </div>
                      ))
                    )}

                    {/* Paginación en dropdown */}
                    {totalPaginas > 1 && (
                      <div className="d-flex justify-content-between mt-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          disabled={paginaActual === 1}
                          onClick={() => setPaginaActual(paginaActual - 1)}
                        >
                          ←
                        </button>
                        <span className="small align-self-center">
                          {paginaActual}/{totalPaginas}
                        </span>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          disabled={paginaActual === totalPaginas}
                          onClick={() => setPaginaActual(paginaActual + 1)}
                        >
                          →
                        </button>
                      </div>
                    )}

                    <div className="text-center mt-2">
                      <Link 
                        to="/notificaciones"
                        className="small text-primary text-decoration-none"
                        onClick={() => setMostrarDropdown(false)}
                      >
                        Ver todas
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <span className="navbar-text me-3 fw-semibold">
              {user.nombre}
            </span>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="container mt-4">
        <h2 className="page-title text-center mb-2">🔔 Notificaciones</h2>
        <p className="page-subtitle text-center mb-4">
          Revisá tus avisos y novedades
        </p>

        <button 
          className="btn-secondary-custom mb-3"
          onClick={() => window.history.back()}
        >
          ← Volver
        </button>

        <div className="card-container">
          {notificaciones.length === 0 ? (
            <p className="text-muted">No tenés notificaciones.</p>
          ) : (
            <>
              <ul className="list-group list-group-flush">
                {notificacionesPagina.map((notif) => (
                  <li
                    key={notif.id_notif}
                    className={`list-group-item d-flex justify-content-between align-items-start py-3 
                      ${notif.leida ? "bg-light" : "bg-white border-start border-4 border-primary"}`}
                  >
                    <div className="ms-2 me-auto">
                      <div className={`${notif.leida ? "text-muted" : "fw-bold"}`}>
                        🔔 {notif.mensaje}
                      </div>
                      <small className="text-muted">
                        {formatearFecha(notif.fecha_envio)}
                      </small>
                    </div>

                    {!notif.leida && (
                      <button
                        className="btn btn-sm btn-main"
                        onClick={() => marcarComoLeida(notif.id_notif)}
                      >
                        Marcar como leída
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {/* Paginación en página completa */}
              {totalPaginas > 1 && (
                <div className="d-flex justify-content-center mt-3 gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual(paginaActual - 1)}
                  >
                    ← Anterior
                  </button>
                  <span className="align-self-center">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPaginaActual(paginaActual + 1)}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notificaciones;
