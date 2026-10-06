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
        return {
            query: async (text, params) => {
                const r = await pool.query(text, params);
                return { rows: r.rows, rowCount: r.rowCount };
            },
            exec: (sql) => pool.query(sql),
        };
    }

    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR || path.join(__dirname, '..', '.data', 'pglite');
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    const db = new PGlite(dir);
    await db.waitReady;
    console.log(`📦 Usando PostgreSQL embebido (PGlite) en ${dir}`);
    return {
        query: async (text, params) => {
            const r = await db.query(text, params);
            return { rows: r.rows, rowCount: r.rows.length || r.affectedRows || 0 };
        },
        exec: (sql) => db.exec(sql),
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
};
