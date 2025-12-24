import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { turnosAPI } from "../services/api";
import Swal from "sweetalert2";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Reportes = () => {
  const [visitasTecnico, setVisitasTecnico] = useState([]);
  const [visitasPorMes, setVisitasPorMes] = useState([]);
  const [zonasDemanda, setZonasDemanda] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarReportes = async () => {
    try {
      
      const respTecnicos = await turnosAPI.getVisitasPorTecnico();
          console.log("Tecnicos:", respTecnicos.data);
          setVisitasTecnico(respTecnicos.data);

          const respMes = await turnosAPI.getVisitasPorMes(); 
          console.log("Meses:", respMes.data);
          setVisitasPorMes(respMes.data);

          const respZonas = await turnosAPI.getZonasDemanda();
          console.log("Zonas:", respZonas.data);
          setZonasDemanda(respZonas.data);

    } catch (err) {
      console.error("Error cargando reportes:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "No se pudieron cargar los reportes",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReportes();
  }, []);

  if (loading) return <p className="text-center mt-5">Cargando reportes...</p>;

  return (
    <div className="min-vh-100 bg-transparent">
      {/* Navbar global */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="navbar-brand fw-bold">PlanificaNet</span>
          <Link to="/dashboard" className="btn btn-outline-light btn-sm">
            Volver al Dashboard
          </Link>
        </div>
      </nav>

      <div className="container pt-4">
        <h2 className="page-title text-center mb-2">📊 Reportes</h2>
        <p className="page-subtitle text-center mb-4">
          Estadísticas de visitas y demanda
        </p>

                      {/* Historial de visitas por técnico */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-primary text-white fw-bold">
                  Historial de visitas por técnico
                </div>
                <div className="card-body">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Técnico</th>
                        <th>Cantidad de visitas</th>
                        <th>Acciones</th> 
                      </tr>
                    </thead>
                    <tbody>
                      {visitasTecnico.map((v, i) => (
                        <tr key={i}>
                          <td>{v.tecnico_nombre}</td>
                          <td>{v.total_visitas}</td>
                          <td>
                            <Link
                              to={`/tecnicos/${v.id_tecnico}/historial`}
                              className="btn btn-outline-primary btn-sm"
                            >
                              🔍
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

        


               {/* Cantidad de visitas por mes */}
                <div className="card mb-4 shadow-sm">
                  <div className="card-header bg-primary text-white fw-bold">
                    Cantidad de visitas por mes
                  </div>
                  <div className="card-body" style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={visitasPorMes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis />
                        <Tooltip labelFormatter={(str) => str} />
                        <Line type="monotone" dataKey="total_visitas" stroke="#007bff" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>





        {/* Zonas con mayor demanda */}
        <div className="card mb-4 shadow-sm">
          <div className="card-header bg-primary text-white fw-bold">
            Zonas con mayor demanda
          </div>
          <div className="card-body">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Cantidad de visitas</th>
                </tr>
              </thead>
              <tbody>
                {zonasDemanda.map((z, i) => (
                  <tr key={i}>
                    <td>{z.zona_nombre}</td>
                    <td>{z.total_visitas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
