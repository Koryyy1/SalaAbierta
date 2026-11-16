const crypto = require('crypto');
const express = require('express');
const pool = require('../config/db');
const { autenticar, requiereRol, guardiaAlumno } = require('../middleware/auth');
const { registrarAuditoria } = require('../services/audit');

const router = express.Router();
router.use(autenticar);

const ZONA_HORARIA = process.env.ZONA_HORARIA || 'America/Santiago';
const COLEGIO = process.env.COLEGIO_NOMBRE || 'Colegio SalaAbierta';
const TIPOS = ['alumno_regular', 'notas', 'asistencia'];
const error = (res, status, mensaje) => res.status(status).json({ estado: 'Error', mensaje });
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA }); // AAAA-MM-DD

const SELECT =
    `SELECT c.id, c.alumno_id, c.tipo, c.codigo, c.contenido, to_char(c.emitido_en, 'YYYY-MM-DD"T"HH24:MI:SS') AS emitido_en
     FROM certificados c`;

// Código legible y difícil de adivinar: SA-AAAA-XXXXXXXX (sin letras ni números que se confunden)
function nuevoCodigo(anio) {
    const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const azar = [...crypto.randomBytes(8)].map((b) => ALFABETO[b % ALFABETO.length]).join('');
    return `SA-${anio}-${azar}`;
}

// Datos que quedan impresos en el certificado, calculados igual que en las secciones Notas y Asistencia
async function contenidoDelCertificado(tipo, alumnoId, fecha) {
    const { rows } = await pool.query('SELECT a.nombre, c.nombre AS curso FROM alumnos a JOIN cursos c ON c.id = a.curso_id WHERE a.id = $1', [alumnoId]);
    const contenido = { colegio: COLEGIO, alumno: rows[0].nombre, curso: rows[0].curso, anio: Number(fecha.slice(0, 4)), fecha };

    if (tipo === 'notas') {
        const { rows: notas } = await pool.query('SELECT asignatura, nota::float8 AS nota FROM calificaciones WHERE alumno_id = $1 ORDER BY asignatura', [alumnoId]);
        const redondear = (n) => Math.round(n * 10) / 10;
        const porAsignatura = new Map();
        for (const { asignatura, nota } of notas) porAsignatura.set(asignatura, [...(porAsignatura.get(asignatura) ?? []), nota]);
        contenido.asignaturas = [...porAsignatura].map(([asignatura, valores]) => ({
            asignatura,
            cantidad: valores.length,
            promedio: redondear(valores.reduce((s, n) => s + n, 0) / valores.length),
        }));
        contenido.promedio = notas.length ? redondear(notas.reduce((s, r) => s + r.nota, 0) / notas.length) : null;
    }
    if (tipo === 'asistencia') {
        const { rows: dias } = await pool.query('SELECT estado FROM asistencia WHERE alumno_id = $1', [alumnoId]);
        const contar = (estado) => dias.filter((d) => d.estado === estado).length;
        const presentes = contar('presente') + contar('atrasado');
        Object.assign(contenido, {
            dias: dias.length,
            presentes,
            atrasos: contar('atrasado'),
            ausentes: contar('ausente'),
            justificados: contar('justificado'),
            porcentaje: dias.length ? Math.round((presentes / dias.length) * 100) : null,
        });
    }
    return contenido;
}

// Certificados que el apoderado ha emitido para su pupilo (los más recientes primero)
router.get('/alumnos/:alumnoId/certificados', requiereRol('Apoderado'), guardiaAlumno, async (req, res) => {
    const { rows } = await pool.query(`${SELECT} WHERE c.alumno_id = $1 AND c.solicitado_por = $2 ORDER BY c.emitido_en DESC, c.id DESC LIMIT 30`, [
        req.alumnoId,
        req.user.id,
    ]);
    res.json({ estado: 'Éxito', datos: rows });
});

// Emite un certificado. Si ese mismo día ya se emitió uno igual, se entrega ese (no se duplican documentos).
router.post('/alumnos/:alumnoId/certificados', requiereRol('Apoderado'), guardiaAlumno, async (req, res) => {
    const tipo = req.body?.tipo;
    if (!TIPOS.includes(tipo)) return error(res, 400, 'Tipo de certificado inválido.');

    const fecha = hoy();
    const previo = await pool.query(
        `${SELECT} WHERE c.alumno_id = $1 AND c.solicitado_por = $2 AND c.tipo = $3 AND c.contenido->>'fecha' = $4 ORDER BY c.id DESC LIMIT 1`,
        [req.alumnoId, req.user.id, tipo, fecha]
    );
    if (previo.rows.length) return res.json({ estado: 'Éxito', dato: previo.rows[0], reutilizado: true });

    const contenido = await contenidoDelCertificado(tipo, req.alumnoId, fecha);
    const dato = await pool.transaction(async (tx) => {
        const codigo = nuevoCodigo(contenido.anio);
        const { rows } = await tx.query(
            'INSERT INTO certificados (alumno_id, tipo, codigo, solicitado_por, contenido) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [req.alumnoId, tipo, codigo, req.user.id, JSON.stringify(contenido)]
        );
        await registrarAuditoria(
            { usuarioId: req.user.id, accion: 'INSERT', tabla: 'certificados', registroId: rows[0].id, despues: { alumno_id: req.alumnoId, tipo, codigo } },
            tx
        );
        return (await tx.query(`${SELECT} WHERE c.id = $1`, [rows[0].id])).rows[0];
    });
    res.status(201).json({ estado: 'Éxito', dato });
});

// La dirección comprueba si un certificado es auténtico. Solo ve lo necesario para validarlo (sin notas ni asistencia).
router.get('/certificados/verificar/:codigo', requiereRol('Administrador'), async (req, res) => {
    const codigo = String(req.params.codigo).trim().toUpperCase();
    if (!/^SA-\d{4}-[A-Z0-9]{8}$/.test(codigo)) return error(res, 400, 'El código debe tener el formato SA-2026-XXXXXXXX.');
    const { rows } = await pool.query(
        `SELECT c.tipo, c.codigo, c.contenido->>'alumno' AS alumno, c.contenido->>'curso' AS curso,
                to_char(c.emitido_en, 'YYYY-MM-DD"T"HH24:MI:SS') AS emitido_en, u.nombre AS solicitado_por
         FROM certificados c JOIN usuarios u ON u.id = c.solicitado_por WHERE c.codigo = $1`,
        [codigo]
    );
    if (!rows.length) return res.status(404).json({ estado: 'Error', valido: false, mensaje: 'No existe un certificado con ese código.' });
    res.json({ estado: 'Éxito', valido: true, dato: rows[0] });
});

module.exports = router;
