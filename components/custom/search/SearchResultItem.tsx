'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  SpotifyAlbum,
  SpotifyPlaylist,
  SpotifyTrack,
} from '@/types/spotify';
import { ListMusic, Music, Plus, Loader2, Disc3, CheckCircle2 } from 'lucide-react';

export type SearchResultItemType =
| { type: 'track'; item: SpotifyTrack }
| { type: 'album'; item: SpotifyAlbum }
| { type: 'playlist'; item: SpotifyPlaylist };

interface SearchResultItemProps {
  itemProps: SearchResultItemType;
  onAdd: (itemProps: SearchResultItemType) => void;
  isAdding: boolean;
  followedPlaylistIds: string[];
}

export default function SearchResultItem({ itemProps, onAdd, isAdding, followedPlaylistIds, }: SearchResultItemProps) {
  const { type, item } = itemProps;
  const isFollowed = type === 'playlist' && followedPlaylistIds.includes(item.id);
  
  let imageUrl: string | undefined;
  let title: string;
  let subtitle: string;
  let fallbackIcon: React.ReactNode;
  let typeIcon: React.ReactNode;
  
  switch (type) {
    case 'track':
    imageUrl = item.album.images?.[0]?.url;
    title = item.name;
    subtitle = item.artists.map(a => a.name).join(', ');
    fallbackIcon = <Music className="h-4 w-4" />;
    typeIcon = <Music className="h-4 w-4 text-muted-foreground" />;
    break;
    case 'album':
    imageUrl = item.images?.[0]?.url;
    title = item.name;
    subtitle = item.artists.map(a => a.name).join(', ');
    fallbackIcon = <Disc3 className="h-4 w-4" />;
    typeIcon = <Disc3 className="h-4 w-4 text-muted-foreground" />;
    break;
    case 'playlist':
    imageUrl = item.images?.[0]?.url;
    title = item.name;
    subtitle = `De: ${item.owner.display_name}`;
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
    {/* Renderizado condicional del icono superpuesto */}
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