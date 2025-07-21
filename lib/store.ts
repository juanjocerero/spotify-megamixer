// /lib/store.ts
import { create } from 'zustand';
import { SpotifyPlaylist } from '@/types/spotify';

interface PlaylistStore {
  selectedPlaylistIds: string[];
  togglePlaylist: (id: string) => void;
  isSelected: (id: string) => boolean;
  clearSelection: () => void;
  addMultipleToSelection: (playlistIds: string[]) => void;
  removeMultipleFromSelection: (playlistIds: string[]) => void;
  showOnlySelected: boolean;
  setShowOnlySelected: (value: boolean) => void;
  playlistCache: SpotifyPlaylist[];
  setPlaylistCache: (playlists: SpotifyPlaylist[]) => void;
  addMoreToCache: (playlists: SpotifyPlaylist[]) => void;
  addPlaylistToCache: (playlist: SpotifyPlaylist) => void;
  updatePlaylistInCache: (playlistId: string, updates: { 
    name?: string; 
    description?: string; 
    trackCount?: number; 
    isSyncable?: boolean; 
    playlistType?: 'MEGALIST' | 'SURPRISE'; 
  }) => void; 
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
    const update = (p: SpotifyPlaylist): SpotifyPlaylist => {
      if (p.id !== playlistId) return p;
      return {
        ...p,
        name: updates.name ?? p.name,
        description: updates.description ?? p.description,
        tracks: {
          ...p.tracks,
          total: updates.trackCount ?? p.tracks.total,
        },
        isSyncable: updates.isSyncable ?? p.isSyncable,
        playlistType: updates.playlistType ?? p.playlistType,
      };
    };
    set((state) => ({
      playlistCache: state.playlistCache.map(update),
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

// Selector Selector para obtener todas las megalistas de la caché.
export const selectAllMegalists = (state: PlaylistStore) => 
  state.playlistCache.filter(p => p.isMegalist);

// Selector de listas sincronizables. 
export const selectSyncableMegalists = (state: PlaylistStore) => 
  state.playlistCache.filter(p => p.isSyncable);