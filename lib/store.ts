// /lib/store.ts
import { create } from 'zustand';
import { SpotifyPlaylist } from '@/types/spotify';

/**
* Define la "forma" del store de Zustand. Contiene tanto el estado
* (ej. `playlistCache`, `selectedPlaylistIds`) como las acciones para modificarlo
* (ej. `togglePlaylist`, `updatePlaylistInCache`).
*/
interface PlaylistStore {
  /**
  * Un array con los IDs de las playlists que el usuario ha seleccionado.
  */
  selectedPlaylistIds: string[];
  /**
  * Añade o quita una playlist de la selección actual.
  * @param id - El ID de la playlist a seleccionar/deseleccionar.
  */
  togglePlaylist: (id: string) => void;
  /**
  * Comprueba si una playlist específica está actualmente seleccionada.
  * @param id - El ID de la playlist a comprobar.
  * @returns `true` si la playlist está seleccionada, `false` en caso contrario.
  */
  isSelected: (id: string) => boolean;
  /**
  * Limpia toda la selección de playlists y desactiva el filtro de "mostrar solo seleccionadas".
  */
  clearSelection: () => void;
  /**
  * Añade múltiples playlists a la selección actual, evitando duplicados.
  * @param playlistIds - Un array de IDs de playlists a añadir a la selección.
  */
  addMultipleToSelection: (playlistIds: string[]) => void;
  /**
  * Elimina múltiples playlists de la selección actual.
  * @param playlistIds - Un array de IDs de playlists a eliminar de la selección.
  */
  removeMultipleFromSelection: (playlistIds: string[]) => void;
  /**
  * Un booleano que controla si la vista principal debe mostrar todas las playlists o solo las seleccionadas.
  */
  showOnlySelected: boolean;
  /**
  * Modifica el estado de `showOnlySelected`.
  * @param value - El nuevo valor booleano.
  */
  setShowOnlySelected: (value: boolean) => void;
  /**
  * La caché principal de playlists del usuario en el cliente.
  * Este es la única fuente de verdad para los datos de playlists en la UI.
  */
  playlistCache: SpotifyPlaylist[];
  /**
  * Reemplaza completamente la caché de playlists. Usado para la inicialización.
  * @param playlists - El nuevo array de playlists.
  */
  setPlaylistCache: (playlists: SpotifyPlaylist[]) => void;
  /**
  * Añade más playlists a la caché existente. Usado para la paginación (scroll infinito).
  * @param playlists - El array de nuevas playlists a añadir.
  */
  addMoreToCache: (playlists: SpotifyPlaylist[]) => void;
  /**
  * Añade una única playlist al principio de la caché, si no existe ya.
  * @param playlist - La playlist a añadir.
  */
  addPlaylistToCache: (playlist: SpotifyPlaylist) => void;
  /**
  * Actualiza las propiedades de una playlist específica en la caché.
  * @param playlistId - El ID de la playlist a actualizar.
  * @param updates - Un objeto con las propiedades a modificar.
  */
  updatePlaylistInCache: (playlistId: string, updates: { 
    name?: string; 
    description?: string; 
    trackCount?: number; 
    isSyncable?: boolean; 
    isFrozen?: boolean;
    playlistType?: 'MEGALIST' | 'SURPRISE'; 
  }) => void; 
  /**
  * Elimina una única playlist de la caché y de la selección.
  * @param playlistId - El ID de la playlist a eliminar.
  */
  removePlaylistFromCache: (playlistId: string) => void;
  /**
  * Elimina múltiples playlists de la caché y de la selección.
  * @param playlistIds - Un array de IDs de playlists a eliminar.
  */
  removeMultipleFromCache: (playlistIds: string[]) => void;
}

const processPlaylists = (playlists: SpotifyPlaylist[]): SpotifyPlaylist[] => {
  return playlists;
};

/**
* Hook de Zustand que crea e inicializa el store de playlists.
* Este es el punto de acceso centralizado para que los componentes
* de React interactúen con el estado global de las playlists.
*/
export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  selectedPlaylistIds: [],
  showOnlySelected: false,
  
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
    set({ selectedPlaylistIds: [], showOnlySelected: false, })
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
      selectedPlaylistIds: state.selectedPlaylistIds.filter(
        (id) => !idSet.has(id)
      ),
    }));
  },
  setShowOnlySelected: (value) => {
    set({ showOnlySelected: value })
  },
  
  playlistCache: [],
  setPlaylistCache: (playlists) => {
    const processedPlaylists = processPlaylists(playlists);
    set({ playlistCache: processedPlaylists });
  },
  addMoreToCache: (playlists) => {
    const processedNewPlaylists = processPlaylists(playlists);
    const newCache = [...get().playlistCache, ...processedNewPlaylists];
    set({ playlistCache: newCache });
  },
  addPlaylistToCache: (playlist) => {
    const existingCache = get().playlistCache;
    if (existingCache.some(p => p.id === playlist.id)) return;
    const [processedPlaylist] = processPlaylists([playlist]);
    const newCache = [processedPlaylist, ...existingCache];
    set({ playlistCache: newCache });
  },
  removePlaylistFromCache: (playlistId) => {
    set((state) => ({
      playlistCache: state.playlistCache.filter((p) => p.id !== playlistId),
      selectedPlaylistIds: state.selectedPlaylistIds.filter((id) => id !== playlistId),
    }));
  },
  updatePlaylistInCache: (playlistId, updates) => {
    set((state) => ({
      playlistCache: state.playlistCache.map((playlist) => {
        if (playlist.id !== playlistId) {
          return playlist;
        }
        
        // Desestructuramos para separar trackCount del resto de las actualizaciones.
        const { trackCount, ...otherUpdates } = updates;
        
        // Creamos el nuevo objeto fusionando el original con las otras actualizaciones.
        const updatedPlaylist = { ...playlist, ...otherUpdates };
        
        // Si trackCount existe, actualizamos la propiedad anidada 'tracks'.
        if (trackCount !== undefined) {
          updatedPlaylist.tracks = {
            ...playlist.tracks,
            total: trackCount,
          };
        }
        
        // 4. Devolvemos el objeto limpio, sin 'delete' ni 'as any'.
        return updatedPlaylist;
      }),
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

// Selectores.
// Los selectores optimizan la re-renderización al permitir que los componentes
// se suscriban solo a partes específicas del estado.

/**
* Selector para obtener únicamente las Megalistas de la caché.
* Para usar con `useShallow` para evitar re-renders innecesarios.
* @example const allMegalists = usePlaylistStore(useShallow(selectAllMegalists));
* @param state - El estado completo del store.
* @returns Un array de playlists que son Megalistas.
*/export const selectAllMegalists = (state: PlaylistStore) => 
  state.playlistCache.filter(p => p.isMegalist);

/**
* Selector para obtener únicamente las Megalistas que son sincaronizables.
* Para usar con `useShallow` para evitar re-renders innecesarios.
* @example const syncableMegalists = usePlaylistStore(useShallow(selectSyncableMegalists));
* @param state - El estado completo del store.
* @returns Un array de playlists que son sincronizables.
*/export const selectSyncableMegalists = (state: PlaylistStore) => 
  state.playlistCache.filter(p => p.isSyncable);