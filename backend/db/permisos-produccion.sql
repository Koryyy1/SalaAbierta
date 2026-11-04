-- T8: permisos de base de datos para el entorno desplegado (PostgreSQL).
-- Ejecutar una vez como superusuario, después de crear las tablas (iniciar el backend una vez crea el esquema).
-- La aplicación se conecta con el usuario sala_abierta_app, que no puede modificar ni borrar la auditoría.
-- Reemplace 'cambiar-esta-clave' por una contraseña segura y úsela en DB_USER / DB_PASSWORD del backend.

CREATE ROLE sala_abierta_app LOGIN PASSWORD 'cambiar-esta-clave';
GRANT CONNECT ON DATABASE sala_abierta_db TO sala_abierta_app;
GRANT USAGE ON SCHEMA public TO sala_abierta_app;

-- Tablas de negocio: lectura y escritura normales
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sala_abierta_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sala_abierta_app;

-- Auditoría: solo agregar y consultar
REVOKE UPDATE, DELETE, TRUNCATE ON auditoria FROM sala_abierta_app;
GRANT SELECT, INSERT ON auditoria TO sala_abierta_app;
