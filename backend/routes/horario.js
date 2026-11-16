const express = require('express');
const { autenticar, requiereRol, guardiaCurso } = require('../middleware/auth');
const { horarioDeCurso, diaDeHoy } = require('../services/horario');

const router = express.Router();
router.use(autenticar);

// Horario semanal del curso. El profesor ve el de sus cursos y el apoderado el del curso de sus pupilos.
router.get('/cursos/:cursoId/horario', requiereRol('Profesor', 'Apoderado'), guardiaCurso, async (req, res) => {
    res.json({ estado: 'Éxito', hoy: diaDeHoy(), datos: await horarioDeCurso(req.cursoId) });
});

module.exports = router;
