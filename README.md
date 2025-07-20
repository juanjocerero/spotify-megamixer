# Spotify Megamixer

[![Deploy with Vercel](https://vercel.com/button)](https://spotify-megamixer.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Una potente herramienta web para mezclar, sincronizar y gestionar tus playlists de Spotify como nunca antes. Crea **"Megalistas"** inteligentes que se actualizan con sus fuentes o genera **"Listas Sorpresa"** aleatorias con un solo clic.

Construida sobre una arquitectura robusta, con persistencia de datos y una lógica de **sincronización incremental** para una experiencia de usuario rápida y fiable.

<br/>

[**➡️ Visita la Aplicación Desplegada ⬅️**](https://spotify-megamixer.vercel.app/)

<br/>

---

## ✨ Características Principales

### 🚀 Sincronización Incremental (Solo Megalistas)
La función estrella de la aplicación, diseñada para ser increíblemente rápida y respetuosa con tus playlists.

*   **Rendimiento Drástico:** En lugar de borrar y reescribir todo, la app solo añade las canciones nuevas y elimina las obsoletas (un "diff sync").
*   **Conserva tus Metadatos:** ¡La mejora más importante! Las canciones que no cambian **conservan su fecha de adición original y su posición** por defecto.
*   **Previsualización y Confirmación:** Antes de ejecutar una sincronización, la app te muestra un resumen exacto de los cambios. Tú siempre tienes el control.
*   **Reordenado Opcional:** Tras confirmar una sincronización con cambios, la app te da a elegir si quieres reordenar la mezcla resultante o mantener el orden.
*   **Autocuración:** Si una de las playlists de origen fue eliminada, la aplicación la excluye de futuras sincronizaciones para evitar errores.

### 🔀 Creación y Gestión Inteligente
La aplicación distingue entre dos tipos de playlists inteligentes:

#### 🟢 Megalistas (Uniones Sincronizables)
*   **Mezcla Estándar:** Selecciona dos o más playlists y combínalas en una nueva "Megalista".
*   **Añadir a Existente:** Enriquece cualquier playlist creada previamente con las canciones de una o más playlists adicionales. (Nota: al hacer esto sobre una "Lista Sorpresa", esta se convertirá en una "Megalista").

#### 🔵 Listas Sorpresa (Mezclas Aleatorias)
*   **Sorpresa desde Selección:** Crea una playlist con un número específico de canciones aleatorias a partir de una o varias playlists que hayas seleccionado.
*   **Sorpresa Totalmente Aleatoria:** Genera una playlist aleatoria con un número de canciones a tu elección, usando hasta 50 playlists de tu librería escogidas al azar como fuente.

### 🛠️ Herramientas Universales
*   **Control Total Sobre el Orden:** Reordena cualquier playlist creada cuando quieras, ya sea de forma individual, en lote o global. El reordenado también se ofrece como paso opcional tras crear o actualizar una playlist.
*   **Ver Canciones:** Accede a una vista detallada de las canciones de CUALQUIER playlist en un panel lateral.
*   **Edición Directa:** Edita el nombre y la descripción de cualquier playlist de tu propiedad directamente desde la aplicación.
*   **Eliminación Múltiple:** Deja de seguir una o varias playlists a la vez de forma segura.

### 💻 Interfaz y Experiencia de Usuario
*   **Carga Infinita y Virtualización:** Navega por miles de playlists sin esfuerzo gracias a `@tanstack/react-virtual`.
*   **Interacción Avanzada:** Búsqueda difusa, ordenación flexible y navegación completa por teclado.
*   **Manejo de Errores:** La aplicación gestiona el *rate limiting* de la API y proporciona feedback claro al usuario en todo momento.

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

## 🏛️ Arquitectura Refinada: "Cerebro vs. Renderizadores"

Tras una refactorización integral, el proyecto sigue un patrón estricto que centraliza la lógica y simplifica los componentes.

1.  **Capa de Datos Inicial (`/app/dashboard/page.tsx`):**
    *   Un **Server Component** se encarga de la carga de datos inicial. Obtiene las playlists de Spotify y las cruza con la base de datos propia para enriquecerlas con metadatos (`isMegalist`, `playlistType`).

2.  **El Cerebro de la UI (`/lib/hooks/usePlaylistActions.ts`):**
    *   Este hook es la **Única Fuente de Verdad** para todo el estado interactivo.
    *   Utiliza un `useReducer` con **uniones discriminadas de TypeScript** para un manejo de estado de diálogos 100% seguro y predecible.
    *   Contiene **toda la lógica de negocio del cliente**: decide cuándo llamar a las Server Actions, qué `toast` mostrar, y cómo encadenar los pasos de un flujo (ej: previsualizar → pedir reordenado → ejecutar).
    *   Abstrae la lógica repetitiva en **`wrappers` de acción** (`executeAction`, `executeBatchAction`) que gestionan el ciclo de vida de la comunicación con el servidor.

3.  **El Puente y los Renderizadores (`/lib/contexts/ActionProvider.tsx`):**
    *   Este componente es un **"puente tonto"** que conecta el "cerebro" con la UI.
    *   Expone las funciones para iniciar acciones a través del hook `useActions`.
    *   Su `DialogRenderer` actúa como un **simple enrutador**: basándose en el estado del cerebro, renderiza el componente de diálogo apropiado.
    *   Toda la lógica de presentación de los diálogos vive en **componentes autocontenidos** dentro de `/components/custom/dialogs/`.

4.  **Consumidores de UI (`/components/custom/*`):**
    *   Componentes como `FloatingActionBar.tsx` o `PlaylistDisplay.tsx` son ahora "tontos".
    *   Simplemente llaman a una función del contexto (ej: `useActions().openSyncDialog(selection)`). No saben cómo funciona el flujo; solo lo inician.
    *   Se usan componentes de UI abstraídos como `ActionBarButton.tsx` para mantener el código limpio y declarativo (DRY).

5.  **Backend (`/lib/action.ts`):**
    *   Las **Server Actions** son el corazón del backend. Han sido refactorizadas para no lanzar errores, sino devolver un objeto **`ActionResult`** estandarizado (`{ success, data }` o `{ success, error }`), haciendo la comunicación cliente-servidor robusta y predecible.