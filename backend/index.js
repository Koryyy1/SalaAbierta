const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 3000;

pool.ready
    .then(() => app.listen(PORT, () => console.log(`🚀 Servidor backend escuchando en el puerto ${PORT}`)))
    .catch((err) => {
        console.error('❌ Error de conexión a la base de datos:', err);
        process.exit(1);
    });
