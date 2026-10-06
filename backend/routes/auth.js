const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { firmarToken, autenticar } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
        return res.status(400).json({ estado: 'Error', mensaje: 'Correo y contraseña son obligatorios.' });
    }

    const { rows } = await pool.query(
        'SELECT u.id, u.nombre, u.email, u.password_hash, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.email = $1',
        [email]
    );
    const usuario = rows[0];
    if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
        return res.status(401).json({ estado: 'Error', mensaje: 'Credenciales incorrectas.' });
    }

    res.json({
        estado: 'Éxito',
        token: firmarToken(usuario),
        usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
});

router.get('/me', autenticar, (req, res) => {
    res.json({ estado: 'Éxito', usuario: req.user });
});

module.exports = router;
