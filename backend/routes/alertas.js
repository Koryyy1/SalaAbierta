const express = require('express');
const pool = require('../config/db');
const { autenticar, requiereRol, guardiaCurso } = require('../middleware/auth');
const { registrarAuditoria } = require('../services/audit');
const { leerUmbrales, recalcularTodos } = require('../services/alertas');

const router = express.Router();
router.use(autenticar);

const SELECT_ALERTAS = `SELECT al.id, al.alumno_id, a.nombre AS alumno, c.id AS curso_id, c.nombre AS curso, al.tipo,
        al.valor::float8 AS valor, al.umbral::float8 AS umbral, to_char(al.creada_en, 'YYYY-MM-DD"T"HH24:MI:SS') AS creada_en
    FROM alertas al JOIN alumnos a ON a.id = al.alumno_id JOIN cursos c ON c.id = a.curso_id
    WHERE al.resuelta_en IS NULL`;

// HU010: alertas activas de todos los cursos del profesor
router.get('/alertas', requiereRol('Profesor'), async (req, res) => {
    const { rows } = await pool.query(
        `${SELECT_ALERTAS} AND a.curso_id IN (SELECT curso_id FROM profesor_cursos WHERE usuario_id = $1)
         ORDER BY c.nombre, a.nombre, al.tipo`,
        [req.user.id]
    );
    res.json({ estado: 'Éxito', datos: rows });
});

// HU010: alertas activas de un curso (solo profesores de ese curso)
router.get('/cursos/:cursoId/alertas', requiereRol('Profesor'), guardiaCurso, async (req, res) => {
    const { rows } = await pool.query(`${SELECT_ALERTAS} AND a.curso_id = $1 ORDER BY a.nombre, al.tipo`, [req.cursoId]);
    res.json({ estado: 'Éxito', datos: rows });
});

// HU010: el Administrador consulta y configura los umbrales
router.get('/umbrales', requiereRol('Administrador'), async (req, res) => {
    res.json({ estado: 'Éxito', dato: await leerUmbrales() });
});

router.put('/umbrales', requiereRol('Administrador'), async (req, res) => {
    const actual = await leerUmbrales();
    const nuevo = { ...actual, ...req.body };
    const p = Number(nuevo.promedio_minimo);
    const valido =
        Number.isFinite(p) && p >= 1 && p <= 7 && Math.round(p * 10) === p * 10 &&
        Number.isInteger(nuevo.asistencia_minima) && nuevo.asistencia_minima >= 0 && nuevo.asistencia_minima <= 100 &&
        Number.isInteger(nuevo.notas_minimas) && nuevo.notas_minimas >= 1 &&
        Number.isInteger(nuevo.dias_minimos) && nuevo.dias_minimos >= 1;
    if (!valido) {
        return res.status(400).json({
            estado: 'Error',
            mensaje: 'Umbrales inválidos: promedio entre 1,0 y 7,0; asistencia entre 0 y 100; mínimos de notas y días desde 1.',
        });
    }
    const guardado = await pool.transaction(async (tx) => {
        await tx.query(
            'UPDATE umbrales_alerta SET promedio_minimo = $1, asistencia_minima = $2, notas_minimas = $3, dias_minimos = $4 WHERE id = 1',
            [p, nuevo.asistencia_minima, nuevo.notas_minimas, nuevo.dias_minimos]
        );
        const despues = await leerUmbrales(tx);
        await registrarAuditoria({ usuarioId: req.user.id, accion: 'UPDATE', tabla: 'umbrales_alerta', registroId: 1, antes: actual, despues }, tx);
        await recalcularTodos(tx); // las alertas se ajustan de inmediato a los nuevos umbrales
        return despues;
    });
    res.json({ estado: 'Éxito', dato: guardado });
});

module.exports = router;
