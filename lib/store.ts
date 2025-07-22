// /lib/store.ts
import { createStore, useStore } from 'zustand';
import { useContext } from 'react';
import { PlaylistStoreContext } from './contexts/PlaylistStoreProvider';
import type { SpotifyPlaylist } from '@/types/spotify';

/**
 * Define la "forma" del estado global de la aplicación, incluyendo las
 * propiedades de estado y las funciones (acciones) para modificarlo.
 */
export interface PlaylistStore {
  /** Array de IDs de las playlists actualmente seleccionadas por el usuario. */
  selectedPlaylistIds: string[];
  /** Flag para controlar si se deben mostrar solo las playlists seleccionadas. */
  showOnlySelected: boolean;
  /** Caché en el cliente de todas las playlists del usuario cargadas hasta el momento. */
  playlistCache: SpotifyPlaylist[];
  
  // Acciones
  /** Alterna la selección de una playlist por su ID. */
  togglePlaylist: (id: string) => void;
  /** Devuelve `true` si una playlist con el ID dado está seleccionada. */
  isSelected: (id: string) => boolean;
  /** Deselecciona todas las playlists y resetea el filtro de "solo seleccionadas". */
  clearSelection: () => void;
  /** Añade múltiples playlists a la selección actual, evitando duplicados. */
  addMultipleToSelection: (playlistIds: string[]) => void;
  /** Elimina un conjunto de playlists de la selección actual. */
  removeMultipleFromSelection: (playlistIds: string[]) => void;
  /** Establece el estado para mostrar u ocultar las playlists no seleccionadas. */
  setShowOnlySelected: (value: boolean) => void;
  
  /** Reemplaza la caché de playlists con un nuevo conjunto. Usado para la carga inicial. */
  initializeCache: (playlists: SpotifyPlaylist[]) => void;
  /** Añade un nuevo lote de playlists al final de la caché existente (para scroll infinito). */
  addMoreToCache: (playlists: SpotifyPlaylist[]) => void;
  /** Añade una única playlist nueva al principio de la caché, si no existe ya. */
  addPlaylistToCache: (playlist: SpotifyPlaylist) => void;
  /**
   * Actualiza propiedades específicas de una playlist en la caché.
   * @param playlistId - El ID de la playlist a actualizar.
   * @param updates - Un objeto con las propiedades a cambiar. Incluye un `trackCount` opcional.
   */
  updatePlaylistInCache: (playlistId: string, updates: Partial<Omit<SpotifyPlaylist, 'id' | 'tracks'> & { trackCount?: number }>) => void;
  /** Elimina una playlist de la caché y de la selección. */
  removePlaylistFromCache: (playlistId: string) => void;
  /** Elimina múltiples playlists de la caché y de la selección. */
  removeMultipleFromCache: (playlistIds: string[]) => void;
}

/**
 * @returns El objeto con el estado inicial por defecto para un nuevo store.
 */
const getDefaultInitialState = () => ({
  selectedPlaylistIds: [],
  showOnlySelected: false,
  playlistCache: [],
});

/**
 * Fábrica de Stores de Zustand. Crea y devuelve una nueva instancia del store.
 * Esto es clave para el patrón SSR, permitiendo crear un store por cada petición
 * en el servidor y evitar el estado singleton global.
 * @param initState - Estado inicial opcional para hidratar el store en el momento de su creación.
 * @returns Una nueva instancia del store de Zustand.
 */
export const createPlaylistStore = (
  initState: Partial<PlaylistStore> = {},
) => {
  return createStore<PlaylistStore>((set, get) => ({
    ...getDefaultInitialState(),
    ...initState,
    
    // Implementación de acciones
    togglePlaylist: (id: string) => {
      set((state) => {
        const isAlreadySelected = state.selectedPlaylistIds.includes(id);
        if (isAlreadySelected) {
          return { selectedPlaylistIds: state.selectedPlaylistIds.filter((pid) => pid !== id) };
        } else {
          return { selectedPlaylistIds: [...state.selectedPlaylistIds, id] };
        }
      });
    },
    isSelected: (id: string) => {
      return get().selectedPlaylistIds.includes(id);
    },
    clearSelection: () => {
      set({ selectedPlaylistIds: [], showOnlySelected: false });
    },
    addMultipleToSelection: (playlistIds) => {
      set((state) => {
        const combinedIds = new Set([...state.selectedPlaylistIds, ...playlistIds]);
        return { selectedPlaylistIds: Array.from(combinedIds) };
      });
    },
    removeMultipleFromSelection: (playlistIds) => {
      const idSet = new Set(playlistIds);
      set((state) => ({
        selectedPlaylistIds: state.selectedPlaylistIds.filter((id) => !idSet.has(id)),
      }));
    },
    setShowOnlySelected: (value) => {
      set({ showOnlySelected: value });
    },
    initializeCache: (playlists) => {
      set({ playlistCache: playlists });
    },
    addMoreToCache: (playlists) => {
      set((state) => ({
        playlistCache: [...state.playlistCache, ...playlists],
      }));
    },
    addPlaylistToCache: (playlist) => {
      const existingCache = get().playlistCache;
      if (existingCache.some(p => p.id === playlist.id)) return;
      const newCache = [playlist, ...existingCache];
      set({ playlistCache: newCache });
    },
    updatePlaylistInCache: (playlistId, updates) => {
      set((state) => ({
        playlistCache: state.playlistCache.map((playlist) => {
          if (playlist.id !== playlistId) return playlist;
          
          const { trackCount, ...otherUpdates } = updates;
          const updatedPlaylist = { ...playlist, ...otherUpdates };
          
          if (trackCount !== undefined) {
            updatedPlaylist.tracks = { ...playlist.tracks, total: trackCount };
          }
          return updatedPlaylist;
        }),
      }));
    },
    removePlaylistFromCache: (playlistId) => {
      set((state) => ({
        playlistCache: state.playlistCache.filter((p) => p.id !== playlistId),
        selectedPlaylistIds: state.selectedPlaylistIds.filter((id) => id !== playlistId),
      }));
    },
    removeMultipleFromCache: (playlistIds) => {
      const idSet = new Set(playlistIds);
      set((state) => ({
        playlistCache: state.playlistCache.filter((p) => !idSet.has(p.id)),
        selectedPlaylistIds: state.selectedPlaylistIds.filter((id) => !idSet.has(id)),
      }));
    },
  }));
};

/**
 * Hook personalizado para acceder al store de playlists.
 * **Importante:** Este hook DEBE ser usado dentro de un `<PlaylistStoreProvider>`.
 * Extrae la instancia del store del Context de React y se suscribe a una parte del estado
 * usando un selector.
 * @template T El tipo de dato que el selector va a devolver.
 * @param selector Una función que recibe el estado completo y devuelve una porción de él.
 * (ej. `state => state.playlistCache`). El uso de selectores es obligatorio y
 * optimiza el rendimiento al evitar re-renders innecesarios.
 * @returns La parte del estado seleccionada.
 */
export const usePlaylistStore = <T>(
  selector: (store: PlaylistStore) => T,
): T => {
  const playlistStoreContext = useContext(PlaylistStoreContext);
  
  if (!playlistStoreContext) {
    throw new Error(`usePlaylistStore debe usarse dentro de un PlaylistStoreProvider`);
  }
  
  return useStore(playlistStoreContext, selector);
};