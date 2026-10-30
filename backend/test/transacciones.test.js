const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('./helpers');

before(() => pool.ready);

const contar = async () => (await pool.query("SELECT COUNT(*)::int AS n FROM auditoria WHERE tabla = 'prueba_rollback'")).rows[0].n;

test('T1: si algo falla dentro de la transacción, no se guarda nada', async () => {
    const antes = await contar();
    await assert.rejects(
        pool.transaction(async (tx) => {
            await tx.query("INSERT INTO auditoria (accion, tabla) VALUES ('INSERT', 'prueba_rollback')");
            // Viola la restricción CHECK de notas: la transacción completa debe deshacerse
            await tx.query("INSERT INTO calificaciones (alumno_id, asignatura, nota) VALUES (1, 'X', 9)");
        })
    );
    assert.equal(await contar(), antes);
});

test('T1: si todo sale bien, la transacción guarda todos los cambios', async () => {
    const antes = await contar();
    await pool.transaction(async (tx) => {
        await tx.query("INSERT INTO auditoria (accion, tabla) VALUES ('INSERT', 'prueba_rollback')");
        await tx.query("INSERT INTO auditoria (accion, tabla) VALUES ('INSERT', 'prueba_rollback')");
    });
    assert.equal(await contar(), antes + 2);
});
