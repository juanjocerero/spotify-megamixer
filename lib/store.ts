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
  updatePlaylistInCache: (playlistId: string, updates: { name?: string; description?: string; trackCount?: number; isSyncable?: boolean }) => void;
  removePlaylistFromCache: (playlistId: string) => void;
  removeMultipleFromCache: (playlistIds: string[]) => void;
}

const processPlaylists = (playlists: SpotifyPlaylist[]): SpotifyPlaylist[] => {
  return playlists;
};

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
  
  playlistCache: [],
  megamixCache: [],
  
  // Acción para inicializar la caché
  setPlaylistCache: (playlists) => {
    const processedPlaylists = processPlaylists(playlists);
    // Filtrar usando la propiedad booleana `isMegalist` ya calculada.
    const megamixes = processedPlaylists.filter(p => p.isMegalist);
    set({ playlistCache: processedPlaylists, megamixCache: megamixes });
  },
  
  // Acción para añadir más playlists a la caché (scroll infinito)
  addMoreToCache: (playlists) => {
    const processedNewPlaylists = processPlaylists(playlists);
    const newCache = [...get().playlistCache, ...processedNewPlaylists];
    const newMegamixes = newCache.filter(p => p.isMegalist);
    set({ playlistCache: newCache, megamixCache: newMegamixes });
  },
  
  addPlaylistToCache: (playlist) => {
    const existingCache = get().playlistCache;
    if (existingCache.some(p => p.id === playlist.id)) return;
    
    const [processedPlaylist] = processPlaylists([playlist]);
    
    const newCache = [processedPlaylist, ...existingCache];
    const newMegamixes = newCache.filter(p => p.isMegalist);
    set({ playlistCache: newCache, megamixCache: newMegamixes });
  },
  
  // Implementación de la acción de eliminación
  removePlaylistFromCache: (playlistId) => {
    set((state) => ({
      playlistCache: state.playlistCache.filter((p) => p.id !== playlistId),
      megamixCache: state.megamixCache.filter((p) => p.id !== playlistId),
      selectedPlaylistIds: state.selectedPlaylistIds.filter((id) => id !== playlistId),
    }));
  },
  
  // Actualiza nombre y descripción de una playlist
  updatePlaylistInCache: (playlistId, updates) => {
    const update = (p: SpotifyPlaylist): SpotifyPlaylist => {
      if (p.id !== playlistId) return p;
      
      return {
        ...p,
        // Actualizamos nombre y descripción si se proporcionan
        name: updates.name ?? p.name,
        description: updates.description ?? p.description,
        tracks: {
          ...p.tracks,
          total: updates.trackCount ?? p.tracks.total, 
        },
        isSyncable: updates.isSyncable ?? p.isSyncable,
      };
    };
    
    set((state) => ({
      playlistCache: state.playlistCache.map(update),
      megamixCache: state.megamixCache.map(update),
    }));
  },
  
  removeMultipleFromCache: (playlistIds) => {
    const idSet = new Set(playlistIds);
    set((state) => ({
      playlistCache: state.playlistCache.filter((p) => !idSet.has(p.id)),
      megamixCache: state.megamixCache.filter((p) => !idSet.has(p.id)),
      selectedPlaylistIds: state.selectedPlaylistIds.filter((id) => !idSet.has(id)),
    }));
  },
}));