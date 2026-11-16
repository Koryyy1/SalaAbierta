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

test('acceso de demostración: entra con una cuenta de prueba sin escribir credenciales', async () => {
    const perfiles = await request(app).get('/api/auth/demo');
    assert.equal(perfiles.body.activo, true);
    assert.deepEqual(perfiles.body.perfiles.map((p) => p.id), ['apoderado', 'profesor', 'direccion']);

    const res = await request(app).post('/api/auth/demo').send({ perfil: 'apoderado' });
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.rol, 'Apoderado');
    assert.equal(res.body.usuario.password_hash, undefined);
    assert.equal((await api(res.body.token).get('/api/apoderado/alumnos')).status, 200);

    assert.equal((await request(app).post('/api/auth/demo').send({ perfil: 'otro' })).status, 400);
});

test('acceso de demostración: se puede desactivar con MODO_DEMO=0', async () => {
    process.env.MODO_DEMO = '0';
    try {
        assert.equal((await request(app).get('/api/auth/demo')).body.activo, false);
        assert.equal((await request(app).post('/api/auth/demo').send({ perfil: 'apoderado' })).status, 403);
    } finally {
        delete process.env.MODO_DEMO;
    }
});
