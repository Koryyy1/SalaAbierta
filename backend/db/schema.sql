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

-- HU010: umbrales configurables por el Administrador (una sola fila, id = 1)
CREATE TABLE IF NOT EXISTS umbrales_alerta (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    promedio_minimo NUMERIC(2,1) NOT NULL DEFAULT 4.0 CHECK (promedio_minimo >= 1.0 AND promedio_minimo <= 7.0),
    asistencia_minima INTEGER NOT NULL DEFAULT 85 CHECK (asistencia_minima BETWEEN 0 AND 100),
    notas_minimas INTEGER NOT NULL DEFAULT 2 CHECK (notas_minimas >= 1),
    dias_minimos INTEGER NOT NULL DEFAULT 10 CHECK (dias_minimos >= 1)
);
INSERT INTO umbrales_alerta (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- HU010: alertas tempranas de rendimiento. resuelta_en = NULL significa alerta activa.
CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER NOT NULL REFERENCES alumnos(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('promedio', 'asistencia')),
    valor NUMERIC(5,1) NOT NULL,
    umbral NUMERIC(5,1) NOT NULL,
    creada_en TIMESTAMP NOT NULL DEFAULT NOW(),
    resuelta_en TIMESTAMP
);
-- Índice único parcial: a lo más una alerta activa por alumno y tipo (evita duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS alertas_activas_unicas ON alertas (alumno_id, tipo) WHERE resuelta_en IS NULL;
