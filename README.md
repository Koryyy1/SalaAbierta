# SalaAbierta
SalaAbierta es una aplicación móvil diseñada para optimizar y transparentar la gestión académica y la comunicación en colegios de educación básica
* *¿Qué hace?:* Centraliza el registro de asistencia, calificaciones, anotaciones y agendamiento de reuniones. Incorpora un sistema de recompensas, alertas tempranas de rendimiento, y un agente de inteligencia artificial para facilitar la accesibilidad.
* *¿A quién va dirigido?:* Profesores (perfil de gestión y control) y Apoderados (perfil de visualización e interacción).
* *¿Qué problema resuelve?:* Elimina la fragmentación de la información y la desconexión comunicacional entre la escuela y el hogar, reemplazando métodos tradicionales (como la libreta de comunicaciones o autorizaciones en papel) por un ecosistema digital centralizado, seguro y auditable.

## 🛠️ Tecnologías Utilizadas
* *Frontend Móvil/Web:* React Native con Expo (Expo Router, TypeScript) — carpeta raíz (`src/`).
* *Backend & API:* Node.js + Express con JWT y control de acceso por roles (RBAC) — carpeta `backend/`.
* *Base de Datos:* PostgreSQL. En desarrollo, sin configuración, se usa PostgreSQL embebido (PGlite).
* *Inteligencia Artificial:* Integración con API de LLM (OpenAI / Gemini) para Agente Conversacional (pendiente).
* *Cloud & Despliegue:* AWS / GitHub Actions (CI/CD) (pendiente).

## ⚙️ Instrucciones para ejecutar el proyecto localmente
Requisitos: Node.js y Git.

```bash
git clone https://github.com/Koryyy1/SalaAbierta.git
cd SalaAbierta
npm install
npm --prefix backend install

npm run backend   # Terminal 1: API en http://localhost:3000
npm run web       # Terminal 2: app en http://localhost:8081
```

* La primera vez, el backend tarda unos segundos en crear la base de datos con datos de demostración (`backend/.data`, no versionada). Borrar esa carpeta reinicia los datos.
* Para PostgreSQL real, copiar `backend/.env.example` a `backend/.env` y completar `DB_*` y `JWT_SECRET`.
* Móvil con Expo Go: `npm start` y definir `EXPO_PUBLIC_API_URL=http://<IP-de-tu-PC>:3000` (misma red Wi-Fi). El emulador Android usa `10.0.2.2` automáticamente.

### Usuarios de demostración
| Rol | Correo | Contraseña |
| --- | --- | --- |
| Profesor | profesor@salaabierta.cl | profesor123 |
| Apoderado (1 pupilo) | apoderado@salaabierta.cl | apoderado123 |
| Apoderado (2 pupilos) | apoderado2@salaabierta.cl | apoderado123 |
| Administrador (auditoría vía API) | admin@salaabierta.cl | admin123 |

### Alcance implementado
* **Épica 001 – Gestión académica:** el profesor pasa asistencia, registra y edita notas y anotaciones; todo cambio queda en la tabla `auditoria` (`GET /api/auditoria`, rol Administrador).
* **Épica 002 (parcial) – Muro:** el profesor publica anuncios; el apoderado ve solo los datos de sus pupilos, lee el muro, confirma recepción y comenta.
* Pendiente: Horario, Certificados y Épica 003 (Chatbot IA, alertas tempranas).
## 👥 Integrantes del Equipo
* *Fernando Pavez* - Líder de Proyecto / Desarrollador Backend y Datos.
* *Catalina Aguilar* - Arquitecta de Software / Desarrolladora Frontend Móvil.

## 📋 Metodología de Trabajo
El proyecto se desarrolla bajo un marco de trabajo ágil basado en *Scrum*, adaptado a un ciclo de desarrollo de 10 semanas. 
* Se utilizan Sprints semanales con entregas de valor continuo (Producto Mínimo Viable iterativo).
* Seguimiento de tareas mediante tableros *Kanban* (GitHub Projects / Trello).
* Control de versiones estructurado en Git (ramas main, develop, y feature/).

## 🏗️ Arquitectura de la Solución
El sistema utiliza una arquitectura *Cliente-Servidor* separada para garantizar seguridad y escalabilidad:

1. *Capa de Presentación (App Móvil):* Interfaces separadas y optimizadas por rol (Profesor/Apoderado) que consumen servicios vía HTTP.
2. *Capa Lógica (API REST):* Actúa como filtro de seguridad implementando RBAC (Control de Acceso Basado en Roles). Valida tokens JWT y asegura que los apoderados solo consulten datos asociados a sus pupilos mediante llaves foráneas.
3. *Capa de Datos:* Modelo relacional que soporta integridad referencial. Incluye un módulo de *Registro de Auditoría* que captura automáticamente cualquier modificación de datos sensibles (quién, cuándo y qué se modificó).
4. *Módulo de Inteligencia y Accesibilidad:* Un servicio acoplado que procesa consultas en lenguaje natural (Agente IA) y un motor de reglas que evalúa periódicamente la base de datos para emitir Alertas Tempranas al cuerpo docente.
