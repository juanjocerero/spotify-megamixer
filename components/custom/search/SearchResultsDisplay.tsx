'use client';

import { useMemo, useState } from 'react';
import { useActions } from '@/lib/contexts/ActionProvider';
import { getAlbumTracksAction } from '@/lib/actions/spotify.actions';
import { SearchResults } from '@/lib/actions/search.actions';
import { SpotifyAlbum, SpotifyPlaylist, SpotifyTrack } from '@/types/spotify';
import SearchResultItem, { SearchResultItemType } from './SearchResultItem';

import { toast } from 'sonner';

// Tipo para el nuevo array unificado
type UnifiedSearchResult = {
  id: string;
  type: 'track' | 'album' | 'playlist';
  // El tipo de `data` debe ser la unión de los posibles objetos
  data: SpotifyTrack | SpotifyAlbum | SpotifyPlaylist;
};

// Props actualizadas para aceptar la opción de ordenación
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
    const unified: UnifiedSearchResult[] = [
      ...results.tracks.map(item => ({ id: item.id, type: 'track' as const, data: item })),
      ...results.albums.map(item => ({ id: item.id, type: 'album' as const, data: item })),
      ...results.playlists.map(item => ({ id: item.id, type: 'playlist' as const, data: item })),
    ];
    // Nueva lógica de ordenación con switch
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
      // No hacer nada, mantener el orden de la API
      break;
    }
    
    return unified;
  }, [results, spotifySortOption]);
  
  // Acción de añadir
  const handleAdd = async (itemProps: SearchResultItemType) => {
    const { type, item } = itemProps;
    
    if (type === 'playlist') {
      openAddToMegalistDialog([item.id]);
      return;
    }
    
    if (type === 'track') {
      openAddTracksDialog([item.uri]);
      return;
    }
    
    if (type === 'album') {
      setAddingItemId(item.id);
      const result = await getAlbumTracksAction(item.id);
      if (result.success) {
        openAddTracksDialog(result.data);
      } else {
        toast.error('Error al procesar el álbum', { description: result.error });
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
      <SearchResultItem
      isAdding={addingItemId === item.id}
      key={`${item.type}-${item.id}`} // Clave más robusta para evitar colisiones
      // Pasamos los datos en el formato que SearchResultItem espera
      itemProps={{ type: item.type, item: item.data as any }}
      onAdd={handleAdd} 
      followedPlaylistIds={followedPlaylistIds}
      />
    ))}
    </div>
  );
}