const express = require('express');
const pool = require('./config/db'); // Módulo de conexión a la BD

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear el cuerpo de las peticiones HTTP a formato JSON
app.use(express.json());

// ----------------------------------------------------------------------------
// ENDPOINTS DE CONFIGURACIÓN Y ESTADO
// ----------------------------------------------------------------------------

// Endpoint base: Verificación de estado del servidor (Health Check)
app.get('/api/holamundo', (req, res) => {
    res.json({
        mensaje: "API REST SalaAbierta operativa.",
        estado: "OK",
        version: "1.0.0",
        desarrollador: "Fernando Pavez"
    });
});

// ----------------------------------------------------------------------------
// ENDPOINTS DE GESTIÓN DE ACCESOS Y SEGURIDAD (RBAC)
// ----------------------------------------------------------------------------

// Endpoint GET /api/roles: Retorna la lista de roles definidos en el sistema
app.get('/api/roles', async (req, res) => {
    try {
        // Ejecución de la consulta a la base de datos PostgreSQL
        const resultado = await pool.query('SELECT * FROM roles');
        
        // Respuesta exitosa 200 con la estructura de datos relacional
        res.status(200).json({
            estado: "Éxito",
            cantidad: resultado.rowCount,
            datos: resultado.rows 
        });
    } catch (error) {
        // Manejo de excepciones y registro del error en consola para auditoría backend
        console.error('Error interno (GET /api/roles):', error);
        res.status(500).json({ 
            estado: "Error", 
            mensaje: "Error interno del servidor al procesar la solicitud de roles." 
        });
    }
});

// ----------------------------------------------------------------------------
// INICIALIZACIÓN DEL SERVIDOR
// ----------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend inicializado y escuchando peticiones en el puerto ${PORT}`);
});