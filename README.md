# Spotify Megamixer

[![Deploy with Vercel](https://vercel.com/button)](https://spotify-megamixer.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Una potente herramienta web para mezclar, sincronizar y gestionar tus playlists de Spotify como nunca antes. Crea **"Megalistas"** inteligentes que se actualizan con sus fuentes, **congélalas** para preservar una mezcla perfecta, o genera **"Listas Sorpresa"** aleatorias con un solo clic.

Construida sobre una arquitectura robusta, con persistencia de datos y una lógica de **sincronización incremental** para una experiencia de usuario rápida y fiable.

<br/>

[**➡️ Visita la Aplicación Desplegada ⬅️**](https://spotify-megamixer.vercel.app/)

<br/>

---

## ✨ Características Principales

### 🚀 Sincronización Inteligente
La función estrella de la aplicación, diseñada para **Megalistas no congeladas (verdes)** para ser increíblemente rápida y respetuosa con tus playlists.

*   **Rendimiento Drástico:** En lugar de borrar y reescribir todo, la app solo añade las canciones nuevas y elimina las obsoletas (un "diff sync").
*   **Conserva tus Metadatos:** ¡La mejora más importante! Las canciones que no cambian **conservan su fecha de adición original y su posición** por defecto.
*   **Previsualización y Confirmación:** Antes de ejecutar una sincronización, la app te muestra un resumen exacto de los cambios. Tú siempre tienes el control.
*   **Reordenado Opcional:** Tras confirmar una sincronización con cambios, la app te da a elegir si quieres reordenar la mezcla resultante.
*   **Autocuración:** Si una de las playlists de origen fue eliminada, la aplicación la excluye de futuras sincronizaciones para evitar errores.

### 🔀 Creación y Gestión Inteligente
La aplicación distingue entre varios tipos y estados de playlists inteligentes:

#### 🟢 Megalistas (Uniones Sincronizables)
*   **Mezcla Estándar:** Selecciona dos o más playlists y combínalas en una nueva "Megalista". Son las únicas que se pueden sincronizar.
*   **Añade Fuentes:** Enriquece una Megalista existente añadiendo más playlists como fuente.
*   **Inyecta Canciones:** Añade canciones o álbumes sueltos desde la búsqueda global de Spotify directamente a una Megalista.

#### 🔵 Megalistas Congeladas (Uniones Protegidas)
*   **Congela y Protege:** Marca cualquier Megalista como "congelada" para evitar que se pueda sincronizar. Perfecto para conservar una mezcla específica. Es una acción reversible.

#### 🔴 Megalistas Vacías
*   **Empieza desde Cero:** Crea una playlist vacía y añádele fuentes más tarde. Se activa y se vuelve sincronizable automáticamente al añadirle la primera playlist.

#### 🟣 Listas Sorpresa (Mezclas Aleatorias)
*   **Sorpresa desde Selección:** Crea una playlist con un número específico de canciones aleatorias a partir de una o varias playlists que hayas seleccionado.
*   **Sorpresa Totalmente Aleatoria:** Genera una playlist aleatoria con un número de canciones a tu elección, usando hasta 50 playlists de tu librería escogidas al azar como fuente.

### 🛠️ Herramientas de Descubrimiento y Gestión
*   **Búsqueda Dual Optimizada:** La interfaz presenta dos barras de búsqueda: una para filtrar rápidamente tu biblioteca y otra para buscar en todo Spotify.
*   **Resultados de Búsqueda Avanzados:** La búsqueda global muestra los resultados en un popover inteligente con:
    *   **Lista Única:** Canciones, álbumes y playlists se muestran en una sola lista unificada.
    *   **Ordenación Interna:** Puedes ordenar los resultados por relevancia o agruparlos por tipo.
    *   **Identificación Visual:** Cada resultado muestra un icono de su tipo, y las playlists que ya sigues se marcan con un "check" en su carátula.
*   **Vista de Canciones Optimizada:** Accede a una vista detallada de las canciones de CUALQUIER playlist. La vista está **optimizada para playlists enormes**, cargando las canciones de forma incremental.
*   **Control Total Sobre el Orden:** Reordena cualquier playlist creada por la app cuando quieras, de forma individual o en lote.
*   **Edición Directa y Eliminación Múltiple:** Edita el nombre/descripción o deja de seguir una o varias playlists a la vez de forma segura.

### 💻 Interfaz y Experiencia de Usuario
*   **Carga Infinita y Virtualización:** Navega por miles de playlists sin esfuerzo gracias a `@tanstack/react-virtual`.
*   **Controles Integrados:** Los controles de ordenación están integrados directamente en las barras de búsqueda para una interfaz más limpia.
*   **Interacción Avanzada:** Búsqueda difusa que perdona errores, ordenación flexible y navegación completa por teclado.
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
    *   **Caché de Datos:** [Zustand](https://github.com/pmndrs/zustand). Uso de selectores optimizados con **`useShallow`** para prevenir re-renderizados innecesarios.
    *   **Estado de UI/Acciones:** [React `useReducer` & `Context`](https://react.dev/) para una gestión de estado centralizada y predecible de los flujos de usuario.
*   **Notificaciones:** [Sonner](https://sonner.emilkowal.ski/)
*   **Despliegue:** [Vercel](https://vercel.com/)

---

## 🏛️ Arquitectura Refinada: "Cerebro vs. Renderizadores"

La arquitectura sigue un patrón estricto que centraliza la lógica y simplifica los componentes.

1.  **Capa de Datos Inicial (`/app/dashboard/page.tsx`):**
    *   Un **Server Component** se encarga de la carga de datos inicial. Obtiene las playlists de Spotify y las cruza con la base de datos propia para enriquecerlas con metadatos (`isMegalist`, `playlistType`, `isFrozen`).

2.  **Los "Cerebros" de la UI (`/lib/hooks/*.ts`):**
    *   **`usePlaylistActions`:** Es la **Única Fuente de Verdad** para todo el estado interactivo de la biblioteca del usuario. Utiliza un `useReducer` con uniones discriminadas de TypeScript para un manejo de estado de diálogos 100% seguro y predecible.
    *   **`useSpotifySearch`:** Un hook especializado que gestiona de forma autónoma la lógica de la búsqueda global en Spotify (input, debouncing, resultados).

3.  **El Puente y los Renderizadores (`/lib/contexts/ActionProvider.tsx`):**
    *   Este componente conecta el "cerebro" `usePlaylistActions` con la UI.
    *   Expone las funciones para iniciar acciones a través del hook `useActions`.
    *   Su `DialogRenderer` actúa como un **simple enrutador**: basándose en el estado del cerebro, renderiza el componente de diálogo apropiado.

4.  **Consumidores de UI (`/components/custom/*`):**
    *   Componentes como `DashboardClient.tsx` orquestan la UI, integrando los "cerebros" y pasando los datos a los componentes de visualización.
    *   Componentes como `SearchResultsPopover.tsx` son ahora más inteligentes, gestionando su propio estado de UI (como la ordenación) para una mayor encapsulación.

5.  **Backend (`/lib/actions/*.ts`):**
    *   Las **Server Actions** son el corazón del backend. Devuelven un objeto **`ActionResult`** estandarizado (`{ success, data }` o `{ success, error }`), haciendo la comunicación cliente-servidor robusta y predecible.