import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { clientesAPI } from "../services/api";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";


const HistorialCliente = () => {
  const { id } = useParams(); // id del cliente seleccionado
  const [cliente, setCliente] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cargarDatos = async () => {
    try {
      // Datos del cliente
      const respCliente = await clientesAPI.getById(id);
      setCliente(respCliente.data);

      // Turnos del cliente
      const respTurnos = await clientesAPI.getHistorial(id);
      const turnosOrdenados = respTurnos.data.sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );
      setTurnos(turnosOrdenados);
    } catch (err) {
      console.error("Error cargando historial:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "No se pudo cargar el historial",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  if (loading) return <p className="text-center mt-5">Cargando...</p>;
  if (!cliente) return <p className="text-center mt-5">Cliente no encontrado.</p>;

  return (
    <div className="min-vh-100 bg-transparent">
      {/* ✅ Navbar global */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="navbar-brand fw-bold">PlanificaNet</span>
          <Link to="/dashboard" className="btn btn-outline-light btn-sm">
            Volver al Dashboard
          </Link>
        </div>
      </nav>

      <div className="container pt-4">
        <h2 className="page-title text-center mb-2">📜 Historial del Cliente</h2>
        <p className="page-subtitle text-center mb-4">
          Turnos y datos de {cliente.nombre}
        </p>

        {/* Datos del cliente */}
        <ul className="list-group mb-4">
          <li className="list-group-item"><strong>Nombre:</strong> {cliente.nombre}</li>
          <li className="list-group-item"><strong>Email:</strong> {cliente.email}</li>
          <li className="list-group-item"><strong>Teléfono:</strong> {cliente.telefono || "-"}</li>
          <li className="list-group-item"><strong>Dirección:</strong> {cliente.direccion || "-"}</li>
          <li className="list-group-item"><strong>Zona:</strong> {cliente.zona_nombre || "-"}</li>
          <li className="list-group-item"><strong>Barrio:</strong> {cliente.barrio_nombre || "-"}</li>
        </ul>

            <button 
            className="btn btn-outline-primary mb-3" 
            onClick={() => navigate("/gestion-clientes")}
            >
            ← Volver a Gestión de Clientes
            </button>


        {/* Tabla de turnos */}
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Franja horaria</th>
                <th>Servicio</th>
                <th>Técnico</th>
                <th>Estado</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No hay turnos registrados.
                  </td>
                </tr>
              ) : (
                turnos.map((t) => (
                  <tr key={t.id_turno}>
                    <td>{new Date(t.fecha).toLocaleDateString()}</td>
                    <td>{t.franja_horaria}</td>
                    <td>{t.servicio_nombre || t.servicio_id}</td>
                    <td>{t.tecnico_nombre || "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          t.estado === "confirmado"
                            ? "bg-success"
                            : t.estado === "pendiente"
                            ? "bg-warning"
                            : "bg-danger"
                        }`}
                      >
                        {t.estado}
                      </span>
                    </td>
                    <td>{t.descripcion || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistorialCliente;
