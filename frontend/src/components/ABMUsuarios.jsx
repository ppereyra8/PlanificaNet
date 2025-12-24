import React, { useState, useEffect } from "react";
import { usuariosAPI, ubicacionesAPI } from "../services/api";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";

const AbmUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [form, setForm] = useState({
    id: null,
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    password: "",
    id_zona: "",
    id_barrio: "",
    id_rol: "2", // default Técnico
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [respUsuarios, respZonas] = await Promise.all([
          usuariosAPI.getAll(),
          ubicacionesAPI.getZonas(),
        ]);
        setUsuarios(respUsuarios.data);
        setZonas(respZonas.data);
      } catch {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar usuarios o zonas",
        });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    // Cargar barrios cuando cambia la zona seleccionada
    const cargarBarrios = async () => {
      if (!form.id_zona) {
        setBarrios([]);
        return;
      }
      try {
        const resp = await ubicacionesAPI.getBarrios(form.id_zona);
        setBarrios(resp.data);
      } catch {
        setBarrios([]);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los barrios",
        });
      }
    };
    cargarBarrios();
  }, [form.id_zona]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Si cambia zona, resetea barrio
    if (name === "id_zona") {
      setForm((prev) => ({ ...prev, id_zona: value, id_barrio: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      nombre: "",
      email: "",
      telefono: "",
      direccion: "",
      password: "",
      id_zona: "",
      id_barrio: "",
      id_rol: "2",
    });
    setModoEdicion(false);
  };

  const guardarUsuario = async () => {
    // Validaciones mínimas
    if (!form.nombre || !form.email || (!modoEdicion && !form.password) || !form.id_rol) {
      return Swal.fire({
        icon: "warning",
        title: "Validación",
        text: "Nombre, email, rol y contraseña (en alta) son obligatorios",
      });
    }
    if (form.id_rol !== "2" && form.id_rol !== "3") {
      return Swal.fire({
        icon: "warning",
        title: "Rol inválido",
        text: "Solo se permiten roles Técnico (2) o Admin (3)",
      });
    }

    setSaving(true);
    try {
      if (modoEdicion) {
        const payload = {
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono,
          direccion: form.direccion,
          id_zona: form.id_zona || null,
          id_barrio: form.id_barrio || null,
          id_rol: parseInt(form.id_rol, 10),
          // No enviar password vacío si no se cambia
        };
        await usuariosAPI.update(form.id, payload);

        setUsuarios((prev) =>
          prev.map((u) => (u.id === form.id ? { ...u, ...payload, id: form.id } : u))
        );

        Swal.fire({
          icon: "success",
          title: "Usuario actualizado",
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        const payload = {
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono,
          direccion: form.direccion,
          password: form.password,
          id_zona: form.id_zona || null,
          id_barrio: form.id_barrio || null,
          id_rol: parseInt(form.id_rol, 10),
        };
        const resp = await usuariosAPI.create(payload);

        // Normalizar la respuesta esperada: { id, nombre, email, telefono, direccion, id_zona, id_barrio, id_rol, habilitado }
        const nuevo = resp.data;
        setUsuarios((prev) => [...prev, nuevo]);

        Swal.fire({
          icon: "success",
          title: "Usuario creado",
          timer: 1800,
          showConfirmButton: false,
        });
      }

      resetForm();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "No se pudo guardar el usuario",
      });
    } finally {
      setSaving(false);
    }
  };

  const editarUsuario = (u) => {
    setModoEdicion(true);
    setForm({
      id: u.id,
      nombre: u.nombre || "",
      email: u.email || "",
      telefono: u.telefono || "",
      direccion: u.direccion || "",
      password: "", // no se muestra la actual
      id_zona: u.id_zona || "",
      id_barrio: u.id_barrio || "",
      id_rol: String(u.id_rol),
    });
  };

  const toggleEstado = async (u) => {
    try {
      const nuevoEstado = u.habilitado ? 0 : 1;
      await usuariosAPI.updateEstado(u.id, nuevoEstado);
      setUsuarios((prev) =>
        prev.map((usr) => (usr.id === u.id ? { ...usr, habilitado: nuevoEstado } : usr))
      );
      Swal.fire({
        icon: "success",
        title: nuevoEstado ? "Usuario habilitado" : "Usuario deshabilitado",
        timer: 1600,
        showConfirmButton: false,
      });
      // Si estabas editando a ese usuario y lo deshabilitás, limpiá el form para evitar confusión
      if (modoEdicion && form.id === u.id) resetForm();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "No se pudo cambiar el estado",
      });
    }
  };

  if (loading) return <p className="text-center mt-4">Cargando...</p>;

  return (
    <div className="min-vh-100 bg-transparent">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary shadow-sm">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="navbar-brand fw-bold">PlanificaNet</span>
          <Link to="/dashboard" className="btn btn-outline-light btn-sm">
            Volver al Dashboard
          </Link>
        </div>
      </nav>

      {/* Contenido */}
      <div className="container mt-4">
        <h2 className="page-title text-center mb-3">👥 ABM Usuarios</h2>
        <p className="page-subtitle text-center mb-4">
          Registrá técnicos y administradores, y gestioná su estado
        </p>

        {/* Formulario */}
        <div className="card-container mb-4">
          <h5 className="fw-bold mb-3">
            {modoEdicion ? "Editar usuario" : "Nuevo usuario"}
          </h5>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Nombre</label>
              <input
                type="text"
                name="nombre"
                className="form-control"
                value={form.nombre}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                className="form-control"
                value={form.telefono}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Dirección</label>
              <input
                type="text"
                name="direccion"
                className="form-control"
                value={form.direccion}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Contraseña</label>
              <input
                type="password"
                name="password"
                className="form-control"
                value={form.password}
                onChange={handleChange}
                required={!modoEdicion}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Rol</label>
              <select
                name="id_rol"
                className="form-select"
                value={form.id_rol}
                onChange={handleChange}
                required
              >
                <option value="2">Técnico</option>
                <option value="3">Admin</option>
              </select>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Zona</label>
              <select
                name="id_zona"
                className="form-select"
                value={form.id_zona}
                onChange={handleChange}
              >
                <option value="">Seleccione una zona</option>
                {zonas.map((z) => (
                  <option key={z.id_zona} value={z.id_zona}>
                    {z.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Barrio</label>
              <select
                name="id_barrio"
                className="form-select"
                value={form.id_barrio}
                onChange={handleChange}
                disabled={!form.id_zona}
              >
                <option value="">Seleccione un barrio</option>
                {barrios.map((b) => (
                  <option key={b.id_barrio} value={b.id_barrio}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="d-flex gap-2 mt-2">
            <button
              className="btn-main"
              type="button"
              onClick={guardarUsuario}
              disabled={saving}
            >
              {saving ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Registrar"}
            </button>

            {modoEdicion && (
              <button className="btn-secondary-custom" type="button" onClick={resetForm}>
                Cancelar edición
              </button>
            )}
          </div>
        </div>

        {/* Grilla */}
        <div className="card-container">
          <h5 className="fw-bold mb-3">Usuarios registrados</h5>

          {usuarios.length === 0 ? (
            <p className="text-muted">No hay usuarios técnicos o admin registrados.</p>
          ) : (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Zona</th>
                  <th>Barrio</th>
                  <th>Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios
                  .filter((u) => u.id_rol === 2 || u.id_rol === 3)
                  .map((u) => (
                    <tr key={u.id}>
                      <td>{u.nombre}</td>
                      <td>{u.email}</td>
                      <td>{u.id_rol === 3 ? "Admin" : "Técnico"}</td>
                      <td>{u.zona_nombre || "-"}</td>
                        <td>{u.barrio_nombre || "-"}</td>

                      <td>{u.habilitado ? "Habilitado" : "Deshabilitado"}</td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => editarUsuario(u)}
                        >
                          Editar
                        </button>
                        <button
                          className={`btn btn-sm ${u.habilitado ? "btn-danger" : "btn-success"}`}
                          onClick={() => toggleEstado(u)}
                        >
                          {u.habilitado ? "Deshabilitar" : "Habilitar"}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie de página informativo */}
        <p className="text-center text-muted mt-3" style={{ fontSize: "0.9rem" }}>
          Usá el toggle para habilitar/deshabilitar. Solo roles válidos: Técnico (2) y Admin (3).
        </p>
      </div>
    </div>
  );
};

export default AbmUsuarios;
