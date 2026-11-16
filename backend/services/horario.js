// Horario de clases de un curso. Lo usan la sección Horario de la app y Sali.
const pool = require('../config/db');

const ZONA_HORARIA = process.env.ZONA_HORARIA || 'America/Santiago';
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// Día de la semana en la zona horaria del colegio: 1 = lunes … 7 = domingo
function diaDeHoy(ahora = new Date()) {
    const nombre = ahora.toLocaleDateString('en-US', { timeZone: ZONA_HORARIA, weekday: 'short' });
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(nombre) + 1;
}

// Bloques del curso ordenados por día y hora, con el profesor que imparte la asignatura (si está asignado)
async function horarioDeCurso(cursoId) {
    const { rows } = await pool.query(
        `SELECT h.dia::int AS dia, h.bloque::int AS bloque, h.hora_inicio, h.hora_fin, a.nombre AS asignatura,
                (SELECT u.nombre FROM profesor_asignaturas pa JOIN usuarios u ON u.id = pa.usuario_id
                 WHERE pa.curso_id = h.curso_id AND pa.asignatura_id = h.asignatura_id ORDER BY u.nombre LIMIT 1) AS profesor
         FROM horario h JOIN asignaturas a ON a.id = h.asignatura_id
         WHERE h.curso_id = $1 ORDER BY h.dia, h.bloque`,
        [cursoId]
    );
    return rows;
}

// Une los bloques seguidos de la misma asignatura: "Matemática 08:00 a 09:30"
function resumenDelDia(bloques, dia) {
    const partes = [];
    for (const b of bloques.filter((x) => x.dia === dia)) {
        const ultima = partes[partes.length - 1];
        if (ultima && ultima.asignatura === b.asignatura && ultima.hora_fin === b.hora_inicio) ultima.hora_fin = b.hora_fin;
        else partes.push({ asignatura: b.asignatura, hora_inicio: b.hora_inicio, hora_fin: b.hora_fin });
    }
    return partes;
}

module.exports = { DIAS, diaDeHoy, horarioDeCurso, resumenDelDia };
