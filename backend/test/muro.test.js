const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { pool, token, api } = require('./helpers');

let profesor, apoderado, apoderado2;
before(async () => {
    await pool.ready;
    [profesor, apoderado, apoderado2] = await Promise.all([token('profesor'), token('apoderado'), token('apoderado2')]);
});

test('T3: el profesor ve quiénes confirmaron un anuncio y quiénes faltan', async () => {
    const creado = await api(profesor).post('/api/cursos/1/anuncios', { titulo: 'Reunión de apoderados', contenido: 'Jueves 18:00 en la sala.' });
    assert.equal(creado.status, 201);
    const id = creado.body.id;

    assert.equal((await api(apoderado).post(`/api/anuncios/${id}/confirmar`)).status, 200);

    const res = await api(profesor).get(`/api/anuncios/${id}/confirmaciones`);
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2); // curso 1: Carolina Rojas y Luis Fuentes
    assert.equal(res.body.confirmados, 1);
    assert.equal(res.body.pendientes, 1);
    assert.equal(res.body.datos.find((a) => a.nombre === 'Carolina Rojas').confirmado, true);
    assert.equal(res.body.datos.find((a) => a.nombre === 'Luis Fuentes').confirmado, false);

    const anuncio = (await api(profesor).get('/api/cursos/1/anuncios')).body.datos.find((a) => a.id === id);
    assert.equal(anuncio.confirmaciones, 1);
    assert.equal(anuncio.total_apoderados, 2);
});

test('T3: un apoderado no puede ver el detalle de confirmaciones (403)', async () => {
    assert.equal((await api(apoderado).get('/api/anuncios/1/confirmaciones')).status, 403);
});

test('confirmar dos veces no duplica la confirmación', async () => {
    await api(apoderado2).post('/api/anuncios/1/confirmar');
    await api(apoderado2).post('/api/anuncios/1/confirmar');
    const res = await api(profesor).get('/api/anuncios/1/confirmaciones');
    assert.equal(res.body.datos.filter((a) => a.nombre === 'Luis Fuentes').length, 1);
});

test('un apoderado no ve el muro de un curso donde no tiene pupilos (403)', async () => {
    assert.equal((await api(apoderado).get('/api/cursos/2/anuncios')).status, 403);
});

test('crear un anuncio queda en la auditoría', async () => {
    const creado = await api(profesor).post('/api/cursos/2/anuncios', { titulo: 'Salida pedagógica', contenido: 'Traer autorización firmada.' });
    const admin = await require('./helpers').token('admin');
    const registros = (await api(admin).get('/api/auditoria?tabla=anuncios')).body.datos;
    assert.ok(registros.some((a) => a.registro_id === creado.body.id));
});
