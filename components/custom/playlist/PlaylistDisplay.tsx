// /components/custom/playlist/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { useShallow } from 'zustand/react/shallow';

import { ListFooterLoader } from '../skeletons/ListFooterLoader';
import TrackDetailSheet from './TrackDetailSheet';
import FolderItem from '../folder/FolderItem';
import PlaylistItem from './PlaylistItem';

import { SpotifyPlaylist, Folder } from '@/types/spotify';
import { usePlaylistStore } from '@/lib/store';
import { usePlaylistKeyboardNavigation } from '@/lib/hooks/usePlaylistKeyboardNavigation';

// Tipos exportados para que los usen otros componentes si es necesario
export type ListItem =
| { type: 'folder'; id: string; data: Folder; playlistCount: number }
| { type: 'playlist'; id: string; data: SpotifyPlaylist; isIndented: boolean };

type SortOption = 
| 'custom' 
| 'megalist_first' 
| 'frozen_first'
| 'empty_first'
| 'name_asc' 
| 'name_desc' 
| 'tracks_desc' 
| 'tracks_asc' 
| 'owner_asc' 
| 'owner_desc';

interface PlaylistDisplayProps {
  userId: string;
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
* Componente encargado de renderizar la lista jerárquica de carpetas y playlists.
*
* Responsabilidades:
* - **Generación de Lista Jerárquica:** Construye una lista aplanada (`flattenedList`) que representa
*   la estructura de carpetas y playlists, mostrando las playlists anidadas si una carpeta está expandida.
* - **Filtrado y Ordenación:** Aplica `sortOption`, `searchTerm`, y `showOnlySelected` a la lista.
*   Las carpetas se mantienen siempre en la parte superior, y luego se ordenan los elementos de primer nivel.
* - **Virtualización:** Emplea `@tanstack/react-virtual` para renderizar solo los elementos visibles,
*   garantizando un alto rendimiento.
* - **Renderizado Condicional:** Renderiza un componente `<FolderItem>` o `<PlaylistItem>` según el tipo de
*   elemento en la lista virtualizada.
* - **Scroll Infinito:** Carga más playlists cuando el usuario se acerca al final.
* - **Navegación por Teclado:** Integra `usePlaylistKeyboardNavigation` para navegar y actuar sobre
*   carpetas (expandir) y playlists (seleccionar).
* - **Vista de Canciones:** Gestiona la apertura de un `Sheet` para mostrar las canciones.
*
* @param {PlaylistDisplayProps} props - El estado y los callbacks del `DashboardClient`.
*/
export default function PlaylistDisplay({
  userId, 
  isLoadingMore, 
  nextUrl,
  searchTerm,           
  showOnlySelected,
  onClearSearch, 
  onFilteredChange, 
  onLoadMore, 
  sortOption 
}: PlaylistDisplayProps) {
  
  const { togglePlaylist, isSelected, selectedPlaylistIds, playlistCache, folders } = usePlaylistStore(
    useShallow((state) => ({
      togglePlaylist: state.togglePlaylist,
      isSelected: state.isSelected,
      selectedPlaylistIds: state.selectedPlaylistIds,
      playlistCache: state.playlistCache,
      folders: state.folders,
    })),
  );
  
  const [trackSheetState, setTrackSheetState] = useState<{
    open: boolean;
    playlist: SpotifyPlaylist | null;
  }>({ open: false, playlist: null });
  
  // Estado para gestionar qué carpetas están expandidas.
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Callback para que FolderItem o la navegación por teclado puedan cambiar el estado de expansión.
  const handleToggleFolderExpand = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) newSet.delete(folderId);
      else newSet.add(folderId);
      return newSet;
    });
  }, []);
  
  // Referencia para el contenedor de scroll, necesaria para el virtualizador.
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
  * Memoiza la lista final de elementos a renderizar. Esta es la lógica central
  * del componente. Transforma las listas planas de playlists y carpetas en una
  * única lista jerárquica aplanada, aplicando filtros y ordenación.
  */
  const flattenedList: ListItem[] = useMemo(() => {
    // Caso especial: si solo se muestran los seleccionados, la jerarquía no aplica.
    if (showOnlySelected) {
      return playlistCache
      .filter(p => selectedPlaylistIds.includes(p.id))
      .map(p => ({ type: 'playlist', id: p.id, data: p, isIndented: false }));
    }
    
    // Hacemos copias para no mutar la caché original.
    let workPlaylists = [...playlistCache];
    let workFolders = [...folders];
    
    // Aplicar filtro de búsqueda si existe.
    if (searchTerm.trim() !== '') {
      const fusePlaylists = new Fuse(workPlaylists, fuseOptions);
      workPlaylists = fusePlaylists.search(searchTerm).map(r => r.item);
      // También filtramos las carpetas por su nombre.
      const fuseFolders = new Fuse(workFolders, { keys: ['name'], threshold: 0.4 });
      workFolders = fuseFolders.search(searchTerm).map(r => r.item);
    }
    
    // Crear mapas para un acceso eficiente a los datos.
    const playlistsById = new Map(workPlaylists.map(p => [p.id, p]));
    const folderPlaylistMap = new Map<string, string[]>();
    workPlaylists.forEach(p => {
      if (p.folderId) {
        if (!folderPlaylistMap.has(p.folderId)) folderPlaylistMap.set(p.folderId, []);
        folderPlaylistMap.get(p.folderId)!.push(p.id);
      }
    });
    
    // Identificar los elementos de primer nivel (carpetas y playlists sin carpeta).
    const topLevelItems: (Folder | SpotifyPlaylist)[] = [
      ...workFolders,
      ...workPlaylists.filter(p => !p.folderId),
    ];
    
    // Aplicar la ordenación a los elementos de primer nivel.
    const finalSortedItems = [...topLevelItems].sort((a, b) => {
      const aIsFolder = 'userId' in a;
      const bIsFolder = 'userId' in b;
      
      // Las carpetas siempre van antes que las playlists.
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      
      // Si ambos son carpetas, ordenar por nombre.
      if (aIsFolder && bIsFolder) return a.name.localeCompare(b.name);
      
      const pA = a as SpotifyPlaylist;
      const pB = b as SpotifyPlaylist;
      
      // Si ambos son playlists, aplicar la lógica de ordenación seleccionada.
      switch (sortOption) {
        case 'name_asc': return pA.name.localeCompare(pB.name);
        case 'name_desc': return pB.name.localeCompare(pA.name);
        case 'tracks_desc': return pB.tracks.total - pA.tracks.total;
        case 'tracks_asc': return pA.tracks.total - pB.tracks.total;
        case 'owner_asc': return pA.owner.display_name.localeCompare(pB.owner.display_name);
        case 'owner_desc': return pB.owner.display_name.localeCompare(pA.owner.display_name); 
        case 'megalist_first': return Number(pB.isMegalist ?? false) - Number(pA.isMegalist ?? false);
        case 'frozen_first': return Number(pB.isFrozen ?? false) - Number(pA.isFrozen ?? false);
        case 'empty_first':
        const aIsEmpty = pA.playlistType === 'MEGALIST' && pA.tracks.total === 0;
        const bIsEmpty = pB.playlistType === 'MEGALIST' && pB.tracks.total === 0;
        return Number(bIsEmpty) - Number(aIsEmpty);
        case 'custom':
        default: return 0; // Mantiene el orden relativo de la caché
      }
    });
    
    // Construir la lista final aplanada.
    const list: ListItem[] = [];
    finalSortedItems.forEach(item => {
      if ('userId' in item) { // Es una carpeta
        const folder = item;
        const childPlaylistIds = folderPlaylistMap.get(folder.id) || [];
        // Solo mostrar carpetas que contienen playlists (después del filtrado).
        if(childPlaylistIds.length > 0 || searchTerm.trim() !== '') {
          list.push({ type: 'folder', id: folder.id, data: folder, playlistCount: childPlaylistIds.length });
          // Si la carpeta está expandida, añadir sus playlists hijas indentadas.
          if (expandedFolders.has(folder.id)) {
            childPlaylistIds.forEach(playlistId => {
              const playlist = playlistsById.get(playlistId);
              if (playlist) list.push({ type: 'playlist', id: playlist.id, data: playlist, isIndented: true });
            });
          }
        }
      } else { // Es una playlist (ya sabemos que es de primer nivel)
        list.push({ type: 'playlist', id: item.id, data: item, isIndented: false });
      }
    });
    return list;
  }, [playlistCache, folders, searchTerm, showOnlySelected, selectedPlaylistIds, fuseOptions, sortOption, expandedFolders]);
  
  const rowVirtualizer = useVirtualizer({ count: flattenedList.length, getScrollElement: () => parentRef.current, estimateSize: () => 76, overscan: 5 });
  
  const { focusedIndex, resetFocus } = usePlaylistKeyboardNavigation({
    items: flattenedList,
    rowVirtualizer,
    togglePlaylistSelection: togglePlaylist,
    toggleFolderExpansion: handleToggleFolderExpand,
    onClearSearch,
    isEnabled: !trackSheetState.open,
  });
  
  // Resetea el foco cuando cambian los filtros para evitar focos incorrectos.
  useEffect(() => {
    resetFocus();
  }, [searchTerm, showOnlySelected, sortOption, resetFocus]);
  
  // Informa al componente padre de los IDs de playlists actualmente visibles.
  useEffect(() => {
    onFilteredChange(flattenedList.filter(item => item.type === 'playlist').map(item => item.id));
  }, [flattenedList, onFilteredChange]);
  
  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItemIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : 0;
  
  // Lógica para el scroll infinito.
  useEffect(() => {
    // No cargar más si estamos filtrando o si no hay más páginas.
    if (showOnlySelected || searchTerm.trim() !== '' || !nextUrl || isLoadingMore) return;
    
    if (lastItemIndex >= flattenedList.length - 1) {
      onLoadMore();
    }
  }, [lastItemIndex, flattenedList.length, nextUrl, isLoadingMore, onLoadMore, showOnlySelected, searchTerm]);
  
  const handleShowTracks = useCallback((playlist: SpotifyPlaylist) => { setTrackSheetState({ open: true, playlist }); }, []);
  
  return (
    <div>
    <div className="rounded-md border border-gray-700 overflow-hidden">
    <div className="w-full">
    <div className="flex items-center bg-gray-900 text-sm font-semibold text-white">
    {/* Header de la tabla (vacío, solo para espaciado) */}
    <div className="w-[60px] sm:w-[80px] flex-shrink-0"></div>
    <div className="w-[50px] flex-shrink-0"></div>
    </div>
    
    <div 
    ref={parentRef} 
    className="h-[65vh] overflow-auto relative scrollbar-thin scrollbar-thumb-zinc-600 hover:scrollbar-thumb-zinc-500 scrollbar-track-transparent"
    >
    {/* Div espaciador para el tamaño total del contenido virtualizado */}
    <div className="h-[--size] w-full" style={{ '--size': `${rowVirtualizer.getTotalSize()}px` } as React.CSSProperties} />
    
    {/* Mapeo de los items virtuales para renderizarlos */}
    {virtualItems.map((virtualRow) => {
      const item = flattenedList[virtualRow.index];
      if (!item) return null;
      
      const style = { height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` };
      const isFocused = virtualRow.index === focusedIndex;
      
      // Renderizado condicional basado en el tipo de elemento.
      if (item.type === 'folder') {
        return (
          <FolderItem
          key={item.id}
          folder={item.data}
          playlistCount={item.playlistCount}
          isExpanded={expandedFolders.has(item.id)}
          isFocused={isFocused}
          style={style}
          onToggleExpand={handleToggleFolderExpand}
          />
        );
      } else { // Es una playlist
        return (
          <PlaylistItem
          key={item.id}
          playlist={item.data}
          currentUserId={userId}
          isSelected={isSelected(item.id)}
          isFocused={isFocused}
          isIndented={item.isIndented} // Se pasa el prop de indentación
          style={style}
          onToggleSelect={togglePlaylist}
          onShowTracks={handleShowTracks}
          />
        );
      }
    })}
    
    {/* Loader al final de la lista durante la carga */}
    {isLoadingMore && (
      <ListFooterLoader />
    )}
    
    {/* Mensaje al llegar al final de la lista */}
    {!isLoadingMore && !nextUrl && playlistCache.length > 0 && (
      <div className="flex justify-center items-center py-4">
      <p className="text-sm text-muted-foreground">
      Has llegado al final de tus playlists.
      </p>
      </div>
    )}
    </div>
    </div>
    </div>
    
    <TrackDetailSheet 
    isOpen={trackSheetState.open}
    onOpenChange={(isOpen) => setTrackSheetState({ open: isOpen, playlist: isOpen ? trackSheetState.playlist : null })}
    playlist={trackSheetState.playlist}
    />
    </div>
  );
}