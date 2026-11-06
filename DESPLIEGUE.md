# Despliegue de SalaAbierta (T11)

Guía para levantar SalaAbierta completa con Docker y compartirla con otras personas.

Con un solo comando se levantan la base de datos, la API y la versión web de la app. La misma configuración sirve en tres lugares:

1. **En tu PC**, en `http://localhost`. Es la opción local que acepta el docente.
2. **Compartida por Internet** desde tu PC, con un túnel que entrega un enlace HTTPS público.
3. **En un servidor en la nube**, por ejemplo AWS (opcional).

## Qué se levanta

```
Navegador / APK ──▶ web (Caddy :80) ──/api/*──▶ api (Node/Express :3000) ──▶ db (PostgreSQL 17)
                    └─ sirve la versión web de la app
túnel (opcional) ──▶ web
```

| Archivo | Para qué sirve |
|---|---|
| `docker-compose.yml` | Define los contenedores, los túneles opcionales y los volúmenes |
| `backend/Dockerfile` | Imagen de la API (Node 22, usuario sin privilegios, health check) |
| `despliegue/web.Dockerfile` | Compila la web de Expo y la sirve con Caddy |
| `despliegue/Caddyfile` | Proxy a `/api`, cabeceras de seguridad y HTTPS automático cuando hay dominio |
| `.env.produccion.example` | Plantilla de variables (se copia como `.env`, que nunca se sube) |
| `frontend/eas.json` | Perfil `preview` que genera el APK |

La web llama a `/api` en el mismo sitio desde el que se abrió. Por eso la misma imagen funciona en localhost, con la IP de la red, detrás de un túnel o en un servidor, sin recompilar. La base de datos no expone puertos. La API corre con `NODE_ENV=production`, por lo que exige `JWT_SECRET`.

---

## Parte 1 · En tu PC con Docker (localhost)

### 1. Instalar Docker Desktop (una sola vez)

1. Descargar **Docker Desktop for Windows** desde <https://www.docker.com/products/docker-desktop/> e instalarlo con las opciones por defecto (usa WSL 2).
2. Reiniciar si lo pide y abrir Docker Desktop. Esperar a que abajo a la izquierda diga **Engine running**.

### 2. Configurar

En una terminal (PowerShell o la de VS Code), en la carpeta del proyecto:

```powershell
git pull
copy .env.produccion.example .env
code .env
```

En `.env`:

- `DOMINIO`: dejar `:80`.
- `DB_PASSWORD` y `JWT_SECRET`: escribir textos largos inventados. `JWT_SECRET` debe tener al menos 32 caracteres.
- `GEMINI_API_KEY`: opcional; pegar la clave de Gemini para que Sali use IA.

### 3. Levantar

```powershell
docker compose up -d --build
```

La primera vez tarda varios minutos, porque descarga imágenes y compila la web. Las siguientes veces es casi inmediato.

```powershell
docker compose ps
```

Los servicios `db`, `api` y `web` deben quedar *running*, y `db` y `api` además *healthy*.

Abrir **<http://localhost>**. Se entra con los mismos usuarios de prueba de siempre. Otros dispositivos conectados al mismo wifi pueden entrar con `http://<IP-del-PC>`, por ejemplo `http://192.168.1.2`, si el firewall de Windows lo permite.

---

## Parte 2 · Compartirla por Internet con un túnel

Un túnel crea un enlace público con HTTPS que llega hasta los contenedores de tu PC. No hace falta abrir puertos en el router. Funciona mientras el PC esté encendido y Docker corriendo.

### Opción A · Cloudflare (sin cuenta, recomendada para mostrarla rápido)

```powershell
docker compose --profile tunel up -d --build
docker compose logs tunel
```

En los registros aparece un recuadro con un enlace del tipo **`https://palabras-al-azar.trycloudflare.com`**. Ese enlace se comparte y abre la app desde cualquier lugar.

> El enlace cambia cada vez que se reinicia el túnel. Para cerrarlo: `docker compose stop tunel`.

### Opción B · ngrok con dominio fijo (necesaria para el APK)

ngrok regala **un dominio fijo** por cuenta, así que el enlace no cambia nunca.

1. Crear una cuenta gratis en <https://dashboard.ngrok.com/signup>.
2. Copiar el **Authtoken**, que está en *Your Authtoken*.
3. En *Domains*, reclamar el dominio gratuito, del tipo `algo-algo.ngrok-free.app`.
4. Completar en `.env`:

   ```
   NGROK_AUTHTOKEN=el-token-copiado
   NGROK_DOMINIO=algo-algo.ngrok-free.app
   ```

5. Levantar:

   ```powershell
   docker compose --profile ngrok up -d --build
   ```

6. Abrir `https://algo-algo.ngrok-free.app`. La primera visita desde un navegador muestra un aviso de ngrok: presionar *Visit Site*.

---

## Parte 3 · APK de Android (EAS Build)

El APK se compila en los servidores de Expo, así que no hace falta Android Studio. Como la URL de la API queda grabada dentro del APK, necesita una dirección que no cambie: el dominio fijo de ngrok (Parte 2, opción B) o el de un servidor (Parte 4).

1. Crear una cuenta gratuita en <https://expo.dev/signup>.
2. En `frontend/eas.json`, reemplazar `https://54-12-34-56.sslip.io` por la URL fija, por ejemplo `https://algo-algo.ngrok-free.app`.
3. En la carpeta `frontend`, ejecutar:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

- La primera vez pregunta si se crea el proyecto en EAS y si se genera la clave de firma (*keystore*). Responder **sí** a ambas.
- La compilación tarda entre 10 y 20 minutos. Al terminar, muestra un **enlace y un código QR** para descargar el `.apk`.
- En el teléfono, abrir el enlace, descargar e instalar. Android pedirá permitir "instalar apps desconocidas".

La app se llama **SalaAbierta** (paquete `cl.salaabierta.app`). Funciona mientras el PC tenga Docker y el túnel de ngrok encendidos, o mientras el servidor esté arriba.

> Si cambia la URL, hay que actualizar `eas.json` y volver a compilar el APK.

---

## Parte 4 (opcional) · Servidor en AWS

> Requiere un curso **AWS Academy Learner Lab** vigente o una cuenta AWS propia. Los pasos son los mismos en ambos casos (en una cuenta propia, la clave se crea en *Key pair → Create new key pair*).

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

- `DOMINIO`: el de sslip.io del paso 3 (con dominio, Caddy obtiene HTTPS solo).
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

---

## Comandos útiles

| Acción | Comando |
|---|---|
| Actualizar a la última versión de `main` | `git pull` y luego `docker compose up -d --build` (agregar `--profile tunel` o `--profile ngrok` si se usa) |
| Ver registros de la API | `docker compose logs -f api` |
| Reiniciar | `docker compose restart` |
| Detener todo | `docker compose --profile tunel --profile ngrok down` (los datos se conservan) |
| Borrar también la base de datos | `docker compose down -v` (se vuelve a sembrar con los datos de prueba) |
| Respaldo de la base | `docker compose exec db pg_dump -U salaabierta sala_abierta_db > respaldo.sql` |

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| `Falta DB_PASSWORD en .env` | No se creó o no se completó el archivo `.env` |
| `port is already allocated` en el puerto 80 | Otro programa usa el puerto 80 (IIS, Skype, XAMPP): cerrarlo |
| `http://localhost` no carga pero `docker compose ps` está bien | Esperar a que `api` quede *healthy* y revisar `docker compose logs web` |
| No aparece el enlace de Cloudflare | Repetir `docker compose logs tunel` unos segundos después |
| ngrok dice que el dominio no es válido | `NGROK_DOMINIO` debe ser exactamente el reclamado en el panel, sin `https://` |
| La compilación de `web` se corta (*killed*) | Falta memoria: en Docker Desktop subir la memoria (Settings → Resources) o, en un servidor, usar swap |
| El APK no inicia sesión | La URL de `eas.json` no coincide con la del túnel o servidor, o están apagados |
| Sali responde en "modo básico" | Falta `GEMINI_API_KEY` en `.env` (después de agregarla: `docker compose up -d api`) |
