// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { SpotifyPlaylist } from '@/types/spotify';
import { cn } from '@/lib/utils';
import { 
  fetchMorePlaylists, 
  unfollowPlaylist, 
  syncMegalist, 
  updatePlaylistDetailsAction 
} from '@/lib/action';
import { usePlaylistStore } from '@/lib/store';

import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Loader2, Music, RefreshCw, Pencil } from 'lucide-react';

type SortOption = 'custom' | 'megalist_first' | 'name_asc' | 'name_desc' | 'tracks_desc' | 'tracks_asc' | 'owner_asc';

interface PlaylistDisplayProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
  searchTerm: string;
  showOnlySelected: boolean;
  onClearSearch: () => void;
  onFilteredChange: (ids: string[]) => void;
  sortOption: SortOption;
}

export default function PlaylistDisplay({ 
  initialPlaylists, 
  initialNextUrl, 
  searchTerm,           
  showOnlySelected,
  onClearSearch, 
  onFilteredChange, 
  sortOption 
}: PlaylistDisplayProps) {
  const { 
    togglePlaylist, 
    isSelected, 
    selectedPlaylistIds, 
    playlistCache,
    setPlaylistCache, 
    addMoreToCache,
    updatePlaylistInCache,
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
  const [editState, setEditState] = useState<{
    open: boolean;
    playlist: SpotifyPlaylist | null;
    newName: string;
    newDescription: string;
  }>({
    open: false,
    playlist: null,
    newName: '',
    newDescription: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Referencia para el contenedor de scroll ---
  const parentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setPlaylistCache(initialPlaylists);
  }, [initialPlaylists, setPlaylistCache]);
  
  // Maneja el guardado de cambios en la edición de información de playlists
  const handleSaveChanges = async () => {
    if (!editState.playlist || !editState.newName.trim()) {
      toast.error('El nombre de la playlist no puede estar vacío.');
      return;
    }
    
    setIsSaving(true);
    const toastId = toast.loading('Guardando cambios...');
    
    try {
      await updatePlaylistDetailsAction(
        editState.playlist.id,
        editState.newName,
        editState.newDescription
      );
      
      // Actualizamos la caché local para que el cambio sea instantáneo
      updatePlaylistInCache(editState.playlist.id, {
        name: editState.newName,
        description: editState.newDescription,
      });
      
      toast.success('¡Playlist actualizada con éxito!', { id: toastId });
      setEditState({ open: false, playlist: null, newName: '', newDescription: '' });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar.';
      toast.error(message, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };
  
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
  
  const fuseOptions: IFuseOptions<SpotifyPlaylist> = useMemo(
    () => ({
      keys: ['name', 'owner.display_name'],
      threshold: 0.4,
      ignoreLocation: true,
      useExtendedSearch: true,
    }),
    []
  );
  
  // El filtrado depende de los parámetros de ordenación primero y luego con el filtrado y la búsqueda
  const filteredPlaylists = useMemo(() => {
    // Hacemos una copia para no mutar la caché original
    const sortedItems = [...playlistCache];
    
    // Primero, se aplica la ordenación
    switch (sortOption) {
      case 'name_asc':
      sortedItems.sort((a, b) => a.name.localeCompare(b.name));
      break;
      case 'name_desc':
      sortedItems.sort((a, b) => b.name.localeCompare(a.name));
      break;
      case 'tracks_desc':
      sortedItems.sort((a, b) => b.tracks.total - a.tracks.total);
      break;
      case 'tracks_asc':
      sortedItems.sort((a, b) => a.tracks.total - b.tracks.total);
      break;
      case 'owner_asc':
      sortedItems.sort((a, b) => a.owner.display_name.localeCompare(b.owner.display_name));
      break;
      case 'megalist_first':
      sortedItems.sort((a, b) => Number(b.isMegalist ?? false) - Number(a.isMegalist ?? false));
      break;
      case 'custom':
      default:
      // No hacemos nada, mantenemos el orden por defecto de la caché
      break;
    }
    
    let finalItems = sortedItems;
    
    // Aplica el filtro de mostrar solo la selección, si está activo
    if (showOnlySelected) {
      finalItems = finalItems.filter((p) => selectedPlaylistIds.includes(p.id));
    }
    
    // Aplica la búsqueda de filtro por nombre, si el campo está relleno
    if (searchTerm.trim() !== '') {
      const fuseInstance = new Fuse(finalItems, fuseOptions);
      finalItems = fuseInstance.search(searchTerm).map((result) => result.item);
    }
    
    return finalItems;
    
  }, [playlistCache, searchTerm, showOnlySelected, selectedPlaylistIds, fuseOptions, sortOption]);
  
  useEffect(() => {
    setFocusedIndex(null);
  }, [searchTerm, showOnlySelected, sortOption]);
  
  useEffect(() => {
    const ids = filteredPlaylists.map(p => p.id);
    onFilteredChange(ids);
  }, [filteredPlaylists, onFilteredChange]);
  
  const rowVirtualizer = useVirtualizer({
    count: filteredPlaylists.length,
    getScrollElement: () => parentRef.current,
    // Estimamos la altura de cada fila. 76px es un buen punto de partida.
    estimateSize: () => 76, 
    // Renderiza 5 elementos extra para un scroll más suave
    overscan: 5,
  });
  
  // --- Lógica para el scroll infinito adaptada a la virtualización ---
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;
    
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= filteredPlaylists.length - 1 && nextUrl && !isLoading) {
      loadMorePlaylists();
    }
  }, [rowVirtualizer.getVirtualItems(), filteredPlaylists.length, nextUrl, isLoading, loadMorePlaylists]);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (filteredPlaylists.length === 0) return;
    
    let newIndex = focusedIndex;
    
    switch (event.key) {
      case 'ArrowDown':
      event.preventDefault();
      newIndex = focusedIndex === null ? 0 : Math.min(focusedIndex + 1, filteredPlaylists.length - 1);
      break;
      
      case 'ArrowUp':
      event.preventDefault();
      newIndex = focusedIndex === null ? 0 : Math.max(focusedIndex - 1, 0);
      break;
      
      case ' ': 
      if (focusedIndex !== null) {
        event.preventDefault();
        togglePlaylist(filteredPlaylists[focusedIndex].id);
      }
      return; // Evita el scroll y la actualización de foco
      
      case 'Escape':
      event.preventDefault();
      setFocusedIndex(null);
      onClearSearch();
      return;
      
      default:
      return;
    }
    
    if (newIndex !== null && newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      // --- Usamos el método del virtualizador para hacer scroll ---
      rowVirtualizer.scrollToIndex(newIndex, { align: 'auto' });
    }
  }, [focusedIndex, filteredPlaylists, togglePlaylist, onClearSearch, rowVirtualizer]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  // --- Lógica para manejar la sincronización desde la UI ---
  const handleSync = async (playlistToSync: SpotifyPlaylist) => {
    if (syncingId) return; // Evitar clics múltiples
    
    setSyncingId(playlistToSync.id);
    const toastId = toast.loading(`Sincronizando "${playlistToSync.name}"...`);
    
    try {
      const result = await syncMegalist(playlistToSync.id);
      
      // Actualizamos el contador de canciones en la UI inmediatamente
      updatePlaylistInCache(playlistToSync.id, { trackCount: result.finalCount });
      
      if (result.message === "Ya estaba sincronizada.") {
        toast.info(`"${playlistToSync.name}" ya estaba al día.`, { id: toastId });
      } else {
        toast.success(`Sincronización de "${playlistToSync.name}" completada.`, {
          id: toastId,
          description: `Añadidas: ${result.added}, Eliminadas: ${result.removed}. Total: ${result.finalCount} canciones.`,
        });
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo sincronizar la playlist.';
      toast.error(message, { id: toastId });
    } finally {
      setSyncingId(null); // Reseteamos el estado de carga
    }
  };
  
  
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
    <TableHead className="w-[60px] sm:w-[80px] text-muted-foreground"></TableHead>
    <TableHead className="text-muted-foreground">Nombre</TableHead>
    <TableHead className="text-muted-foreground hidden sm:table-cell w-[120px]">Propietario</TableHead>
    <TableHead className="w-[80px] sm:w-[100px] text-right text-muted-foreground">Canciones</TableHead>
    <TableHead className="w-[50px]"></TableHead>
    </TableRow>
    </TableHeader>
    </Table>
    
    
    <div
    ref={parentRef}
    style={{
      height: `65vh`, // Altura fija para el área de scroll
      overflow: 'auto',
    }}
    >
    {/* Div "fantasma" que ocupa la altura total para que el scrollbar sea correcto */}
    <div
    style={{
      height: `${rowVirtualizer.getTotalSize()}px`,
      width: '100%',
      position: 'relative',
    }}
    >
    {/* --- Bucle de renderizado virtualizado --- */}
    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const playlist = filteredPlaylists[virtualRow.index];
      const isMegalista = playlist.isMegalist ?? false;
      const isSyncable = playlist.isSyncable ?? false;
      const isSyncingThis = syncingId === playlist.id;
      const selected = isSelected(playlist.id);
      const focused = virtualRow.index === focusedIndex;
      
      return (
        <Table
        key={playlist.id}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          // El transform posiciona la fila en su lugar correcto
          transform: `translateY(${virtualRow.start}px)`,
        }}
        >
        <TableBody>
        <TableRow
        onClick={() => togglePlaylist(playlist.id)}
        className={cn(
          'border-gray-800 transition-colors cursor-pointer',
          // ... clases de estilo sin cambios
          {
            'bg-green-900/40 hover:bg-green-900/60': selected,
            'hover:bg-white/5': !selected,
            'outline outline-2 outline-offset-[-2px] outline-blue-500': focused,
          }
        )}
        >
        
        {/* Añadir padding a la celda del cover solo en el móvil */}
        <TableCell className="pl-4 py-2">
        <Avatar className="h-12 w-12">
        <AvatarImage src={playlist.images?.[0]?.url} alt={playlist.name} />
        <AvatarFallback>
        <Music />
        </AvatarFallback>
        </Avatar>
        </TableCell>
        
        <TableCell className="font-medium py-2">
        {/* El contenedor principal ahora es flex y alinea verticalmente */}
        <div className="flex items-start justify-between gap-x-3">
        {/* Contenedor para el texto (nombre y propietario) */}
        <div className="flex-grow min-w-0">
        <span className="block break-words pr-2">{playlist.name}</span>
        {/* El propietario se muestra debajo solo en pantallas pequeñas */}
        <span className="block text-xs text-muted-foreground sm:hidden break-words">
        {playlist.owner.display_name}
        </span>
        </div>
        
        {/* Contenedor para el Badge */}
        {isMegalista && (
          <Badge variant="outline" className={cn(
            "whitespace-nowrap shrink-0", // shrink-0 para que no se encoja
            "mt-1 sm:mt-0", // Margen superior en móvil, reseteado en escritorio
            isSyncable 
            ? "border-green-500 text-green-500"
            : "border-yellow-500 text-yellow-500"
          )}>
          Megalista
          </Badge>
        )}
        </div>
        </TableCell>
        
        {/* La celda de Propietario ahora se oculta en móvil */}
        <TableCell className="hidden sm:table-cell py-2 break-words">
        {playlist.owner.display_name}
        </TableCell>
        
        <TableCell className="py-2 text-right">{playlist.tracks.total}</TableCell>
        
        <TableCell className="py-2">
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
        <MoreHorizontal className="h-4 w-4" />
        </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end">
        {/* Opción de Editar */}
        <DropdownMenuItem
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setEditState({
            open: true,
            playlist: playlist,
            newName: playlist.name,
            newDescription: playlist.description || '',
          });
        }}
        >
        <Pencil className="mr-2 h-4 w-4" />
        <span>Editar detalles</span>
        </DropdownMenuItem>
        {/* --- Opción de Sincronizar --- */}
        {isSyncable && (
          <DropdownMenuItem
          disabled={isSyncingThis}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleSync(playlist);
          }}
          >
          {isSyncingThis ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          <span>{isSyncingThis ? "Sincronizando..." : "Sincronizar"}</span>
          </DropdownMenuItem>
        )}
        
        {/* Opción de Eliminar */}
        <DropdownMenuItem
        className="text-red-500 focus:text-red-500"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setDeleteAlert({ open: true, playlist });
        }}
        >
        <Trash2 className="mr-2 h-4 w-4" />
        Eliminar
        </DropdownMenuItem>
        </DropdownMenuContent>
        
        </DropdownMenu>
        </TableCell>
        
        </TableRow>
        </TableBody>
        </Table>
      );
    })}
    </div>
    </div>
    </div>
    
    <AlertDialog open={deleteAlert.open} onOpenChange={(open: boolean) => setDeleteAlert({ open, playlist: open ? deleteAlert.playlist : null })}>
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
    <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="text-white bg-red-600 hover:bg-red-700">
    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
    Sí, eliminar
    </AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    
    {/* Diálogo de edición de detalles */}
    <Dialog open={editState.open} onOpenChange={(isOpen) => setEditState({ ...editState, open: isOpen })}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Editar: {editState.playlist?.name}</DialogTitle>
    <DialogDescription>
    Modifica el nombre y la descripción de tu playlist. Los cambios se reflejarán en Spotify.
    </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
    <div className="grid gap-2">
    <Label htmlFor="playlist-name">Nombre</Label>
    <Input
    id="playlist-name"
    value={editState.newName}
    onChange={(e) => setEditState({ ...editState, newName: e.target.value })}
    />
    </div>
    <div className="grid gap-2">
    <Label htmlFor="playlist-description">Descripción</Label>
    <Textarea
    id="playlist-description"
    value={editState.newDescription}
    onChange={(e) => setEditState({ ...editState, newDescription: e.target.value })}
    placeholder="Añade una descripción (opcional)"
    />
    </div>
    </div>
    <DialogFooter>
    <Button 
    variant="outline" 
    onClick={() => setEditState({ ...editState, open: false })}
    disabled={isSaving} // Deshabilitar mientras se guarda
    >
    Cancelar
    </Button>
    <Button onClick={handleSaveChanges} disabled={isSaving}>
    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    </div>
  );
}