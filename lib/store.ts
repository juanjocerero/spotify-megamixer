// /lib/store.ts
import { create } from 'zustand';
import { SpotifyPlaylist } from '@/types/spotify';

// Definimos la "forma" de nuestro almacén de estado
interface PlaylistStore {
  selectedPlaylistIds: string[];
  togglePlaylist: (id: string) => void;
  isSelected: (id: string) => boolean;
  clearSelection: () => void;
  
  // Estado para la caché de playlists
  playlistCache: SpotifyPlaylist[];
  megamixCache: SpotifyPlaylist[]; // Un subconjunto de la caché para solo nuestras megalistas
  setPlaylistCache: (playlists: SpotifyPlaylist[]) => void;
  addMoreToCache: (playlists: SpotifyPlaylist[]) => void;
  addPlaylistToCache: (playlist: SpotifyPlaylist) => void;
  updatePlaylistInCache: (playlistId: string, newTrackCount: number) => void;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  // --- Estado existente ---
  selectedPlaylistIds: [],
  
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
    set({ selectedPlaylistIds: [] });
  },
  
  // Lógica de la caché ---
  playlistCache: [],
  megamixCache: [],
  
  // Acción para inicializar la caché
  setPlaylistCache: (playlists) => {
    // Filtramos las megalistas basándonos en nuestra "firma"
    const megamixes = playlists.filter(
      (p) => p.description?.includes('<!-- MEGAMIXER_APP_V1 -->')
    );
    set({ playlistCache: playlists, megamixCache: megamixes });
  },
  
  // Acción para añadir más playlists a la caché (scroll infinito)
  addMoreToCache: (playlists) => {
    const newCache = [...get().playlistCache, ...playlists];
    const newMegamixes = newCache.filter(
      (p) => p.description?.includes('<!-- MEGAMIXER_APP_V1 -->')
    );
    set({ playlistCache: newCache, megamixCache: newMegamixes });
  },
  
  addPlaylistToCache: (playlist) => {
    const existingCache = get().playlistCache;
    // Evitamos añadir duplicados si por alguna razón ya estuviera
    if (existingCache.some(p => p.id === playlist.id)) return;
    
    const newCache = [playlist, ...existingCache]; // La añadimos al principio
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

}));