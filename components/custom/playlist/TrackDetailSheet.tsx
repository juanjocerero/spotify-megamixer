// components/custom/playlist/TrackDetailSheet.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { SpotifyPlaylist } from '@/types/spotify';
import { useActions } from '@/lib/contexts/ActionProvider';
import { getPlaylistTracksDetailsAction } from '@/lib/actions/spotify.actions';

import { Loader2, Music, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface Track {
  uri: string;
  name: string;
  artists: string;
}

interface TrackListProps {
  playlistId: string;
  playlistName: string;
}

function TrackList({ playlistId, playlistName }: TrackListProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  
  const { openAddTracksDialog } = useActions();
  
  const handleAddTrack = (e: React.MouseEvent, trackUri: string) => {
    e.stopPropagation();
    openAddTracksDialog([trackUri]);
  };
  
  const fetchPage = useCallback(
    async (url: string | null) => {
      setIsLoading(true);
      try {
        const { tracks: newTracks, next: newNextUrl } = await getPlaylistTracksDetailsAction(playlistId, url);
        setTracks(prev => (url === null ? newTracks : [...prev, ...newTracks]));
        setNextUrl(newNextUrl);
        setError(null);
      } catch (err: unknown) {
        const errorMessage =
        err instanceof Error
        ? err.message
        : 'Error desconocido al cargar las canciones.';
        setError(errorMessage);
        toast.error(`Error al cargar la página de canciones de "${playlistName}"`, {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [playlistId, playlistName],
  );
  
  useEffect(() => {
    setTracks([]);
    setNextUrl(null);
    fetchPage(null);
  }, [playlistId, fetchPage]);
  
  useEffect(() => {
    if (!nextUrl || isLoading) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchPage(nextUrl);
        }
      },
      { rootMargin: '200px' },
    );
    const loaderElement = loaderRef.current;
    if (loaderElement) {
      observer.observe(loaderElement);
    }
    return () => {
      if (loaderElement) observer.unobserve(loaderElement);
    };
  }, [nextUrl, isLoading, fetchPage]);
  
  const isInitialLoading = isLoading && tracks.length === 0;
  
  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p>Cargando canciones de "{playlistName}"...</p>
      </div>
    );
  }
  
  if (error && tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 p-4 text-center">
      <p>Error al cargar las canciones:</p>
      <p className="text-sm mt-2">{error}</p>
      </div>
    );
  }
  
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
      <Music className="h-8 w-8 mb-4" />
      <p>Esta playlist no contiene canciones.</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-[calc(100vh-150px)] p-4 pr-6">
    <ul className="space-y-2">
    {tracks.map((track, index) => (
      // CAMBIO: Usamos track.uri como key para un renderizado más estable
      <li
      key={track.uri} 
      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800 transition-colors"
      >
      <span className="text-gray-500 text-sm w-6 text-right flex-shrink-0">
      {index + 1}.
      </span>
      <div className="flex-grow min-w-0">
      <p className="font-medium text-white break-words">{track.name}</p>
      <p className="text-sm text-gray-400 break-words">
      {track.artists}
      </p>
      </div>
      
      <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={(e) => handleAddTrack(e, track.uri)}
      >
      <Plus className="h-4 w-4" />
      </Button>
      
      </li>
    ))}
    </ul>
    {}
    <div
    ref={loaderRef}
    className="h-10 w-full flex justify-center items-center"
    >
    {isLoading && <Loader2 className="h-6 w-6 animate-spin text-gray-500" />}
    </div>
    </ScrollArea>
  );
}


interface TrackDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  playlist: SpotifyPlaylist | null;
}

export default function TrackDetailSheet({ isOpen, onOpenChange, playlist }: TrackDetailSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
    <SheetContent className="w-full sm:max-w-[500px] flex flex-col p-0">
    <SheetHeader className="p-4 pb-2 border-b border-gray-800">
    <div className="flex items-start gap-4">
    <Avatar className="w-24 h-24 rounded-md flex-shrink-0">
    <AvatarImage src={playlist?.images?.[0]?.url} alt={playlist?.name} />
    <AvatarFallback className="rounded-md">
    <Music className="w-12 h-12" />
    </AvatarFallback>
    </Avatar>
    <div className="pt-2">
    <SheetTitle className="text-white text-xl leading-tight">
    {playlist ? playlist.name : "Cargando..."}
    </SheetTitle>
    <SheetDescription className="mt-2">
    Mostrando las canciones de esta playlist.
    </SheetDescription>
    </div>
    </div>
    </SheetHeader>
    {playlist && (
      <TrackList
      playlistId={playlist.id}
      playlistName={playlist.name || ''}
      />
    )}
    </SheetContent>
    </Sheet>
  );
}