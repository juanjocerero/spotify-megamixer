'use client';

import { useState } from 'react';
import { useActions } from '@/lib/contexts/ActionProvider';
import { getAlbumTracksAction } from '@/lib/actions/spotify.actions';
import { SearchResults } from '@/lib/actions/search.actions';
import SearchResultItem from './SearchResultItem';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function SearchResultsDisplay({ results }: { results: SearchResults; }) {

  const { openAddToMegalistDialog, openAddTracksDialog } = useActions();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  // Acción de añadir
  const handleAdd = async (itemProps: any) => {
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
    <ScrollArea className="max-h-[50vh] p-1">
    <div className="p-2">
    {results.tracks.length > 0 && (
      <div className="mb-2">
      <h4 className="text-sm font-semibold text-muted-foreground px-2 py-1">
      Canciones
      </h4>
      {results.tracks.map(track => (
        <SearchResultItem 
        isAdding={addingItemId === track.id}
        key={track.id}
        itemProps={{ type: 'track', item: track }}
        onAdd={handleAdd}
        />
      ))}
      </div>
    )}
    
    {results.albums.length > 0 && (
      <div className="mb-2">
      <h4 className="text-sm font-semibold text-muted-foreground px-2 py-1">
      Álbumes
      </h4>
      {results.albums.map(album => (
        <SearchResultItem 
        isAdding={addingItemId === album.id}
        key={album.id}
        itemProps={{ type: 'album', item: album }}
        onAdd={handleAdd}
        />
      ))}
      </div>
    )}
    
    {results.playlists.length > 0 && (
      <div>
      <h4 className="text-sm font-semibold text-muted-foreground px-2 py-1">
      Listas de reproducción
      </h4>
      {results.playlists.map(playlist => (
        <SearchResultItem 
        isAdding={addingItemId === playlist.id}
        key={playlist.id}
        itemProps={{ type: 'playlist', item: playlist }}
        onAdd={handleAdd}
        />
      ))}
      </div>
    )}
    </div>
    </ScrollArea>
  );
}