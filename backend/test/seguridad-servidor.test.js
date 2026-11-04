const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { app, pool, request } = require('./helpers');
const { MAX_INTENTOS } = require('../middleware/limiteLogin');

before(() => pool.ready);

const login = (password, email = 'apoderado2@salaabierta.cl') => request(app).post('/api/auth/login').send({ email, password });

test('T6: bloquea el inicio de sesión tras demasiados intentos fallidos', async () => {
    for (let i = 0; i < MAX_INTENTOS; i++) assert.equal((await login('incorrecta')).status, 401);
    const bloqueado = await login('apoderado123');
    assert.equal(bloqueado.status, 429);
    assert.match(bloqueado.body.mensaje, /Demasiados intentos/);
    // Otro correo desde la misma IP no queda bloqueado
    assert.equal((await login('profesor123', 'profesor@salaabierta.cl')).status, 200);
});

test('T6: un inicio de sesión correcto reinicia el contador', async () => {
    for (let i = 0; i < MAX_INTENTOS - 1; i++) await login('incorrecta', 'apoderado@salaabierta.cl');
    assert.equal((await login('apoderado123', 'apoderado@salaabierta.cl')).status, 200);
    assert.equal((await login('incorrecta', 'apoderado@salaabierta.cl')).status, 401);
    assert.equal((await login('apoderado123', 'apoderado@salaabierta.cl')).status, 200);
});

test('T7: /api/roles ya no responde sin token y no existe para usuarios autenticados', async () => {
    assert.equal((await request(app).get('/api/roles')).status, 401);
    const tk = (await login('profesor123', 'profesor@salaabierta.cl')).body.token;
    assert.equal((await request(app).get('/api/roles').set('Authorization', `Bearer ${tk}`)).status, 404);
});

test('T7: CORS acepta la app en la red local y rechaza otros sitios', async () => {
    const local = await request(app).get('/api/holamundo').set('Origin', 'http://localhost:8081');
    assert.equal(local.headers['access-control-allow-origin'], 'http://localhost:8081');
    const lan = await request(app).get('/api/holamundo').set('Origin', 'http://192.168.1.2:8081');
    assert.equal(lan.headers['access-control-allow-origin'], 'http://192.168.1.2:8081');
    const ajeno = await request(app).get('/api/holamundo').set('Origin', 'https://sitio-malicioso.com');
    assert.equal(ajeno.headers['access-control-allow-origin'], undefined);
});

test('T8: la auditoría no se puede modificar ni borrar en la base de datos', async () => {
    await pool.query("INSERT INTO auditoria (accion, tabla) VALUES ('INSERT', 'prueba_inmutable')");
    await assert.rejects(pool.query("UPDATE auditoria SET accion = 'X' WHERE tabla = 'prueba_inmutable'"), /no se puede modificar/);
    await assert.rejects(pool.query("DELETE FROM auditoria WHERE tabla = 'prueba_inmutable'"), /no se puede modificar/);
    const { rows } = await pool.query("SELECT accion FROM auditoria WHERE tabla = 'prueba_inmutable'");
    assert.equal(rows[0].accion, 'INSERT');
});
