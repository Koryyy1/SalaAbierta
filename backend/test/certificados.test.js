const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { pool, token, api } = require('./helpers');

let profesor, apoderado, admin;
before(async () => {
    await pool.ready;
    [profesor, apoderado, admin] = await Promise.all([token('profesor'), token('apoderado'), token('admin')]);
});

const emitir = (tk, alumnoId, tipo) => api(tk).post(`/api/alumnos/${alumnoId}/certificados`, { tipo });

test('certificados: el apoderado emite un certificado de alumno regular con código de verificación', async () => {
    const res = await emitir(apoderado, 1, 'alumno_regular');
    assert.equal(res.status, 201);
    assert.match(res.body.dato.codigo, /^SA-\d{4}-[A-Z2-9]{8}$/);
    assert.equal(res.body.dato.contenido.alumno, 'Sofía Rojas');
    assert.equal(res.body.dato.contenido.curso, '5° Básico A');
    assert.equal(res.body.dato.contenido.asignaturas, undefined);
});

test('certificados: pedir el mismo certificado el mismo día entrega el ya emitido', async () => {
    const primero = await emitir(apoderado, 1, 'asistencia');
    const segundo = await emitir(apoderado, 1, 'asistencia');
    assert.equal(primero.status, 201);
    assert.equal(segundo.status, 200);
    assert.equal(segundo.body.reutilizado, true);
    assert.equal(segundo.body.dato.codigo, primero.body.dato.codigo);
});

test('certificados: el de notas y el de asistencia usan los mismos valores que las secciones de la app', async () => {
    const notas = (await api(apoderado).get('/api/alumnos/1/calificaciones')).body;
    const asistencia = (await api(apoderado).get('/api/alumnos/1/asistencia')).body;
    const certNotas = (await emitir(apoderado, 1, 'notas')).body.dato.contenido;
    const certAsistencia = (await emitir(apoderado, 1, 'asistencia')).body.dato.contenido;
    assert.equal(certNotas.promedio, notas.promedio);
    assert.equal(certNotas.asignaturas.reduce((s, a) => s + a.cantidad, 0), notas.datos.length);
    assert.equal(certAsistencia.porcentaje, asistencia.porcentaje);
    assert.equal(certAsistencia.dias, asistencia.datos.length);
});

test('certificados: solo el apoderado del estudiante puede emitirlos y listarlos', async () => {
    assert.equal((await emitir(apoderado, 2, 'alumno_regular')).status, 403);
    assert.equal((await emitir(profesor, 1, 'alumno_regular')).status, 403);
    assert.equal((await emitir(admin, 1, 'alumno_regular')).status, 403);
    assert.equal((await emitir(apoderado, 1, 'titulo')).status, 400);
    assert.equal((await api(apoderado).get('/api/alumnos/2/certificados')).status, 403);
    const lista = await api(apoderado).get('/api/alumnos/1/certificados');
    assert.equal(lista.status, 200);
    assert.ok(lista.body.datos.length >= 1);
});

test('certificados: cada emisión queda en la auditoría', async () => {
    const { codigo } = (await emitir(apoderado, 1, 'alumno_regular')).body.dato;
    const res = await api(admin).get('/api/auditoria?tabla=certificados');
    const registro = res.body.datos.find((r) => r.datos_despues.codigo === codigo);
    assert.ok(registro, 'la emisión debe quedar registrada');
    assert.equal(registro.usuario, 'Carolina Rojas');
    assert.equal(registro.alumno, 'Sofía Rojas');
});

test('certificados: la dirección verifica un código sin ver notas ni asistencia', async () => {
    const { codigo } = (await emitir(apoderado, 1, 'notas')).body.dato;
    const res = await api(admin).get(`/api/certificados/verificar/${codigo.toLowerCase()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.valido, true);
    assert.deepEqual(Object.keys(res.body.dato).sort(), ['alumno', 'codigo', 'curso', 'emitido_en', 'solicitado_por', 'tipo']);
    assert.equal(res.body.dato.alumno, 'Sofía Rojas');

    assert.equal((await api(admin).get('/api/certificados/verificar/SA-2026-AAAAAAAA')).status, 404);
    assert.equal((await api(admin).get('/api/certificados/verificar/123')).status, 400);
    assert.equal((await api(apoderado).get(`/api/certificados/verificar/${codigo}`)).status, 403);
});
