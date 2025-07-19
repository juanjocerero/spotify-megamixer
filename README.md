# Spotify Megamixer

[![Deploy with Vercel](https://vercel.com/button)](https://spotify-megamixer.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Una potente herramienta web para mezclar, fusionar y gestionar tus playlists de Spotify como nunca antes, construida con persistencia de datos para una experiencia robusta y escalable.

<br/>

[**➡️ Visita la Aplicación Desplegada ⬅️**](https://spotify-megamixer.vercel.app/)

<br/>

---

## ✨ Características Principales

*   **Creación de Megalistas Avanzada:**
    *   **Mezcla Estándar:** Selecciona dos o más de tus playlists y combínalas en una nueva "Megalista".
    *   **Actualización Inteligente:** Si una Megalista ya existe, puedes elegir entre **reemplazarla** por completo o **actualizarla**, fusionando las canciones, eliminando duplicados y reordenando todo.
    *   **Enriquecimiento Múltiple:** Añade canciones de una o varias playlists a una Megalista existente con un solo clic.
    *   **Megamix Sorpresa:** Genera nuevas playlists con un número de canciones aleatorias. Esta función te permite **elegir un número específico (hasta 50) de tus playlists aleatorias como fuente** o usar tus playlists seleccionadas. **Si ya tienes una Megamix con el mismo nombre, la aplicación te permitirá sobrescribirla.**

*   **Sincronización Fiable y Autocurativa:**
    *   Actualiza tus Megalistas con las últimas canciones de sus playlists de origen, ya sea individualmente o en lote.
    *   Gracias a la base de datos dedicada, esta función es totalmente robusta e independiente de las limitaciones de la API de Spotify.
    *   **Autocuración:** Detecta y corrige automáticamente fuentes de playlist eliminadas, eliminando las referencias "fantasma" para prevenir errores futuros y manteniendo tus Megalistas funcionales.

*   **Gestión Universal de Playlists:**
    *   **Edición Directa:** Edita el nombre y la descripción de **CUALQUIER** playlist de Spotify directamente desde la aplicación.
    *   **Eliminación Flexible:** Elimina playlists individualmente desde su menú contextual o elimina **múltiples playlists** a la vez seleccionándolas y usando el botón de la barra de acciones.

*   **Interfaz de Usuario Moderna y Eficiente:**
    *   **Controles Siempre Visibles:** Una cabecera de búsqueda fija y una barra de acciones flotante rediseñada (más limpia y responsiva para móviles) aseguran que siempre tengas el control.
    *   **Diseño Responsivo:** Experiencia de usuario optimizada para escritorio y móvil, con una interfaz más compacta en pantallas grandes.
    *   **Carga Infinita y Virtualización de la Lista:** Navega por todas tus playlists sin paginación gracias al scroll infinito. **La virtualización avanzada garantiza un rendimiento fluido y eficiente, incluso con miles de playlists, cargando solo los elementos visibles en pantalla.**

*   **Interacción Avanzada:**
    *   **Búsqueda Difusa (Fuzzy Search):** Encuentra playlists incluso si cometes errores tipográficos.
    *   **Selección Rápida:** Selecciona todos los resultados de una búsqueda con un solo botón.
    *   **Navegación por Teclado:** Usa las flechas (▲/▼) para navegar, la barra espaciadora para seleccionar y `Esc` para limpiar.
    *   **Ordenación Flexible:** Organiza tus playlists por múltiples criterios: orden personalizado (Spotify), nombre (A-Z/Z-A), número de canciones (ascendente/descendente), propietario o visualiza tus Megalistas primero.

*   **Robusto y Resiliente:**
    *   **Manejo de Rate Limiting:** La aplicación reintenta automáticamente las peticiones a la API de Spotify si se excede el límite de velocidad.
    *   **Mezclas Reanudables:** Si una mezcla larga falla, puedes reanudarla exactamente desde donde se quedó.
    *   **Filtrado Inteligente de Canciones:** Previene errores de la API ignorando y filtrando elementos no válidos (ej. archivos locales o episodios de podcast) en las playlists de origen.

*   **Seguridad:** Autenticación segura a través del flujo oficial OAuth 2.0 de Spotify con NextAuth.js.
*   **Guía de Ayuda Integrada:** Accede a una página de FAQ dentro de la aplicación para entender todas las funcionalidades.

## 🛠️ Stack Tecnológico y Arquitectura

### Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
*   **Backend:** [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
*   **Base de Datos:** [Vercel Postgres](https://vercel.com/postgres) (proveído por Neon)
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **Autenticación:** [NextAuth.js (Auth.js v5)](https://next-auth.js.org/)
*   **UI y Estilos:** [Tailwind CSS](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/) y **[@tanstack/react-virtual](https://tanstack.com/virtual/latest/docs/framework/react) (para virtualización de listas)**
*   **Gestión de Estado:** [Zustand](https://github.com/pmndrs/zustand)
*   **Notificaciones:** [Sonner](https://sonner.emilkowal.ski/)
*   **Despliegue:** [Vercel](https://vercel.com/)

### Arquitectura

Este proyecto sigue un patrón de arquitectura moderno que separa claramente las responsabilidades:

1.  **Componente de Servidor (`/app/dashboard/page.tsx`):** La página principal tiene un rol doble. Primero, obtiene las playlists del usuario desde la API de Spotify. Segundo, consulta la **base de datos propia** de la aplicación para obtener los metadatos de las Megalistas. Finalmente, "enriquece" la lista de playlists con esta información antes de pasarla al cliente.
2.  **Componente Cliente Orquestador (`/components/custom/DashboardClient.tsx`):** Recibe los datos enriquecidos y gestiona el estado de la interfaz (filtros, búsqueda, **ordenación**).
3.  **Componentes Especializados:**
    *   **`FloatingActionBar.tsx`:** Rediseñado para ser más limpio y responsivo. Centraliza la lógica de acciones del usuario (crear estándar, añadir, sincronizar en lote, crear sorpresa y eliminación en lote), sus estados y los diálogos correspondientes.
    *   **`PlaylistDisplay.tsx`:** Muestra la lista de playlists, gestiona la interacción directa con la tabla (scroll, selección, navegación por teclado, **ordenación**). **Ha sido refactorizado para implementar virtualización de la lista usando `@tanstack/react-virtual`, lo que garantiza un alto rendimiento incluso con miles de playlists, recreando la estructura visual de tabla con `divs` y `flexbox` para una compatibilidad óptima.** Y provee menús contextuales universales para editar y eliminar playlists.

Esta arquitectura, que combina la obtención de datos de APIs externas y de una base de datos propia en el servidor, resulta en una aplicación rápida, segura y escalable.

## 🚀 Cómo Empezar

Sigue estos pasos para ejecutar una copia del proyecto localmente.

### Prerrequisitos

*   Node.js (versión 18.x o superior)
*   `npm`, `yarn` o `pnpm`
*   Una cuenta de Spotify
*   Una cuenta de Vercel (para usar su CLI y base de datos gratuita)

### Instalación y Configuración

1.  **Clona el repositorio:**
    ```sh
    git clone https://github.com/tu-usuario/spotify-megamixer.git
    cd spotify-megamixer
    ```

2.  **Instala las dependencias del proyecto:**
    ```sh
    npm install
    # o yarn install / pnpm install
    ```

3.  **Crea una aplicación en el Dashboard de Desarrolladores de Spotify:**
    *   Ve a [tu Dashboard](https://developer.spotify.com/dashboard).
    *   Crea una nueva aplicación.
    *   Añade `http://localhost:3000/api/auth/callback/spotify` a las "Redirect URIs" en la configuración de tu app.
    *   Guarda tu `Client ID` y `Client Secret`.

4.  **Conecta el proyecto a Vercel:**
    *   Instala la CLI de Vercel: `npm i -g vercel`
    *   Ejecuta `vercel link` y sigue los pasos para conectar tu repositorio local a un nuevo proyecto en Vercel.

5.  **Crea y conecta la base de datos:**
    *   Desde el dashboard de tu nuevo proyecto en Vercel, ve a la pestaña "Storage" y crea una nueva base de datos "Postgres".
    *   Sigue los pasos para conectarla a tu proyecto.

6.  **Configura las variables de entorno:**
    *   Añade tu `SPOTIFY_CLIENT_ID` y `SPOTIFY_CLIENT_SECRET` a las variables de entorno de tu proyecto en Vercel.
    *   Ejecuta el siguiente comando para traer todas las variables (incluida la URL de la base de datos) a tu entorno local:
    ```sh
    vercel env pull .env.local
    ```
    *   Este comando creará un fichero `.env.local` con todas las credenciales necesarias.

7.  **Aplica el esquema a tu base de datos:**
    *   Prisma necesita crear las tablas definidas en `prisma/schema.prisma`. Ejecuta:
    ```sh
    npx prisma db push
    ```

8.  **¡Ejecuta la aplicación!**
    ```sh
    npm run dev
    ```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador y deberías ver la aplicación funcionando.