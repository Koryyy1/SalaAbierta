const bcrypt = require('bcryptjs');

const ROLES = ['Profesor', 'Apoderado', 'Administrador'];

function diasAtras(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
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

    const { rows: existentes } = await db.query('SELECT 1 FROM usuarios LIMIT 1');
    if (existentes.length) return;

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

    const estados = ['presente', 'presente', 'presente', 'atrasado', 'presente', 'ausente', 'presente', 'justificado'];
    for (const [i, alumnoId] of [sofia, mateo, benjamin, antonia, josefa].entries()) {
        for (let d = 1; d <= 8; d++) {
            await db.query('INSERT INTO asistencia (alumno_id, fecha, estado) VALUES ($1, $2, $3)', [
                alumnoId,
                diasAtras(d),
                estados[(d + i * 3) % estados.length],
            ]);
        }
    }

    const notas = [
        ['Matemática', 'Prueba 1: Fracciones', [6.5, 5.8, 4.9, 6.0, 5.2]],
        ['Lenguaje', 'Control de lectura', [6.0, 6.8, 5.5, 4.5, 6.2]],
        ['Ciencias', 'Informe experimento', [5.5, 6.1, 4.2, 5.9, 6.6]],
    ];
    for (const [asignatura, descripcion, valores] of notas) {
        for (const [i, alumnoId] of [sofia, mateo, benjamin, antonia, josefa].entries()) {
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
};
