// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Fuse, { type IFuseOptions } from 'fuse.js';

import { ListFooterLoader } from '../skeletons/ListFooterLoader';

import { SpotifyPlaylist } from '@/types/spotify';
import { usePlaylistStore } from '@/lib/store';
import { usePlaylistKeyboardNavigation } from '@/lib/hooks/usePlaylistKeyboardNavigation';
import TrackDetailView from '../TrackDetailView';
import PlaylistItem from './PlaylistItem';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

type SortOption = 'custom' | 'megalist_first' | 'name_asc' | 'name_desc' | 'tracks_desc' | 'tracks_asc' | 'owner_asc';

interface PlaylistDisplayProps {
  isLoadingMore: boolean; 
  nextUrl: string | null;
  searchTerm: string;
  showOnlySelected: boolean;
  onClearSearch: () => void;
  onFilteredChange: (ids: string[]) => void;
  onLoadMore: () => void; 
  sortOption: SortOption;
}


/**
* Componente encargado de renderizar la lista de playlists del usuario.
*
* Responsabilidades:
* - **Filtrado y Ordenación:** Aplica la lógica de ordenación (`sortOption`) y
*   filtrado (`searchTerm`, `showOnlySelected`) sobre la caché de playlists de Zustand.
*   Utiliza `Fuse.js` para una búsqueda "fuzzy" eficiente.
* - **Virtualización:** Emplea `@tanstack/react-virtual` (`useVirtualizer`) para renderizar
*   solo los elementos visibles en la pantalla, garantizando un alto rendimiento incluso
*   con miles de playlists.
* - **Scroll Infinito:** Detecta cuándo el usuario se acerca al final de la lista y llama
*   a la función `onLoadMore` para cargar la siguiente página de resultados.
* - **Navegación por Teclado:** Integra `usePlaylistKeyboardNavigation` para permitir
*   la navegación y selección de playlists con las flechas y la barra espaciadora.
* - **Vista de Canciones:** Gestiona la apertura de un `Sheet` para mostrar los
*   detalles de las canciones de una playlist en el componente `TrackDetailView`.
*
* @param {PlaylistDisplayProps} props - El estado y los callbacks del `DashboardClient`.
*/
export default function PlaylistDisplay({
  isLoadingMore, 
  nextUrl,
  searchTerm,           
  showOnlySelected,
  onClearSearch, 
  onFilteredChange, 
  onLoadMore, 
  sortOption 
}: PlaylistDisplayProps) {
  
  const { 
    togglePlaylist, 
    isSelected, 
    selectedPlaylistIds, 
    playlistCache,
  } = usePlaylistStore();
  
  const [trackSheetState, setTrackSheetState] = useState<{
    open: boolean;
    playlist: SpotifyPlaylist | null;
  }>({ open: false, playlist: null });
  
  // Referencia para el contenedor de scroll
  const parentRef = useRef<HTMLDivElement>(null);
  
  const fuseOptions: IFuseOptions<SpotifyPlaylist> = useMemo(
    () => ({
      keys: ['name', 'owner.display_name'],
      threshold: 0.4,
      ignoreLocation: true,
      useExtendedSearch: true,
    }),
    []
  );
  
  /**
  * Memoiza la lista final de playlists a renderizar, aplicando la ordenación
  * y los filtros correspondientes.
  */
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
  
  
  const rowVirtualizer = useVirtualizer({
    count: filteredPlaylists.length,
    getScrollElement: () => parentRef.current,
    // Estimamos la altura de cada fila. 76px es un buen punto de partida.
    estimateSize: () => 76, 
    // Renderiza 5 elementos extra para un scroll más suave
    overscan: 5,
  });
  
  const { focusedIndex, resetFocus } = usePlaylistKeyboardNavigation({
    playlists: filteredPlaylists,
    rowVirtualizer,
    togglePlaylistSelection: togglePlaylist,
    onClearSearch,
    isEnabled: trackSheetState.open === false,
  });
  
  useEffect(() => {
    resetFocus();
  }, [searchTerm, showOnlySelected, sortOption, resetFocus]);
  
  useEffect(() => {
    onFilteredChange(filteredPlaylists.map(p => p.id));
  }, [filteredPlaylists, onFilteredChange]);
  
  
  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItemIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : 0;
  
  
  useEffect(() => {
    // La condición no cambia: se activa cuando el último elemento visible
    // está cerca del final de la lista de datos cargados.
    if (lastItemIndex >= filteredPlaylists.length - 1 && nextUrl && !isLoadingMore) {
      // En lugar de tener su propia lógica, ahora solo notifica al padre.
      onLoadMore(); 
    }
  }, [
    lastItemIndex,
    filteredPlaylists.length,
    nextUrl,
    isLoadingMore,
    onLoadMore, // <-- Se añade la dependencia al callback.
  ]);
  
  const handleShowTracks = useCallback((playlist: SpotifyPlaylist) => {
    setTrackSheetState({ open: true, playlist });
  }, []);
  
  // Si no, renderizamos la lista normal.
  return (
    <div>
    <div className="rounded-md border border-gray-700 overflow-hidden">
    <div className="w-full">
    <div className="flex items-center bg-gray-900 text-sm font-semibold text-white">
    <div className="w-[60px] sm:w-[80px] flex-shrink-0"></div>
    <div className="flex-grow min-w-0 px-4 py-3">Nombre</div>
    <div className="hidden sm:block w-[120px] flex-shrink-0 px-4 py-3">Propietario</div>
    <div className="w-[80px] sm:w-[100px] flex-shrink-0 px-4 py-3 text-right">Canciones</div>
    <div className="w-[50px] flex-shrink-0"></div>
    </div>
    
    <div ref={parentRef} 
    className="h-[65vh] overflow-auto relative scrollbar-thin scrollbar-thumb-zinc-600 hover:scrollbar-thumb-zinc-500 scrollbar-track-transparent"
    >
    <div className="h-[--size] w-full" style={{ '--size': `${rowVirtualizer.getTotalSize()}px` } as React.CSSProperties} />
    
    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const playlist = filteredPlaylists[virtualRow.index];
      if (!playlist) return null;
      
      return (
        <PlaylistItem
        key={playlist.id}
        playlist={playlist}
        isSelected={isSelected(playlist.id)}
        isFocused={virtualRow.index === focusedIndex}
        style={{
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        onToggleSelect={togglePlaylist}
        onShowTracks={handleShowTracks}
        />
      );
    })}
    
    {isLoadingMore && (
      <div
      style={{
        height: '60px',
        transform: `translateY(${rowVirtualizer.getTotalSize()}px)`,
      }}
      >
      <ListFooterLoader />
      </div>
    )}
    
    {isLoadingMore ? (
      <ListFooterLoader />
    ) : !nextUrl && playlistCache.length > 0 ? (
      <div className="flex justify-center items-center py-4">
      <p className="text-sm text-muted-foreground">
      Has llegado al final de tus playlists.
      </p>
      </div>
    ) : null}
    
    </div>
    </div>
    </div>
    
    <Sheet open={trackSheetState.open} onOpenChange={(isOpen) => setTrackSheetState({ open: isOpen, playlist: null })}>
    <SheetContent className="w-full sm:max-w-[500px] flex flex-col p-0">
    <SheetHeader className="p-4 pb-0">
    <SheetTitle className="text-white">{trackSheetState.playlist ? `Canciones en "${trackSheetState.playlist.name}"` : "Cargando canciones..."}</SheetTitle>
    <SheetDescription>Aquí se muestran todas las canciones de esta playlist.</SheetDescription>
    </SheetHeader>
    {trackSheetState.playlist && (
      <TrackDetailView playlistId={trackSheetState.playlist.id} playlistName={trackSheetState.playlist.name || ''} />
    )}
    </SheetContent>
    </Sheet>
    </div>
  );
}