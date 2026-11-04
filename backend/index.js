const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 3000;

const UN_DIA_MS = 24 * 60 * 60 * 1000;

pool.ready
    .then(() => {
        // HU010: recálculo diario de respaldo de las alertas tempranas
        setInterval(() => {
            require('./services/alertas')
                .recalcularTodos()
                .catch((err) => console.error('Error al recalcular alertas:', err));
        }, UN_DIA_MS).unref();
        app.listen(PORT, () => console.log(`🚀 Servidor backend escuchando en el puerto ${PORT}`));
    })
    .catch((err) => {
        console.error('❌ Error de conexión a la base de datos:', err);
        process.exit(1);
    });
