const pool = require('../config/db');

// Registro de auditoría: quién, cuándo y qué se modificó.
// Recibe la conexión (db) para registrarse dentro de la misma transacción que el cambio auditado.
async function registrarAuditoria({ usuarioId, accion, tabla, registroId, antes = null, despues = null }, db = pool) {
    await db.query(
        'INSERT INTO auditoria (usuario_id, accion, tabla, registro_id, datos_antes, datos_despues) VALUES ($1, $2, $3, $4, $5, $6)',
        [usuarioId, accion, tabla, registroId, antes && JSON.stringify(antes), despues && JSON.stringify(despues)]
    );
}

module.exports = { registrarAuditoria };
