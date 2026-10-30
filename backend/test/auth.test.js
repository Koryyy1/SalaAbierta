const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { app, pool, request, token, api } = require('./helpers');

before(() => pool.ready);

test('inicia sesión con credenciales correctas y devuelve el rol', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'profesor@salaabierta.cl', password: 'profesor123' });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.usuario.rol, 'Profesor');
    assert.equal(res.body.usuario.password_hash, undefined, 'nunca debe exponer el hash de la contraseña');
});

test('rechaza una contraseña incorrecta con 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'profesor@salaabierta.cl', password: 'otra' });
    assert.equal(res.status, 401);
    assert.equal(res.body.mensaje, 'Credenciales incorrectas.');
});

test('exige correo y contraseña', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '' });
    assert.equal(res.status, 400);
});

test('las rutas protegidas exigen token', async () => {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/cursos').set('Authorization', 'Bearer token-falso')).status, 401);
});

test('/me devuelve el usuario del token', async () => {
    const res = await api(await token('apoderado')).get('/api/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.rol, 'Apoderado');
});
