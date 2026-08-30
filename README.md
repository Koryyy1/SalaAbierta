# SalaAbierta
SalaAbierta es una aplicación móvil diseñada para optimizar y transparentar la gestión académica y la comunicación en colegios de educación básica
* *¿Qué hace?:* Centraliza el registro de asistencia, calificaciones, anotaciones y agendamiento de reuniones. Incorpora un sistema de recompensas, alertas tempranas de rendimiento, y un agente de inteligencia artificial para facilitar la accesibilidad.
* *¿A quién va dirigido?:* Profesores (perfil de gestión y control) y Apoderados (perfil de visualización e interacción).
* *¿Qué problema resuelve?:* Elimina la fragmentación de la información y la desconexión comunicacional entre la escuela y el hogar, reemplazando métodos tradicionales (como la libreta de comunicaciones o autorizaciones en papel) por un ecosistema digital centralizado, seguro y auditable.

## 🛠️ Tecnologías Utilizadas
(Nota: Ajusta estas tecnologías si definieron un stack distinto)
* *Frontend Móvil:* React Native / Flutter
* *Backend & API:* Node.js / Python (con JWT para manejo de sesiones)
* *Base de Datos:* Relacional (PostgreSQL / SQL Server)
* *Inteligencia Artificial:* Integración con API de LLM (OpenAI / Gemini) para Agente Conversacional.
* *Cloud & Despliegue:* AWS / GitHub Actions (CI/CD)

## ⚙️ Instrucciones para ejecutar el proyecto localmente
> 🚧 *Estado del Proyecto:* En fase inicial de desarrollo (Sprints activos). 
> Las instrucciones de instalación, dependencias y variables de entorno (.env) serán actualizadas en las próximas versiones conforme se consolide la arquitectura base.

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
