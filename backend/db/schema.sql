CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    rol_id INTEGER NOT NULL REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS cursos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS profesor_cursos (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    curso_id INTEGER NOT NULL REFERENCES cursos(id),
    PRIMARY KEY (usuario_id, curso_id)
);

CREATE TABLE IF NOT EXISTS alumnos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    curso_id INTEGER NOT NULL REFERENCES cursos(id)
);

CREATE TABLE IF NOT EXISTS apoderado_alumno (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    alumno_id INTEGER NOT NULL REFERENCES alumnos(id),
    PRIMARY KEY (usuario_id, alumno_id)
);

CREATE TABLE IF NOT EXISTS asistencia (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER NOT NULL REFERENCES alumnos(id),
    fecha DATE NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('presente', 'ausente', 'atrasado', 'justificado')),
    UNIQUE (alumno_id, fecha)
);

CREATE TABLE IF NOT EXISTS calificaciones (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER NOT NULL REFERENCES alumnos(id),
    asignatura VARCHAR(80) NOT NULL,
    descripcion VARCHAR(200) NOT NULL DEFAULT '',
    nota NUMERIC(2,1) NOT NULL CHECK (nota >= 1.0 AND nota <= 7.0),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    profesor_id INTEGER REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS anotaciones (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER NOT NULL REFERENCES alumnos(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('positiva', 'negativa', 'observacion')),
    descripcion TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    profesor_id INTEGER REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS anuncios (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER NOT NULL REFERENCES cursos(id),
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    titulo VARCHAR(160) NOT NULL,
    contenido TEXT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anuncio_confirmaciones (
    anuncio_id INTEGER NOT NULL REFERENCES anuncios(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anuncio_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS anuncio_comentarios (
    id SERIAL PRIMARY KEY,
    anuncio_id INTEGER NOT NULL REFERENCES anuncios(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    contenido TEXT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    accion VARCHAR(20) NOT NULL,
    tabla VARCHAR(60) NOT NULL,
    registro_id INTEGER,
    datos_antes JSONB,
    datos_despues JSONB,
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);
