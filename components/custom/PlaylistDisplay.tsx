// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { SpotifyPlaylist } from '@/types/spotify';
import { cn } from '@/lib/utils';
import { fetchMorePlaylists, updatePlaylistDetailsAction, 
} from '@/lib/action';
import { usePlaylistStore } from '@/lib/store';

import { useActions } from '@/lib/contexts/ActionProvider'; 

import TrackDetailView from './TrackDetailView';

import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MoreHorizontal, Trash2, Loader2, Music, Pencil, Eye, Shuffle, Wand2 } from 'lucide-react';

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
  } = usePlaylistStore();
  
  const { 
    isProcessing, 
    openEditDialog, 
    openSyncDialog, 
    openShuffleDialog, 
    openDeleteDialog, 
    openSurpriseMixDialog 
  } = useActions();
  
  const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  const [trackSheetState, setTrackSheetState] = useState<{ open: boolean; playlistId: string | null; playlistName: string | null 
  }>({ 
    open: false, playlistId: null, playlistName: null }
  );
  
  // Referencia para el contenedor de scroll ---
  const parentRef = useRef<HTMLTableSectionElement>(null);
  
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
      
      const isSyncable = playlist.isSyncable ?? false;
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
        
        {/* Lógica de la insignia*/}
        {playlist.playlistType === 'MEGALIST' && (
          <Badge variant="outline" className="whitespace-nowrap shrink-0 mt-1 sm:mt-0 border-green-500 text-green-500">
          Megalista
          </Badge>
        )}
        {playlist.playlistType === 'SURPRISE' && (
          <Badge variant="outline" className="whitespace-nowrap shrink-0 mt-1 sm:mt-0 border-blue-500 text-blue-500">
          Sorpresa
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
        <DropdownMenuContent align="end" className="mr-6">
        
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
          openEditDialog(playlist);
        }}
        >
        <Pencil className="mr-2 h-4 w-4" />
        <span>Editar detalles</span>
        </DropdownMenuItem>
        
        {/* Sincronizar */}
        {isSyncable && (
          <DropdownMenuItem 
          disabled={isProcessing} 
          onClick={(e) => { 
            e.stopPropagation(); 
            openSyncDialog([{ id: playlist.id, name: playlist.name }]); 
          }}>
          </DropdownMenuItem>
        )}
        
        {/* Reordenar */}
        <DropdownMenuItem 
        disabled={isProcessing} 
        onClick={(e) => { 
          e.stopPropagation(); 
          openShuffleDialog([{ id: playlist.id, name: playlist.name }]); 
        }}>
        <Shuffle className="mr-2 h-4 w-4" />
        <span>Reordenar</span>
        </DropdownMenuItem>
        
        {/* Crear lista sorpresa */}
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          openSurpriseMixDialog([playlist.id]);
        }}>        <Wand2 className="mr-2 h-4 w-4" />
        <span>Crear lista sorpresa</span>
        </DropdownMenuItem>
        
        {/* Eliminar */}
        <DropdownMenuItem className="text-red-500 focus:text-red-500" 
        disabled={isProcessing} 
        onClick={(e) => { 
          e.stopPropagation(); 
          openDeleteDialog([{ id: playlist.id, name: playlist.name 
            
          }]); }}>
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