# Despliegue de SalaAbierta (T11)

Guía para publicar SalaAbierta en AWS con Docker y HTTPS, y para generar el APK de Android.

Resultado final:

- **Web:** `https://<IP-con-guiones>.sslip.io`, abre la app en cualquier navegador.
- **API:** el mismo dominio, en `/api` (por ejemplo `/api/holamundo`).
- **APK:** un archivo instalable en cualquier teléfono Android, conectado a esa misma API.

## Qué se levanta

```
Internet ──443/80──▶ web (Caddy) ──/api/*──▶ api (Node/Express) ──▶ db (PostgreSQL 17)
                     │  HTTPS automático
                     └─ sirve la versión web de la app
```

| Archivo | Para qué sirve |
|---|---|
| `docker-compose.yml` | Define los tres contenedores y sus volúmenes |
| `backend/Dockerfile` | Imagen de la API (Node 22, usuario sin privilegios, health check) |
| `despliegue/web.Dockerfile` | Compila la web de Expo y la sirve con Caddy |
| `despliegue/Caddyfile` | HTTPS con Let's Encrypt, proxy a `/api`, cabeceras de seguridad |
| `.env.produccion.example` | Plantilla de variables (se copia como `.env`, que nunca se sube) |
| `frontend/eas.json` | Perfil `preview` que genera el APK |

La base de datos no expone puertos y solo es accesible desde la red interna de Docker. La API se ejecuta con `NODE_ENV=production`, por lo que exige `JWT_SECRET` y solo acepta el dominio propio en CORS.

---

## Parte 1 · Servidor en AWS Academy (Learner Lab)

> **Requisito:** estar matriculado en un curso **AWS Academy Learner Lab**. Si en AWS Academy no aparece ningún curso, el docente debe enviar la invitación.

### 1. Iniciar el laboratorio

1. En AWS Academy, entrar a **Courses**, abrir el curso y luego **Modules → Launch AWS Academy Learner Lab**.
2. Presionar **Start Lab** y esperar a que el círculo junto a "AWS" quede **verde**.
3. Hacer clic en **AWS** para abrir la consola (región **us-east-1, N. Virginia**).

Límites del Learner Lab:

- Las sesiones duran alrededor de 4 horas.
- Al terminar una sesión, las instancias se **detienen**. Al volver a presionar Start Lab, se encienden de nuevo y los contenedores arrancan solos porque tienen `restart: unless-stopped`.
- El crédito es limitado, así que conviene detener la instancia cuando no se use.

### 2. Crear la instancia EC2

En **EC2 → Instances → Launch instance**:

| Campo | Valor |
|---|---|
| Name | `salaabierta` |
| AMI | **Ubuntu Server 24.04 LTS** |
| Instance type | **t3.medium** (compilar la web necesita unos 2 GB de RAM; con t3.small agregar swap, paso 5) |
| Key pair | `vockey` (la clave del laboratorio) |
| Network settings → Firewall | *Create security group* y marcar: **Allow SSH**, **Allow HTTPS**, **Allow HTTP** |
| Storage | **20 GiB** gp3 |

Presionar **Launch instance**.

### 3. Asignar una IP fija (Elastic IP)

Sin IP fija, la IP pública cambia cada vez que se reinicia el laboratorio, y con ella el dominio y el certificado.

1. **EC2 → Elastic IPs → Allocate Elastic IP address → Allocate**.
2. Seleccionar la IP, **Actions → Associate Elastic IP address**, elegir la instancia `salaabierta` y asociar.
3. Anotar la IP, por ejemplo `54.12.34.56`. El dominio queda como **`54-12-34-56.sslip.io`** (los puntos se cambian por guiones). sslip.io resuelve gratis cualquier IP, y gracias a eso Let's Encrypt puede emitir el certificado.

### 4. Conectarse a la instancia

La forma más simple es por el navegador: seleccionar la instancia, **Connect → EC2 Instance Connect → Connect**.

También se puede por SSH desde el PC:

1. En el Learner Lab, ir a **AWS Details → Download PEM** para obtener `labsuser.pem`.
2. Ejecutar:

```bash
ssh -i labsuser.pem ubuntu@54.12.34.56
```

### 5. Instalar Docker (una sola vez)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit    # salir y volver a conectarse para que aplique el grupo docker
```

Solo si la instancia es t3.small o menor, agregar 2 GB de swap:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 6. Descargar el proyecto y configurarlo

```bash
git clone https://github.com/Koryyy1/SalaAbierta.git
cd SalaAbierta
cp .env.produccion.example .env
nano .env
```

En `.env`, completar:

- `DOMINIO`: el de sslip.io del paso 3.
- `DB_PASSWORD` y `JWT_SECRET`: valores generados con los comandos de abajo.
- `GEMINI_API_KEY`: opcional; es la clave de Gemini para que Sali use IA.

Para generar los secretos, copiar la salida de cada comando:

```bash
openssl rand -hex 24   # para DB_PASSWORD
openssl rand -hex 48   # para JWT_SECRET
```

Guardar en nano con `Ctrl+O`, `Enter` y `Ctrl+X`.

### 7. Levantar todo

```bash
docker compose up -d --build
```

La primera vez tarda unos minutos, sobre todo la compilación de la web. Para revisar el avance:

```bash
docker compose ps            # los tres servicios deben quedar "running" (api y db "healthy")
docker compose logs -f web   # aquí se ve cuando Caddy obtiene el certificado
```

Probar en el navegador:

- `https://54-12-34-56.sslip.io/api/holamundo` debe responder `"estado": "OK"`.
- `https://54-12-34-56.sslip.io` abre la app. Se puede entrar con los usuarios de prueba de siempre.

### Comandos útiles

| Acción | Comando |
|---|---|
| Actualizar a la última versión de `main` | `git pull && docker compose up -d --build` |
| Ver registros de la API | `docker compose logs -f api` |
| Reiniciar | `docker compose restart` |
| Detener | `docker compose down` (los datos se conservan en los volúmenes) |
| Borrar también la base de datos | `docker compose down -v` (se vuelve a sembrar con los datos de prueba) |
| Respaldo de la base | `docker compose exec db pg_dump -U salaabierta sala_abierta_db > respaldo.sql` |

---

## Parte 2 · APK de Android (EAS Build)

El APK se compila en los servidores de Expo, así que no hace falta instalar Android Studio.

1. Crear una cuenta gratuita en <https://expo.dev/signup>.
2. En `frontend/eas.json`, reemplazar `https://54-12-34-56.sslip.io` por el dominio real del paso 3. La URL de la API queda grabada dentro del APK.
3. En una terminal, dentro de la carpeta `frontend`, ejecutar:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

- La primera vez pregunta si se crea el proyecto en EAS y si se genera la clave de firma (*keystore*). Responder **sí** a ambas.
- La compilación tarda entre 10 y 20 minutos. Al terminar, muestra un **enlace y un código QR** para descargar el `.apk`.
- En el teléfono, abrir el enlace, descargar e instalar. Android pedirá permitir "instalar apps desconocidas".

La app se llama **SalaAbierta** (paquete `cl.salaabierta.app`) y se conecta directamente al servidor de AWS por HTTPS, sin depender del PC ni de Expo Go.

> Si la IP o el dominio cambian, hay que actualizar `eas.json` y volver a compilar el APK.

---

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| El navegador no abre la página | El grupo de seguridad no tiene abiertos los puertos 80 y 443, o la instancia está detenida (laboratorio apagado) |
| Caddy no obtiene el certificado | `DOMINIO` no coincide con la Elastic IP, o el puerto 80 está cerrado |
| `Falta DB_PASSWORD en .env` | No se creó o no se completó el archivo `.env` |
| La compilación de `web` se corta (*killed*) | Falta memoria: usar t3.medium o agregar swap (paso 5) |
| El APK no inicia sesión | La URL de `eas.json` no es la del servidor, o el servidor está apagado |
| Sali responde en "modo básico" | Falta `GEMINI_API_KEY` en `.env` (después de agregarla: `docker compose up -d api`) |
