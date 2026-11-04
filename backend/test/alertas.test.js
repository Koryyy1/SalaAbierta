const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { app, pool, request, token, api } = require('./helpers');
const { evaluar } = require('../services/alertas');

let profesor, apoderado, admin;
const UMBRALES = { promedio_minimo: 4.0, asistencia_minima: 85, notas_minimas: 2, dias_minimos: 10 };
const BENJAMIN = 4; // datos de demostración: promedio 3,9 y asistencia 58 %

before(async () => {
    await pool.ready;
    [profesor, apoderado, admin] = await Promise.all([token('profesor'), token('apoderado'), token('admin')]);
});

const alertasDe = async (alumnoId) => (await api(profesor).get('/api/alertas')).body.datos.filter((a) => a.alumno_id === alumnoId);

test('HU010: casos límite del cálculo (en el umbral no hay alerta; sin datos suficientes tampoco)', () => {
    const base = { cantidadNotas: 3, promedio: 5.0, cantidadDias: 12, asistencia: 90 };
    assert.equal(evaluar({ ...base, promedio: 4.0 }, UMBRALES).promedio, null);
    assert.deepEqual(evaluar({ ...base, promedio: 3.9 }, UMBRALES).promedio, { valor: 3.9, umbral: 4.0 });
    assert.equal(evaluar({ ...base, cantidadNotas: 1, promedio: 2.0 }, UMBRALES).promedio, null);
    assert.equal(evaluar({ ...base, asistencia: 85 }, UMBRALES).asistencia, null);
    assert.deepEqual(evaluar({ ...base, asistencia: 84 }, UMBRALES).asistencia, { valor: 84, umbral: 85 });
    assert.equal(evaluar({ ...base, cantidadDias: 9, asistencia: 50 }, UMBRALES).asistencia, null);
    assert.equal(evaluar({ cantidadNotas: 0, promedio: null, cantidadDias: 0, asistencia: null }, UMBRALES).promedio, null);
});

test('HU010: el profesor ve las alertas de promedio y asistencia de sus cursos', async () => {
    const alertas = await alertasDe(BENJAMIN);
    const promedio = alertas.find((a) => a.tipo === 'promedio');
    const asistencia = alertas.find((a) => a.tipo === 'asistencia');
    assert.equal(promedio.valor, 3.9);
    assert.equal(promedio.umbral, 4);
    assert.equal(asistencia.valor, 58);
    assert.equal(asistencia.alumno, 'Benjamín Pérez');
    // Los alumnos sobre el umbral no tienen alertas
    assert.equal((await alertasDe(1)).length, 0);
});

test('HU010: no se duplican alertas para la misma condición', async () => {
    await api(profesor).post(`/api/alumnos/${BENJAMIN}/calificaciones`, { asignatura: 'Historia', descripcion: 'Control', nota: 3.5 });
    const promedio = (await alertasDe(BENJAMIN)).filter((a) => a.tipo === 'promedio');
    assert.equal(promedio.length, 1);
    assert.equal(promedio[0].valor, 3.8); // se actualiza el valor de la misma alerta
});

test('HU010: la alerta se resuelve cuando el estudiante se recupera', async () => {
    for (let i = 0; i < 4; i++) {
        await api(profesor).post(`/api/alumnos/${BENJAMIN}/calificaciones`, { asignatura: 'Lenguaje', descripcion: `Recuperación ${i + 1}`, nota: 7 });
    }
    const alertas = await alertasDe(BENJAMIN);
    assert.equal(alertas.some((a) => a.tipo === 'promedio'), false);
    assert.equal(alertas.some((a) => a.tipo === 'asistencia'), true);
    const { rows } = await pool.query("SELECT resuelta_en FROM alertas WHERE alumno_id = $1 AND tipo = 'promedio'", [BENJAMIN]);
    assert.ok(rows.length >= 1 && rows.every((r) => r.resuelta_en !== null));
});

test('HU010: apoderados y profesores de otros cursos reciben 403', async () => {
    assert.equal((await api(apoderado).get('/api/alertas')).status, 403);
    assert.equal((await api(apoderado).get('/api/cursos/1/alertas')).status, 403);

    const rol = (await pool.query("SELECT id FROM roles WHERE nombre = 'Profesor'")).rows[0].id;
    await pool.query('INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES ($1, $2, $3, $4)', [
        'Profesor Sin Curso',
        'otro.profesor@salaabierta.cl',
        bcrypt.hashSync('otro123', 4),
        rol,
    ]);
    const login = await request(app).post('/api/auth/login').send({ email: 'otro.profesor@salaabierta.cl', password: 'otro123' });
    const otro = login.body.token;
    assert.equal((await api(otro).get('/api/cursos/1/alertas')).status, 403);
    assert.deepEqual((await api(otro).get('/api/alertas')).body.datos, []);
});

test('HU010: el Administrador configura los umbrales y las alertas se recalculan', async () => {
    const actual = await api(admin).get('/api/umbrales');
    assert.equal(actual.status, 200);
    assert.deepEqual(actual.body.dato, UMBRALES);

    assert.equal((await api(profesor).put('/api/umbrales', { asistencia_minima: 50 })).status, 403);
    assert.equal((await api(admin).put('/api/umbrales', { asistencia_minima: 120 })).status, 400);
    assert.equal((await api(admin).put('/api/umbrales', { promedio_minimo: 4.25 })).status, 400);

    const cambio = await api(admin).put('/api/umbrales', { asistencia_minima: 50 });
    assert.equal(cambio.status, 200);
    assert.equal(cambio.body.dato.asistencia_minima, 50);
    assert.equal((await alertasDe(BENJAMIN)).some((a) => a.tipo === 'asistencia'), false); // 58 % ya no está bajo 50 %

    const auditoria = (await api(admin).get('/api/auditoria?tabla=umbrales_alerta')).body.datos;
    assert.equal(auditoria[0].datos_antes.asistencia_minima, 85);
    assert.equal(auditoria[0].datos_despues.asistencia_minima, 50);
});
