const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { pool, token, api, fecha } = require('./helpers');

let profesor, admin;
before(async () => {
    await pool.ready;
    [profesor, admin] = await Promise.all([token('profesor'), token('admin')]);
});

const auditoriaDe = async (tabla) => (await api(admin).get(`/api/auditoria?tabla=${tabla}`)).body.datos;

test('T2: rechaza asistencia en una fecha futura', async () => {
    const res = await api(profesor).put('/api/cursos/1/asistencia', {
        fecha: fecha(1),
        registros: [{ alumno_id: 1, estado: 'presente' }],
    });
    assert.equal(res.status, 400);
    assert.match(res.body.mensaje, /futura/);
});

test('rechaza fechas que no existen en el calendario', async () => {
    const res = await api(profesor).put('/api/cursos/1/asistencia', {
        fecha: '2026-02-30',
        registros: [{ alumno_id: 1, estado: 'presente' }],
    });
    assert.equal(res.status, 400);
});

test('guarda la asistencia del día y deja un registro de auditoría por cada cambio', async () => {
    const antes = (await auditoriaDe('asistencia')).length;
    const res = await api(profesor).put('/api/cursos/1/asistencia', {
        fecha: fecha(0),
        registros: [
            { alumno_id: 1, estado: 'presente' },
            { alumno_id: 2, estado: 'ausente' },
        ],
    });
    assert.equal(res.status, 200);
    assert.equal((await auditoriaDe('asistencia')).length, antes + 2);

    const lista = (await api(profesor).get(`/api/cursos/1/asistencia?fecha=${fecha(0)}`)).body.datos;
    assert.equal(lista.find((r) => r.alumno_id === 2).estado, 'ausente');
});

test('no permite pasar asistencia a alumnos de otro curso', async () => {
    const res = await api(profesor).put('/api/cursos/1/asistencia', {
        fecha: fecha(0),
        registros: [{ alumno_id: 3, estado: 'presente' }],
    });
    assert.equal(res.status, 403);
});

test('rechaza notas fuera de la escala 1,0 a 7,0', async () => {
    const res = await api(profesor).post('/api/alumnos/1/calificaciones', { asignatura: 'Lenguaje', nota: 8 });
    assert.equal(res.status, 400);
});

test('registra y edita una nota, auditando el valor antes y después', async () => {
    const creada = await api(profesor).post('/api/alumnos/1/calificaciones', { asignatura: 'Historia', descripcion: 'Control 1', nota: 5.5 });
    assert.equal(creada.status, 201);
    const id = creada.body.dato.id;

    const editada = await api(profesor).put(`/api/calificaciones/${id}`, { nota: 6.2 });
    assert.equal(editada.status, 200);
    assert.equal(editada.body.dato.nota, 6.2);

    const registro = (await auditoriaDe('calificaciones')).find((a) => a.registro_id === id && a.accion === 'UPDATE');
    assert.equal(registro.datos_antes.nota, 5.5);
    assert.equal(registro.datos_despues.nota, 6.2);
});

test('registra una anotación con su auditoría', async () => {
    const res = await api(profesor).post('/api/alumnos/1/anotaciones', { tipo: 'positiva', descripcion: 'Excelente trabajo en equipo.' });
    assert.equal(res.status, 201);
    assert.ok((await auditoriaDe('anotaciones')).some((a) => a.registro_id === res.body.dato.id));
});
