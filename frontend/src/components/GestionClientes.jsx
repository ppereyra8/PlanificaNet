import React, { useEffect, useState } from "react";
import { clientesAPI } from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";

const GestionClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cargarClientes = async () => {
    try {
      const resp = await clientesAPI.getAll();
      setClientes(resp.data);
    } catch (err) {
      console.error("Error cargando clientes:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "No se pudieron cargar los clientes",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const toggleEstado = async (cliente) => {
    const nuevoEstado = cliente.habilitado === 1 ? 0 : 1;
    try {
      const resp = await clientesAPI.updateEstado(cliente.id, nuevoEstado);
      Swal.fire({
        icon: "success",
        title: "Estado actualizado",
        text: resp.data?.message || "El estado del cliente se actualizó correctamente",
      });
      // Refresco local sin reconsultar todo
      setClientes((prev) =>
        prev.map((c) => (c.id === cliente.id ? { ...c, habilitado: nuevoEstado } : c))
      );
    } catch (err) {
      console.error("Error actualizando estado:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "No se pudo cambiar el estado",
      });
    }
  };

  const eliminarCliente = async (cliente) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Eliminar cliente",
      text: `¿Seguro que deseas eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    try {
      const resp = await clientesAPI.delete(cliente.id);
      Swal.fire({
        icon: "success",
        title: "Cliente eliminado",
        text: resp.data?.message || "El cliente se eliminó correctamente",
      });
      setClientes((prev) => prev.filter((c) => c.id !== cliente.id));
    } catch (err) {
      console.error("Error eliminando cliente:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "No se pudo eliminar el cliente",
      });
    }
  };

  const irHistorial = (cliente) => {
    navigate(`/clientes/${cliente.id}/historial`);
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-transparent">
        <div className="card-container" style={{ maxWidth: "900px", width: "100%" }}>
          <h2 className="page-title text-center mb-2">👥 Gestión de Clientes</h2>
          <p className="page-subtitle text-center mb-4">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    
  <div className="min-vh-100 bg-transparent">
    {/*  Navbar global */}
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div className="container d-flex justify-content-between align-items-center">
        <span className="navbar-brand fw-bold">PlanificaNet</span>
        <Link to="/dashboard" className="btn btn-outline-light btn-sm">
          Volver al Dashboard
        </Link>
      </div>
    </nav>

    {/*  Contenido principal */}
    <div className="d-flex align-items-start justify-content-center pt-4">
      <div className="card-container" style={{ maxWidth: "1100px", width: "100%" }}>
        <h2 className="page-title text-center mb-2">👥 Gestión de Clientes</h2>
        <p className="page-subtitle text-center mb-4">
          Administra la información de los clientes
        </p>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Zona</th>
                <th>Barrio</th>
                <th>Estado</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-4">
                    No hay clientes registrados.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.email}</td>
                    <td>{c.telefono || "-"}</td>
                    <td>{c.direccion || "-"}</td>
                    <td>{c.zona_nombre || "-"}</td>
                    <td>{c.barrio_nombre || "-"}</td>
                    <td>
                      <span
                        className={`badge ${c.habilitado === 1 ? "bg-success" : "bg-secondary"}`}
                      >
                        {c.habilitado === 1 ? "Habilitado" : "Deshabilitado"}
                      </span>
                    </td>
                    <td className="text-end">
                        <div className="d-inline-flex gap-2">
                            <button
                            className="btn-main btn-sm"
                            onClick={() => toggleEstado(c)}
                            >
                            {c.habilitado === 1 ? "Deshabilitar" : "Habilitar"}
                            </button>

                           <button 
                           className="btn-outline-secondary btn-sm" 
                           onClick={() => navigate(`/clientes/${c.id}/historial`)} 
                           title="Ver historial" > 🔍 
                           </button>


                        </div>
                        </td>




                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

};

export default GestionClientes;
