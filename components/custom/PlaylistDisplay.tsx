// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { SpotifyPlaylist } from '@/types/spotify';
import { fetchMorePlaylists } from '@/lib/action'; // CORRECCIÓN 1: Ruta de importación corregida.
import { usePlaylistStore } from '@/lib/store';

// Componentes UI y Íconos
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Music, Search, ListChecks } from 'lucide-react';

// Props del componente
interface PlaylistDisplayProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
}

// CORRECCIÓN 2: Componente Loader simplificado para mayor estabilidad.
function Loader() {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
    <Loader2 className="h-5 w-5 animate-spin" />
    <span>Cargando más playlists...</span>
    </div>
  );
}

export default function PlaylistDisplay({ initialPlaylists, initialNextUrl }: PlaylistDisplayProps) {
  // ---- ESTADO GLOBAL (ZUSTAND) ----
  const { togglePlaylist, isSelected, selectedPlaylistIds } = usePlaylistStore();
  
  // ---- ESTADO LOCAL ----
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>(initialPlaylists);
  const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  
  // ---- HOOKS PARA SCROLL INFINITO ----
  const { ref, inView } = useInView({ threshold: 0 });
  
  const loadMorePlaylists = useCallback(async () => {
    // Evita cargas si ya está en proceso, si no hay más páginas, o si se está mostrando solo la selección.
    if (isLoading || !nextUrl || showOnlySelected) return;
    
    setIsLoading(true);
    try {
      const { items: newPlaylists, next: newNextUrl } = await fetchMorePlaylists(nextUrl);
      setPlaylists(prev => [...prev, ...newPlaylists]);
      setNextUrl(newNextUrl);
    } catch (error) {
      console.error("Error al cargar más playlists:", error);
      // Aquí se podría mostrar un toast de error al usuario.
    } finally {
      setIsLoading(false);
    }
  }, [nextUrl, isLoading, showOnlySelected]);
  
  useEffect(() => {
    if (inView) {
      loadMorePlaylists();
    }
  }, [inView, loadMorePlaylists]);
  
  // ---- LÓGICA DE FILTRADO ----
  const filteredPlaylists = useMemo(() => {
    let items = playlists;
    
    if (showOnlySelected) {
      items = items.filter(p => selectedPlaylistIds.includes(p.id));
    }
    
    if (searchTerm) {
      items = items.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return items;
  }, [playlists, searchTerm, showOnlySelected, selectedPlaylistIds]);
  
  return (
    <div>
    {/* ---- CONTROLES DE FILTRADO ---- */}
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
    <div className="relative flex-grow">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
    <Input
    type="text"
    placeholder="Filtrar por nombre..."
    className="pl-10"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    />
    </div>
    <div className="flex items-center space-x-2">
    <Switch
    id="show-selected"
    checked={showOnlySelected}
    onCheckedChange={setShowOnlySelected}
    />
    <Label htmlFor="show-selected" className="flex items-center gap-2 cursor-pointer">
    <ListChecks className="h-5 w-5" />
    Mostrar solo seleccionadas ({selectedPlaylistIds.length})
    </Label>
    </div>
    </div>
    
    {/* ---- TABLA DE PLAYLISTS ---- */}
    <div className="rounded-md border border-gray-700">
    <Table>
    <TableHeader>
    <TableRow className="hover:bg-transparent">
    <TableHead className="w-[50px]"></TableHead>
    <TableHead className="w-[80px] text-muted-foreground">Cover</TableHead>
    <TableHead className="text-muted-foreground">Nombre</TableHead>
    <TableHead className="text-muted-foreground">Propietario</TableHead>
    <TableHead className="text-right text-muted-foreground">Nº de Canciones</TableHead>
    </TableRow>
    </TableHeader>
    <TableBody>
    {filteredPlaylists.map((playlist) => {
      const selected = isSelected(playlist.id);
      return (
        <TableRow 
        key={playlist.id} 
        className={`border-gray-800 transition-colors ${selected ? 'bg-green-900/40 hover:bg-green-900/60' : 'hover:bg-white/5'}`}
        >
        <TableCell>
        <Checkbox
        id={`select-${playlist.id}`}
        checked={selected}
        onCheckedChange={() => togglePlaylist(playlist.id)}
        />
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
      );
    })}
    </TableBody>
    </Table>
    </div>
    
    {/* ---- TRIGGER Y LOADER PARA SCROLL INFINITO ---- */}
    {/* Se muestra solo si no estamos filtrando por selección y si hay más items por cargar */}
    {!showOnlySelected && nextUrl && (
      <div ref={ref} className="w-full h-10 mt-4">
      {isLoading && <Loader />}
      </div>
    )}
    </div>
  );
}