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
  // --- Estado existente ---
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
      // Usamos un Set para fusionar y eliminar duplicados de forma eficiente
      const combinedIds = new Set([...state.selectedPlaylistIds, ...playlistIds]);
      return { selectedPlaylistIds: Array.from(combinedIds) };
    });
  },
  
  setShowOnlySelected: (value) => {
    set({ showOnlySelected: value })
  },
  
  // Lógica de la caché ---
  playlistCache: [],
  megamixCache: [],
  
  // Acción para inicializar la caché
  setPlaylistCache: (playlists) => {
    const processedPlaylists = processPlaylists(playlists);
    // Filtramos las megalistas basándonos en nuestra "firma"
    const megamixes = processedPlaylists.filter(
      (p) => p.description?.includes('<!-- MEGAMIXER_APP_V1 -->')
    );
    set({ playlistCache: processedPlaylists, megamixCache: megamixes });
  },
  
  // Acción para añadir más playlists a la caché (scroll infinito)
  addMoreToCache: (playlists) => {
    const processedNewPlaylists = processPlaylists(playlists); // Usamos la función de ayuda
    const newCache = [...get().playlistCache, ...processedNewPlaylists];
    const newMegamixes = newCache.filter(
      (p) => p.description?.includes('<!-- MEGAMIXER_APP_V1 -->')
    );
    set({ playlistCache: newCache, megamixCache: newMegamixes });
  },
  
  addPlaylistToCache: (playlist) => {
    const existingCache = get().playlistCache;
    if (existingCache.some(p => p.id === playlist.id)) return;
    
    // Usamos la función de ayuda aquí también, dentro de un array
    const [processedPlaylist] = processPlaylists([playlist]);
    
    const newCache = [processedPlaylist, ...existingCache];
    const newMegamixes = newCache.filter(
      (p) => p.description?.includes('<!-- MEGAMIXER_APP_V1 -->')
    );
    set({ playlistCache: newCache, megamixCache: newMegamixes });
  },
  
  // Implementación de la acción de actualización
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
  
  removePlaylistFromCache: (playlistId) => {
    set((state) => ({
      playlistCache: state.playlistCache.filter((p) => p.id !== playlistId),
      megamixCache: state.megamixCache.filter((p) => p.id !== playlistId),
      // También la eliminamos de la selección si estuviera seleccionada
      selectedPlaylistIds: state.selectedPlaylistIds.filter((id) => id !== playlistId),
    }));
  },
  
}));