¡Por supuesto! Un buen `README.md` es la tarjeta de presentación de cualquier proyecto. Es fundamental que refleje la calidad y la arquitectura del código que contiene.

He preparado una versión actualizada, completa y profesional del `README.md` para "Spotify Megamixer", incorporando todos los cambios y mejoras de nuestra refactorización. Está pensado tanto para usuarios que quieran entender la aplicación como para desarrolladores que quieran colaborar o analizar el código.

---

# Spotify Megamixer

Lleva la gestión de tus playlists de Spotify al siguiente nivel. **Spotify Megamixer** es una herramienta web avanzada, construida con las últimas tecnologías, que te permite combinar, sincronizar y descubrir música de formas que la aplicación oficial no permite.

**[➡️ Ver la aplicación en vivo](https://spotify-megamixer.vercel.app/)**

---

## ✨ Características Principales

*   **Creación y Sincronización de Megalistas:** Combina múltiples playlists en una única "Megalista". La aplicación realiza una sincronización incremental inteligente (*diff sync*), añadiendo solo las canciones nuevas y eliminando las que ya no están en las listas de origen, preservando tus metadatos.
*   **Congelar y Proteger Playlists:** ¿Tienes una Megalista perfecta que no quieres que cambie? "Congélala" para protegerla de futuras sincronizaciones. Esta acción es totalmente reversible.
*   **Listas Sorpresa Inteligentes:** Crea mezclas aleatorias a partir de tus playlists seleccionadas o de una selección al azar de toda tu librería. Ideal para descubrir joyas olvidadas.
*   **Búsqueda Dual Avanzada:**
    *   **Filtro Local:** Filtra y ordena instantáneamente tu propia librería de playlists por nombre, número de canciones o propietario.
    *   **Búsqueda Global:** Busca canciones, álbumes y playlists públicas en todo el catálogo de Spotify, con resultados unificados y fáciles de añadir.
*   **Interfaz de Alto Rendimiento:**
    *   **Carga Inicial Instantánea:** Gracias al Renderizado en Servidor (SSR), tus playlists se cargan de inmediato.
    *   **Scroll Infinito y Virtualización:** Navega por miles de playlists sin ninguna degradación del rendimiento.
*   **Gestión Completa de Playlists:** Edita los detalles de cualquier playlist, reordena sus canciones, previsualiza su contenido o elimínala, todo desde una interfaz centralizada.

## 🚀 Stack Tecnológico

Este proyecto utiliza un stack moderno, eficiente y escalable, enfocado en el rendimiento y la experiencia de desarrollo.

*   **Framework:** **Next.js 14+** (App Router)
*   **Lenguaje:** **TypeScript**
*   **Backend:** **Next.js Server Actions**
*   **Base de Datos:** **Vercel Postgres** (proveído por Neon)
*   **ORM:** **Prisma**
*   **Autenticación:** **Auth.js** (NextAuth v5)
*   **UI y Estilos:** **Tailwind CSS** y **Shadcn/ui**
*   **Gestión de Estado (Cliente):** **Zustand** (para el caché global) y React Hooks
*   **Virtualización de Listas:** **TanStack Virtual**
*   **Notificaciones:** **Sonner**

## 🏛️ Arquitectura del Software

La aplicación ha sido refactorizada siguiendo un patrón de **separación estricta de responsabilidades**, lo que hace que el código sea altamente modular, mantenible y fácil de testear.

El núcleo de la arquitectura se basa en el concepto de **"Cerebros" (Hooks de Lógica) vs. "Renderizadores" (Componentes de UI)**.

#### Los Cerebros (Hooks Especializados)

1.  🧠 **`usePlaylistActions` (Cerebro de Lógica):** Encapsula toda la lógica de negocio. Ejecuta las Server Actions, actualiza el estado global en Zustand y gestiona el estado de carga (`isProcessing`). No sabe nada sobre la UI de los diálogos, solo solicita que se abran.
2.  🧠 **`useDialogManager` (Cerebro de Diálogos):** Funciona como una máquina de estados para la UI modal. Es el único responsable de saber QUÉ diálogo debe mostrarse en cada momento.
3.  🧠 **`useSpotifySearch` (Cerebro de Búsqueda):** Gestiona de forma autónoma toda la lógica de la búsqueda global en Spotify, incluyendo el *debouncing* y los resultados.

#### El Flujo de Datos

El flujo es unidireccional y orquestado por el componente `ActionProvider`, que actúa como el **compositor principal de la arquitectura**:

1.  **Carga Inicial (SSR):** El Server Component `page.tsx` obtiene los datos iniciales.
2.  **Disparo de Acción:** Un componente de UI (ej: un botón) llama a una función del contexto `useActions` (ej: `openDeleteDialog`).
3.  **Comunicación entre Cerebros:**
    *   `usePlaylistActions` recibe la llamada y pide a `useDialogManager` que abra el diálogo de confirmación.
    *   `useDialogManager` actualiza su estado y se renderiza el diálogo correspondiente.
4.  **Confirmación:** Cuando el usuario confirma, el `ActionProvider` invoca el *callback* de lógica correspondiente en `usePlaylistActions`, pasándole los datos necesarios que obtiene del estado del diálogo.
5.  **Ejecución:** `usePlaylistActions` ejecuta la Server Action, y al finalizar, actualiza el store de Zustand, lo que provoca que la UI se actualice de forma reactiva.

## ⚙️ Cómo Ejecutar el Proyecto Localmente

Para clonar y ejecutar este proyecto en tu máquina local, sigue estos pasos:

#### 1. Prerrequisitos
*   Node.js (v18 o superior)
*   `pnpm`, `npm` o `yarn`
*   Una cuenta de Spotify

#### 2. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/spotify-megamixer.git
cd spotify-megamixer
```

#### 3. Instalar Dependencias
```bash
npm install
```

#### 4. Configurar Variables de Entorno

Crea un fichero `.env.local` en la raíz del proyecto. Necesitarás obtener credenciales de la **API de Spotify** y una base de datos de **Vercel Postgres**.

1.  **Spotify:** Ve al [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), crea una nueva aplicación y obtén tu `Client ID` y `Client Secret`. Asegúrate de añadir `http://localhost:3000/api/auth/callback/spotify` a las *Redirect URIs* en la configuración de tu app de Spotify.
2.  **Base de Datos:** Crea un nuevo proyecto en [Vercel](https://vercel.com) y añade un almacenamiento de Vercel Postgres (proveído por Neon). Obtén las cadenas de conexión (pooling y non-pooling).

Copia el siguiente contenido en tu `.env.local` y rellénalo con tus credenciales:

```env
# Autenticación con Auth.js y Spotify
AUTH_SECRET="GENERATED_SECRET" # Genera un secreto con `openssl rand -base64 32`
AUTH_SPOTIFY_ID="TU_CLIENT_ID_DE_SPOTIFY"
AUTH_SPOTIFY_SECRET="TU_CLIENT_SECRET_DE_SPOTIFY"

# Base de Datos (Vercel/Neon)
POSTGRES_PRISMA_URL="TU_URL_DE_CONEXION_CON_POOLING"
POSTGRES_URL_NON_POOLING="TU_URL_DE_CONEXION_SIN_POOLING"

# Email de Contacto (Opcional, con Resend)
RESEND_API_KEY="TU_API_KEY_DE_RESEND"
CONTACT_EMAIL_TO="email_destino@dominio.com"
```

#### 5. Sincronizar la Base de Datos

Ejecuta los siguientes comandos de Prisma para generar el cliente y sincronizar el esquema con tu base de datos:

```bash
npx prisma generate
npx prisma db push
```

#### 6. Ejecutar la Aplicación
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación funcionando.

## 🗂️ Estructura del Proyecto

```
/
├── app/                  # Rutas de la aplicación (App Router)
│   └── dashboard/
│       └── page.tsx      # Server Component para la carga inicial (SSR)
├── components/           # Componentes de React
│   ├── custom/           # Componentes específicos de la aplicación
│   │   ├── DashboardClient.tsx
│   │   ├── DashboardHeader.tsx
│   │   └── ...
│   └── ui/               # Componentes de Shadcn/ui
├── lib/                  # Lógica central, utilidades y hooks
│   ├── actions/          # Server Actions (backend)
│   ├── contexts/         # React Contexts (ActionProvider)
│   ├── hooks/            # Hooks de cliente ("Los Cerebros")
│   ├── store.ts          # Store de Zustand
│   └── ...
├── prisma/               # Configuración de Prisma
│   └── schema.prisma     # Esquema de la base de datos
├── types/                # Definiciones de TypeScript
└── ...```

---

Creado con 💚 por **Juanjo Cerero**.