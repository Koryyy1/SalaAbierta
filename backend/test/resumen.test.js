const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { pool, token, api } = require('./helpers');

let profesor, apoderado, apoderado2, admin;
before(async () => {
    await pool.ready;
    [profesor, apoderado, apoderado2, admin] = await Promise.all([token('profesor'), token('apoderado'), token('apoderado2'), token('admin')]);
});

test('el inicio del apoderado resume a su pupilo con los mismos cálculos de las pantallas', async () => {
    const res = await api(apoderado).get('/api/apoderado/resumen');
    assert.equal(res.status, 200);
    assert.equal(res.body.datos.length, 1);
    const sofia = res.body.datos[0];
    assert.equal(sofia.nombre, 'Sofía Rojas');
    assert.equal(sofia.promedio, (await api(apoderado).get('/api/alumnos/1/calificaciones')).body.promedio);
    assert.equal(sofia.asistencia, (await api(apoderado).get('/api/alumnos/1/asistencia')).body.porcentaje);
    assert.equal(sofia.ultimaAnotacion.tipo, 'positiva');
});

test('un apoderado con dos pupilos recibe el resumen de ambos y de nadie más', async () => {
    const nombres = (await api(apoderado2).get('/api/apoderado/resumen')).body.datos.map((p) => p.nombre);
    assert.deepEqual(nombres, ['Josefa Fuentes', 'Mateo Fuentes']);
});

test('la dirección ve indicadores por curso, sin nombres de alumnos', async () => {
    const res = await api(admin).get('/api/direccion/resumen');
    assert.equal(res.status, 200);
    assert.equal(res.body.colegio.cursos, 2);
    assert.equal(res.body.colegio.alumnos, 5);
    const quinto = res.body.datos.find((c) => c.nombre === '5° Básico A');
    assert.equal(quinto.alumnos, 4);
    assert.equal(quinto.alumnosConAlerta, 1); // Benjamín Pérez en los datos de demostración
    assert.equal(quinto.alertasPromedio, 1);
    assert.equal(quinto.alertasAsistencia, 1);
    assert.ok(quinto.asistencia > 0 && quinto.asistencia <= 100);
    assert.equal(res.body.datos.find((c) => c.nombre === '6° Básico B').alumnosConAlerta, 0);
    assert.ok(!JSON.stringify(res.body).includes('Benjamín'), 'no debe incluir nombres de alumnos');
});

test('cada resumen es solo para su rol (403)', async () => {
    assert.equal((await api(profesor).get('/api/apoderado/resumen')).status, 403);
    assert.equal((await api(apoderado).get('/api/direccion/resumen')).status, 403);
    assert.equal((await api(profesor).get('/api/direccion/resumen')).status, 403);
});

test('el usuario de la dirección tiene nombre de persona', async () => {
    assert.equal((await api(admin).get('/api/auth/me')).body.usuario.nombre, 'Patricia Vidal');
});
