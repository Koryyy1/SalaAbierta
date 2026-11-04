const express = require('express');
const pool = require('../config/db');
const { autenticar, requiereRol } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// Mismos cálculos que las pantallas: promedio con un decimal y % de días presente o atrasado
const promedio = (notas) => (notas.length ? Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 10) / 10 : null);
const porcentaje = (presentes, total) => (total ? Math.round((presentes / total) * 100) : null);

// Inicio del apoderado: resumen de cada pupilo (promedio, asistencia y última anotación)
router.get('/apoderado/resumen', requiereRol('Apoderado'), async (req, res) => {
    const { rows: pupilos } = await pool.query(
        `SELECT a.id, a.nombre, c.nombre AS curso FROM apoderado_alumno aa
         JOIN alumnos a ON a.id = aa.alumno_id JOIN cursos c ON c.id = a.curso_id
         WHERE aa.usuario_id = $1 ORDER BY a.nombre`,
        [req.user.id]
    );
    const datos = [];
    for (const p of pupilos) {
        const notas = (await pool.query('SELECT nota::float8 AS nota FROM calificaciones WHERE alumno_id = $1', [p.id])).rows.map((r) => r.nota);
        const dias = (await pool.query('SELECT estado FROM asistencia WHERE alumno_id = $1', [p.id])).rows;
        const ultima = (
            await pool.query(
                "SELECT tipo, descripcion, to_char(fecha, 'YYYY-MM-DD') AS fecha FROM anotaciones WHERE alumno_id = $1 ORDER BY fecha DESC, id DESC LIMIT 1",
                [p.id]
            )
        ).rows[0];
        datos.push({
            ...p,
            promedio: promedio(notas),
            asistencia: porcentaje(dias.filter((d) => d.estado === 'presente' || d.estado === 'atrasado').length, dias.length),
            ultimaAnotacion: ultima ?? null,
        });
    }
    res.json({ estado: 'Éxito', datos });
});

// Dirección: indicadores agregados por curso, sin datos individuales de alumnos (mínimo privilegio)
router.get('/direccion/resumen', requiereRol('Administrador'), async (req, res) => {
    const { rows } = await pool.query(
        `SELECT c.id, c.nombre,
            (SELECT COUNT(*)::int FROM alumnos a WHERE a.curso_id = c.id) AS alumnos,
            (SELECT AVG(cal.nota)::float8 FROM calificaciones cal JOIN alumnos a ON a.id = cal.alumno_id WHERE a.curso_id = c.id) AS promedio,
            (SELECT COUNT(*)::int FROM asistencia s JOIN alumnos a ON a.id = s.alumno_id WHERE a.curso_id = c.id) AS dias_registrados,
            (SELECT COUNT(*)::int FROM asistencia s JOIN alumnos a ON a.id = s.alumno_id
              WHERE a.curso_id = c.id AND s.estado IN ('presente', 'atrasado')) AS dias_presentes,
            (SELECT COUNT(*)::int FROM alertas al JOIN alumnos a ON a.id = al.alumno_id
              WHERE a.curso_id = c.id AND al.resuelta_en IS NULL AND al.tipo = 'promedio') AS alertas_promedio,
            (SELECT COUNT(*)::int FROM alertas al JOIN alumnos a ON a.id = al.alumno_id
              WHERE a.curso_id = c.id AND al.resuelta_en IS NULL AND al.tipo = 'asistencia') AS alertas_asistencia,
            (SELECT COUNT(DISTINCT al.alumno_id)::int FROM alertas al JOIN alumnos a ON a.id = al.alumno_id
              WHERE a.curso_id = c.id AND al.resuelta_en IS NULL) AS alumnos_con_alerta
         FROM cursos c ORDER BY c.nombre`
    );
    const cursos = rows.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        alumnos: c.alumnos,
        promedio: c.promedio === null ? null : Math.round(c.promedio * 10) / 10,
        asistencia: porcentaje(c.dias_presentes, c.dias_registrados),
        alertasPromedio: c.alertas_promedio,
        alertasAsistencia: c.alertas_asistencia,
        alumnosConAlerta: c.alumnos_con_alerta,
    }));
    const suma = (k) => rows.reduce((s, c) => s + c[k], 0);
    res.json({
        estado: 'Éxito',
        colegio: {
            cursos: rows.length,
            alumnos: suma('alumnos'),
            asistencia: porcentaje(suma('dias_presentes'), suma('dias_registrados')),
            alumnosConAlerta: suma('alumnos_con_alerta'),
        },
        datos: cursos,
    });
});

module.exports = router;
