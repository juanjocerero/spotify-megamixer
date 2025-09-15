# Guía de Despliegue en VPS para Spotify Megamixer

Esta guía detalla los pasos para desplegar el proyecto Spotify Megamixer en un servidor privado virtual (VPS) con Ubuntu 22.04. Se cubrirá la configuración del servidor, la base de datos, Nginx como reverse proxy, la obtención de un certificado SSL y el inicio de la aplicación con PM2.

## Stack Tecnológico
- **Framework**: Next.js
- **ORM**: Prisma
- **Base de Datos**: PostgreSQL
- **Autenticación**: NextAuth.js
- **Servidor Web**: Nginx
- **Gestor de Procesos**: PM2
- **Certificado SSL**: Let's Encrypt (Certbot)

---

### Requisitos Previos
1.  **VPS**: Un servidor con Ubuntu 22.04.
2.  **Dominio**: Un nombre de dominio apuntando a la IP de tu VPS.
3.  **Acceso SSH**: Acceso al servidor con un usuario con privilegios `sudo`.
4.  **Cuenta de Spotify Developer**: Para obtener las credenciales de la API.

---

### Paso 1: Configuración Inicial del Servidor

1.  **Actualizar el sistema**:
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

2.  **Instalar NVM y Node.js**:
    Recomendamos usar NVM (Node Version Manager) para instalar Node.js, ya que ofrece más flexibilidad.
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
    Recarga la configuración de tu shell:
    ```bash
    source ~/.bashrc
    ```
    Instala la última versión LTS de Node.js (actualmente 20.x):
    ```bash
    nvm install --lts
    ```

3.  **Instalar PM2**:
    PM2 es un gestor de procesos para aplicaciones Node.js que mantendrá tu aplicación corriendo.
    ```bash
    npm install -g pm2
    ```

4.  **Instalar Nginx**:
    ```bash
    sudo apt install nginx -y
    ```

---

### Paso 2: Configuración de la Base de Datos (PostgreSQL)

1.  **Instalar PostgreSQL**:
    ```bash
    sudo apt install postgresql postgresql-contrib -y
    ```

2.  **Crear un usuario y una base de datos**:
    Accede a la consola de PostgreSQL.
    ```bash
    sudo -u postgres psql
    ```
    Dentro de `psql`, ejecuta los siguientes comandos. Reemplaza `megamixer_user` y `password_segura` con tus propias credenciales.
    ```sql
    CREATE DATABASE megamixer_db;
    CREATE USER megamixer_user WITH ENCRYPTED PASSWORD 'password_segura';
    GRANT ALL PRIVILEGES ON DATABASE megamixer_db TO megamixer_user;
    ALTER ROLE megamixer_user WITH LOGIN;
    ```
    Sal de `psql` con `\q`.

3.  **Construir la URL de conexión**:
    La necesitarás para las variables de entorno. El formato es:
    `postgresql://<user>:<password>@<host>:<port>/<database>`
    Ejemplo: `postgresql://megamixer_user:password_segura@localhost:5432/megamixer_db`

---

### Paso 3: Configuración de la Aplicación de Spotify

1.  Ve al [Dashboard de Spotify Developer](https://developer.spotify.com/dashboard).
2.  Crea una nueva "App".
3.  Una vez creada, ve a "Edit Settings".
4.  En **Redirect URIs**, añade la URL de callback de tu aplicación. Debe ser tu dominio seguido de `/api/auth/callback/spotify`.
    ```
    https://tudominio.com/api/auth/callback/spotify
    ```
5.  Guarda los cambios.
6.  Copia el **Client ID** y el **Client Secret**. Los necesitarás en el siguiente paso.

---

### Paso 4: Clonar y Configurar el Proyecto

1.  **Clonar el repositorio**:
    Clona el proyecto en el directorio de tu elección, por ejemplo, `/var/www`.
    ```bash
    sudo git clone https://github.com/tu-usuario/spotify-megamixer.git /var/www/megamixer
    cd /var/www/megamixer
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno**:
    Crea un fichero `.env.local` en la raíz del proyecto.
    ```bash
    nano .env.local
    ```
    Añade las siguientes variables. **Es crucial** que `NEXTAUTH_SECRET` sea un valor aleatorio y seguro.

    ```env
    # URL de la base de datos del Paso 2
    DATABASE_URL="postgresql://megamixer_user:password_segura@localhost:5432/megamixer_db"

    # URL pública de tu aplicación
    NEXTAUTH_URL="https://tudominio.com"

    # Genera un secreto con: openssl rand -base64 32
    NEXTAUTH_SECRET="valor_generado_con_openssl"

    # Credenciales de Spotify del Paso 3
    SPOTIFY_CLIENT_ID="tu_client_id_de_spotify"
    SPOTIFY_CLIENT_SECRET="tu_client_secret_de_spotify"
    
    # Credenciales para el envío de emails (si aplica)
    # Ejemplo para Resend
    # RESEND_API_KEY="tu_api_key"
    # EMAIL_FROM="noreply@tudominio.com"
    ```

4.  **Ejecutar las migraciones de Prisma**:
    Esto creará las tablas en tu base de datos de producción.
    ```bash
    npx prisma migrate deploy
    ```

5.  **Construir la aplicación**:
    ```bash
    npm run build
    ```
    
6.  **Asignar permisos**:
    Asegúrate de que el usuario que corre Nginx (`www-data`) pueda acceder a los ficheros.
    ```bash
    sudo chown -R www-data:www-data /var/www/megamixer
    ```

---

### Paso 5: Configuración de Nginx como Reverse Proxy

1.  **Crear un fichero de configuración para tu sitio**:
    ```bash
    sudo nano /etc/nginx/sites-available/megamixer
    ```

2.  **Pegar la siguiente configuración**:
    Reemplaza `tudominio.com` con tu dominio.

    ```nginx
    server {
        listen 80;
        server_name tudominio.com www.tudominio.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```

3.  **Activar la configuración**:
    Crea un enlace simbólico al directorio `sites-enabled`.
    ```bash
    sudo ln -s /etc/nginx/sites-available/megamixer /etc/nginx/sites-enabled/
    ```

4.  **Verificar la sintaxis de Nginx**:
    ```bash
    sudo nginx -t
    ```
    Si no hay errores, reinicia Nginx.
    ```bash
    sudo systemctl restart nginx
    ```

---

### Paso 6: Configuración de SSL con Certbot

1.  **Instalar Certbot**:
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```

2.  **Obtener el certificado SSL**:
    Certbot leerá tu configuración de Nginx y configurará SSL automáticamente.
    ```bash
    sudo certbot --nginx -d tudominio.com -d www.tudominio.com
    ```
    Sigue las instrucciones en pantalla. Se recomienda elegir la opción de redirigir el tráfico HTTP a HTTPS.

3.  **Verificar la renovación automática**:
    Certbot configura una tarea `cron` para renovar los certificados automáticamente.
    ```bash
    sudo systemctl status certbot.timer
    ```

---

### Paso 7: Iniciar la Aplicación con PM2

1.  **Iniciar la aplicación**:
    Desde el directorio de tu proyecto (`/var/www/megamixer`), usa el fichero `ecosystem.config.js` para iniciar la aplicación.
    ```bash
    cd /var/www/megamixer
    pm2 start ecosystem.config.js
    ```

2.  **Verificar el estado**:
    ```bash
    pm2 list
    # o para monitorización en tiempo real
    pm2 monit
    ```

3.  **Guardar la configuración de PM2**:
    Esto asegura que PM2 reinicie tus aplicaciones si el servidor se reinicia.
    ```bash
    pm2 save
    ```
    
4.  **Configurar PM2 para que inicie en el arranque del sistema**:
    ```bash
    pm2 startup
    ```
    Copia y pega el comando que te proporcionará la salida del comando anterior.

---

### Paso 8: Configuración del Firewall (UFW)

1.  **Permitir conexiones**:
    Permite el tráfico SSH, HTTP y HTTPS.
    ```bash
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    ```

2.  **Activar el firewall**:
    ```bash
    sudo ufw enable
    ```
    Confirma con `y` cuando te lo pida.

---

¡Felicidades! Tu aplicación debería estar ahora desplegada y accesible en `https://tudominio.com`. Puedes ver los logs de tu aplicación en tiempo real con `pm2 logs`.
