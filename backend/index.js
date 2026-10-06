const express = require('express');
const cors = require('cors');
const pool = require('./config/db'); // Módulo de conexión a la BD

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
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

// Roles definidos en el sistema
app.get('/api/roles', async (req, res) => {
    const resultado = await pool.query('SELECT id, nombre FROM roles ORDER BY id');
    res.status(200).json({ estado: 'Éxito', cantidad: resultado.rowCount, datos: resultado.rows });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/academico')); // Épica 001: gestión académica y evaluativa
app.use('/api', require('./routes/muro')); // Épica 002: muro de comunicación

app.use('/api', (req, res) => res.status(404).json({ estado: 'Error', mensaje: 'Ruta no encontrada.' }));

app.use((err, req, res, next) => {
    console.error('Error interno:', err);
    res.status(500).json({ estado: 'Error', mensaje: 'Error interno del servidor.' });
});

pool.ready
    .then(() => app.listen(PORT, () => console.log(`🚀 Servidor backend escuchando en el puerto ${PORT}`)))
    .catch((err) => {
        console.error('❌ Error de conexión a la base de datos:', err);
        process.exit(1);
    });
