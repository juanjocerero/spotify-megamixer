// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { SpotifyPlaylist } from '@/types/spotify.d';
import { fetchMorePlaylists } from '@/lib/action';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Music } from 'lucide-react';

// Props actualizadas para recibir los datos iniciales
interface PlaylistDisplayProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
}

// Un pequeño componente para el indicador de carga
function Loader() {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
    <Loader2 className="h-5 w-5 animate-spin" />
    <span>Cargando más playlists...</span>
    </div>
  );
}


export default function PlaylistDisplay({ initialPlaylists, initialNextUrl }: PlaylistDisplayProps) {
  // ---- ESTADO ----
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>(initialPlaylists);
  const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
  const [isLoading, setIsLoading] = useState(false);
  
  // ---- HOOKS PARA DETECCIÓN DE SCROLL ----
  const { ref, inView } = useInView({
    threshold: 0, // Se activa en cuanto el elemento sea visible
    triggerOnce: false, // Queremos que se siga activando si el usuario scrollea arriba y abajo
  });
  
  // ---- FUNCIÓN PARA CARGAR DATOS ----
  const loadMorePlaylists = useCallback(async () => {
    // Evita cargas múltiples si ya está cargando o si no hay más páginas
    if (isLoading || !nextUrl) return;
    
    setIsLoading(true);
    try {
      const { items: newPlaylists, next: newNextUrl } = await fetchMorePlaylists(nextUrl);
      setPlaylists(prev => [...prev, ...newPlaylists]);
      setNextUrl(newNextUrl);
    } catch (error) {
      console.error(error);
      // Opcional: mostrar un toast de error al usuario
    } finally {
      setIsLoading(false);
    }
  }, [nextUrl, isLoading]);
  
  // ---- EFECTO PARA DISPARAR LA CARGA ----
  useEffect(() => {
    if (inView) {
      loadMorePlaylists();
    }
  }, [inView, loadMorePlaylists]);
  
  return (
    <Table>
    <TableHeader>
    {/* ... (el header de la tabla no cambia) ... */}
    <TableRow>
    <TableHead className="w-[50px]">
    <Checkbox disabled />
    </TableHead>
    <TableHead className="w-[80px] text-muted-foreground">Cover</TableHead>
    <TableHead className="text-muted-foreground">Nombre</TableHead>
    <TableHead className="text-muted-foreground">Propietario</TableHead>
    <TableHead className="text-right text-muted-foreground">Nº de Canciones</TableHead>
    </TableRow>
    </TableHeader>
    <TableBody>
    {playlists.map((playlist) => (
      <TableRow key={playlist.id} className="border-gray-800">
      {/* ... (el contenido de la fila no cambia) ... */}
      <TableCell>
      <Checkbox id={`select-${playlist.id}`} />
      </TableCell>
      <TableCell>
      <Avatar>
      <AvatarImage src={playlist.images?.[0]?.url} alt={playlist.name} />
      <AvatarFallback>
      <Music />
      </AvatarFallback>
      </Avatar>
      </TableCell>
      <TableCell className="font-medium">{playlist.name}</TableCell>
      <TableCell>{playlist.owner.display_name}</TableCell>
      <TableCell className="text-right">{playlist.tracks.total}</TableCell>
      </TableRow>
    ))}
    
    {/* ---- ELEMENTO TRIGGER Y LOADER ---- */}
    {/* Si hay una URL siguiente, mostramos el elemento 'ref' que activará la carga */}
    {nextUrl && (
      <TableRow ref={ref} className="border-none hover:bg-transparent">
      <TableCell colSpan={5}>
      {/* Y el loader solo se muestra aquí dentro cuando estamos cargando */}
      {isLoading && <Loader />}
      </TableCell>
      </TableRow>
    )}
    </TableBody>
    </Table>
  );
}