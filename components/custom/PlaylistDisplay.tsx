// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { SpotifyPlaylist } from '@/types/spotify';
import { cn } from '@/lib/utils';
import { fetchMorePlaylists } from '@/lib/action';
import { usePlaylistStore } from '@/lib/store';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, ListChecks, Music } from 'lucide-react';

interface PlaylistDisplayProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
}

function Loader() {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
    <Loader2 className="h-5 w-5 animate-spin" />
    <span>Cargando más playlists...</span>
    </div>
  );
}

export default function PlaylistDisplay({ initialPlaylists, initialNextUrl }: PlaylistDisplayProps) {
  const { 
    togglePlaylist, 
    isSelected, 
    selectedPlaylistIds, 
    playlistCache,
    setPlaylistCache, 
    addMoreToCache,
    addMultipleToSelection 
  } = usePlaylistStore();
  
  const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  
  const { ref, inView } = useInView({ threshold: 0 });
  
  useEffect(() => {
    setPlaylistCache(initialPlaylists);
  }, [initialPlaylists, setPlaylistCache]);
  
  const loadMorePlaylists = useCallback(async () => {
    if (isLoading || !nextUrl || showOnlySelected) return;
    setIsLoading(true);
    try {
      const { items: newPlaylists, next: newNextUrl } = await fetchMorePlaylists(nextUrl);
      addMoreToCache(newPlaylists);
      setNextUrl(newNextUrl);
    } catch {
      // Silenciamos el error para evitar el warning
    } finally {
      setIsLoading(false);
    }
  }, [nextUrl, isLoading, showOnlySelected, addMoreToCache]);
  
  useEffect(() => {
    if (inView) {
      loadMorePlaylists();
    }
  }, [inView, loadMorePlaylists]);
  
  const fuseOptions: IFuseOptions<SpotifyPlaylist> = useMemo(
    () => ({
      keys: ['name', 'owner.display_name'],
      threshold: 0.4,
      ignoreLocation: true,
      useExtendedSearch: true,
    }),
    []
  );
  
  const filteredPlaylists = useMemo(() => {
    let items = playlistCache;
    if (showOnlySelected) {
      items = items.filter((p) => selectedPlaylistIds.includes(p.id));
    }
    if (searchTerm.trim() !== '') {
      const fuseInstance = new Fuse(items, fuseOptions);
      items = fuseInstance.search(searchTerm).map((result) => result.item);
    }
    return items;
  }, [playlistCache, searchTerm, showOnlySelected, selectedPlaylistIds, fuseOptions]);
  
  useEffect(() => {
    setFocusedIndex(null);
  }, [searchTerm, showOnlySelected]);
  
  const areAllFilteredSelected = useMemo(() => {
    if (searchTerm.trim() === '' || filteredPlaylists.length === 0) {
      return false;
    }
    return filteredPlaylists.every(p => selectedPlaylistIds.includes(p.id));
  }, [filteredPlaylists, selectedPlaylistIds, searchTerm]);
  
  const handleSelectAllFiltered = () => {
    if (areAllFilteredSelected) return;
    const filteredIds = filteredPlaylists.map(p => p.id);
    addMultipleToSelection(filteredIds);
    toast.info(`${filteredIds.length} playlists de la búsqueda han sido añadidas a la selección.`);
  };
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (filteredPlaylists.length === 0) return;
    
    switch (event.key) {
      case 'ArrowDown':
      event.preventDefault();
      const nextIndex = focusedIndex === null ? 0 : Math.min(focusedIndex + 1, filteredPlaylists.length - 1);
      setFocusedIndex(nextIndex);
      rowRefs.current.get(nextIndex)?.scrollIntoView({ block: 'nearest' });
      break;
      
      case 'ArrowUp':
      event.preventDefault();
      const prevIndex = focusedIndex === null ? 0 : Math.max(focusedIndex - 1, 0);
      setFocusedIndex(prevIndex);
      rowRefs.current.get(prevIndex)?.scrollIntoView({ block: 'nearest' });
      break;
      
      case ' ': // Barra espaciadora
      if (focusedIndex !== null) {
        event.preventDefault();
        const focusedPlaylistId = filteredPlaylists[focusedIndex].id;
        togglePlaylist(focusedPlaylistId);
      }
      break;
      
      case 'Escape':
      event.preventDefault();
      setFocusedIndex(null);
      setSearchTerm('');
      break;
    }
  }, [focusedIndex, filteredPlaylists, togglePlaylist]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  return (
    <div>
    {/* Controles de Vista (Búsqueda y Filtro) */}
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
    <div className="relative flex-grow">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
    <Input
    type="text"
    placeholder="Filtrar por nombre..."
    className="pl-10 pr-32"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    />
    {searchTerm.trim() !== '' && filteredPlaylists.length > 0 && (
      <Button
      variant="ghost"
      size="sm"
      className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
      onClick={handleSelectAllFiltered}
      disabled={areAllFilteredSelected}
      >
      <ListChecks className="mr-2 h-4 w-4" />
      {areAllFilteredSelected ? 'Seleccionado' : 'Seleccionar'}
      </Button>
    )}
    </div>
    <div className="flex items-center space-x-2">
    <Switch
    id="show-selected"
    checked={showOnlySelected}
    onCheckedChange={(isChecked) => {
      setShowOnlySelected(isChecked);
      if (isChecked) setSearchTerm('');
    }}
    />
    <Label htmlFor="show-selected" className="flex items-center gap-2 cursor-pointer">
    <ListChecks className="h-5 w-5" />
    Mostrar solo seleccionadas ({selectedPlaylistIds.length})
    </Label>
    </div>
    </div>
    
    
    {/* Tabla de Playlists */}
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
    {filteredPlaylists.map((playlist, index) => {
      const selected = isSelected(playlist.id);
      const focused = index === focusedIndex;
      
      return (
        <TableRow
        key={playlist.id}
        ref={(node) => {
          if (node) rowRefs.current.set(index, node);
          else rowRefs.current.delete(index);
        }}
        onClick={() => togglePlaylist(playlist.id)}
        className={cn(
          'border-gray-800 transition-colors cursor-pointer',
          {
            'bg-green-900/40 hover:bg-green-900/60': selected,
            'hover:bg-white/5': !selected,
            'outline outline-2 outline-offset-[-2px] outline-blue-500': focused,
          }
        )}
        >
        
        <TableCell>
        <Checkbox
        id={`select-${playlist.id}`}
        checked={selected}
        onClick={(e) => e.stopPropagation()}
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
    
    {/* Trigger y Loader para Scroll Infinito */}
    {!showOnlySelected && nextUrl && (
      <div ref={ref} className="w-full h-10 mt-4">
      {isLoading && <Loader />}
      </div>
    )}
    
    </div>
  );
}