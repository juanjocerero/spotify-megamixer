// components/custom/TrackDetailView.tsx
'use client';

import { useState, useEffect } from 'react'; // Importa useEffect
import { Loader2, Music } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getPlaylistTracksDetailsAction } from '@/lib/action'; // Importa la Server Action
import { toast } from 'sonner'; // Para notificaciones de errores

interface Track {
  name: string;
  artists: string;
}

interface TrackDetailViewProps {
  playlistId: string;
  playlistName: string;
}

export default function TrackDetailView({ playlistId, playlistName }: TrackDetailViewProps) {
  const [tracks, setTracks] = useState<Track[]>([]); // Inicialmente vacío
  const [isLoading, setIsLoading] = useState(true); // Empieza en true para mostrar el cargador
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      setError(null);
      setTracks([]); // Limpia las canciones previas al cargar
      try {
        const fetchedTracks = await getPlaylistTracksDetailsAction(playlistId);
        setTracks(fetchedTracks);
      } catch (err: any) {
        console.error('[TrackDetailView] Error al cargar canciones:', err);
        setError(err.message || 'Error desconocido al cargar las canciones.');
        toast.error(`Error al cargar canciones de "${playlistName}"`, {
          description: err.message || 'Inténtalo de nuevo más tarde.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (playlistId) { // Solo si tenemos un playlistId válido
      fetchTracks();
    } else {
      setIsLoading(false); // Si no hay playlistId, no hay nada que cargar
    }
  }, [playlistId, playlistName]); // Ejecutar cuando playlistId o playlistName cambien
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p>Cargando canciones de "{playlistName}"...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 p-4 text-center">
      <p>Error al cargar las canciones de "{playlistName}":</p>
      <p className="text-sm mt-2">{error}</p>
      </div>
    );
  }
  
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
      <Music className="h-8 w-8 mb-4" />
      <p>Esta playlist no contiene canciones o no se pudieron cargar.</p>
      </div>
    );
  }
  
  return (
    <div className="p-4">
    {/* El título de la playlist se mostrará en el Sheet, no aquí directamente. */}
    <ScrollArea className="h-[calc(100vh-180px)] pr-4"> {/* Ajusta la altura según necesidad */}
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
    </ScrollArea>
    </div>
  );
}