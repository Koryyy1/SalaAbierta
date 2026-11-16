# SalaAbierta
SalaAbierta es una aplicación móvil diseñada para optimizar y transparentar la gestión académica y la comunicación en colegios de educación básica
* *¿Qué hace?:* Centraliza el registro de asistencia, calificaciones y anotaciones, y la comunicación entre profesores y apoderados mediante un muro de anuncios por curso. Incorpora un registro de auditoría de los datos sensibles, alertas tempranas de rendimiento, una asistente de inteligencia artificial (Sali), el horario de clases y certificados del estudiante.
* *¿A quién va dirigido?:* Profesores (perfil de gestión y control), Apoderados (perfil de visualización e interacción) y Administradores (auditoría y configuración).
* *¿Qué problema resuelve?:* Elimina la fragmentación de la información y la desconexión comunicacional entre la escuela y el hogar, reemplazando métodos tradicionales (como la libreta de comunicaciones o autorizaciones en papel) por un ecosistema digital centralizado, seguro y auditable.

## 📁 Estructura del Repositorio
```text
SalaAbierta/
├── frontend/   App móvil/web (Expo + React Native, TypeScript)
│   ├── src/app/          Pantallas (Expo Router): login, inicio, muro, horario, profesor/, apoderado/, admin/
│   ├── src/components/   Componentes reutilizables
│   └── src/lib/          Cliente de la API, autenticación y texto de los certificados
├── backend/    API REST (Node.js + Express)
│   ├── routes/           Endpoints: auth, académico, muro, resumen, alertas, horario, certificados, agente
│   ├── middleware/       Autenticación JWT, control de roles (RBAC) y límite de intentos
│   ├── services/         Auditoría, alertas, horario y agente IA (Sali)
│   ├── config/           Conexión a la base de datos
│   ├── db/               Esquema SQL (19 tablas) y datos de demostración
│   └── test/             75 pruebas automatizadas de la API
├── despliegue/           Caddyfile y Dockerfile de la versión web
├── docker-compose.yml    Base de datos, API y web en contenedores
├── DESPLIEGUE.md         Guía: Docker en el equipo, túnel HTTPS, APK y AWS
├── Fase 1/     Evidencias de la Fase 1 (Evidencias Grupales / Evidencias Individuales)
├── Fase 2/     Evidencias de la Fase 2 (Evidencias Grupales / Evidencias Individuales / Evidencias Proyecto: documentos ágiles y videos)
├── LICENSE
└── README.md
```

## 🛠️ Tecnologías Utilizadas
* *Frontend Móvil/Web:* React Native con Expo (Expo Router, TypeScript) — carpeta `frontend/`.
* *Backend & API:* Node.js + Express con JWT y control de acceso por roles (RBAC) — carpeta `backend/`.
* *Base de Datos:* PostgreSQL. En desarrollo, sin configuración, se usa PostgreSQL embebido (PGlite).
* *Inteligencia Artificial:* Google Gemini para la asistente conversacional Sali (arquitectura RAG); sin clave responde en modo básico.
* *Despliegue:* Docker Compose (PostgreSQL, API y Caddy), túnel HTTPS (ngrok o Cloudflare) y APK de Android con EAS Build. Ver [DESPLIEGUE.md](DESPLIEGUE.md).
* *Integración continua:* GitHub Actions (lint, pruebas, revisión de tipos y prueba de humo con Docker).

## ⚙️ Instrucciones para ejecutar el proyecto localmente
Requisitos: Node.js y Git.

```bash
git clone https://github.com/Koryyy1/SalaAbierta.git
cd SalaAbierta

# Terminal 1: API en http://localhost:3000
cd backend
npm install
npm start

# Terminal 2: app en http://localhost:8081
cd frontend
npm install
npm run web
```

* La primera vez, el backend tarda unos segundos en crear la base de datos con datos de demostración (`backend/.data`, no versionada). Borrar esa carpeta reinicia los datos.
* Para PostgreSQL real, copiar `backend/.env.example` a `backend/.env` y completar `DB_*` y `JWT_SECRET`.
* Móvil con Expo Go: desde `frontend/`, `npm start` y definir `EXPO_PUBLIC_API_URL=http://<IP-de-tu-PC>:3000` (misma red Wi-Fi). El emulador Android usa `10.0.2.2` automáticamente.

### Usuarios de demostración
| Rol | Correo | Contraseña |
| --- | --- | --- |
| Profesor | profesor@salaabierta.cl | profesor123 |
| Apoderado (1 pupilo) | apoderado@salaabierta.cl | apoderado123 |
| Apoderado (2 pupilos) | apoderado2@salaabierta.cl | apoderado123 |
| Dirección: Patricia Vidal (rol Administrador: resumen del colegio, auditoría, umbrales y verificación de certificados) | admin@salaabierta.cl | admin123 |

### Alcance implementado
* **Épica 001 – Gestión académica:** el profesor pasa asistencia, registra y edita notas y anotaciones; todo cambio queda en la tabla `auditoria` (`GET /api/auditoria`, rol Administrador).
* **Épica 002 – Muro:** el profesor publica anuncios; el apoderado ve solo los datos de sus pupilos, lee el muro, confirma recepción y comenta; el profesor ve quiénes confirmaron cada anuncio y cuántos faltan.
* **Épica 003 – HU009 Asistente IA (Sali):** el apoderado pregunta en lenguaje natural por notas, asistencia, anotaciones, horario, certificados, anuncios o dudas de uso (RAG con Google Gemini; sin `GEMINI_API_KEY` responde en modo básico). El modelo nunca accede a la base de datos ni recibe nombres. Sali se presenta una sola vez y no responde preguntas ajenas al colegio.
* **Épica 003 – HU010 Alertas tempranas:** el profesor ve alertas cuando un alumno baja de promedio 4,0 o de 85 % de asistencia; el Administrador configura los umbrales.
* **Calidad y seguridad:** cada cambio se guarda junto con su auditoría en una sola transacción; la auditoría no se puede modificar ni borrar; límite de 5 intentos fallidos de inicio de sesión cada 15 minutos; CORS restringido; JWT_SECRET obligatorio en producción; textos de 14 a 16 pt, zonas táctiles de 48 dp y selector de fecha sin escribir.
* **Horario:** el apoderado ve el horario semanal del curso de su pupilo y el profesor el de sus cursos.
* **Certificados:** el apoderado genera certificados de alumno regular, notas y asistencia, con código de verificación; cada emisión queda en la auditoría y la dirección puede comprobar el código.
* **Despliegue:** Docker Compose con HTTPS mediante túnel y APK de Android ([DESPLIEGUE.md](DESPLIEGUE.md)).
* Fuera del alcance del PMV: agendamiento de reuniones, sistema de recompensas y gestión de usuarios por pantalla.

### Producción
* Definir `NODE_ENV=production`, `JWT_SECRET` y `CORS_ORIGINS` (ver `backend/.env.example`).
* Ejecutar `backend/db/permisos-produccion.sql` para que la app use un usuario de base de datos sin permisos de UPDATE ni DELETE sobre la auditoría.

### Pruebas y revisión del código
```bash
cd backend
npm run lint   # ESLint
npm test       # 75 pruebas de la API sobre una base de datos en memoria
```
GitHub Actions ejecuta ambos, más la revisión de tipos del frontend y una prueba de humo con Docker, en cada push y Pull Request.

## 👥 Integrantes del Equipo
* *Fernando Pavez* - Líder de Proyecto / Desarrollador Backend y Datos.
* *Catalina Aguilar* - Arquitecta de Software / Desarrolladora Frontend Móvil.

## 📋 Metodología de Trabajo
El proyecto se desarrolla bajo un marco de trabajo ágil basado en *Scrum*, adaptado a un ciclo de desarrollo de 10 semanas. 
* Se utilizan Sprints semanales con entregas de valor continuo (Producto Mínimo Viable iterativo).
* Seguimiento de tareas mediante tableros *Kanban* (GitHub Projects / Trello).
* Control de versiones en Git: rama `main` y, desde el Sprint 5, ramas `feature/` por historia integradas mediante Pull Request revisado por el otro integrante.

## 🏗️ Arquitectura de la Solución
El sistema utiliza una arquitectura *Cliente-Servidor* separada para garantizar seguridad y escalabilidad:

1. *Capa de Presentación (App Móvil):* Interfaces separadas y optimizadas por rol (Profesor/Apoderado/Administrador) que consumen servicios vía HTTP.
2. *Capa Lógica (API REST):* Actúa como filtro de seguridad implementando RBAC (Control de Acceso Basado en Roles). Valida tokens JWT y asegura que los apoderados solo consulten datos asociados a sus pupilos mediante llaves foráneas.
3. *Capa de Datos:* Modelo relacional que soporta integridad referencial. Incluye un módulo de *Registro de Auditoría* que captura automáticamente cualquier modificación de datos sensibles (quién, cuándo y qué se modificó).
4. *Módulo de Inteligencia y Accesibilidad:* Un servicio acoplado que procesa consultas en lenguaje natural (Agente IA) y un motor de reglas que evalúa periódicamente la base de datos para emitir Alertas Tempranas al cuerpo docente.
