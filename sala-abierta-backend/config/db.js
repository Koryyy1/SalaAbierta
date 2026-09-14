const { Pool } = require('pg');
require('dotenv').config();

// Inicialización del pool de conexiones utilizando variables de entorno para proteger credenciales
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// Verificación de conexión al instanciar el módulo
pool.connect()
    .then(() => console.log('📦 Conectado exitosamente a PostgreSQL (sala_abierta_db)'))
    .catch(err => console.error('❌ Error de conexión a la base de datos:', err.stack));

module.exports = pool;