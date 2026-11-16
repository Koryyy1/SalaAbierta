const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { firmarToken, autenticar } = require('../middleware/auth');
const limite = require('../middleware/limiteLogin');

const router = express.Router();

router.post('/login', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
        return res.status(400).json({ estado: 'Error', mensaje: 'Correo y contraseña son obligatorios.' });
    }

    const minutos = limite.minutosBloqueado(req, email);
    if (minutos > 0) {
        return res.status(429).json({
            estado: 'Error',
            mensaje: `Demasiados intentos fallidos. Intente nuevamente en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
        });
    }

    const { rows } = await pool.query(
        'SELECT u.id, u.nombre, u.email, u.password_hash, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.email = $1',
        [email]
    );
    const usuario = rows[0];
    if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
        limite.registrarFallo(req, email);
        return res.status(401).json({ estado: 'Error', mensaje: 'Credenciales incorrectas.' });
    }
    limite.registrarExito(req, email);

    res.json({
        estado: 'Éxito',
        token: firmarToken(usuario),
        usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
});

// Acceso de demostración: permite recorrer la app con las cuentas de prueba sin escribir correo ni contraseña
// (por ejemplo, al llegar desde el código QR de la presentación). Usa datos sintéticos.
// En producción solo funciona con MODO_DEMO=1; con datos reales de un colegio debe quedar en 0.
const PERFILES_DEMO = [
    { id: 'apoderado', etiqueta: 'Apoderado', email: 'apoderado@salaabierta.cl' },
    { id: 'profesor', etiqueta: 'Profesor', email: 'profesor@salaabierta.cl' },
    { id: 'direccion', etiqueta: 'Dirección', email: 'admin@salaabierta.cl' },
];
const demoActivo = () => (process.env.MODO_DEMO ? process.env.MODO_DEMO === '1' : process.env.NODE_ENV !== 'production');

router.get('/demo', (req, res) => {
    const perfiles = demoActivo() ? PERFILES_DEMO.map(({ id, etiqueta }) => ({ id, etiqueta })) : [];
    res.json({ estado: 'Éxito', activo: perfiles.length > 0, perfiles });
});

router.post('/demo', async (req, res) => {
    if (!demoActivo()) return res.status(403).json({ estado: 'Error', mensaje: 'El acceso de demostración no está disponible.' });
    const perfil = PERFILES_DEMO.find((p) => p.id === req.body?.perfil);
    if (!perfil) return res.status(400).json({ estado: 'Error', mensaje: 'Perfil de demostración inválido.' });

    const { rows } = await pool.query(
        'SELECT u.id, u.nombre, u.email, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.email = $1',
        [perfil.email]
    );
    if (!rows.length) return res.status(404).json({ estado: 'Error', mensaje: 'La cuenta de demostración no existe en esta base de datos.' });
    res.json({ estado: 'Éxito', token: firmarToken(rows[0]), usuario: rows[0] });
});

router.get('/me', autenticar, (req, res) => {
    res.json({ estado: 'Éxito', usuario: req.user });
});

module.exports = router;
