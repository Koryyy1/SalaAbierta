const express = require('express');
const pool = require('../config/db');
const { autenticar, requiereRol, puedeVerCurso, guardiaCurso } = require('../middleware/auth');
const { registrarAuditoria } = require('../services/audit');

const router = express.Router();
router.use(autenticar);

const error = (res, status, mensaje) => res.status(status).json({ estado: 'Error', mensaje });
const texto = (v, max) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);
const TS = "to_char(%s, 'YYYY-MM-DD\"T\"HH24:MI:SS')";

// Muro del curso: anuncios con conteo de confirmaciones, comentarios y estado del usuario
router.get('/cursos/:cursoId/anuncios', guardiaCurso, async (req, res) => {
    const { rows: anuncios } = await pool.query(
        `SELECT n.id, n.titulo, n.contenido, ${TS.replace('%s', 'n.creado_en')} AS creado_en, u.nombre AS autor,
                (SELECT COUNT(*)::int FROM anuncio_confirmaciones c WHERE c.anuncio_id = n.id) AS confirmaciones,
                EXISTS (SELECT 1 FROM anuncio_confirmaciones c WHERE c.anuncio_id = n.id AND c.usuario_id = $2) AS confirmado,
                (SELECT COUNT(DISTINCT aa.usuario_id)::int FROM apoderado_alumno aa JOIN alumnos al ON al.id = aa.alumno_id
                 WHERE al.curso_id = n.curso_id) AS total_apoderados
         FROM anuncios n JOIN usuarios u ON u.id = n.autor_id
         WHERE n.curso_id = $1 ORDER BY n.creado_en DESC, n.id DESC`,
        [req.cursoId, req.user.id]
    );
    const { rows: comentarios } = await pool.query(
        `SELECT m.id, m.anuncio_id, m.contenido, ${TS.replace('%s', 'm.creado_en')} AS creado_en, u.nombre AS autor
         FROM anuncio_comentarios m JOIN usuarios u ON u.id = m.usuario_id
         JOIN anuncios n ON n.id = m.anuncio_id WHERE n.curso_id = $1 ORDER BY m.id`,
        [req.cursoId]
    );
    const datos = anuncios.map((a) => ({ ...a, comentarios: comentarios.filter((c) => c.anuncio_id === a.id) }));
    res.json({ estado: 'Éxito', datos });
});

router.post('/cursos/:cursoId/anuncios', requiereRol('Profesor'), guardiaCurso, async (req, res) => {
    const titulo = texto(req.body?.titulo, 160);
    const contenido = texto(req.body?.contenido, 2000);
    if (!titulo || !contenido) return error(res, 400, 'Título y contenido son obligatorios.');

    const id = await pool.transaction(async (tx) => {
        const { rows } = await tx.query(
            'INSERT INTO anuncios (curso_id, autor_id, titulo, contenido) VALUES ($1, $2, $3, $4) RETURNING id',
            [req.cursoId, req.user.id, titulo, contenido]
        );
        await registrarAuditoria(
            { usuarioId: req.user.id, accion: 'INSERT', tabla: 'anuncios', registroId: rows[0].id, despues: { curso_id: req.cursoId, titulo, contenido } },
            tx
        );
        return rows[0].id;
    });
    res.status(201).json({ estado: 'Éxito', id });
});

// Carga el anuncio y valida que el usuario tenga acceso a su curso
async function anuncioAccesible(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return error(res, 400, 'Identificador inválido.'), null;
    const { rows } = await pool.query('SELECT id, curso_id FROM anuncios WHERE id = $1', [id]);
    if (!rows.length || !(await puedeVerCurso(req.user, rows[0].curso_id))) {
        return error(res, 404, 'Anuncio no encontrado.'), null;
    }
    return rows[0];
}

// HU008: el profesor ve qué apoderados del curso confirmaron la recepción del anuncio y cuáles faltan
router.get('/anuncios/:id/confirmaciones', requiereRol('Profesor'), async (req, res) => {
    const anuncio = await anuncioAccesible(req, res);
    if (!anuncio) return;
    const { rows } = await pool.query(
        `SELECT u.id, u.nombre,
                string_agg(DISTINCT al.nombre, ', ' ORDER BY al.nombre) AS pupilos,
                ${TS.replace('%s', 'c.creado_en')} AS confirmado_en
         FROM apoderado_alumno aa
         JOIN alumnos al ON al.id = aa.alumno_id AND al.curso_id = $1
         JOIN usuarios u ON u.id = aa.usuario_id
         LEFT JOIN anuncio_confirmaciones c ON c.anuncio_id = $2 AND c.usuario_id = u.id
         GROUP BY u.id, u.nombre, c.creado_en
         ORDER BY (c.creado_en IS NULL) DESC, u.nombre`,
        [anuncio.curso_id, anuncio.id]
    );
    const datos = rows.map((r) => ({ ...r, confirmado: r.confirmado_en !== null }));
    const confirmados = datos.filter((r) => r.confirmado).length;
    res.json({ estado: 'Éxito', total: datos.length, confirmados, pendientes: datos.length - confirmados, datos });
});

router.post('/anuncios/:id/confirmar', requiereRol('Apoderado'), async (req, res) => {
    const anuncio = await anuncioAccesible(req, res);
    if (!anuncio) return;
    await pool.query(
        'INSERT INTO anuncio_confirmaciones (anuncio_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [anuncio.id, req.user.id]
    );
    res.json({ estado: 'Éxito', mensaje: 'Recepción confirmada.' });
});

router.post('/anuncios/:id/comentarios', requiereRol('Apoderado', 'Profesor'), async (req, res) => {
    const anuncio = await anuncioAccesible(req, res);
    if (!anuncio) return;
    const contenido = texto(req.body?.contenido, 500);
    if (!contenido) return error(res, 400, 'El comentario no puede estar vacío.');

    const { rows } = await pool.query(
        'INSERT INTO anuncio_comentarios (anuncio_id, usuario_id, contenido) VALUES ($1, $2, $3) RETURNING id',
        [anuncio.id, req.user.id, contenido]
    );
    res.status(201).json({ estado: 'Éxito', id: rows[0].id });
});

module.exports = router;
