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
  previewMegalistSync, 
  executeMegalistSync, 
  updatePlaylistDetailsAction, 
  shufflePlaylistsAction
} from '@/lib/action';
import { usePlaylistStore } from '@/lib/store';

import { toast } from 'sonner';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MoreHorizontal, Trash2, Loader2, Music, RefreshCw, Pencil, Eye, Shuffle } from 'lucide-react';

import TrackDetailView from './TrackDetailView';

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
  const [syncPreviewAlert, setSyncPreviewAlert] = useState<{
    open: boolean;
    playlist: SpotifyPlaylist | null;
    added: number;
    removed: number;
    finalCount: number;
    isExecutingSync: boolean;
  }>({
    open: false,
    playlist: null,
    added: 0,
    removed: 0,
    finalCount: 0,
    isExecutingSync: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [trackSheetState, setTrackSheetState] = useState<{ 
    open: boolean; 
    playlistId: string | null; 
    playlistName: string | null 
  }>({ 
    open: 
    false, playlistId: null, 
    playlistName: null }
  );
  const [shuffleAlert, setShuffleAlert] = useState<{
    open: boolean;
    playlist: SpotifyPlaylist | null;
    isShuffling: boolean;
  }>({ open: false, playlist: null, isShuffling: false });
  
  // Referencia para el contenedor de scroll ---
  const parentRef = useRef<HTMLTableSectionElement>(null);
  
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
  
  // Maneja el barajado explícito del contenido de una playlist
  const handleShuffle = (playlist: SpotifyPlaylist) => {
    setShuffleAlert({ open: true, playlist, isShuffling: false });
  };
  
  // Maneja el flujo de confirmación del barajado
  const handleConfirmShuffle = async () => {
    if (!shuffleAlert.playlist) return;
    
    setShuffleAlert(prev => ({ ...prev, isShuffling: true }));
    const toastId = toast.loading(`Barajando "${shuffleAlert.playlist.name}"...`);
    
    try {
      await shufflePlaylistsAction([shuffleAlert.playlist.id]);
      toast.success(`Playlist "${shuffleAlert.playlist.name}" barajada con éxito.`, { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo barajar la playlist.';
      toast.error(message, { id: toastId });
    } finally {
      setShuffleAlert({ open: false, playlist: null, isShuffling: false });
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
  }, [rowVirtualizer, filteredPlaylists.length, nextUrl, isLoading, loadMorePlaylists]);
  
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
    if (syncingId) return; // Evitar múltiples clics
    setSyncingId(playlistToSync.id);
    const toastId = toast.loading(`Calculando cambios para "${playlistToSync.name}"...`);
    
    try {
      const result = await previewMegalistSync(playlistToSync.id);
      
      if (result.message === "Ya estaba sincronizada.") {
        toast.info(`"${playlistToSync.name}" ya está al día.`, { id: toastId });
      } else {
        toast.dismiss(toastId); // Cierra el toast de carga
        // Abre el diálogo de confirmación con los datos de la previsualización
        setSyncPreviewAlert({
          open: true,
          playlist: playlistToSync,
          added: result.added,
          removed: result.removed,
          finalCount: result.finalCount,
          isExecutingSync: false,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo previsualizar la sincronización.';
      toast.error(message, { id: toastId });
    } finally {
      setSyncingId(null); // Resetea el estado de carga del icono en la lista
    }
  };
  
  const handleConfirmSync = async () => {
    if (!syncPreviewAlert.playlist) return;
    
    setSyncPreviewAlert(prev => ({ ...prev, isExecutingSync: true })); // Muestra el loader en el botón
    const toastId = toast.loading(`Sincronizando "${syncPreviewAlert.playlist.name}"...`);
    
    try {
      const result = await executeMegalistSync(syncPreviewAlert.playlist.id);
      
      // Actualiza la caché de Zustand con el nuevo número de canciones
      updatePlaylistInCache(syncPreviewAlert.playlist.id, { trackCount: result.finalCount });
      
      toast.success(`Sincronización de "${syncPreviewAlert.playlist.name}" completada.`, {
        id: toastId,
        description: `Añadidas: ${result.added}, Eliminadas: ${result.removed}. Total: ${result.finalCount} canciones.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la sincronización.';
      toast.error(message, { id: toastId });
    } finally {
      // Cierra el diálogo y resetea el estado
      setSyncPreviewAlert({
        open: false,
        playlist: null,
        added: 0,
        removed: 0,
        finalCount: 0,
        isExecutingSync: false,
      });
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
    <div className="rounded-md border border-gray-700 overflow-hidden">
    <div className="w-full">
    {/* Cabecera - Ahora usa flexbox */}
    <div className="flex items-center bg-gray-900 text-sm font-semibold text-white">
    <div className="w-[60px] sm:w-[80px] flex-shrink-0"></div>
    <div className="flex-grow min-w-0 px-4 py-3">Nombre</div>
    <div className="hidden sm:block w-[120px] flex-shrink-0 px-4 py-3">Propietario</div>
    <div className="w-[80px] sm:w-[100px] flex-shrink-0 px-4 py-3 text-right">Canciones</div>
    <div className="w-[50px] flex-shrink-0"></div>
    </div>
    
    {/* Cuerpo - Usa flexbox y virtualización */}
    <div
    ref={parentRef}
    style={{
      height: '65vh',
      overflow: 'auto',
      position: 'relative',
      paddingRight: '10px'
    }}
    >
    <div
    style={{
      height: `${rowVirtualizer.getTotalSize()}px`,
      width: '100%',
    }}
    />
    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const playlist = filteredPlaylists[virtualRow.index];
      if (!playlist) return null;
      
      const isMegalista = playlist.isMegalist ?? false;
      const isSyncable = playlist.isSyncable ?? false;
      const isSyncingThis = syncingId === playlist.id;
      const selected = isSelected(playlist.id);
      const focused = virtualRow.index === focusedIndex;
      
      return (
        <div
        key={playlist.id}
        onClick={() => togglePlaylist(playlist.id)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        className={cn(
          'flex items-center border-b border-gray-800 transition-colors cursor-pointer',
          {
            'bg-green-900/40 hover:bg-green-900/60': selected,
            'hover:bg-white/5': !selected,
            'outline outline-2 outline-offset-[-2px] outline-blue-500': focused,
          }
        )}
        >
        <div className="pl-4 py-2 w-[60px] sm:w-[80px] flex-shrink-0">
        <Avatar className="h-12 w-12">
        <AvatarImage src={playlist.images?.[0]?.url} alt={playlist.name} />
        <AvatarFallback><Music /></AvatarFallback>
        </Avatar>
        </div>
        
        <div className="font-medium py-2 flex-grow min-w-0 px-4">
        <div className="flex items-start justify-between gap-x-3">
        <div className="flex-grow min-w-0">
        <span className="block break-words pr-2">{playlist.name}</span>
        <span className="block text-xs text-muted-foreground sm:hidden break-words">
        {playlist.owner.display_name}
        </span>
        </div>
        {isMegalista && (
          <Badge
          variant="outline"
          className={cn(
            'whitespace-nowrap shrink-0 mt-1 sm:mt-0',
            isSyncable
            ? 'border-green-500 text-green-500'
            : 'border-yellow-500 text-yellow-500'
          )}
          >
          Megalista
          </Badge>
        )}
        </div>
        </div>
        
        <div className="hidden sm:flex items-center px-4 py-2 w-[120px] break-words flex-shrink-0">
        {playlist.owner.display_name}
        </div>
        
        <div className="px-4 py-2 text-right w-[80px] sm:w-[100px] flex-shrink-0">
        {playlist.tracks.total}
        </div>
        
        <div className="px-4 py-2 w-[50px] flex-shrink-0">
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => e.stopPropagation()}
        >
        <MoreHorizontal className="h-4 w-4" />
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="mr-4">
        
        {/* Preview */}
        <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          setTrackSheetState({ open: true, playlistId: playlist.id, playlistName: playlist.name });
        }}
        >
        <Eye className="mr-2 h-4 w-4" />
        <span>Ver Canciones</span>
        </DropdownMenuItem>
        
        {/* Editar detalles */}
        <DropdownMenuItem
        onClick={(e) => {
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
        
        {/* Sincronizar */}
        {isSyncable && (
          <DropdownMenuItem
          disabled={isSyncingThis}
          onClick={(e) => {
            e.stopPropagation();
            handleSync(playlist);
          }}
          >
          {isSyncingThis ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          <span>{isSyncingThis ? 'Sincronizando...' : 'Sincronizar'}</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleShuffle(playlist);
        }}
        >
        <Shuffle className="mr-2 h-4 w-4" />
        <span>Reordenar</span>
        </DropdownMenuItem>
        
        {/* Eliminar */}
        <DropdownMenuItem
        className="text-red-500 focus:text-red-500"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteAlert({ open: true, playlist: playlist });
        }}
        >
        <Trash2 className="mr-2 h-4 w-4" />
        Eliminar
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
        </div>
        </div>
      );
    })}
    </div>
    </div>
    </div>
    
    {/* Diálogo de confirmación de eliminación */}
    <AlertDialog open={deleteAlert.open} onOpenChange={(open) => setDeleteAlert({ ...deleteAlert, open })}>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>¿Estás absolutely seguro?</AlertDialogTitle>
    <AlertDialogDescription>
    Esta acción es irreversible. Estás a punto de eliminar la playlist{' '}
    <strong className="text-white">{deleteAlert.playlist?.name}</strong> de tu librería de Spotify.
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
    <AlertDialogAction
    onClick={handleConfirmDelete}
    disabled={isDeleting}
    className="text-white bg-red-600 hover:bg-red-700"
    >
    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
    Sí, eliminar
    </AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    
    {/* Diálogo de edición */}
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
    disabled={isSaving}
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
    
    {/* Confirmación de sincronización */}
    <AlertDialog
    open={syncPreviewAlert.open}
    onOpenChange={(isOpen) => {
      if (!syncPreviewAlert.isExecutingSync) { // Evita cerrar el diálogo mientras se ejecuta la acción
        setSyncPreviewAlert(prev => ({ ...prev, open: isOpen, playlist: isOpen ? prev.playlist : null }));
      }
    }}
    >
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>Confirmar Sincronización</AlertDialogTitle>
    <AlertDialogDescription asChild>
    <div>
    Vas a sincronizar la playlist{' '}
    <strong className="text-white">{syncPreviewAlert.playlist?.name}</strong>.
    <ul className="list-disc pl-5 mt-3 space-y-1">
    <li className="text-green-400">
    Se añadirán <strong className="text-green-300">{syncPreviewAlert.added}</strong> canciones nuevas.
    </li>
    <li className="text-red-400">
    Se eliminarán <strong className="text-red-300">{syncPreviewAlert.removed}</strong> canciones obsoletas.
    </li>
    </ul>
    <p className="mt-3">
    La playlist tendrá un total de{' '}
    <strong className="text-white">{syncPreviewAlert.finalCount}</strong> canciones. ¿Deseas continuar?
    </p>
    </div>
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel disabled={syncPreviewAlert.isExecutingSync}>Cancelar</AlertDialogCancel>
    <AlertDialogAction
    onClick={handleConfirmSync}
    disabled={syncPreviewAlert.isExecutingSync}
    className="bg-blue-600 hover:bg-blue-700 text-white"
    >
    {syncPreviewAlert.isExecutingSync ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    ) : null}
    {syncPreviewAlert.isExecutingSync ? 'Sincronizando...' : 'Sí, continuar'}
    </AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    
    {/* Confirmación de reordenado de lista */}
    <AlertDialog
    open={shuffleAlert.open}
    onOpenChange={(open) => !shuffleAlert.isShuffling && setShuffleAlert({ ...shuffleAlert, open })}
    >
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>Confirmar Barajado</AlertDialogTitle>
    <AlertDialogDescription>
    Vas a barajar todas las canciones de la playlist{' '}
    <strong className="text-white">{shuffleAlert.playlist?.name}</strong>. Esta acción
    reordenará completamente la lista y no se puede deshacer. Este proceso puede ser lento.
    ¿Deseas continuar?
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel disabled={shuffleAlert.isShuffling}>Cancelar</AlertDialogCancel>
    <AlertDialogAction
    onClick={handleConfirmShuffle}
    disabled={shuffleAlert.isShuffling}
    className="bg-orange-600 hover:bg-orange-700 text-white"
    >
    {shuffleAlert.isShuffling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {shuffleAlert.isShuffling ? 'Barajando...' : 'Sí, barajar'}
    </AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    
    {/* Sheet para la vista de canciones */}
    <Sheet open={trackSheetState.open} onOpenChange={(isOpen) => setTrackSheetState({ open: isOpen, playlistId: null, playlistName: null })}>
    {/* Usamos w-full para móviles y un ancho fijo para pantallas más grandes */}
    <SheetContent className="w-full sm:max-w-[500px] flex flex-col p-0">
    <SheetHeader className="p-4 pb-0">
    <SheetTitle className="text-white">{trackSheetState.playlistName ? `Canciones en "${trackSheetState.playlistName}"` : "Cargando canciones..."}</SheetTitle>
    <SheetDescription>
    Aquí se muestran todas las canciones de esta playlist.
    </SheetDescription>
    </SheetHeader>
    {trackSheetState.playlistId && (
      <TrackDetailView
      playlistId={trackSheetState.playlistId}
      playlistName={trackSheetState.playlistName || ''}
      />
    )}
    </SheetContent>
    </Sheet>
    </div>
  );
}