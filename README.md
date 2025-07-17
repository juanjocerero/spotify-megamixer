# Spotify Megamixer

[![Deploy with Vercel](https://vercel.com/button)](https://spotify-megamixer.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Una potente herramienta web para mezclar, fusionar y gestionar tus playlists de Spotify como nunca antes.

<br/>

[**➡️ Visita la Aplicación Desplegada ⬅️**](https://spotify-megamixer.vercel.app/)

<br/>

---

## ✨ Características Principales

*   **Mezcla sin Límites:** Selecciona dos o más de tus playlists y combínalas en una nueva "Megalista".
*   **Actualización Inteligente:** Si una Megalista ya existe, puedes elegir entre **reemplazarla** por completo o **actualizarla**, fusionando las canciones, eliminando duplicados y reordenando todo.
*   **Enriquecimiento Múltiple:** Añade canciones de una o varias playlists a una Megalista existente con un solo clic.
*   **Interfaz de Usuario Moderna y Eficiente:**
    *   **Controles Siempre Visibles:** Una cabecera de búsqueda fija y una barra de acciones flotante aseguran que siempre tengas el control, sin importar cuánto te desplaces.
    *   **Diseño Responsivo:** Experiencia de usuario optimizada tanto para escritorio como para dispositivos móviles.
    *   **Carga Infinita:** Navega por todas tus playlists sin paginación gracias al scroll infinito.
*   **Interacción Avanzada:**
    *   **Búsqueda Difusa (Fuzzy Search):** Encuentra playlists incluso si cometes errores tipográficos.
    *   **Selección Rápida:** Selecciona todos los resultados de una búsqueda con un solo botón.
    *   **Navegación por Teclado:** Usa las flechas (▲/▼) para navegar, la barra espaciadora para seleccionar y `Esc` para limpiar.
    *   **Clic en Fila Completa:** Selecciona playlists haciendo clic en cualquier parte de su fila.
*   **Robusto y Resiliente:**
    *   **Manejo de Rate Limiting:** La aplicación reintenta automáticamente las peticiones a la API de Spotify si se excede el límite de velocidad.
    *   **Mezclas Reanudables:** Si una mezcla larga falla, puedes reanudarla exactamente desde donde se quedó.
*   **Seguridad:** Autenticación segura a través del flujo oficial OAuth 2.0 de Spotify con NextAuth.js.

## 🛠️ Stack Tecnológico y Arquitectura

### Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
*   **Backend:** [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
*   **Autenticación:** [NextAuth.js (Auth.js v5)](https://next-auth.js.org/)
*   **UI y Estilos:** [Tailwind CSS](https://tailwindcss.com/) y [Shadcn/ui](https://ui.shadcn.com/)
*   **Gestión de Estado:** [Zustand](https://github.com/pmndrs/zustand)
*   **Notificaciones:** [Sonner](https://sonner.emilkowal.ski/)
*   **Despliegue:** [Vercel](https://vercel.com/)

### Arquitectura

Este proyecto sigue un patrón de arquitectura moderno y optimizado para el App Router de Next.js:

1.  **Componente de Servidor (`/app/dashboard/page.tsx`):** La página principal obtiene los datos iniciales (la primera tanda de playlists) en el servidor.
2.  **Componente Cliente Orquestador (`/components/custom/DashboardClient.tsx`):** Este componente recibe los datos iniciales y gestiona todo el estado de la interfaz que no es de acciones, como el término de búsqueda y los filtros. Renderiza la cabecera fija y los componentes hijos.
3.  **Componentes Especializados:**
    *   **`FloatingActionBar.tsx`:** Un componente cliente autónomo que gestiona toda la lógica de acciones (crear, añadir, etc.), sus estados y los diálogos correspondientes.
    *   **`PlaylistDisplay.tsx`:** Un componente cliente "tonto" cuya única responsabilidad es mostrar la lista de playlists y gestionar la interacción directa con la tabla (scroll, navegación por teclado).

Esta separación de responsabilidades hace que el código sea más limpio, mantenible y escalable.

## 🚀 Cómo Empezar

Sigue estos pasos para ejecutar una copia del proyecto localmente.

### Prerrequisitos

*   Node.js (versión 18.x o superior)
*   `npm`, `yarn` o `pnpm`
*   Una cuenta de Spotify

### Instalación

1.  **Clona el repositorio:**
    ```sh
    git clone https://github.com/tu-usuario/spotify-megamixer.git
    cd spotify-megamixer
    ```

2.  **Instala las dependencias:**
    ```sh
    npm install
    # o
    yarn install
    # o
    pnpm install
    ```

3.  **Configura las variables de entorno:**
    *   Crea un fichero llamado `.env.local` en la raíz del proyecto.
    *   Añade las siguientes variables:

    ```env
    # Credenciales de tu aplicación de Spotify
    # Obtenlas en https://developer.spotify.com/dashboard
    SPOTIFY_CLIENT_ID=TU_CLIENT_ID_DE_SPOTIFY
    SPOTIFY_CLIENT_SECRET=TU_CLIENT_SECRET_