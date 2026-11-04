// HU010 · Alertas tempranas de rendimiento.
// Usa los mismos cálculos que ve el apoderado: promedio simple de las notas y porcentaje de días
// presente o atrasado sobre los días registrados.
const pool = require('../config/db');

async function leerUmbrales(db = pool) {
    const { rows } = await db.query(
        'SELECT promedio_minimo::float8 AS promedio_minimo, asistencia_minima, notas_minimas, dias_minimos FROM umbrales_alerta WHERE id = 1'
    );
    return rows[0];
}

// Promedio con un decimal (o null) y porcentaje de asistencia entero (o null), como en las pantallas del apoderado
async function indicadores(alumnoId, db = pool) {
    const { rows: notas } = await db.query('SELECT nota::float8 AS nota FROM calificaciones WHERE alumno_id = $1', [alumnoId]);
    const { rows: dias } = await db.query('SELECT estado FROM asistencia WHERE alumno_id = $1', [alumnoId]);
    const presentes = dias.filter((d) => d.estado === 'presente' || d.estado === 'atrasado').length;
    return {
        cantidadNotas: notas.length,
        promedio: notas.length ? Math.round((notas.reduce((s, n) => s + n.nota, 0) / notas.length) * 10) / 10 : null,
        cantidadDias: dias.length,
        asistencia: dias.length ? Math.round((presentes / dias.length) * 100) : null,
    };
}

// Decide qué alertas corresponden. Bajo el umbral = estrictamente menor (en el umbral no hay alerta).
function evaluar(ind, umbrales) {
    return {
        promedio:
            ind.cantidadNotas >= umbrales.notas_minimas && ind.promedio < umbrales.promedio_minimo
                ? { valor: ind.promedio, umbral: umbrales.promedio_minimo }
                : null,
        asistencia:
            ind.cantidadDias >= umbrales.dias_minimos && ind.asistencia < umbrales.asistencia_minima
                ? { valor: ind.asistencia, umbral: umbrales.asistencia_minima }
                : null,
    };
}

// Crea o actualiza la alerta activa si se cumple la condición; si el estudiante se recuperó, la marca como resuelta
async function recalcularAlumno(alumnoId, db = pool, umbrales) {
    const u = umbrales ?? (await leerUmbrales(db));
    const resultado = evaluar(await indicadores(alumnoId, db), u);
    for (const tipo of ['promedio', 'asistencia']) {
        const condicion = resultado[tipo];
        if (condicion) {
            await db.query(
                `INSERT INTO alertas (alumno_id, tipo, valor, umbral) VALUES ($1, $2, $3, $4)
                 ON CONFLICT (alumno_id, tipo) WHERE resuelta_en IS NULL
                 DO UPDATE SET valor = EXCLUDED.valor, umbral = EXCLUDED.umbral`,
                [alumnoId, tipo, condicion.valor, condicion.umbral]
            );
        } else {
            await db.query('UPDATE alertas SET resuelta_en = NOW() WHERE alumno_id = $1 AND tipo = $2 AND resuelta_en IS NULL', [
                alumnoId,
                tipo,
            ]);
        }
    }
}

// Recálculo completo: al iniciar el servidor, una vez al día y al cambiar los umbrales
async function recalcularTodos(db = pool) {
    const umbrales = await leerUmbrales(db);
    const { rows } = await db.query('SELECT id FROM alumnos ORDER BY id');
    for (const { id } of rows) await recalcularAlumno(id, db, umbrales);
    return rows.length;
}

module.exports = { leerUmbrales, indicadores, evaluar, recalcularAlumno, recalcularTodos };
