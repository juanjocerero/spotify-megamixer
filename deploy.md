# Guía de Despliegue en VPS para Megamixer

Esta guía detalla los pasos para desplegar el proyecto Megamixer en un servidor privado virtual (VPS). Se asume que el servidor ya tiene una configuración base con Nginx, PM2 y Certbot.

## Stack Tecnológico
- **Framework**: Next.js
- **ORM**: Prisma
- **Base de Datos**: PostgreSQL
- **Autenticación**: BetterAuth
- **Servidor Web**: Nginx (como reverse proxy)
- **Gestor de Procesos**: PM2
- **Certificado SSL**: Let's Encrypt (Certbot)

---

### Requisitos Previos
1.  **VPS**: Un servidor con acceso SSH y un usuario con privilegios `sudo`.
2.  **Dominio**: El subdominio `megamixer.juanjocerero.es` apuntando a la IP de tu VPS.
3.  **Software Base**: Node.js (vía NVM), PM2, Nginx y Certbot ya instalados y configurados.
4.  **Base de Datos**: Una base de datos PostgreSQL creada y accesible.
5.  **Cuenta de Spotify Developer**: Para obtener las credenciales de la API.

---

### Paso 1: Preparar el Directorio y Clonar el Proyecto

1.  **Crear el directorio de la aplicación**:
    La aplicación se alojará en `~/apps/megamixer`.
    ```bash
    mkdir -p ~/apps
    cd ~/apps
    ```

2.  **Clonar el repositorio**:
    ```bash
    git clone <URL_DEL_REPOSITORIO> megamixer
    cd megamixer
    ```

---

### Paso 2: Configuración de la Aplicación

1.  **Instalar dependencias**:
    Se recomienda usar `npm`.
    ```bash
    npm install
    ```

2.  **Configurar la aplicación de Spotify**:
    - Ve al [Dashboard de Spotify Developer](https://developer.spotify.com/dashboard).
    - Selecciona tu App y ve a "Settings".
    - En **Redirect URIs**, añade la siguiente URL:
      ```
      https://megamixer.juanjocerero.es/api/auth/callback/spotify
      ```
    - Guarda los cambios y copia el **Client ID** y el **Client Secret**.

3.  **Configurar variables de entorno**:
    Crea un fichero `.env.local` en la raíz del proyecto (`~/apps/megamixer/.env.local`).
    ```bash
    nano .env.local
    ```
    Añade las siguientes variables.

    ```env
    # URL de la base de datos
    DATABASE_URL="postgresql://user:password@host:port/database"

    # URL pública de la aplicación para BetterAuth
    AUTH_URL="https://megamixer.juanjocerero.es"

    # Secreto para firmar sesiones (generar con: openssl rand -base64 32)
    AUTH_SECRET="tu_secreto_generado_con_openssl"

    # Credenciales de Spotify
    AUTH_SPOTIFY_ID="tu_client_id_de_spotify"
    AUTH_SPOTIFY_SECRET="tu_client_secret_de_spotify"

    # Credenciales para envío de emails (opcional, si se usa Resend)
    # RESEND_API_KEY="tu_api_key_de_resend"
    # EMAIL_FROM="noreply@megamixer.juanjocerero.es"
    ```

4.  **Ejecutar las migraciones de la base de datos**:
    ```bash
    npx prisma migrate deploy
    ```

5.  **Construir la aplicación para producción**:
    ```bash
    npm run build
    ```

---

### Paso 3: Añadir Certificado SSL para el Subdominio

El certificado principal `juanjocerero.es` ya existe. Vamos a ampliarlo para que cubra el nuevo subdominio.

1.  **Ejecutar Certbot para ampliar el certificado**:
    Usa el flag `--expand` y lista todos los dominios existentes más el nuevo.
    ```bash
    sudo certbot --nginx --expand -d juanjocerero.es,dbadmin.juanjocerero.es,irc.juanjocerero.es,recetas.juanjocerero.es,www.juanjocerero.es,megamixer.juanjocerero.es
    ```
    Certbot modificará automáticamente la configuración de Nginx para gestionar el nuevo subdominio y aplicar el SSL.

---

### Paso 4: Configuración de Nginx

Certbot debería haber creado una configuración básica. Vamos a asegurarnos de que esté correcta y apunte al puerto correcto.

1.  **Editar el fichero de configuración de Nginx**:
    La configuración probablemente estará en `/etc/nginx/sites-available/default` o un fichero específico si lo creaste. La entrada del servidor para `megamixer` debería parecerse a esto.
    ```bash
    sudo nano /etc/nginx/sites-enabled/default
    ```

2.  **Verificar y ajustar la configuración del `server` block**:
    Asegúrate de que el `proxy_pass` apunta al puerto `3001`, ya que el `3000` está en uso.

    ```nginx
    server {
        server_name megamixer.juanjocerero.es;

        location / {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        listen 443 ssl; # managed by Certbot
        ssl_certificate /etc/letsencrypt/live/juanjocerero.es/fullchain.pem; # managed by Certbot
        ssl_certificate_key /etc/letsencrypt/live/juanjocerero.es/privkey.pem; # managed by Certbot
        include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
    }
    ```

3.  **Probar y reiniciar Nginx**:
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

---

### Paso 5: Iniciar la Aplicación con PM2

1.  **Crear un fichero de configuración para PM2**:
    En la raíz de tu proyecto (`~/apps/megamixer`), crea un fichero llamado `ecosystem.config.js`.
    ```bash
    nano ecosystem.config.js
    ```
    Pega el siguiente contenido. Este fichero define cómo PM2 debe ejecutar la aplicación.

    ```javascript
    module.exports = {
      apps: [
        {
          name: 'megamixer',
          script: 'npm',
          args: 'start',
          interpreter: 'none',
          env: {
            NODE_ENV: 'production',
            PORT: 3001,
          },
        },
      ],
    };
    ```

2.  **Iniciar la aplicación**:
    Desde el directorio del proyecto, ejecuta:
    ```bash
    cd ~/apps/megamixer
    pm2 start ecosystem.config.js
    ```

3.  **Guardar la lista de procesos de PM2**:
    Esto asegura que PM2 reiniciará la aplicación si el servidor se reinicia.
    ```bash
    pm2 save
    ```

4.  **Verificar el estado**:
    Puedes ver los logs y el estado de la aplicación con los siguientes comandos:
    ```bash
    pm2 list
    pm2 logs megamixer
    ```

---

¡Felicidades! Tu aplicación debería estar desplegada y accesible en `https://megamixer.juanjocerero.es`.
