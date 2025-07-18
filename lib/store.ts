// /lib/store.ts
import { create } from 'zustand';
import { SpotifyPlaylist } from '@/types/spotify';

// Definimos la "forma" de nuestro almacén de estado
interface PlaylistStore {
  selectedPlaylistIds: string[];
  togglePlaylist: (id: string) => void;
  isSelected: (id: string) => boolean;
  clearSelection: () => void;
  addMultipleToSelection: (playlistIds: string[]) => void;
  showOnlySelected: boolean;
  setShowOnlySelected: (value: boolean) => void;
  
  // Estado para la caché de playlists
  playlistCache: SpotifyPlaylist[];
  megamixCache: SpotifyPlaylist[]; // Un subconjunto de la caché para solo nuestras megalistas
  setPlaylistCache: (playlists: SpotifyPlaylist[]) => void;
  addMoreToCache: (playlists: SpotifyPlaylist[]) => void;
  addPlaylistToCache: (playlist: SpotifyPlaylist) => void;
  updatePlaylistInCache: (playlistId: string, newTrackCount: number) => void;
  removePlaylistFromCache: (playlistId: string) => void; 
}

const processPlaylists = (playlists: SpotifyPlaylist[]): SpotifyPlaylist[] => {
  return playlists.map(p => {
    // Usamos .includes() con los nuevos delimitadores, que es más simple y robusto.
    const isMegalista = p.description?.includes('__MEGAMIXER_APP_V1__') || false;
    if (!isMegalista) return p;
    
    // Si es una megalista, comprobamos si es sincronizable.
    const isSyncable = p.description?.includes('__MEGAMIXER_SOURCES:[') || false;
    return { ...p, isSyncable, isMegalist: true };
  });
};

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  // --- Estado existente (sin cambios) ---
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
    set({ 
      selectedPlaylistIds: [],
      showOnlySelected: false,
    })
  },
  
  addMultipleToSelection: (playlistIds) => {
    set((state) => {
      const combinedIds = new Set([...state.selectedPlaylistIds, ...playlistIds]);
      return { selectedPlaylistIds: Array.from(combinedIds) };
    });
  },
  
  setShowOnlySelected: (value) => {
    set({ showOnlySelected: value })
  },
  
  // --- Lógica de la caché (con correcciones) ---
  playlistCache: [],
  megamixCache: [],
  
  // Acción para inicializar la caché
  setPlaylistCache: (playlists) => {
    const processedPlaylists = processPlaylists(playlists);
    // CORRECCIÓN: Filtrar usando la propiedad booleana `isMegalist` ya calculada.
    const megamixes = processedPlaylists.filter(p => p.isMegalist);
    set({ playlistCache: processedPlaylists, megamixCache: megamixes });
  },
  
  // Acción para añadir más playlists a la caché (scroll infinito)
  addMoreToCache: (playlists) => {
    const processedNewPlaylists = processPlaylists(playlists);
    const newCache = [...get().playlistCache, ...processedNewPlaylists];
    // CORRECCIÓN: Filtrar usando la propiedad booleana `isMegalist`.
    const newMegamixes = newCache.filter(p => p.isMegalist);
    set({ playlistCache: newCache, megamixCache: newMegamixes });
  },
  
  addPlaylistToCache: (playlist) => {
    const existingCache = get().playlistCache;
    if (existingCache.some(p => p.id === playlist.id)) return;
    
    const [processedPlaylist] = processPlaylists([playlist]);
    
    const newCache = [processedPlaylist, ...existingCache];
    // CORRECCIÓN: Filtrar usando la propiedad booleana `isMegalist`.
    const newMegamixes = newCache.filter(p => p.isMegalist);
    set({ playlistCache: newCache, megamixCache: newMegamixes });
  },
  
  // Implementación de la acción de actualización (sin cambios)
  updatePlaylistInCache: (playlistId, newTrackCount) => {
    const update = (p: SpotifyPlaylist) => 
      p.id === playlistId 
    ? { ...p, tracks: { ...p.tracks, total: newTrackCount } } 
    : p;
    
    set((state) => ({
      playlistCache: state.playlistCache.map(update),
      megamixCache: state.megamixCache.map(update),
    }));
  },
  
  // Implementación de la acción de eliminación (sin cambios)
  removePlaylistFromCache: (playlistId) => {
    set((state) => ({
      playlistCache: state.playlistCache.filter((p) => p.id !== playlistId),
      megamixCache: state.megamixCache.filter((p) => p.id !== playlistId),
      selectedPlaylistIds: state.selectedPlaylistIds.filter((id) => id !== playlistId),
    }));
  },
}));