# Spotify Megamixer

[![Deploy with Vercel](https://vercel.com/button)](https://spotify-megamixer.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Una potente herramienta web para mezclar, sincronizar y gestionar tus playlists de Spotify como nunca antes. Crea **"Megalistas"** inteligentes que se sincronizan con sus fuentes o genera **"Listas Sorpresa"** aleatorias con un solo clic. Construida con un stack moderno, persistencia de datos y una lógica de **sincronización incremental** para una experiencia de usuario robusta y rápida.

<br/>

[**➡️ Visita la Aplicación Desplegada ⬅️**](https://spotify-megamixer.vercel.app/)

<br/>

---

## ✨ Características Principales

### 🚀 Sincronización Incremental (Solo Megalistas)
La función estrella de la aplicación, diseñada para ser increíblemente rápida y respetuosa con tus playlists.

*   **Rendimiento Drástico:** En lugar de borrar y reescribir todo, la app solo añade las canciones nuevas y elimina las obsoletas.
*   **Conserva tus Metadatos:** ¡La mejora más importante! Las canciones que no cambian **conservan su fecha de adición original y su posición** por defecto.
*   **Previsualización y Confirmación:** Antes de ejecutar una sincronización, la app te muestra un resumen exacto de los cambios. Tú siempre tienes el control.
*   **Reordenado Opcional:** Tras confirmar una sincronización con cambios, la app te da a elegir si quieres reordenar la mezcla resultante o mantener el orden.
*   **Autocuración:** Si una de las playlists de origen fue eliminada, la aplicación la excluye de futuras sincronizaciones para evitar errores.

### 🔀 Control Total Sobre el Orden
Para darte el máximo control, la función de reordenar es ahora una acción flexible que puedes usar de dos maneras.

*   **Reordenado Explícito:** Reordena cualquier playlist creada (Megalista o Sorpresa) cuando quieras, ya sea de forma individual, en lote o global.
*   **Reordenado Opcional:** Después de crear o actualizar una playlist, la aplicación siempre te preguntará si deseas reordenar el contenido como último paso.

### ➕ Creación Inteligente de Playlists
La aplicación distingue entre dos tipos de playlists inteligentes:

#### 🟢 Megalistas (Uniones Sincronizables)
*   **Mezcla Estándar:** Selecciona dos o más playlists y combínalas en una nueva "Megalista".
*   **Añadir a Existente:** Enriquece cualquier playlist creada previamente con las canciones de una o más playlists adicionales. (Nota: al hacer esto sobre una "Lista Sorpresa", esta se convertirá en una "Megalista").

#### 🔵 Listas Sorpresa (Mezclas Aleatorias)
*   **Sorpresa desde Selección:** Crea una playlist con un número específico de canciones aleatorias a partir de una o varias playlists que hayas seleccionado.
*   **Sorpresa Totalmente Aleatoria:** Genera una playlist aleatoria con un número de canciones a tu elección, usando hasta 50 playlists de tu librería escogidas al azar como fuente.

### 🛠️ Gestión Universal de Playlists
*   **Ver Canciones:** Accede a una vista detallada de las canciones de CUALQUIER playlist en un panel lateral.
*   **Edición Directa:** Edita el nombre y la descripción de cualquier playlist directamente desde la aplicación.
*   **Eliminación Múltiple:** Elimina una o varias playlists a la vez de forma segura.

### 💻 Interfaz y Experiencia de Usuario
*   **Carga Infinita y Virtualización:** Navega por miles de playlists sin esfuerzo.
*   **Interacción Avanzada:** Búsqueda difusa, ordenación flexible y navegación completa por teclado.
*   **Robusto y Resiliente:** La app maneja automáticamente el rate limiting de la API y te permite reanudar mezclas fallidas.

---

## 🛠️ Stack Tecnológico

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
*   **Backend:** [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
*   **Base de Datos:** [Vercel Postgres](https://vercel.com/postgres) (provisto por Neon)
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **Autenticación:** [NextAuth.js (Auth.js v5)](https://next-auth.js.org/)
*   **UI y Estilos:** [Tailwind CSS](https://tailwindcss.com/), [Shadcn](https://shadcn.com/) y **[@tanstack/react-virtual](https://tanstack.com/virtual/latest/docs/framework/react)** (para virtualización)
*   **Gestión de Estado:** [Zustand](https://github.com/pmndrs/zustand)
*   **Notificaciones:** [Sonner](https://sonner.emilkowal.ski/)
*   **Despliegue:** [Vercel](https://vercel.com/)

---

## 🏛️ Arquitectura

Este proyecto sigue un patrón de arquitectura moderno que separa claramente las responsabilidades:

1.  **Componente de Servidor (`/app/dashboard/page.tsx`):** La página principal se encarga de la carga de datos inicial. Obtiene las playlists del usuario desde Spotify y las cruza con la **base de datos propia** de la aplicación (Postgres). Finalmente, **enriquece** los datos de Spotify con las propiedades `isMegalist`, `isSyncable` y `playlistType` (`MEGALIST` o `SURPRISE`) antes de pasarlos al cliente.

2.  **Componente Cliente Orquestador (`/components/custom/DashboardClient.tsx`):** Recibe los datos enriquecidos y gestiona el estado de la interfaz (filtros, búsqueda, ordenación) usando Zustand.

3.  **Componentes Especializados:**
    *   **`PlaylistDisplay.tsx`:** Renderiza la lista de playlists usando **virtualización**. Gestiona la interacción con cada playlist (selección, menú contextual) y muestra insignias de distinto color según el `playlistType`.
    *   **`FloatingActionBar.tsx`, `SyncAllButton.tsx`, etc.:** Componentes dedicados para las acciones en lote (crear, añadir, sincronizar, reordenar).
    *   **`SurpriseMixDialog.tsx`:** Un componente reutilizable que encapsula todo el flujo de creación de una "Lista Sorpresa".

4.  **Lógica de Backend (`/lib/action.ts`):** Todas las operaciones de escritura se centralizan en Server Actions. Estas acciones se comunican con la API de Spotify (para ejecutar los cambios) y con la base de datos (para mantener la persistencia y la consistencia del `type` de cada playlist, gestionando incluso la conversión de un tipo a otro).