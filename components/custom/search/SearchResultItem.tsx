'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  SpotifyAlbum,
  SpotifyPlaylist,
  SpotifyTrack,
} from '@/types/spotify';
import { Album, ListMusic, Music, Plus, Loader2 } from 'lucide-react';

export type SearchResultItemType =
| { type: 'track'; item: SpotifyTrack }
| { type: 'album'; item: SpotifyAlbum }
| { type: 'playlist'; item: SpotifyPlaylist };

interface SearchResultItemProps {
  itemProps: SearchResultItemType;
  onAdd: (itemProps: SearchResultItemType) => void;
  isAdding: boolean;
}

export default function SearchResultItem({ itemProps, onAdd, isAdding }: SearchResultItemProps) {
  const { type, item } = itemProps;
  
  let imageUrl: string | undefined;
  let title: string;
  let subtitle: string;
  let fallbackIcon: React.ReactNode;
  
  switch (type) {
    case 'track':
    imageUrl = item.album.images?.[0]?.url;
    title = item.name;
    subtitle = item.artists.map(a => a.name).join(', ');
    fallbackIcon = <Music className="h-4 w-4" />;
    break;
    case 'album':
    imageUrl = item.images?.[0]?.url;
    title = item.name;
    subtitle = item.artists.map(a => a.name).join(', ');
    fallbackIcon = <Album className="h-4 w-4" />;
    break;
    case 'playlist':
    imageUrl = item.images?.[0]?.url;
    title = item.name;
    subtitle = `De: ${item.owner.display_name}`;
    fallbackIcon = <ListMusic className="h-4 w-4" />;
    break;
  }
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
    <Avatar className="h-10 w-10">
    <AvatarImage src={imageUrl} alt={title} />
    <AvatarFallback>{fallbackIcon}</AvatarFallback>
    </Avatar>
    <div className="flex-grow min-w-0">
    <p className="font-medium text-sm truncate">{title}</p>
    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
    </div>
    <Button
    size="icon"
    variant="ghost"
    className="h-8 w-8 flex-shrink-0"
    onClick={() => onAdd(itemProps)} 
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