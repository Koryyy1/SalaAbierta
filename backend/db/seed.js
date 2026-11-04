const bcrypt = require('bcryptjs');

const ROLES = ['Profesor', 'Apoderado', 'Administrador'];
const ASIGNATURAS = ['Matemática', 'Lenguaje', 'Ciencias', 'Historia', 'Inglés', 'Artes Visuales', 'Educación Física'];

// Asignaturas que imparte la profesora de demostración en cada curso.
// También se aplica a bases ya creadas que aún no tienen asignaciones.
const ASIGNACIONES_DEMO = {
    '5° Básico A': ['Matemática', 'Lenguaje', 'Ciencias'],
    '6° Básico B': ['Matemática', 'Ciencias'],
};

async function asignarAsignaturasDemo(db) {
    const { rows: hay } = await db.query('SELECT 1 FROM profesor_asignaturas LIMIT 1');
    if (hay.length) return;
    const { rows: prof } = await db.query("SELECT id FROM usuarios WHERE email = 'profesor@salaabierta.cl'");
    if (!prof.length) return;
    for (const [curso, asignaturas] of Object.entries(ASIGNACIONES_DEMO)) {
        for (const asignatura of asignaturas) {
            await db.query(
                `INSERT INTO profesor_asignaturas (usuario_id, curso_id, asignatura_id)
                 SELECT $1, c.id, a.id FROM cursos c, asignaturas a WHERE c.nombre = $2 AND a.nombre = $3
                 ON CONFLICT DO NOTHING`,
                [prof[0].id, curso, asignatura]
            );
        }
    }
}

// Fecha AAAA-MM-DD de hace n días, en la zona horaria del colegio (la misma que usa la API para "hoy")
function diasAtras(n) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: process.env.ZONA_HORARIA || 'America/Santiago' });
    const d = new Date(`${hoy}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
}

// Datos sintéticos (mock data) para demostrar el PMV. Solo se cargan si no hay usuarios.
module.exports = async function seed(db) {
    for (const nombre of ROLES) {
        await db.query(
            'INSERT INTO roles (nombre) SELECT $1::varchar WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = $1::varchar)',
            [nombre]
        );
    }

    for (const nombre of ASIGNATURAS) {
        await db.query('INSERT INTO asignaturas (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', [nombre]);
    }

    const { rows: existentes } = await db.query('SELECT 1 FROM usuarios LIMIT 1');
    if (existentes.length) return asignarAsignaturasDemo(db);

    const rolId = async (nombre) => (await db.query('SELECT id FROM roles WHERE nombre = $1', [nombre])).rows[0].id;
    const insertar = async (sql, params) => (await db.query(sql + ' RETURNING id', params)).rows[0].id;

    const usuario = async (nombre, email, password, rol) =>
        insertar('INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES ($1, $2, $3, $4)', [
            nombre,
            email,
            bcrypt.hashSync(password, 10),
            await rolId(rol),
        ]);

    const profesor = await usuario('Marcela Soto', 'profesor@salaabierta.cl', 'profesor123', 'Profesor');
    const apoderado1 = await usuario('Carolina Rojas', 'apoderado@salaabierta.cl', 'apoderado123', 'Apoderado');
    const apoderado2 = await usuario('Luis Fuentes', 'apoderado2@salaabierta.cl', 'apoderado123', 'Apoderado');
    await usuario('Administrador', 'admin@salaabierta.cl', 'admin123', 'Administrador');

    const curso = await insertar('INSERT INTO cursos (nombre) VALUES ($1)', ['5° Básico A']);
    const curso2 = await insertar('INSERT INTO cursos (nombre) VALUES ($1)', ['6° Básico B']);
    await db.query('INSERT INTO profesor_cursos (usuario_id, curso_id) VALUES ($1, $2), ($1, $3)', [
        profesor,
        curso,
        curso2,
    ]);

    const alumno = (nombre, cursoId) => insertar('INSERT INTO alumnos (nombre, curso_id) VALUES ($1, $2)', [nombre, cursoId]);
    const sofia = await alumno('Sofía Rojas', curso);
    const mateo = await alumno('Mateo Fuentes', curso);
    const josefa = await alumno('Josefa Fuentes', curso2);
    const benjamin = await alumno('Benjamín Pérez', curso);
    const antonia = await alumno('Antonia Muñoz', curso);

    await db.query('INSERT INTO apoderado_alumno (usuario_id, alumno_id) VALUES ($1, $2), ($3, $4), ($3, $5)', [
        apoderado1,
        sofia,
        apoderado2,
        mateo,
        josefa,
    ]);

    // 12 días de asistencia; los días no listados son "presente". Benjamín queda bajo el 85% (alerta HU010).
    const excepciones = new Map([
        [sofia, { 4: 'atrasado' }],
        [mateo, { 3: 'ausente', 7: 'atrasado' }],
        [benjamin, { 2: 'ausente', 5: 'ausente', 6: 'ausente', 9: 'ausente', 10: 'justificado' }],
        [antonia, { 8: 'justificado' }],
        [josefa, { 1: 'atrasado', 11: 'ausente' }],
    ]);
    for (const [alumnoId, dias] of excepciones) {
        for (let d = 1; d <= 12; d++) {
            await db.query('INSERT INTO asistencia (alumno_id, fecha, estado) VALUES ($1, $2, $3)', [alumnoId, diasAtras(d), dias[d] ?? 'presente']);
        }
    }

    const notas = [
        // Orden: Sofía, Mateo, Benjamín, Antonia, Josefa. Benjamín queda con promedio bajo 4,0 (alerta HU010).
        ['Matemática', 'Prueba 1: Fracciones', [6.5, 5.8, 3.6, 6.0, 5.2]],
        ['Lenguaje', 'Control de lectura', [6.0, 6.8, 4.3, 4.5, 6.2]],
        ['Ciencias', 'Informe experimento', [5.5, 6.1, 3.8, 5.9, 6.6]],
    ];
    for (const [asignatura, descripcion, valores] of notas) {
        for (const [i, alumnoId] of [sofia, mateo, benjamin, antonia, josefa].entries()) {
            if (alumnoId === josefa && !ASIGNACIONES_DEMO['6° Básico B'].includes(asignatura)) continue;
            await db.query(
                'INSERT INTO calificaciones (alumno_id, asignatura, descripcion, nota, fecha, profesor_id) VALUES ($1, $2, $3, $4, $5, $6)',
                [alumnoId, asignatura, descripcion, valores[i], diasAtras(10 + i), profesor]
            );
        }
    }

    await db.query(
        `INSERT INTO anotaciones (alumno_id, tipo, descripcion, fecha, profesor_id) VALUES
         ($1, 'positiva', 'Destacó por su participación y ayuda a sus compañeros.', $3, $4),
         ($2, 'negativa', 'No trajo los materiales solicitados para la clase de Artes.', $3, $4)`,
        [sofia, mateo, diasAtras(3), profesor]
    );

    await db.query('INSERT INTO anuncios (curso_id, autor_id, titulo, contenido) VALUES ($1, $2, $3, $4)', [
        curso,
        profesor,
        'Materiales para Artes Visuales',
        'Se solicita traer para el jueves: cartulina de colores, tijeras y pegamento en barra. ¡Gracias por su colaboración!',
    ]);

    await asignarAsignaturasDemo(db);
};
