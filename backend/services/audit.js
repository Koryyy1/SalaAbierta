const pool = require('../config/db');

// Registro de auditoría: quién, cuándo y qué se modificó
async function registrarAuditoria({ usuarioId, accion, tabla, registroId, antes = null, despues = null }) {
    await pool.query(
        'INSERT INTO auditoria (usuario_id, accion, tabla, registro_id, datos_antes, datos_despues) VALUES ($1, $2, $3, $4, $5, $6)',
        [usuarioId, accion, tabla, registroId, antes && JSON.stringify(antes), despues && JSON.stringify(despues)]
    );
}

module.exports = { registrarAuditoria };
