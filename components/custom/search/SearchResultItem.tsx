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

// La estructura ahora usa 'data', igual que en el componente padre.
export type SearchResultItemType =
| { type: 'track'; data: SpotifyTrack }
| { type: 'album'; data: SpotifyAlbum }
| { type: 'playlist'; data: SpotifyPlaylist };

interface SearchResultItemProps {
  // El prop se llama ahora `itemData` para mayor claridad.
  itemData: SearchResultItemType;
  onAdd: (itemData: SearchResultItemType) => void;
  isAdding: boolean;
  followedPlaylistIds: string[];
}

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