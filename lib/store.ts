// /lib/store.ts
import { createStore, useStore } from 'zustand';
import { useContext } from 'react';
import { PlaylistStoreContext } from './contexts/PlaylistStoreProvider';
import type { SpotifyPlaylist } from '@/types/spotify';

// Definimos la interfaz del estado y las acciones
export interface PlaylistStore {
  selectedPlaylistIds: string[];
  showOnlySelected: boolean;
  playlistCache: SpotifyPlaylist[];
  
  togglePlaylist: (id: string) => void;
  isSelected: (id: string) => boolean;
  clearSelection: () => void;
  addMultipleToSelection: (playlistIds: string[]) => void;
  removeMultipleFromSelection: (playlistIds: string[]) => void;
  setShowOnlySelected: (value: boolean) => void;
  
  // Estas funciones ahora aceptan el estado inicial y devuelven un nuevo estado
  initializeCache: (playlists: SpotifyPlaylist[]) => void;
  addMoreToCache: (playlists: SpotifyPlaylist[]) => void;
  addPlaylistToCache: (playlist: SpotifyPlaylist) => void;
  updatePlaylistInCache: (playlistId: string, updates: Partial<Omit<SpotifyPlaylist, 'id' | 'tracks'> & { trackCount?: number }>) => void;
  removePlaylistFromCache: (playlistId: string) => void;
  removeMultipleFromCache: (playlistIds: string[]) => void;
}

// Separamos el estado inicial por defecto
const getDefaultInitialState = () => ({
  selectedPlaylistIds: [],
  showOnlySelected: false,
  playlistCache: [],
});

// La "Fábrica" que crea una nueva instancia del store
export const createPlaylistStore = (
  initState: Partial<PlaylistStore> = {},
) => {
  return createStore<PlaylistStore>((set, get) => ({
    ...getDefaultInitialState(),
    ...initState,
    
    // ACCIONES
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

// El nuevo hook que consume el Context y requiere un selector.
export const usePlaylistStore = <T>(
  selector: (store: PlaylistStore) => T,
): T => {
  const playlistStoreContext = useContext(PlaylistStoreContext);
  
  if (!playlistStoreContext) {
    throw new Error(`usePlaylistStore must be used within a PlaylistStoreProvider`);
  }
  
  return useStore(playlistStoreContext, selector);
};