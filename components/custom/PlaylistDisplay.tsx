// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Fuse, { type IFuseOptions } from 'fuse.js';

import { SpotifyPlaylist } from '@/types/spotify';
import { fetchMorePlaylists, } from '@/lib/actions/spotify.actions';
import { usePlaylistStore } from '@/lib/store';
import { usePlaylistKeyboardNavigation } from '@/lib/hooks/usePlaylistKeyboardNavigation';
import TrackDetailView from './TrackDetailView';
import PlaylistItem from './PlaylistItem';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

type SortOption = 'custom' | 'megalist_first' | 'name_asc' | 'name_desc' | 'tracks_desc' | 'tracks_asc' | 'owner_asc';

interface PlaylistDisplayProps {
  initialNextUrl: string | null;
  searchTerm: string;
  showOnlySelected: boolean;
  onClearSearch: () => void;
  onFilteredChange: (ids: string[]) => void;
  sortOption: SortOption;
}

export default function PlaylistDisplay({ 
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
    addMoreToCache,
  } = usePlaylistStore();
  
  const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
  const [isLoading, setIsLoading] = useState(false);
  
  const [trackSheetState, setTrackSheetState] = useState<{ open: boolean; playlist: SpotifyPlaylist | null }>({ open: false, playlist: null });
  
  // Referencia para el contenedor de scroll
  const parentRef = useRef<HTMLDivElement>(null);
  
  const loadMorePlaylists = useCallback(async () => {
    if (isLoading || !nextUrl || showOnlySelected) return;
    
    setIsLoading(true);
    try {
      const { items: newPlaylists, next: newNextUrl } = await fetchMorePlaylists(nextUrl);
      addMoreToCache(newPlaylists);
      setNextUrl(newNextUrl);
    } catch {
      // Manejo de errores
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nextUrl, showOnlySelected, addMoreToCache]);
  
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
    if (
      lastItemIndex >= filteredPlaylists.length - 1 &&
      nextUrl &&
      !isLoading
    ) {
      loadMorePlaylists();
    }
  }, [
    lastItemIndex,
    filteredPlaylists.length,
    nextUrl,
    isLoading,
    loadMorePlaylists,
  ]);
  
  const handleShowTracks = useCallback((playlist: SpotifyPlaylist) => {
    setTrackSheetState({ open: true, playlist });
  }, []);
  
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
    
    <div ref={parentRef} className="h-[65vh] overflow-auto relative pr-[10px]">
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