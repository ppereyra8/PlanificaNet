import React, { useState } from 'react'
import { authAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import Swal from "sweetalert2"

const Login = ({ onLogin }) => {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      })

      onLogin(response.data.user, response.data.token)

    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.response?.data?.error || "Error de conexión",
        icon: "error",
        confirmButtonColor: "#d33"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-transparent">

      {/* Tarjeta con estilo global */}
      <div className="card-container" style={{ maxWidth: "450px", width: "100%" }}>

        {/* Encabezado */}
        <div className="text-center mb-4">
          <h2 className="page-title">PlanificaNet</h2>
          <p className="page-subtitle">Sistema de Gestión de Turnos</p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              className="form-control"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Contraseña */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Contraseña</label>
            <input
              type="password"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Botón de login con estilo global */}
          <button
            type="submit"
            className="btn-main w-100"
            disabled={loading}
          >
            {loading ? "Cargando..." : "Iniciar Sesión"}
          </button>
        </form>

        {/* Botón para ir al registro */}
        <div className="text-center mt-3">
          <button
            type="button"
            className="btn btn-link"
            onClick={() => navigate('/registro')}
          >
            ¿No tienes cuenta? Regístrate
          </button>
        </div>


      </div>
    </div>
  )
}

export default Login
