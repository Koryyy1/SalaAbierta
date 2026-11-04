// Aplicación Express sin iniciar el servidor: la usan index.js y las pruebas automatizadas
const express = require('express');
const cors = require('cors');

const app = express();

// T7: CORS restringido. En producción solo se aceptan los orígenes de CORS_ORIGINS (separados por coma).
// En desarrollo se aceptan localhost y la red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x).
// Las apps nativas (Expo Go, APK) no envían Origin y no se ven afectadas.
const origenesPermitidos = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
const RED_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
app.use(
    cors({
        origin: (origen, listo) => {
            const permitido =
                !origen || origenesPermitidos.includes(origen) || (process.env.NODE_ENV !== 'production' && RED_LOCAL.test(origen));
            listo(null, permitido);
        },
    })
);
app.use(express.json());

// Health check
app.get('/api/holamundo', (req, res) => {
    res.json({
        mensaje: 'API REST SalaAbierta operativa.',
        estado: 'OK',
        version: '1.0.0',
        desarrollador: 'Fernando Pavez',
    });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/academico')); // Épica 001: gestión académica y evaluativa
app.use('/api', require('./routes/muro')); // Épica 002: muro de comunicación
app.use('/api', require('./routes/resumen')); // Inicio del apoderado y resumen de la dirección
app.use('/api', require('./routes/alertas')); // Épica 003: alertas tempranas (HU010)
app.use('/api/agente', require('./routes/agente')); // Épica 003: agente IA conversacional (HU009)

app.use('/api', (req, res) => res.status(404).json({ estado: 'Error', mensaje: 'Ruta no encontrada.' }));

// eslint-disable-next-line no-unused-vars -- Express reconoce el manejador de errores por sus 4 parámetros
app.use((err, req, res, next) => {
    console.error('Error interno:', err);
    res.status(500).json({ estado: 'Error', mensaje: 'Error interno del servidor.' });
});

module.exports = app;
