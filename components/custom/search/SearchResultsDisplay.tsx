// components/custom/search/SearchResultsDisplay.tsx

'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useActions } from '@/lib/contexts/ActionProvider';
import { getAlbumTracksAction } from '@/lib/actions/spotify.actions';
import { SearchResults } from '@/lib/actions/search.actions';
import type {
  SpotifyAlbum,
  SpotifyPlaylist,
  SpotifyTrack,
} from '@/types/spotify';
import SearchResultItem, { SearchResultItemType } from './SearchResultItem';

// PASO 1: Definimos el tipo como una unión discriminada, usando 'data'.
type UnifiedSearchResult =
| { id: string; type: 'track'; data: SpotifyTrack }
| { id: string; type: 'album'; data: SpotifyAlbum }
| { id: string; type: 'playlist'; data: SpotifyPlaylist };

interface SearchResultsDisplayProps {
  results: SearchResults;
  followedPlaylistIds: string[];
  spotifySortOption:
  | 'relevance'
  | 'playlists_first'
  | 'albums_first'
  | 'tracks_first';
}

export default function SearchResultsDisplay({
  results,
  spotifySortOption,
  followedPlaylistIds,
}: SearchResultsDisplayProps) {
  const { openAddToMegalistDialog, openAddTracksDialog } = useActions();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  
  const sortedAndUnifiedResults = useMemo(() => {
    // TypeScript ahora entiende perfectamente la estructura de este array.
    const unified: UnifiedSearchResult[] = [
      ...results.tracks.map(item => ({ id: item.id, type: 'track' as const, data: item })),
      ...results.albums.map(item => ({ id: item.id, type: 'album' as const, data: item })),
      ...results.playlists.map(item => ({ id: item.id, type: 'playlist' as const, data: item })),
    ];
    
    switch (spotifySortOption) {
      case 'playlists_first': {
        const typeOrder = { playlist: 1, album: 2, track: 3 };
        unified.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
        break;
      }
      case 'albums_first': {
        const typeOrder = { album: 1, track: 2, playlist: 3 };
        unified.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
        break;
      }
      case 'tracks_first': {
        const typeOrder = { track: 1, album: 2, playlist: 3 };
        unified.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
        break;
      }
      case 'relevance':
      default:
      break;
    }
    return unified;
  }, [results, spotifySortOption]);
  
  const handleAdd = async (itemData: SearchResultItemType) => {
    const { type, data } = itemData;
    if (type === 'playlist') {
      openAddToMegalistDialog([data.id]);
      return;
    }
    if (type === 'track') {
      openAddTracksDialog([data.uri]);
      return;
    }
    if (type === 'album') {
      setAddingItemId(data.id);
      const result = await getAlbumTracksAction(data.id);
      if (result.success) {
        openAddTracksDialog(result.data);
      } else {
        toast.error('Error al procesar el álbum', {
          description: result.error,
        });
      }
      setAddingItemId(null);
    }
  };
  
  const hasContent =
  results.tracks.length > 0 ||
  results.albums.length > 0 ||
  results.playlists.length > 0;
  
  if (!hasContent) return null;
  
  return (
    <div className="p-2">
    {sortedAndUnifiedResults.map(item => (
      // PASO 2: La llamada al componente ahora es simple y segura.
      // No hay error porque el tipo de 'item' coincide con lo que 'itemData' espera.
      <SearchResultItem
      isAdding={addingItemId === item.id}
      key={`${item.type}-${item.id}`}
      itemData={item}
      onAdd={handleAdd}
      followedPlaylistIds={followedPlaylistIds}
      />
    ))}
    </div>
  );
}