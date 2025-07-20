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
Para darte el máximo control, la función de reordenar es una acción flexible que puedes usar de dos maneras.

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
*   **Carga Infinita y Virtualización:** Navega por miles de playlists sin esfuerzo gracias a `@tanstack/react-virtual`.
*   **Interacción Avanzada:** Búsqueda difusa, ordenación flexible y navegación completa por teclado.
*   **Manejo de Errores:** La aplicación gestiona el *rate limiting* de la API y proporciona feedback claro al usuario.

---

## 🛠️ Stack Tecnológico

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
*   **Backend:** [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
*   **Base de Datos:** [Vercel Postgres](https://vercel.com/postgres) (provisto por Neon)
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **Autenticación:** [NextAuth.js (Auth.js v5)](https://next-auth.js.org/)
*   **UI y Estilos:** [Tailwind CSS](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/)
*   **Gestión de Estado:**
    *   **Caché de Datos:** [Zustand](https://github.com/pmndrs/zustand) para la caché global de playlists.
    *   **Estado de UI/Acciones:** [React `useReducer` & `Context`](https://react.dev/) para una gestión de estado centralizada y predecible de los flujos de usuario.
*   **Notificaciones:** [Sonner](https://sonner.emilkowal.ski/)
*   **Despliegue:** [Vercel](https://vercel.com/)

---

## 🏛️ Arquitectura

Tras una refactorización clave, el proyecto sigue un patrón de **"Cerebro vs. Renderizadores"**, que centraliza la lógica y simplifica los componentes.

1.  **Capa de Datos Inicial (`/app/dashboard/page.tsx`):**
    *   Un **Server Component** se encarga de la carga de datos inicial. Obtiene las playlists de Spotify y las cruza con la base de datos propia para enriquecerlas con metadatos (`isMegalist`, `playlistType`).

2.  **El Cerebro de la UI (`/lib/hooks/usePlaylistActions.ts`):**
    *   Este hook es la **Única Fuente de Verdad** para todo el estado interactivo.
    *   Utiliza un `useReducer` para gestionar un único objeto de estado que define qué diálogo o flujo de usuario está activo (`delete`, `syncPreview`, `createName`, etc.).
    *   Contiene **toda la lógica de negocio del cliente**: decide cuándo llamar a las Server Actions, qué `toast` mostrar, y cómo encadenar los pasos de un flujo (ej: previsualizar sincronización → pedir reordenado → ejecutar).

3.  **El Puente/Renderizador (`/lib/contexts/ActionProvider.tsx`):**
    *   Este componente es un **"puente tonto"** cuya única misión es conectar el "cerebro" con la UI.
    *   Consume el estado y los callbacks del hook `usePlaylistActions`.
    *   Expone las funciones para iniciar acciones (ej: `openDeleteDialog`) a los componentes hijos a través del hook `useActions`.
    *   Renderiza el diálogo activo basándose en el estado del cerebro, sin contener lógica propia.

4.  **Consumidores (`/components/custom/*`):**
    *   Componentes como `FloatingActionBar.tsx` o `PlaylistDisplay.tsx` son ahora "tontos".
    *   Simplemente llaman a una función del contexto (`useActions()`) cuando el usuario hace clic en un botón (ej: `openSyncDialog(selection)`). No saben ni les importa cómo funciona el flujo; solo lo inician.

5.  **Backend (`/lib/action.ts`):**
    *   Las **Server Actions** siguen siendo el corazón del backend. Son funciones puras que interactúan con la API de Spotify y la base de datos. Ahora son llamadas exclusivamente por el "cerebro" (`usePlaylistActions`), asegurando un flujo de datos unidireccional y claro.