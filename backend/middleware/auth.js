const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-sala-abierta-cambiar-en-produccion';
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET no definido: usando secreto de desarrollo.');
}

function firmarToken(usuario) {
    return jwt.sign({ sub: usuario.id, rol: usuario.rol }, JWT_SECRET, { expiresIn: '12h' });
}

// Valida el token JWT y adjunta req.user = { id, nombre, rol }
async function autenticar(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ estado: 'Error', mensaje: 'Token requerido.' });

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const { rows } = await pool.query(
            'SELECT u.id, u.nombre, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = $1',
            [payload.sub]
        );
        if (!rows.length) return res.status(401).json({ estado: 'Error', mensaje: 'Usuario no válido.' });
        req.user = rows[0];
        next();
    } catch {
        res.status(401).json({ estado: 'Error', mensaje: 'Token inválido o expirado.' });
    }
}

// RBAC: restringe una ruta a uno o más roles
const requiereRol = (...roles) => (req, res, next) =>
    roles.includes(req.user.rol)
        ? next()
        : res.status(403).json({ estado: 'Error', mensaje: 'No tienes permisos para esta acción.' });

// Filtro de seguridad: un profesor solo accede a sus cursos y un apoderado solo a sus pupilos
async function puedeVerCurso(user, cursoId) {
    if (user.rol === 'Profesor') {
        const { rows } = await pool.query('SELECT 1 FROM profesor_cursos WHERE usuario_id = $1 AND curso_id = $2', [user.id, cursoId]);
        return rows.length > 0;
    }
    if (user.rol === 'Apoderado') {
        const { rows } = await pool.query(
            'SELECT 1 FROM apoderado_alumno aa JOIN alumnos a ON a.id = aa.alumno_id WHERE aa.usuario_id = $1 AND a.curso_id = $2',
            [user.id, cursoId]
        );
        return rows.length > 0;
    }
    return user.rol === 'Administrador';
}

async function puedeVerAlumno(user, alumnoId) {
    if (user.rol === 'Profesor') {
        const { rows } = await pool.query(
            'SELECT 1 FROM alumnos a JOIN profesor_cursos pc ON pc.curso_id = a.curso_id WHERE a.id = $1 AND pc.usuario_id = $2',
            [alumnoId, user.id]
        );
        return rows.length > 0;
    }
    if (user.rol === 'Apoderado') {
        const { rows } = await pool.query('SELECT 1 FROM apoderado_alumno WHERE usuario_id = $1 AND alumno_id = $2', [user.id, alumnoId]);
        return rows.length > 0;
    }
    return user.rol === 'Administrador';
}

// Valida que :id sea entero y que el usuario tenga acceso al recurso
const guardia = (nombreParam, verificador) => async (req, res, next) => {
    const id = Number(req.params[nombreParam]);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ estado: 'Error', mensaje: 'Identificador inválido.' });
    try {
        if (!(await verificador(req.user, id))) {
            return res.status(403).json({ estado: 'Error', mensaje: 'No tienes acceso a este recurso.' });
        }
        req[nombreParam] = id;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    firmarToken,
    autenticar,
    requiereRol,
    puedeVerCurso,
    puedeVerAlumno,
    guardiaCurso: guardia('cursoId', puedeVerCurso),
    guardiaAlumno: guardia('alumnoId', puedeVerAlumno),
};
