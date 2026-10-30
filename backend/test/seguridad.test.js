const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { pool, token, api } = require('./helpers');

let profesor, apoderado, admin;
before(async () => {
    await pool.ready;
    [profesor, apoderado, admin] = await Promise.all([token('profesor'), token('apoderado'), token('admin')]);
});

test('el apoderado ve las notas de su pupilo', async () => {
    const res = await api(apoderado).get('/api/alumnos/1/calificaciones');
    assert.equal(res.status, 200);
    assert.ok(res.body.datos.length > 0);
});

test('el apoderado no ve las notas de un alumno que no es su pupilo (403)', async () => {
    assert.equal((await api(apoderado).get('/api/alumnos/2/calificaciones')).status, 403);
});

test('el apoderado no puede registrar notas (403)', async () => {
    const res = await api(apoderado).post('/api/alumnos/1/calificaciones', { asignatura: 'Lenguaje', nota: 7 });
    assert.equal(res.status, 403);
});

test('T4: el Administrador no lee datos de alumnos ni muros (403)', async () => {
    assert.equal((await api(admin).get('/api/alumnos/1/calificaciones')).status, 403);
    assert.equal((await api(admin).get('/api/alumnos/1/asistencia')).status, 403);
    assert.equal((await api(admin).get('/api/cursos/1/anuncios')).status, 403);
});

test('solo el Administrador consulta la auditoría', async () => {
    assert.equal((await api(admin).get('/api/auditoria')).status, 200);
    assert.equal((await api(profesor).get('/api/auditoria')).status, 403);
    assert.equal((await api(apoderado).get('/api/auditoria')).status, 403);
});

test('rechaza identificadores inválidos (400)', async () => {
    assert.equal((await api(profesor).get('/api/alumnos/abc/calificaciones')).status, 400);
});
