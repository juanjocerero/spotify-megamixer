// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { SpotifyPlaylist } from '@/types/spotify';
import { cn } from '@/lib/utils';
import { fetchMorePlaylists, unfollowPlaylist } from '@/lib/action';
import { usePlaylistStore } from '@/lib/store';

import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Loader2, Music, Search, ListChecks } from 'lucide-react';

interface PlaylistDisplayProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
  searchTerm: string;
  showOnlySelected: boolean;
  onClearSearch: () => void;
}

function Loader() {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
    <Loader2 className="h-5 w-5 animate-spin" />
    <span>Cargando más playlists...</span>
    </div>
  );
}

export default function PlaylistDisplay({ 
  initialPlaylists, 
  initialNextUrl, 
  searchTerm,           
  showOnlySelected,
  onClearSearch
}: PlaylistDisplayProps) {
  const { 
    togglePlaylist, 
    isSelected, 
    selectedPlaylistIds, 
    playlistCache,
    setPlaylistCache, 
    addMoreToCache,
    addMultipleToSelection, 
    removePlaylistFromCache
  } = usePlaylistStore();
  
  const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const [deleteAlert, setDeleteAlert] = useState<{ open: boolean; playlist: SpotifyPlaylist | null }>({
    open: false,
    playlist: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  // El filtrado depende de las props
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
      onClearSearch();
      break;
    }
  }, [focusedIndex, filteredPlaylists, togglePlaylist]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  const handleConfirmDelete = async () => {
    if (!deleteAlert.playlist) return;
    setIsDeleting(true);
    
    const toastId = toast.loading(`Eliminando "${deleteAlert.playlist.name}"...`);
    
    try {
      await unfollowPlaylist(deleteAlert.playlist.id);
      removePlaylistFromCache(deleteAlert.playlist.id); // Sincroniza la UI
      toast.success('Playlist eliminada con éxito.', { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la playlist.';
      toast.error(message, { id: toastId });
    } finally {
      setIsDeleting(false);
      setDeleteAlert({ open: false, playlist: null });
    }
  };
  
  return (
    <div>
    {/* Tabla de Playlists */}
    <div className="rounded-md border border-gray-700">
    <Table className="table-fixed">
    
    <TableHeader>
    <TableRow className="hover:bg-transparent">
    <TableHead className="w-[50px] hidden sm:table-cell"></TableHead>
    <TableHead className="w-[60px] sm:w-[80px] text-muted-foreground">Cover</TableHead>
    <TableHead className="text-muted-foreground">Nombre</TableHead>
    <TableHead className="text-muted-foreground hidden sm:table-cell w-[120px]">Propietario</TableHead>
    <TableHead className="w-[80px] sm:w-[100px] text-right text-muted-foreground">Canciones</TableHead>
    <TableHead className="w-[50px]"></TableHead>
    </TableRow>
    </TableHeader>
    
    <TableBody>
    {filteredPlaylists.map((playlist, index) => {
      const isMegalista = playlist.description?.includes('<!-- MEGAMIXER_APP_V1 -->');
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
        
        {/* Ocultar celda de checkbox en móvil */}
        <TableCell className="hidden sm:table-cell">
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
        
        <TableCell className="font-medium">
        <div className="flex flex-col">
        <span className="truncate break-words">{playlist.name}</span>
        {/* El propietario se muestra debajo solo en pantallas pequeñas */}
        <span className="text-xs text-muted-foreground sm:hidden break-words">
        {playlist.owner.display_name}
        </span>
        {isMegalista && (
          <Badge variant="outline" className="border-green-500 text-green-500 whitespace-nowrap">
          Megalista
          </Badge>
        )}
        </div>
        </TableCell>
        
        {/* La celda de Propietario ahora se oculta en móvil */}
        <TableCell className="hidden sm:table-cell break-words">
        {playlist.owner.display_name}
        </TableCell>
        
        <TableCell className="text-right">{playlist.tracks.total}</TableCell>
        
        <TableCell>
        {isMegalista && (
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
          </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
          <DropdownMenuItem
          className="text-red-500 focus:text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteAlert({ open: true, playlist });
          }}
          >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
          </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        )}
        </TableCell>
        
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
    
    <AlertDialog open={deleteAlert.open} onOpenChange={(open) => setDeleteAlert({ open, playlist: open ? deleteAlert.playlist : null })}>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
    <AlertDialogDescription>
    Esta acción es irreversible. Estás a punto de eliminar la playlist{' '}
    <strong className="text-white">{deleteAlert.playlist?.name}</strong> de tu librería de Spotify.
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
    <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
    Sí, eliminar
    </AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    
    </div>
  );
}