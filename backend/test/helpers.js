// Configuración común de las pruebas: base de datos PGlite en memoria con los datos de demostración
process.env.NODE_ENV = 'test';
process.env.PGLITE_DIR = 'memory://';
process.env.JWT_SECRET = 'secreto-de-pruebas';
delete process.env.DB_HOST;

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

const USUARIOS = {
    profesor: ['profesor@salaabierta.cl', 'profesor123'],
    apoderado: ['apoderado@salaabierta.cl', 'apoderado123'], // pupila: Sofía Rojas (alumno 1, curso 1)
    apoderado2: ['apoderado2@salaabierta.cl', 'apoderado123'], // pupilos: Mateo (alumno 2, curso 1) y Josefa (alumno 3, curso 2)
    admin: ['admin@salaabierta.cl', 'admin123'],
};

async function token(quien) {
    const [email, password] = USUARIOS[quien];
    const res = await request(app).post('/api/auth/login').send({ email, password });
    if (res.status !== 200) throw new Error(`No se pudo iniciar sesión como ${quien}: ${res.status}`);
    return res.body.token;
}

// Cliente HTTP autenticado: api(token).get('/api/...')
const api = (tk) => ({
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${tk}`),
    post: (url, body) => request(app).post(url).set('Authorization', `Bearer ${tk}`).send(body),
    put: (url, body) => request(app).put(url).set('Authorization', `Bearer ${tk}`).send(body),
});

// Fecha AAAA-MM-DD en la zona horaria del colegio, desplazada n días desde hoy
function fecha(n = 0) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: process.env.ZONA_HORARIA || 'America/Santiago' });
    const d = new Date(`${hoy}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

module.exports = { app, pool, request, token, api, fecha };
