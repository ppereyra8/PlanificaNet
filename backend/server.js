import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';


function formatearFecha(fecha) {
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const año = d.getFullYear();
  return `${dia}-${mes}-${año}`;
}



dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// Conexión a la base de datos
// =======================
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// =======================
// MIDDLEWARE DE AUTH
// =======================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar en la base de datos que el usuario exista y esté habilitado
    const [rows] = await db.execute(
      'SELECT id_usuario, id_rol, habilitado FROM usuarios WHERE id_usuario = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (rows[0].habilitado === 0) {
      return res.status(403).json({ error: 'Usuario deshabilitado' });
    }

    // Sobrescribimos req.user con datos confiables desde la DB
    req.user = { id: rows[0].id_usuario, rol: rows[0].id_rol };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};


// =======================
// RUTAS DE AUTENTICACIÓN
// =======================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        
        //  validación de habilitado
        if (user.habilitado === 0) {
           return res.status(403).json({ error: 'Usuario deshabilitado' }); 
          }


        const token = jwt.sign(
            { id: user.id_usuario, email: user.email, rol: user.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id_usuario,
                email: user.email,
                nombre: user.nombre,
                rol: user.id_rol,
                habilitado: user.habilitado
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// =======================
// REGISTRO DE CLIENTES
// =======================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, telefono, direccion, id_zona, id_barrio } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, nombre y contraseña son obligatorios' });
    }

    // Verificar si el email ya existe
    const [existe] = await db.execute('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Rol fijo = 1 (cliente), habilitado por defecto
    const [result] = await db.execute(
      'INSERT INTO usuarios (email, password, nombre, telefono, direccion, id_rol, id_zona, id_barrio, habilitado) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1)',
      [email, hashedPassword, nombre, telefono, direccion, id_zona, id_barrio]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      email,
      telefono,
      direccion,
      id_zona,
      id_barrio,
      id_rol: 1,
      habilitado: 1,
      message: 'Cliente registrado exitosamente'
    });
  } catch (error) {
    console.error('Error registrando cliente:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});



// Crear usuario técnico o admin
app.post('/api/usuarios', authMiddleware, async (req, res) => {
  try {
    // Solo admin puede crear otros usuarios
    if (req.user.rol !== 3) {
      return res.status(403).json({ error: 'No tienes permiso para crear usuarios' });
    }

    const { email, password, nombre, telefono, direccion, id_zona, id_barrio, id_rol } = req.body;


    if (!email || !password || !nombre) { 
      return res.status(400).json({ error: 'Email, nombre y contraseña son obligatorios' });
     }


    if (![2, 3].includes(id_rol)) {
      return res.status(400).json({ error: 'Rol inválido, solo Técnico (2) o Admin (3)' });
    }

    const [existe] = await db.execute('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      'INSERT INTO usuarios (email, password, nombre, telefono, direccion, id_rol, id_zona, id_barrio, habilitado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [email, hashedPassword, nombre, telefono, direccion, id_rol, id_zona, id_barrio]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      email,
      telefono,
      direccion,
      id_zona,
      id_barrio,
      id_rol,
      habilitado: 1
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});



// Listar usuarios técnicos y admin
app.get('/api/usuarios', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol !== 3) {
      return res.status(403).json({ error: 'Solo admin puede ver usuarios' });
    }

    const [rows] = await db.execute(`
      SELECT u.id_usuario AS id, u.nombre, u.email, u.telefono, u.direccion,
             u.id_zona, u.id_barrio, u.id_rol, u.habilitado,
             z.nombre AS zona_nombre, b.nombre AS barrio_nombre
      FROM usuarios u
      LEFT JOIN zonas z ON u.id_zona = z.id_zona
      LEFT JOIN barrios b ON u.id_barrio = b.id_barrio
      WHERE u.id_rol IN (2,3)
      ORDER BY u.nombre ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Cambiar estado habilitado
app.put('/api/usuarios/:id/estado', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol !== 3) {
      return res.status(403).json({ error: 'Solo admin puede cambiar estado' });
    }

    const { id } = req.params;
    const { habilitado } = req.body;

    const [result] = await db.execute(
      'UPDATE usuarios SET habilitado = ? WHERE id_usuario = ?',
      [habilitado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

   res.json({ id: parseInt(id), habilitado, message: 'Estado actualizado correctamente' });
   }
    catch (error) { 
      console.error('Error cambiando estado usuario:', error);
       res.status(500).json({ error: 'Error del servidor' });
       } 
      });


// =======================
// RUTAS DE ZONAS Y BARRIOS
// =======================

// Obtener todas las zonas
app.get('/api/zonas', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id_zona, nombre FROM zonas ORDER BY nombre ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo zonas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener barrios por zona
app.get('/api/barrios/:id_zona', async (req, res) => {
  try {
    const { id_zona } = req.params;
    const [rows] = await db.execute(
      'SELECT id_barrio, nombre FROM barrios WHERE id_zona = ? ORDER BY nombre ASC',
      [id_zona]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo barrios:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});



// =======================
// RUTAS DE TURNOS
// =======================

// Obtener turnos según rol
app.get('/api/turnos', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRol = req.user.rol;

    let query = '';
    let params = [];

    if (userRol === 3) { // admin
      query = `
        SELECT t.id_turno, t.fecha, t.franja_horaria, t.estado,
               t.descripcion,
               c.nombre AS cliente_nombre,
               tec.nombre AS tecnico_nombre,
               s.nombre AS servicio_nombre
        FROM turnos t
        JOIN servicios s ON t.servicio_id = s.id_servicio
        LEFT JOIN usuarios c ON t.cliente_id = c.id_usuario
        LEFT JOIN usuarios tec ON t.tecnico_id = tec.id_usuario
        ORDER BY t.fecha DESC, t.franja_horaria DESC
      `;
    } else if (userRol === 2) { // técnico
      query = `
        SELECT t.id_turno, t.fecha, t.franja_horaria, t.estado,
               t.descripcion,
               c.nombre AS cliente_nombre,
               c.telefono,
               s.nombre AS servicio_nombre
        FROM turnos t
        JOIN servicios s ON t.servicio_id = s.id_servicio
        LEFT JOIN usuarios c ON t.cliente_id = c.id_usuario
        WHERE t.tecnico_id = ?
        ORDER BY t.fecha DESC, t.franja_horaria DESC
      `;
      params = [userId];
    } else { // cliente
      query = `
        SELECT t.id_turno, t.fecha, t.franja_horaria, t.estado,
               t.descripcion,
               u.nombre AS tecnico_nombre,
               s.nombre AS servicio_nombre
        FROM turnos t
        JOIN servicios s ON t.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON t.tecnico_id = u.id_usuario
        WHERE t.cliente_id = ?
        ORDER BY t.fecha DESC, t.franja_horaria DESC
      `;
      params = [userId];
    }

    const [turns] = await db.execute(query, params);
    res.json(turns);

  } catch (error) {
    console.error('Error obteniendo turnos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Obtener historial de turnos de un cliente
app.get('/api/clientes/:id/turnos', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol !== 3) {
      return res.status(403).json({ error: 'Solo admin puede consultar historial de clientes' });
    }

    const { id } = req.params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const [rows] = await db.execute(
      `SELECT 
         t.id_turno,
         t.fecha,
         t.franja_horaria,
         t.estado,
         t.descripcion,
         s.nombre AS servicio_nombre,
         tec.nombre AS tecnico_nombre,
         c.nombre AS cliente_nombre
       FROM turnos t
       JOIN servicios s ON t.servicio_id = s.id_servicio
       LEFT JOIN usuarios tec ON t.tecnico_id = tec.id_usuario
       LEFT JOIN usuarios c ON t.cliente_id = c.id_usuario
       WHERE t.cliente_id = ?
       ORDER BY t.fecha DESC, FIELD(t.franja_horaria,'mañana','tarde','noche') DESC`,
      [idNum]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo historial de turnos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});




//  Obtener el próximo turno del cliente o técnico
app.get('/api/turnos/proximo', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRol = req.user.rol;

    let query = "";
    let params = [];

    //  Cliente → próximo turno del cliente
    if (userRol === 1) {
      query = `
        SELECT t.id_turno, t.fecha, t.franja_horaria, t.estado,
               t.descripcion, u.nombre AS tecnico_nombre, s.nombre AS servicio_nombre
        FROM turnos t
        JOIN servicios s ON t.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON t.tecnico_id = u.id_usuario
        WHERE t.cliente_id = ?
          AND t.fecha >= CURDATE()
          AND t.estado IN ('pendiente', 'confirmado')
        ORDER BY t.fecha ASC, FIELD(t.franja_horaria, 'mañana', 'tarde', 'noche')
        LIMIT 1
      `;
      params = [userId];
    }

    // Técnico → próximo turno asignado al técnico
    else if (userRol === 2) {
      query = `
        SELECT t.id_turno, t.fecha, t.franja_horaria, t.estado,
               t.descripcion, c.nombre AS cliente_nombre, s.nombre AS servicio_nombre
        FROM turnos t
        JOIN servicios s ON t.servicio_id = s.id_servicio
        LEFT JOIN usuarios c ON t.cliente_id = c.id_usuario
        WHERE t.tecnico_id = ?
          AND t.fecha >= CURDATE()
          AND t.estado IN ('pendiente', 'confirmado')
        ORDER BY t.fecha ASC, FIELD(t.franja_horaria, 'mañana', 'tarde', 'noche')
        LIMIT 1
      `;
      params = [userId];
    }

    // 
    else {
      return res.json(null);
    }

    const [rows] = await db.execute(query, params);
    return res.json(rows[0] || null);

  } catch (error) {
    console.error('Error obteniendo próximo turno:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

//obtener los turnos del técnico para la fecha actual:
app.get('/api/turnos/tecnico-dia/:id', authMiddleware, async (req, res) => {
  try {
    const tecnicoId = parseInt(req.params.id, 10);
    if (Number.isNaN(tecnicoId)) {
      return res.status(400).json({ error: 'ID de técnico inválido' });
    }

    // Solo admin o el propio técnico pueden consultar
    if (req.user.rol !== 3 && !(req.user.rol === 2 && req.user.id === tecnicoId)) {
      return res.status(403).json({ error: 'No tienes permiso para consultar estos turnos' });
    }

    const hoy = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const [rows] = await db.execute(
      `SELECT t.id_turno, t.fecha, t.franja_horaria, u.nombre AS cliente_nombre, 
              u.direccion, z.nombre AS zona_nombre, b.nombre AS barrio_nombre
       FROM turnos t
       JOIN usuarios u ON u.id_usuario = t.cliente_id
       JOIN zonas z ON z.id_zona = u.id_zona
       JOIN barrios b ON b.id_barrio = u.id_barrio
       WHERE t.tecnico_id = ? AND DATE(t.fecha) = ?
       ORDER BY t.fecha DESC`,
      [tecnicoId, hoy]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo turnos del día:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});



// Crear turno
app.post('/api/turnos', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol !== 1) {
      return res.status(403).json({ error: 'Solo clientes pueden crear turnos' });
    }

    const { fecha, franja_horaria, servicio_id, descripcion } = req.body;

    const clienteId = req.user.id;

    const franjasValidas = ['mañana', 'tarde', 'noche'];
    if (!franjasValidas.includes(franja_horaria)) {
      return res.status(400).json({ error: 'Franja horaria inválida' });
    }

    // Obtener nombre del servicio
    const [servicioRows] = await db.execute(
      'SELECT nombre FROM servicios WHERE id_servicio = ?',
      [servicio_id]
    );
    if (servicioRows.length === 0) {
      return res.status(400).json({ error: 'Servicio no válido' });
    }

    // Seleccionar técnico disponible
   const [tecnicos] = await db.execute(
        ` SELECT u.id_usuario
        FROM usuarios u
        WHERE u.id_rol = 2
          AND u.id_usuario NOT IN (
            SELECT tecnico_id
            FROM turnos
            WHERE fecha = ?
              AND franja_horaria = ?
          )
        LIMIT 1
        `,
        [fecha, franja_horaria]
      );


      if (tecnicos.length === 0) {
        return res.status(400).json({
          error: "No hay técnicos disponibles. Por favor prueba otra fecha u otra franja horaria"
        });
      }

    const tecnicoId = tecnicos[0].id_usuario;

    // Crear turno
    const [result] = await db.execute(
      'INSERT INTO turnos (cliente_id, tecnico_id, fecha, franja_horaria, servicio_id, descripcion, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [clienteId, tecnicoId, fecha, franja_horaria, servicio_id, descripcion, 'pendiente']

    );

    const fechaFormateada = formatearFecha(fecha);

    // Notificación para el cliente
    await db.execute(
      'INSERT INTO notificaciones (id_usuario, mensaje, fecha_envio, leida) VALUES (?, ?, NOW(), 0)',
      [
        clienteId,
        `Tu turno de ${servicioRows[0].nombre} para el ${fechaFormateada} (${franja_horaria}) fue creado correctamente.`
      ]
    );

    //  Notificación para el técnico
    await db.execute(
      'INSERT INTO notificaciones (id_usuario, mensaje, fecha_envio, leida) VALUES (?, ?, NOW(), 0)',
      [
        tecnicoId,
        `Se te asignó un nuevo turno de ${servicioRows[0].nombre} para el ${fechaFormateada} (${franja_horaria}).`
      ]
    );

    // Respuesta final
    res.status(201).json({
      message: 'Turno creado exitosamente',
      turnoId: result.insertId,
      servicio_nombre: servicioRows[0].nombre,
      franja_horaria
    });

  } catch (error) {
    console.error('Error creando turno:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


//actualizar fecha, franja y técnico:
app.put('/api/turnos/:id', authMiddleware, async (req, res) => {
  try {
    const { fecha, franja_horaria, tecnico_id } = req.body;

    // Actualizamos el turno y lo dejamos en estado pendiente
    await db.execute(
      `UPDATE turnos 
       SET fecha = ?, franja_horaria = ?, tecnico_id = ?, estado = 'pendiente'
       WHERE id_turno = ?`,
      [fecha, franja_horaria, tecnico_id, req.params.id]
    );

    // Obtenemos datos del turno actualizado para notificar
    const [turnoRows] = await db.execute(
      `SELECT t.id_turno, t.cliente_id, t.tecnico_id, s.nombre AS servicio_nombre
       FROM turnos t
       JOIN servicios s ON s.id_servicio = t.servicio_id
       WHERE t.id_turno = ?`,
      [req.params.id]
    );

    if (turnoRows.length === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const turno = turnoRows[0];
    const clienteId = turno.cliente_id;
    const tecnicoId = turno.tecnico_id;
    const servicioNombre = turno.servicio_nombre;

    // Formateamos fecha para el mensaje
    const fechaFormateada = new Date(fecha).toLocaleDateString("es-ES");

    // Notificación para el cliente
    await db.execute(
      'INSERT INTO notificaciones (id_usuario, mensaje, fecha_envio, leida) VALUES (?, ?, NOW(), 0)',
      [
        clienteId,
        `Tu turno de ${servicioNombre} fue reprogramado para el ${fechaFormateada} (${franja_horaria}).`
      ]
    );

    // Notificación para el técnico
    await db.execute(
      'INSERT INTO notificaciones (id_usuario, mensaje, fecha_envio, leida) VALUES (?, ?, NOW(), 0)',
      [
        tecnicoId,
        `Se te asignó un turno de ${servicioNombre} para el ${fechaFormateada} (${franja_horaria}).`
      ]
    );

    res.json({ message: 'Turno actualizado y notificaciones enviadas' });
  } catch (error) {
    console.error('Error actualizando turno:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});




// Actualizar estado del turno (confirmar, cancelar, etc.)
app.put('/api/turnos/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const userId = req.user.id;
    const userRol = req.user.rol;

    const estadosValidos = ['pendiente', 'confirmado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    // Obtener turno
    const [turnos] = await db.execute(
      'SELECT cliente_id, tecnico_id, fecha, franja_horaria, servicio_id, descripcion FROM turnos WHERE id_turno = ?',
      [id]
    );

    if (turnos.length === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const turno = turnos[0];

    // Validación por rol
    if (userRol === 2 && turno.tecnico_id !== userId) {
      // Técnico solo sus turnos
      return res.status(403).json({ error: 'No tienes permiso para modificar este turno' });
    }

    if (userRol === 1 && turno.cliente_id !== userId) {
      // Cliente solo sus turnos
      return res.status(403).json({ error: 'No puedes cancelar turnos de otros clientes' });
    }

    // Admin (rol 3) 

    // Obtener nombre del usuario que realiza la acción
    const [usuarios] = await db.execute(
      'SELECT nombre FROM usuarios WHERE id_usuario = ?',
      [userId]
    );
    const usuarioAccion = usuarios[0]?.nombre || "Un usuario";

    // Actualizar estado
    await db.execute('UPDATE turnos SET estado = ? WHERE id_turno = ?', [estado, id]);

    // Formatear fecha
    const fechaFormateada = formatearFecha(turno.fecha);

    // Notificaciones
    if (estado === 'confirmado') {
      await db.execute(
        'INSERT INTO notificaciones (id_usuario, mensaje, fecha_envio, leida) VALUES (?, ?, NOW(), 0)',
        [turno.cliente_id, `Tu turno del ${fechaFormateada} (${turno.franja_horaria}) fue confirmado.`]
      );
      await db.execute(
        'INSERT INTO notificaciones (id_usuario, mensaje, fecha_envio, leida) VALUES (?, ?, NOW(), 0)',
        [turno.tecnico_id, `${usuarioAccion} confirmó el turno del ${fechaFormateada} (${turno.franja_horaria}).`]
      );
    } else if (estado === 'cancelado') {
      await db.execute(
        'INSERT INTO notificaciones (id_usuario, mensaje, fecha_envio, leida) VALUES (?, ?, NOW(), 0)',
        [turno.cliente_id, `Tu turno del ${fechaFormateada} (${turno.franja_horaria}) fue cancelado.`]
      );
      await db.execute(
        'INSERT INTO notificaciones (id_usuario, mensaje, fecha_envio, leida) VALUES (?, ?, NOW(), 0)',
        [turno.tecnico_id, `${usuarioAccion} canceló el turno del ${fechaFormateada} (${turno.franja_horaria}).`]
      );
    }

    res.json({ message: 'Estado actualizado y notificaciones enviadas' });

  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// =======================
// RUTAS DE USUARIOS
// =======================
// Obtener datos del usuario
app.get('/api/usuarios/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Solo el usuario o el admin pueden ver estos datos
    if (req.user.id !== parseInt(id) && req.user.rol !== 3) {
      return res.status(403).json({ error: 'No tienes permiso para ver estos datos' });
    }

    const [rows] = await db.execute(
      'SELECT id_usuario, nombre, email, telefono, direccion FROM usuarios WHERE id_usuario = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Actualizar datos personales
app.put('/api/usuarios/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, direccion } = req.body;

    // Solo el usuario o el admin pueden editar
    if (req.user.id !== parseInt(id) && req.user.rol !== 3) {
      return res.status(403).json({ error: 'No tienes permiso para editar estos datos' });
    }

    // VALIDACIÓN: evitar emails duplicados
    const [existe] = await db.execute(
  'SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario <> ?',
  [email, id]
    );

if (existe.length > 0) {
  return res.status(400).json({ error: 'El email ya está en uso' });
}
 // Actualizar datos
    await db.execute(
      `UPDATE usuarios 
       SET nombre = ?, email = ?, telefono = ?, direccion = ?
       WHERE id_usuario = ?`,
      [nombre, email, telefono, direccion, id]
    );

    res.json({ message: 'Datos actualizados correctamente' });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Cambiar contraseña
app.put('/api/usuarios/:id/password', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { actual, nueva } = req.body;

    // Solo el usuario puede cambiar su propia contraseña
    if (req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'No puedes cambiar la contraseña de otro usuario' });
    }

    // Obtener contraseña actual
    const [rows] = await db.execute(
      'SELECT password FROM usuarios WHERE id_usuario = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const passwordHash = rows[0].password;

    // Validar contraseña actual
    const coincide = await bcrypt.compare(actual, passwordHash);
    if (!coincide) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Encriptar nueva contraseña
    const nuevaHash = await bcrypt.hash(nueva, 10);

    // Guardar nueva contraseña
    await db.execute(
      'UPDATE usuarios SET password = ? WHERE id_usuario = ?',
      [nuevaHash, id]
    );

    res.json({ message: 'Contraseña actualizada correctamente' });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// =======================
// RUTAS DE NOTIFICACIONES
// =======================

// Listar notificaciones del usuario autenticado
app.get('/api/notificaciones', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.execute(
      `SELECT id_notif, mensaje, fecha_envio,leida
       FROM notificaciones
       WHERE id_usuario = ?
       ORDER BY fecha_envio DESC`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Marcar notificación como leída 
app.put('/api/notificaciones/:id/leida', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await db.execute(
      'SELECT id_usuario FROM notificaciones WHERE id_notif = ?', [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
    }

    if (rows[0].id_usuario !== userId) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para esta notificación' });
    }

    const [result] = await db.execute(
      'UPDATE notificaciones SET leida = 1 WHERE id_notif = ?',
      [id]
    );

    if (result.affectedRows === 1) {
      return res.json({ success: true });
    }

    return res.status(500).json({ success: false, error: 'No se pudo actualizar la notificación' });
  } catch (error) {
    console.error('Error actualizando notificación:', error);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});


// =======================
// Health check
// =======================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'PlanificaNet MVP funcionando',
        timestamp: new Date().toISOString()
    });
});




// SERVICIOS - ABM COMPLETO

app.get("/api/servicios", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id_servicio AS id, nombre, descripcion FROM servicios ORDER BY nombre ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo servicios:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});


// Obtener un servicio por ID
app.get("/api/servicios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "SELECT id_servicio AS id, nombre, descripcion FROM servicios WHERE id_servicio = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    res.json(rows[0]); // devuelve el objeto único { id, nombre, descripcion }
  } catch (err) {
    console.error("Error al obtener servicio:", err);
    res.status(500).json({ error: "Error al obtener servicio" });
  }
});


// Crear un nuevo servicio
app.post("/api/servicios", authMiddleware, async (req, res) => {
  if (!req.user || req.user.rol !== 3) {
    return res.status(403).json({ error: 'Solo admin puede crear servicios' });
  }

  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO servicios (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      descripcion
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Ya existe un servicio con ese nombre" });
    }
    console.error("Error al crear servicio:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Actualizar un servicio
app.put("/api/servicios/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.rol !== 3) {
      return res.status(403).json({ error: 'Solo admin puede editar servicios' });
    }

    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const sql = `
      UPDATE servicios 
      SET nombre = ?, descripcion = ?
      WHERE id_servicio = ?
    `;

    const [result] = await db.execute(sql, [nombre, descripcion, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    //  Devuelve el objeto actualizado
    res.json({ id: parseInt(id), nombre, descripcion });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Ya existe un servicio con ese nombre" });
    }
    console.error("Error al actualizar servicio:", err);
    res.status(500).json({ error: "Error al actualizar servicio" });
  }
});

// Eliminar un servicio
app.delete("/api/servicios/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.rol !== 3) {
      return res.status(403).json({ error: 'Solo admin puede eliminar servicios' });
    }

    const { id } = req.params;
    const sql = "DELETE FROM servicios WHERE id_servicio = ?";

    const [result] = await db.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    //  Devuelve el id eliminado
    res.json({ id: parseInt(id) });
  } catch (err) {
    console.error("Error al eliminar servicio:", err);
    res.status(500).json({ error: "Error al eliminar servicio" });
  }
});


// =======================
// GESTION CLIENTES (solo admin)
// =======================


// Obtener un cliente por ID
app.get('/api/clientes/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol !== 3) {
      return res.status(403).json({ error: 'Solo admin puede ver detalle de clientes' });
    }

    const { id } = req.params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const [rows] = await db.execute(
      ` SELECT u.id_usuario AS id, u.nombre, u.email, u.telefono, u.direccion,
              z.nombre AS zona_nombre, b.nombre AS barrio_nombre, u.habilitado
       FROM usuarios u
       LEFT JOIN zonas z ON u.id_zona = z.id_zona
       LEFT JOIN barrios b ON u.id_barrio = b.id_barrio
       WHERE u.id_usuario = ? AND u.id_rol = 1
 `,
      [idNum]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Listar clientes
app.get('/api/clientes', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol !== 3) {
      return res.status(403).json({ error: 'Solo admin puede ver clientes' });
    }

    const [rows] = await db.execute(`
      SELECT u.id_usuario AS id, u.nombre, u.email, u.telefono, u.direccion,
             u.id_zona, u.id_barrio, u.habilitado,
             z.nombre AS zona_nombre, b.nombre AS barrio_nombre
      FROM usuarios u
      LEFT JOIN zonas z ON u.id_zona = z.id_zona
      LEFT JOIN barrios b ON u.id_barrio = b.id_barrio
      WHERE u.id_rol = 1
      ORDER BY u.nombre ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error listando clientes:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Cambiar estado habilitado del cliente
app.put('/api/clientes/:id/estado', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol !== 3) {
      return res.status(403).json({ error: 'Solo admin puede cambiar estado' });
    }

    const { id } = req.params;
    const { habilitado } = req.body;

    const idNum = parseInt(id, 10);
    const habil = parseInt(habilitado, 10);
    if (![0, 1].includes(habil)) {
      return res.status(400).json({ error: 'Valor inválido para habilitado' });
    }

    const [result] = await db.execute(
      'UPDATE usuarios SET habilitado = ? WHERE id_usuario = ? AND id_rol = 1',
      [habil, idNum]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ id: idNum, habilitado: habil, message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error cambiando estado cliente:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Historial de turnos de un técnico
app.get('/api/tecnicos/:id/turnos', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (req.user.rol !== 3 && !(req.user.rol === 2 && req.user.id === id)) {
      return res.status(403).json({ error: 'No tienes permiso para ver este historial' });
    }

    const [rows] = await db.execute(
      `SELECT tu.id_turno, tu.fecha, tu.franja_horaria, tu.estado, tu.descripcion,
              s.nombre AS servicio_nombre,
              c.nombre AS cliente_nombre
       FROM turnos tu
       JOIN servicios s ON tu.servicio_id = s.id_servicio
       JOIN usuarios c ON tu.cliente_id = c.id_usuario
       WHERE tu.tecnico_id = ?
       ORDER BY tu.fecha DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo historial técnico:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Reporte: visitas por técnico
app.get('/api/reportes/visitas-tecnico', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id_usuario AS id_tecnico,
       u.nombre AS tecnico_nombre,
       COALESCE(SUM(CASE WHEN tu.estado = 'confirmado' THEN 1 ELSE 0 END), 0) AS total_visitas
          FROM usuarios u
          LEFT JOIN turnos tu ON tu.tecnico_id = u.id_usuario
          WHERE u.id_rol = 2
          GROUP BY u.id_usuario, u.nombre
          ORDER BY total_visitas DESC;`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo visitas por técnico:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Reporte: zonas con mayor demanda
app.get('/api/reportes/zonas-demanda', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT z.id_zona,
              z.nombre AS zona_nombre,
              COALESCE(SUM(tu.estado = 'confirmado'), 0) AS total_visitas
       FROM zonas z
       LEFT JOIN usuarios u ON u.id_zona = z.id_zona
       LEFT JOIN turnos tu ON tu.cliente_id = u.id_usuario
       GROUP BY z.id_zona, z.nombre
       ORDER BY total_visitas DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo zonas con demanda:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Reporte: visitas por mes
app.get('/api/reportes/visitas-mes', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT m.mes,
              COALESCE(SUM(tu.estado = 'confirmado'), 0) AS total_visitas
       FROM (
         SELECT CONCAT(YEAR(CURDATE()), '-01') AS mes UNION
         SELECT CONCAT(YEAR(CURDATE()), '-02') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-03') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-04') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-05') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-06') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-07') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-08') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-09') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-10') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-11') UNION
         SELECT CONCAT(YEAR(CURDATE()), '-12')
       ) m
       LEFT JOIN turnos tu
         ON DATE_FORMAT(tu.fecha, '%Y-%m') = m.mes
       GROUP BY m.mes
       ORDER BY m.mes`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo visitas por mes:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});






const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('🚀 PlanificaNet MVP Backend en puerto', PORT);
    });
