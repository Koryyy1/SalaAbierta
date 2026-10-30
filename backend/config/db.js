const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Si hay DB_HOST se usa PostgreSQL; si no, PGlite (Postgres embebido, persistido en disco)
// para poder desarrollar sin instalar un servidor de base de datos.
const usePostgres = Boolean(process.env.DB_HOST);

let impl;

async function connect() {
    if (usePostgres) {
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
        });
        await pool.query('SELECT 1');
        console.log('📦 Conectado exitosamente a PostgreSQL');
        const adaptar = (cliente) => async (text, params) => {
            const r = await cliente.query(text, params);
            return { rows: r.rows, rowCount: r.rowCount };
        };
        return {
            query: adaptar(pool),
            exec: (sql) => pool.query(sql),
            // Ejecuta fn dentro de BEGIN/COMMIT en una sola conexión; ante cualquier error hace ROLLBACK
            transaction: async (fn) => {
                const cliente = await pool.connect();
                try {
                    await cliente.query('BEGIN');
                    const resultado = await fn({ query: adaptar(cliente) });
                    await cliente.query('COMMIT');
                    return resultado;
                } catch (err) {
                    await cliente.query('ROLLBACK');
                    throw err;
                } finally {
                    cliente.release();
                }
            },
        };
    }

    const { PGlite } = await import('@electric-sql/pglite');
    // PGLITE_DIR=memory:// crea una base temporal en memoria (se usa en las pruebas automatizadas)
    const dir = process.env.PGLITE_DIR || path.join(__dirname, '..', '.data', 'pglite');
    if (!dir.startsWith('memory://')) fs.mkdirSync(path.dirname(dir), { recursive: true });
    const db = new PGlite(dir);
    await db.waitReady;
    if (process.env.NODE_ENV !== 'test') console.log(`📦 Usando PostgreSQL embebido (PGlite) en ${dir}`);
    const adaptar = (cliente) => async (text, params) => {
        const r = await cliente.query(text, params);
        return { rows: r.rows, rowCount: r.rows.length || r.affectedRows || 0 };
    };
    return {
        query: adaptar(db),
        exec: (sql) => db.exec(sql),
        // PGlite hace ROLLBACK automáticamente si fn lanza un error
        transaction: (fn) => db.transaction((tx) => fn({ query: adaptar(tx) })),
    };
}

const ready = (async () => {
    impl = await connect();
    await impl.exec(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
    await require('../db/seed')({ query: impl.query });
})();

module.exports = {
    ready,
    query: async (text, params) => {
        await ready;
        return impl.query(text, params);
    },
    // Agrupa varias operaciones (por ejemplo, un cambio y su auditoría) para que se guarden todas o ninguna
    transaction: async (fn) => {
        await ready;
        return impl.transaction(fn);
    },
};
