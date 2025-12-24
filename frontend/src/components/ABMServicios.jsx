import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { serviciosAPI } from "../services/api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const ABMServicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ id: null, nombre: "", descripcion: "" });
  const [modoEdicion, setModoEdicion] = useState(false);
  const [saving, setSaving] = useState(false); // ✅ nuevo estado

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    try {
      const response = await serviciosAPI.getAll();
      setServicios(response.data);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los servicios",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({ id: null, nombre: "", descripcion: "" });
    setModoEdicion(false);
  };

  const guardarServicio = async () => {
    if (!form.nombre) {
      return Swal.fire({
        icon: "warning",
        title: "Validación",
        text: "El nombre es obligatorio",
      });
    }

    const nombreExiste = servicios.some(
      (s) => s.nombre?.toLowerCase() === form.nombre.toLowerCase() && s.id !== form.id
    );
    if (nombreExiste) {
      return Swal.fire({
        icon: "warning",
        title: "Duplicado",
        text: "Ya existe un servicio con ese nombre",
      });
    }

    setSaving(true); //  bloquear botón
    try {
      if (modoEdicion) {
        const resp = await serviciosAPI.update(form.id, {
          nombre: form.nombre,
          descripcion: form.descripcion,
        });

        setServicios((prev) =>
          prev.map((s) => (s.id === resp.data.id ? resp.data : s))
        );

        Swal.fire({
          icon: "success",
          title: "Servicio actualizado",
          text: "Los cambios se guardaron correctamente",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        const resp = await serviciosAPI.create({
          nombre: form.nombre,
          descripcion: form.descripcion,
        });

        const nuevo = {
          id: resp.data.id,
          nombre: resp.data.nombre,
          descripcion: resp.data.descripcion,
        };

        setServicios((prev) => [...prev, nuevo]);

        Swal.fire({
          icon: "success",
          title: "Servicio creado",
          text: "El servicio fue agregado correctamente",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      resetForm();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar el servicio",
      });
    } finally {
      setSaving(false); // liberar botón
    }
  };

  const editarServicio = (serv) => {
    setModoEdicion(true);
    setForm({ id: serv.id, nombre: serv.nombre, descripcion: serv.descripcion });
  };

  const eliminarServicio = async (id) => {
    try {
      const resp = await serviciosAPI.delete(id);
      setServicios((prev) => prev.filter((s) => s.id !== resp.data.id));

      Swal.fire({
        icon: "success",
        title: "Eliminado",
        text: "El servicio fue eliminado correctamente",
        timer: 2000,
        showConfirmButton: false,
      });

      resetForm(); // limpiar formulario tras eliminar
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo eliminar el servicio",
      });
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="min-vh-100 bg-transparent">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="navbar-brand fw-bold">PlanificaNet</span>
          <Link to="/dashboard" className="btn btn-outline-light btn-sm">
            Volver al Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mt-4">
        <h2 className="page-title text-center mb-3">🛠️ ABM Servicios</h2>
        <p className="page-subtitle text-center mb-4">
          Gestiona los servicios disponibles en el sistema
        </p>

        <div className="card p-4 shadow-sm mb-4">
          <h5 className="fw-bold mb-3">{modoEdicion ? "Editar Servicio" : "Nuevo Servicio"}</h5>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                className="form-control"
                value={form.nombre}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label>Descripción</label>
              <input
                type="text"
                name="descripcion"
                className="form-control"
                value={form.descripcion}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              className="btn btn-success"
              type="button"
              onClick={guardarServicio}
              disabled={saving} // deshabilitar mientras guarda
            >
              {saving
                ? "Guardando..."
                : modoEdicion
                ? "Guardar Cambios"
                : "Agregar Servicio"}
            </button>

            {modoEdicion && (
              <button className="btn btn-secondary" type="button" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="card p-4 shadow-sm">
          <h5 className="fw-bold mb-3">Servicios Registrados</h5>

          {servicios.length === 0 ? (
            <p className="text-muted">No hay servicios cargados.</p>
          ) : (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {servicios.map((serv) => (
                  <tr key={serv.id}>
                    <td>{serv.nombre}</td>
                    <td>{serv.descripcion}</td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => editarServicio(serv)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => eliminarServicio(serv.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ABMServicios;
