'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Music } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getPlaylistTracksDetailsAction } from '@/lib/actions/spotify.actions';

interface Track {
  name: string;
  artists: string;
}

interface TrackDetailViewProps {
  playlistId: string;
  playlistName: string;
}

export default function TrackDetailView({ playlistId, playlistName }: TrackDetailViewProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  
  const fetchPage = useCallback(async (url: string | null) => {
    setIsLoading(true);
    try {
      const { tracks: newTracks, next: newNextUrl } = await getPlaylistTracksDetailsAction(playlistId, url);
      // Si la URL es null, es la carga inicial, así que reemplazamos los tracks. Si no, añadimos.
      setTracks(prev => (url === null ? newTracks : [...prev, ...newTracks]));
      setNextUrl(newNextUrl);
      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar las canciones.';
      setError(errorMessage);
      toast.error(`Error al cargar la página de canciones de "${playlistName}"`, {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, playlistName]);
  
  // Efecto para la carga inicial
  useEffect(() => {
    setTracks([]);
    setNextUrl(null);
    fetchPage(null);
  }, [playlistId, fetchPage]);
  
  // Efecto para el IntersectionObserver que carga más páginas
  useEffect(() => {
    if (!nextUrl || isLoading) return;
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchPage(nextUrl);
        }
      },
      { rootMargin: '200px' } // Carga un poco antes de llegar al final
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
      <p>Cargando canciones de &quot;{playlistName}&quot;...</p>
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
    <ScrollArea className="h-[calc(100vh-120px)] p-4 pr-6">
    <ul className="space-y-2">
    {tracks.map((track, index) => (
      <li key={index} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800 transition-colors">
      <span className="text-gray-500 text-sm w-6 text-right flex-shrink-0">{index + 1}.</span>
      <div className="flex-grow min-w-0">
      <p className="font-medium text-white break-words">{track.name}</p>
      <p className="text-sm text-gray-400 break-words">{track.artists}</p>
      </div>
      </li>
    ))}
    </ul>
    {/* Elemento centinela y spinner de carga */}
    <div ref={loaderRef} className="h-10 w-full flex justify-center items-center">
    {isLoading && <Loader2 className="h-6 w-6 animate-spin text-gray-500" />}
    </div>
    </ScrollArea>
  );
}