# Spotify Megamixer

[![Deploy with Vercel](https://vercel.com/button)](https://spotify-megamixer.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Una potente herramienta web para mezclar, sincronizar y gestionar tus playlists de Spotify como nunca antes. Construida con un stack moderno, persistencia de datos y una lógica de **sincronización incremental** para una experiencia de usuario robusta, rápida y que preserva tus metadatos.

<br/>

[**➡️ Visita la Aplicación Desplegada ⬅️**](https://spotify-megamixer.vercel.app/)

<br/>

---

## ✨ Características Principales

### 🚀 Sincronización Incremental (Diff Sync)
La función estrella de la aplicación, rediseñada para ser increíblemente rápida y respetuosa con tus playlists.

*   **Rendimiento Drástico:** En lugar de borrar y reescribir todo, la app solo añade las canciones nuevas y elimina las obsoletas. Una sincronización que antes tardaba minutos ahora puede tardar segundos.
*   **Conserva tus Metadatos:** ¡La mejora más importante! Las canciones que no cambian **conservan su fecha de adición original y su posición**, permitiéndote seguir ordenando por "Fecha de adición" en Spotify.
*   **Previsualización y Confirmación:** Antes de ejecutar una sincronización (individual, en lote o global), la app te muestra un resumen exacto de los cambios. Tú siempre tienes el control.
*   **Autocuración:** Si una de las playlists de origen fue eliminada en Spotify, la aplicación lo detecta y la excluye de futuras sincronizaciones para evitar errores.

### 🔀 Reordenado Explícito y Controlado
Para darte el máximo control, la función de reordenar ahora es una acción separada que puedes ejecutar cuando quieras.

*   **Reordenado Individual:** Desde el menú de una Megalista.
*   **Reordenado en Lote:** Seleccionando varias Megalistas y usando el botón de la barra de acciones.
*   **Reordenado Global:** Con un solo botón en la cabecera para reordenar todas tus Megalistas a la vez.

### ➕ Creación de Megalistas Avanzada
*   **Mezcla Estándar:** Selecciona dos o más playlists y combínalas en una nueva "Megalista".
*   **Añadir a Existente:** Enriquece una Megalista creada previamente con las canciones de una o más playlists adicionales.
*   **Megamix Sorpresa:** Genera playlists aleatorias con un número de canciones a tu elección. Usa tus playlists seleccionadas como fuente o deja que la app elija hasta 50 de tu librería al azar.

### 🛠️ Gestión Universal de Playlists
*   **Ver Canciones:** Accede a una vista detallada de las canciones de CUALQUIER playlist a través de un panel lateral.
*   **Edición Directa:** Edita el nombre y la descripción de cualquier playlist directamente desde la aplicación.
*   **Eliminación Múltiple:** Elimina una o varias playlists a la vez de forma segura.

### 💻 Interfaz y Experiencia de Usuario
*   **Carga Infinita y Virtualización:** Navega por miles de playlists sin esfuerzo. La app solo renderiza los elementos visibles, garantizando un rendimiento siempre fluido.
*   **Interacción Avanzada:** Búsqueda difusa (perdona errores tipográficos), ordenación flexible por múltiples criterios y navegación completa por teclado (flechas para mover, espacio para seleccionar).
*   **Robusto y Resiliente:** La app maneja automáticamente el rate limiting de la API de Spotify y te permite reanudar una mezcla si falla.

---

## 🛠️ Stack Tecnológico

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
*   **Backend:** [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
*   **Base de Datos:** [Vercel Postgres](https://vercel.com/postgres) (proveído por Neon)
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **Autenticación:** [NextAuth.js (Auth.js v5)](https://next-auth.js.org/)
*   **UI y Estilos:** [Tailwind CSS](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/) y **[@tanstack/react-virtual](https://tanstack.com/virtual/latest/docs/framework/react)** (para virtualización)
*   **Gestión de Estado:** [Zustand](https://github.com/pmndrs/zustand)
*   **Notificaciones:** [Sonner](https://sonner.emilkowal.ski/)
*   **Despliegue:** [Vercel](https://vercel.com/)

---

## 🏛️ Arquitectura

Este proyecto sigue un patrón de arquitectura moderno que separa claramente las responsabilidades:

1.  **Componente de Servidor (`/app/dashboard/page.tsx`):** La página principal se encarga de la carga de datos inicial. Primero, obtiene todas las playlists del usuario desde la API de Spotify. Inmediatamente después, consulta la **base de datos propia** de la aplicación (Postgres) para obtener los IDs de las Megalistas. Finalmente, **enriquece** los datos de Spotify con el estado `isMegalist` y `isSyncable` antes de pasarlos al cliente.

2.  **Componente Cliente Orquestador (`/components/custom/DashboardClient.tsx`):** Recibe los datos enriquecidos y gestiona todo el estado de la interfaz (filtros, búsqueda, ordenación) usando Zustand. Este componente compone el layout principal y pasa los datos al componente de visualización.

3.  **Componentes Especializados:**
    *   **`PlaylistDisplay.tsx`:** Gestiona la renderización de la lista de playlists. Implementa **virtualización** para asegurar un alto rendimiento. También maneja la interacción directa con cada playlist (selección, menú contextual para editar, eliminar, sincronizar y reordenar).
    *   **Acciones Centralizadas (`FloatingActionBar.tsx`, `SyncAllButton.tsx`, `ShuffleAllButton.tsx`):** Las acciones que operan sobre una o varias playlists (crear, añadir, sincronizar, reordenar, eliminar) se gestionan desde componentes dedicados, cada uno con su propia lógica de estado y diálogos de confirmación.

4.  **Lógica de Backend (`/lib/action.ts`):** Todas las operaciones de escritura y modificación se centralizan en Server Actions. Estas acciones se comunican tanto con la API de Spotify (para ejecutar los cambios) como con la base de datos de la aplicación (para mantener la persistencia y la consistencia del estado `Megalist`).