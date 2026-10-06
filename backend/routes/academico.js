const express = require('express');
const pool = require('../config/db');
const { autenticar, requiereRol, guardiaCurso, guardiaAlumno, puedeVerAlumno } = require('../middleware/auth');
const { registrarAuditoria } = require('../services/audit');

const router = express.Router();
router.use(autenticar);

const ESTADOS_ASISTENCIA = ['presente', 'ausente', 'atrasado', 'justificado'];
const TIPOS_ANOTACION = ['positiva', 'negativa', 'observacion'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const fechaValida = (valor) => FECHA.test(valor) && !Number.isNaN(Date.parse(valor));
const notaValida = (n) => typeof n === 'number' && n >= 1 && n <= 7 && Math.round(n * 10) === n * 10;
const texto = (v, max) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);
const hoy = () => new Date().toISOString().slice(0, 10);
const error = (res, status, mensaje) => res.status(status).json({ estado: 'Error', mensaje });

const SELECT_NOTA =
    "SELECT id, alumno_id, asignatura, descripcion, nota::float8 AS nota, to_char(fecha, 'YYYY-MM-DD') AS fecha FROM calificaciones";

// --- Cursos y alumnos -------------------------------------------------------

router.get('/cursos', requiereRol('Profesor'), async (req, res) => {
    const { rows } = await pool.query(
        'SELECT c.id, c.nombre FROM cursos c JOIN profesor_cursos pc ON pc.curso_id = c.id WHERE pc.usuario_id = $1 ORDER BY c.nombre',
        [req.user.id]
    );
    res.json({ estado: 'Éxito', datos: rows });
});

router.get('/cursos/:cursoId/alumnos', requiereRol('Profesor'), guardiaCurso, async (req, res) => {
    const { rows } = await pool.query('SELECT id, nombre FROM alumnos WHERE curso_id = $1 ORDER BY nombre', [req.cursoId]);
    res.json({ estado: 'Éxito', datos: rows });
});

// Pupilos del apoderado autenticado (filtro de seguridad por llave foránea)
router.get('/apoderado/alumnos', requiereRol('Apoderado'), async (req, res) => {
    const { rows } = await pool.query(
        `SELECT a.id, a.nombre, a.curso_id, c.nombre AS curso
         FROM apoderado_alumno aa
         JOIN alumnos a ON a.id = aa.alumno_id
         JOIN cursos c ON c.id = a.curso_id
         WHERE aa.usuario_id = $1 ORDER BY a.nombre`,
        [req.user.id]
    );
    res.json({ estado: 'Éxito', datos: rows });
});

// --- Asistencia -------------------------------------------------------------

router.get('/cursos/:cursoId/asistencia', requiereRol('Profesor'), guardiaCurso, async (req, res) => {
    const fecha = req.query.fecha || hoy();
    if (!fechaValida(fecha)) return error(res, 400, 'Fecha inválida (use AAAA-MM-DD).');

    const { rows } = await pool.query(
        `SELECT a.id AS alumno_id, a.nombre, s.estado
         FROM alumnos a LEFT JOIN asistencia s ON s.alumno_id = a.id AND s.fecha = $2
         WHERE a.curso_id = $1 ORDER BY a.nombre`,
        [req.cursoId, fecha]
    );
    res.json({ estado: 'Éxito', fecha, datos: rows });
});

// Registro masivo de asistencia diaria (crea o edita)
router.put('/cursos/:cursoId/asistencia', requiereRol('Profesor'), guardiaCurso, async (req, res) => {
    const { fecha, registros } = req.body || {};
    if (!fechaValida(fecha)) return error(res, 400, 'Fecha inválida (use AAAA-MM-DD).');
    if (!Array.isArray(registros) || !registros.length) return error(res, 400, 'Debe enviar al menos un registro.');
    if (registros.some((r) => !ESTADOS_ASISTENCIA.includes(r?.estado) || !Number.isInteger(r?.alumno_id))) {
        return error(res, 400, 'Registro de asistencia inválido.');
    }

    const { rows: alumnos } = await pool.query('SELECT id FROM alumnos WHERE curso_id = $1', [req.cursoId]);
    const idsCurso = new Set(alumnos.map((a) => a.id));
    if (registros.some((r) => !idsCurso.has(r.alumno_id))) return error(res, 403, 'Hay alumnos que no pertenecen al curso.');

    for (const { alumno_id, estado } of registros) {
        const previo = (await pool.query("SELECT id, estado FROM asistencia WHERE alumno_id = $1 AND fecha = $2", [alumno_id, fecha])).rows[0];
        if (previo?.estado === estado) continue;

        const { rows } = await pool.query(
            `INSERT INTO asistencia (alumno_id, fecha, estado) VALUES ($1, $2, $3)
             ON CONFLICT (alumno_id, fecha) DO UPDATE SET estado = EXCLUDED.estado RETURNING id`,
            [alumno_id, fecha, estado]
        );
        await registrarAuditoria({
            usuarioId: req.user.id,
            accion: previo ? 'UPDATE' : 'INSERT',
            tabla: 'asistencia',
            registroId: rows[0].id,
            antes: previo ? { alumno_id, fecha, estado: previo.estado } : null,
            despues: { alumno_id, fecha, estado },
        });
    }
    res.json({ estado: 'Éxito', mensaje: 'Asistencia guardada.' });
});

router.get('/alumnos/:alumnoId/asistencia', guardiaAlumno, async (req, res) => {
    const { rows } = await pool.query(
        "SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, estado FROM asistencia WHERE alumno_id = $1 ORDER BY fecha DESC",
        [req.alumnoId]
    );
    const presentes = rows.filter((r) => r.estado === 'presente' || r.estado === 'atrasado').length;
    res.json({
        estado: 'Éxito',
        porcentaje: rows.length ? Math.round((presentes / rows.length) * 100) : null,
        datos: rows,
    });
});

// --- Calificaciones ---------------------------------------------------------

router.get('/alumnos/:alumnoId/calificaciones', guardiaAlumno, async (req, res) => {
    const { rows } = await pool.query(`${SELECT_NOTA} WHERE alumno_id = $1 ORDER BY fecha DESC, id DESC`, [req.alumnoId]);
    const promedio = rows.length ? Math.round((rows.reduce((s, r) => s + r.nota, 0) / rows.length) * 10) / 10 : null;
    res.json({ estado: 'Éxito', promedio, datos: rows });
});

router.post('/alumnos/:alumnoId/calificaciones', requiereRol('Profesor'), guardiaAlumno, async (req, res) => {
    const asignatura = texto(req.body?.asignatura, 80);
    const descripcion = texto(req.body?.descripcion ?? 'Evaluación', 200);
    const nota = req.body?.nota;
    if (!asignatura || !descripcion || !notaValida(nota)) {
        return error(res, 400, 'Asignatura, descripción y nota (1.0 a 7.0) son obligatorias.');
    }

    const { rows } = await pool.query(
        `INSERT INTO calificaciones (alumno_id, asignatura, descripcion, nota, fecha, profesor_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [req.alumnoId, asignatura, descripcion, nota, hoy(), req.user.id]
    );
    const creada = (await pool.query(`${SELECT_NOTA} WHERE id = $1`, [rows[0].id])).rows[0];
    await registrarAuditoria({ usuarioId: req.user.id, accion: 'INSERT', tabla: 'calificaciones', registroId: creada.id, despues: creada });
    res.status(201).json({ estado: 'Éxito', dato: creada });
});

router.put('/calificaciones/:id', requiereRol('Profesor'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return error(res, 400, 'Identificador inválido.');

    const previa = (await pool.query(`${SELECT_NOTA} WHERE id = $1`, [id])).rows[0];
    if (!previa || !(await puedeVerAlumno(req.user, previa.alumno_id))) return error(res, 404, 'Calificación no encontrada.');

    const asignatura = texto(req.body?.asignatura ?? previa.asignatura, 80);
    const descripcion = texto(req.body?.descripcion ?? previa.descripcion, 200);
    const nota = req.body?.nota ?? previa.nota;
    if (!asignatura || !descripcion || !notaValida(nota)) return error(res, 400, 'Datos de calificación inválidos.');

    await pool.query('UPDATE calificaciones SET asignatura = $1, descripcion = $2, nota = $3 WHERE id = $4', [asignatura, descripcion, nota, id]);
    const actual = (await pool.query(`${SELECT_NOTA} WHERE id = $1`, [id])).rows[0];
    await registrarAuditoria({ usuarioId: req.user.id, accion: 'UPDATE', tabla: 'calificaciones', registroId: id, antes: previa, despues: actual });
    res.json({ estado: 'Éxito', dato: actual });
});

// --- Anotaciones ------------------------------------------------------------

const SELECT_ANOTACION =
    "SELECT id, alumno_id, tipo, descripcion, to_char(fecha, 'YYYY-MM-DD') AS fecha FROM anotaciones";

router.get('/alumnos/:alumnoId/anotaciones', guardiaAlumno, async (req, res) => {
    const { rows } = await pool.query(`${SELECT_ANOTACION} WHERE alumno_id = $1 ORDER BY fecha DESC, id DESC`, [req.alumnoId]);
    res.json({ estado: 'Éxito', datos: rows });
});

router.post('/alumnos/:alumnoId/anotaciones', requiereRol('Profesor'), guardiaAlumno, async (req, res) => {
    const descripcion = texto(req.body?.descripcion, 1000);
    const tipo = req.body?.tipo;
    if (!descripcion || !TIPOS_ANOTACION.includes(tipo)) return error(res, 400, 'Tipo y descripción son obligatorios.');

    const { rows } = await pool.query(
        'INSERT INTO anotaciones (alumno_id, tipo, descripcion, fecha, profesor_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [req.alumnoId, tipo, descripcion, hoy(), req.user.id]
    );
    const creada = (await pool.query(`${SELECT_ANOTACION} WHERE id = $1`, [rows[0].id])).rows[0];
    await registrarAuditoria({ usuarioId: req.user.id, accion: 'INSERT', tabla: 'anotaciones', registroId: creada.id, despues: creada });
    res.status(201).json({ estado: 'Éxito', dato: creada });
});

// --- Auditoría --------------------------------------------------------------

router.get('/auditoria', requiereRol('Administrador'), async (req, res) => {
    const { rows } = await pool.query(
        `SELECT a.id, u.nombre AS usuario, a.accion, a.tabla, a.registro_id, a.datos_antes, a.datos_despues,
                to_char(a.fecha, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha
         FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id ORDER BY a.id DESC LIMIT 200`
    );
    res.json({ estado: 'Éxito', datos: rows });
});

module.exports = router;
