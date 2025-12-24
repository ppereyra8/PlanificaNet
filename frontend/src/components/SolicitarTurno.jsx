import React, { useState, useEffect } from 'react'
import { turnosAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { serviciosAPI } from "../services/api";

const SolicitarTurno = ({ user }) => {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    fecha: '',
    franja_horaria: 'Mañana',
    servicio_id: '',
    descripcion: ''
  })

  const [loading, setLoading] = useState(false)
  const [servicios, setServicios] = useState([])
  const [cargandoServicios, setCargandoServicios] = useState(true)

  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const response = await serviciosAPI.getAll()
        setServicios(response.data)
        setCargandoServicios(false)
      } catch (error) {
        setCargandoServicios(false)
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los servicios',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        })
      }
    }

    fetchServicios()
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
  e.preventDefault();

  // Validación 1: No permitir sábados ni domingos
  const fechaSeleccionada = new Date(formData.fecha);
  const diaSemana = fechaSeleccionada.getDay(); // 0 = domingo, 6 = sábado

  if (diaSemana === 5 || diaSemana === 6) {
    Swal.fire({
      title: "Día no permitido",
      text: "No podés solicitar turnos los días sábado o domingo.",
      icon: "warning",
      confirmButtonColor: "#0d6efd"
    });
    return;
  }

  setLoading(true);
  try {
    // 1. Obtener todos los turnos
          const responseTurnos = await turnosAPI.getAll();
          console.log(responseTurnos.data);

            // 2. Normalizar la fecha seleccionada
            const fechaSeleccionada = formData.fecha; // "2025-12-22"

            // 3. Filtrar turnos que coincidan con la fecha (sin importar el cliente)
            const turnosMismoDia = responseTurnos.data.filter((t) => {
              const fechaTurno = t.fecha.split("T")[0]; // "2025-12-22"
              return fechaTurno === fechaSeleccionada;
            });

            // 4. Si ya existe un turno ese día, bloquear
            if (turnosMismoDia.length > 0) {
              Swal.fire({
                title: "Turno duplicado",
                text: "Ya existe un turno registrado para este día. Elegí otra fecha.",
                icon: "warning",
                confirmButtonColor: "#0d6efd"
              });
              setLoading(false);
              return;
            }

         


    // 4. Crear el turno si pasa la validación
    await turnosAPI.create(formData);

    Swal.fire({
      title: "Turno solicitado",
      text: "Tu turno fue registrado correctamente",
      icon: "success",
      confirmButtonText: "Ver mis turnos",
      confirmButtonColor: "#0d6efd"
    }).then(() => navigate("/turnos"));

    setFormData({
      fecha: "",
      franja_horaria: "mañana",
      servicio_id: "",
      descripcion: ""
    });

  } catch (error) {
    Swal.fire({
      title: "Error",
      text: error.response?.data?.error || "No se pudo solicitar el turno",
      icon: "error",
      confirmButtonText: "Entendido",
      confirmButtonColor: "#dc3545"
    });
  } finally {
    setLoading(false);
  }

};


  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-vh-100 bg-transparent">

      {/*  Navbar unificada */}
      <nav className="navbar navbar-dark bg-primary shadow-sm">
        <div className="container">
          <span className="navbar-brand fw-bold">PlanificaNet</span>
          <a href="/dashboard" className="btn btn-outline-light btn-sm">
            Volver al Dashboard
          </a>
        </div>
      </nav>

      {/* Contenido */}
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">

            {/* Tarjeta con estilo global */}
            <div className="card-container">

              <h2 className="page-title text-center mb-2">🗓️ Nuevo Turno</h2>
              <p className="page-subtitle text-center mb-4">
                Completá los datos para solicitar tu turno
              </p>

              <form onSubmit={handleSubmit}>

                {/* Fecha */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    min={today}
                    required
                  />
                </div>

                {/* Franja horaria */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Franja Horaria</label>
                  <select
                    className="form-select"
                    name="franja_horaria"
                    value={formData.franja_horaria}
                    onChange={handleChange}
                    required
                  >
                    <option value="Mañana">Mañana 09:00 - 12:00</option>
                    <option value="Tarde">Tarde 13:00 - 17:00</option>
                    <option value="Noche">Noche 18:00 - 21:00</option>
                  </select>
                </div>

                {/* Servicio */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Servicio</label>
                  <select
                    className="form-select"
                    name="servicio_id"
                    value={formData.servicio_id}
                    onChange={handleChange}
                    required
                  >
                    {cargandoServicios ? (
                      <option value="">Cargando servicios...</option>
                    ) : (
                      <>
                        <option value="">Seleccionar servicio...</option>
                        {servicios.map(serv => (
                          <option key={serv.id} value={serv.id}>
                            {serv.nombre}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* Descripción */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Descripción (opcional)</label>
                  <textarea
                    className="form-control"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Describe el problema o requerimiento..."
                  />
                </div>

                {/* Botones con estilos globales */}
                <div className="d-grid gap-3 mt-4">

                  <button 
                    type="submit" 
                    className="btn-main w-100"
                    disabled={loading}
                  >
                    {loading ? 'Procesando...' : 'Confirmar Turno'}
                  </button>


                  <a href="/dashboard" className="btn-danger-light">
                    Cancelar
                  </a>

                  <a href="/turnos" className="btn-secondary-custom">
                    Ver Mis Turnos
                  </a>

                </div>

              </form>
            </div>

            <p className="text-center text-muted mt-3" style={{ fontSize: '0.9rem' }}>
              Asegurate de que los datos sean correctos antes de enviar
            </p>

          </div>
        </div>
      </div>
    </div>
  )
}

export default SolicitarTurno
