const express = require('express');
const pool = require('../config/db');
const { autenticar, requiereRol } = require('../middleware/auth');
const { responder } = require('../services/agente');

const router = express.Router();
router.use(autenticar);

// HU009: el apoderado pregunta en lenguaje natural sobre sus pupilos o el uso de la app
router.post('/preguntar', requiereRol('Apoderado'), async (req, res) => {
    const pregunta = typeof req.body?.pregunta === 'string' ? req.body.pregunta.trim() : '';
    if (!pregunta || pregunta.length > 500) {
        return res.status(400).json({ estado: 'Error', mensaje: 'Escriba una pregunta de hasta 500 caracteres.' });
    }
    const alumnoId = req.body?.alumnoId === undefined ? undefined : Number(req.body.alumnoId);

    const { rows: pupilos } = await pool.query(
        `SELECT a.id, a.nombre, a.curso_id, c.nombre AS curso
         FROM apoderado_alumno aa JOIN alumnos a ON a.id = aa.alumno_id JOIN cursos c ON c.id = a.curso_id
         WHERE aa.usuario_id = $1 ORDER BY a.nombre`,
        [req.user.id]
    );
    if (!pupilos.length) return res.status(404).json({ estado: 'Error', mensaje: 'No tiene pupilos asociados.' });
    if (alumnoId !== undefined && !pupilos.some((p) => p.id === alumnoId)) {
        return res.status(403).json({ estado: 'Error', mensaje: 'No tienes acceso a este recurso.' });
    }

    const resultado = await responder({ usuario: req.user, pupilos, alumnoId, pregunta });
    res.json({ estado: 'Éxito', ...resultado });
});

module.exports = router;
