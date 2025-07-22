// components/custom/search/SearchResultItem.tsx

'use client';

import {
  CheckCircle2,
  Disc3,
  ListMusic,
  Loader2,
  Music,
  Plus,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  SpotifyAlbum,
  SpotifyPlaylist,
  SpotifyTrack,
} from '@/types/spotify';

/**
* Define la estructura de un único resultado de búsqueda usando una unión discriminada.
* La propiedad `type` determina la forma de `data`.
*/
export type SearchResultItemType =
| { type: 'track'; data: SpotifyTrack }
| { type: 'album'; data: SpotifyAlbum }
| { type: 'playlist'; data: SpotifyPlaylist };

interface SearchResultItemProps {
  /** El objeto de datos del resultado de búsqueda a renderizar. */
  itemData: SearchResultItemType;
  /** Callback que se invoca cuando el usuario hace clic en el botón de añadir (+). */
  onAdd: (itemData: SearchResultItemType) => void;
  /** `true` si se está procesando una acción sobre este item (ej. obteniendo tracks de un álbum). */
  isAdding: boolean;
  /** Un array de IDs de las playlists que el usuario ya sigue, para mostrar el indicador de "check". */
  followedPlaylistIds: string[];
}

/**
* Componente que renderiza una única fila en el popover de resultados de la búsqueda global.
* Es capaz de mostrar diferentes tipos de contenido (canción, álbum, playlist) de forma unificada.
*
* @param {SearchResultItemProps} props - Las props del componente.
*/
export default function SearchResultItem({
  itemData,
  onAdd,
  isAdding,
  followedPlaylistIds,
}: SearchResultItemProps) {
  
  // Desestructuramos `itemData` y usamos `data` internamente.
  const { type, data } = itemData;
  const isFollowed = type === 'playlist' && followedPlaylistIds.includes(data.id);
  let imageUrl: string | undefined;
  let title: string;
  let subtitle: string;
  let fallbackIcon: React.ReactNode;
  let typeIcon: React.ReactNode;
  
  // Adapta la UI según el tipo de resultado
  switch (type) {
    case 'track':
    imageUrl = data.album.images?.[0]?.url;
    title = data.name;
    subtitle = data.artists.map(a => a.name).join(', ');
    fallbackIcon = <Music className="h-4 w-4" />;
    typeIcon = <Music className="h-4 w-4 text-muted-foreground" />;
    break;
    case 'album':
    imageUrl = data.images?.[0]?.url;
    title = data.name;
    subtitle = data.artists.map(a => a.name).join(', ');
    fallbackIcon = <Disc3 className="h-4 w-4" />;
    typeIcon = <Disc3 className="h-4 w-4 text-muted-foreground" />;
    break;
    case 'playlist':
    imageUrl = data.images?.[0]?.url;
    title = data.name;
    subtitle = `De: ${data.owner.display_name}`;
    fallbackIcon = <ListMusic className="h-4 w-4" />;
    typeIcon = <ListMusic className="h-4 w-4 text-muted-foreground" />;
    break;
  }
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
    <div className="w-6 flex-shrink-0 flex items-center justify-center">
    {typeIcon}
    </div>
    <div className="relative flex-shrink-0">
    <Avatar className="h-10 w-10">
    <AvatarImage src={imageUrl} alt={title} />
    <AvatarFallback>{fallbackIcon}</AvatarFallback>
    </Avatar>
    {isFollowed && (
      <div className="absolute -bottom-1 -right-1 bg-background rounded-full">
      <CheckCircle2 className="h-5 w-5 text-green-500" />
      </div>
    )}
    </div>
    <div className="flex-1 min-w-0">
    <p className="font-medium text-sm truncate">{title}</p>
    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
    </div>
    <Button
    size="icon"
    variant="ghost"
    className="h-8 w-8 flex-shrink-0"
    onClick={() => onAdd(itemData)}
    disabled={isAdding}
    >
    {isAdding ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <Plus className="h-4 w-4" />
    )}
    </Button>
    </div>
  );
}