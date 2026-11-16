const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { pool, token, api } = require('./helpers');

let profesor, apoderado, admin;
before(async () => {
    await pool.ready;
    [profesor, apoderado, admin] = await Promise.all([token('profesor'), token('apoderado'), token('admin')]);
});

test('horario: el apoderado ve el horario semanal del curso de su pupilo', async () => {
    const res = await api(apoderado).get('/api/cursos/1/horario');
    assert.equal(res.status, 200);
    assert.equal(res.body.datos.length, 38); // 8 bloques de lunes a jueves y 6 el viernes
    assert.ok(res.body.hoy >= 1 && res.body.hoy <= 7);
    assert.deepEqual(res.body.datos[0], {
        dia: 1,
        bloque: 1,
        hora_inicio: '08:00',
        hora_fin: '08:45',
        asignatura: 'Matemática',
        profesor: 'Marcela Soto',
    });
    const viernes = res.body.datos.filter((b) => b.dia === 5);
    assert.equal(viernes.at(-1).hora_fin, '13:10');
});

test('horario: el profesor ve el de sus cursos; cada curso tiene su propio horario', async () => {
    const res = await api(profesor).get('/api/cursos/2/horario');
    assert.equal(res.status, 200);
    assert.equal(res.body.datos[0].asignatura, 'Lenguaje');
});

test('horario: no se puede ver el de un curso ajeno ni desde la dirección (403)', async () => {
    assert.equal((await api(apoderado).get('/api/cursos/2/horario')).status, 403);
    assert.equal((await api(admin).get('/api/cursos/1/horario')).status, 403);
    assert.equal((await api(apoderado).get('/api/cursos/abc/horario')).status, 400);
});

test('horario: cargar los datos de demostración dos veces no duplica bloques', async () => {
    await require('../db/seed')({ query: pool.query });
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM horario');
    assert.equal(rows[0].total, 76);
});
