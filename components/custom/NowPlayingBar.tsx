// components/custom/NowPlayingBar.tsx

'use client';

import { usePlaylistStore } from '@/lib/store';
import { useActions } from '@/lib/contexts/ActionProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ListPlus, Music } from 'lucide-react';

export default function NowPlayingBar() {
  const currentlyPlayingTrack = usePlaylistStore(
    (state) => state.currentlyPlayingTrack,
  );
  const { openAddTracksDialog } = useActions();
  
  // Si no hay canción sonando, el componente no renderiza nada.
  if (!currentlyPlayingTrack) {
    return null;
  }
  
  const handleAddTrack = () => {
    openAddTracksDialog([currentlyPlayingTrack.uri]);
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex h-20 items-center border-t border-gray-700 bg-gray-800/95 px-4 shadow-lg backdrop-blur-sm">
    <div className="flex w-full max-w-4xl items-center justify-between mx-auto gap-4">
    <div className="flex items-center gap-3 min-w-0">
    <Avatar className="h-12 w-12 rounded-md">
    <AvatarImage
    src={currentlyPlayingTrack.album?.images?.[0]?.url}
    alt={currentlyPlayingTrack.name}
    />
    <AvatarFallback className="rounded-md">
    <Music />
    </AvatarFallback>
    </Avatar>
    <div className="flex-grow min-w-0">
    <p className="font-medium text-white truncate text-sm">
    {currentlyPlayingTrack.name}
    </p>
    <p className="text-xs text-muted-foreground truncate">
    {currentlyPlayingTrack.artists.map((a) => a.name).join(', ')}
    </p>
    </div>
    </div>
    
    <Button
    size="sm"
    variant="outline"
    onClick={handleAddTrack}
    className="flex-shrink-0"
    >
    <ListPlus className="mr-2 h-4 w-4" />
    Añadir a...
    </Button>
    </div>
    </div>
  );
}