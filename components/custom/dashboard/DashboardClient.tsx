// /components/custom/DashboardClient.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { usePlaylistStore } from '@/lib/store';
import { useNowPlaying } from '@/lib/hooks/useNowPlaying';
import { cn } from '@/lib/utils';
import { fetchMorePlaylists } from '@/lib/actions/spotify.actions';
import PlaylistDisplay from '../playlist/PlaylistDisplay';
import FloatingActionBar from '../FloatingActionBar';
import NowPlayingBar from '../NowPlayingBar';
import DashboardHeader from './DashboardHeader';

/**
* Define las opciones de ordenación disponibles para la lista de playlists.
*/
export type SortOption =
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

/**
* Mapea los identificadores de las opciones de ordenación a etiquetas legibles por humanos.
*/
export const sortLabels: Record<SortOption, string> = {
  custom: 'Orden por defecto',
  megalist_first: 'Megalistas primero',
  frozen_first: 'Congeladas primero',
  empty_first: 'Vacías primero',
  name_asc: 'Nombre (A-Z)',
  name_desc: 'Nombre (Z-A)',
  tracks_desc: 'Canciones (más a menos)',
  tracks_asc: 'Canciones (menos a más)',
  owner_asc: 'Propietario (A-Z)',
  owner_desc: 'Propietario (Z-A)',
};

interface DashboardClientProps {
  /**
  * La URL para la siguiente página de playlists, obtenida del servidor durante el SSR.
  * Si es `null`, significa que no hay más páginas para cargar.
  */
  initialNextUrl: string | null;
  /**
  * El id del usuario actual para pasarlo a PlaylistDisplay.
  * El objetivo es ocultar el nombre del creador de una lista si es el propio usuario.
  */
  userId: string;
}

/**
* Componente orquestador principal de la vista del dashboard.
* Es el "cerebro" de la UI del cliente.
*
* Responsabilidades:
* - **Propietario del Estado Compartido:** Gestiona el estado que debe ser compartido entre
*   `DashboardHeader` y `PlaylistDisplay`, como el término de búsqueda (`searchTerm`),
*   la opción de ordenación (`sortOption`) y el filtro de "solo seleccionadas".
* - **Gestión de Carga Paginada:** Maneja la lógica del scroll infinito. Mantiene la URL
*   de la siguiente página y ejecuta `handleLoadMorePlaylists` cuando es necesario.
* - **Renderizado de Componentes:** Renderiza los componentes `DashboardHeader` y `PlaylistDisplay`,
*   pasándoles el estado y los callbacks necesarios para que funcionen de forma coordinada.
*
* @param {DashboardClientProps} props - Las props del componente.
*/
export default function DashboardClient({ initialNextUrl, userId }: DashboardClientProps) {
  
  useNowPlaying();
  
  // Estado del store de Zustand
  const {
    selectedPlaylistIds,
    addMultipleToSelection,
    removeMultipleFromSelection,
    showOnlySelected,
    setShowOnlySelected,
    playlistCache,
    addMoreToCache, 
    currentlyPlayingTrack, 
  } = usePlaylistStore(useShallow((state) => ({
    selectedPlaylistIds: state.selectedPlaylistIds,
    addMultipleToSelection: state.addMultipleToSelection,
    removeMultipleFromSelection: state.removeMultipleFromSelection,
    showOnlySelected: state.showOnlySelected,
    setShowOnlySelected: state.setShowOnlySelected,
    playlistCache: state.playlistCache,
    addMoreToCache: state.addMoreToCache, 
    currentlyPlayingTrack: state.currentlyPlayingTrack, 
  })));
  
  // Estado para la paginación
  const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // En una carga exitosa del dashboard, limpiamos la bandera de recuperación.
  // Esto asegura que el mecanismo de recarga automática esté disponible para futuras sesiones.
  useEffect(() => {
    if (sessionStorage.getItem('recovery_attempted')) {
      sessionStorage.removeItem('recovery_attempted');
    }
  }, []); // El array vacío asegura que se ejecute solo una vez.
  
  /**
  * Carga la siguiente página de playlists desde la API de Spotify y la añade a la caché.
  */
  const handleLoadMorePlaylists = useCallback(async () => {
    if (isLoadingMore || !nextUrl) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchMorePlaylists(nextUrl);
      addMoreToCache(result.items);
      setNextUrl(result.next);
    } catch (error) {
      console.error('Failed to load more playlists:', error);
      toast.error('Error al cargar más playlists');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextUrl, addMoreToCache]);
  
  const followedPlaylistIds = useMemo(
    () => playlistCache.map(p => p.id),
    [playlistCache],
  );
  
  // Estado para la interacción del usuario
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortOption, setSortOption] = useState<SortOption>('custom');
  
  // Estado para la comunicación entre componentes hijos
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  
  const handleFilteredChange = useCallback((ids: string[]) => {
    setFilteredIds(ids);
  }, []);
  
  const handleClearSearch = () => {
    setSearchTerm('');
  };
  
  const areAllFilteredSelected = useMemo(() => {
    if (filteredIds.length === 0) return false;
    return filteredIds.every(id => selectedPlaylistIds.includes(id));
  }, [filteredIds, selectedPlaylistIds]);
  
  const handleSelectAllFiltered = () => {
    if (areAllFilteredSelected) {
      removeMultipleFromSelection(filteredIds);
      toast.info(
        `${filteredIds.length} playlists de la búsqueda han sido deseleccionadas.`,
      );
    } else {
      addMultipleToSelection(filteredIds);
      toast.info(
        `${filteredIds.length} playlists de la búsqueda han sido añadidas.`,
      );
    }
  };
  
  // Lógica para determinar el padding dinámico
  const getPaddingClass = () => {
    const isFloatingBarVisible = selectedPlaylistIds.length > 0;
    const isNowPlayingBarVisible = !!currentlyPlayingTrack;
    
    if (isFloatingBarVisible && isNowPlayingBarVisible) {
      // Ambas barras son visibles. La altura total es h-20 (NowPlaying) + h-20 (Floating) = 10rem.
      // En Tailwind, 10rem es `pb-40`.
      return 'pb-40';
    }
    if (isFloatingBarVisible) {
      // Solo la barra flotante es visible. Su altura es h-20/h-24. Usamos pb-24 para el caso más grande.
      return 'pb-20 sm:pb-24';
    }
    if (isNowPlayingBarVisible) {
      // Solo la barra de reproducción es visible. Su altura es h-20.
      return 'pb-20';
    }
    return '';
  };
  
  return (
    // Se añade padding-bottom condicional si hay una canción sonando
    // para que la FloatingActionBar se "eleve" y no se solape con la NowPlayingBar.
    <div className={cn('relative', getPaddingClass())}>
    <DashboardHeader
    searchTerm={searchTerm}
    setSearchTerm={setSearchTerm}
    sortOption={sortOption}
    setSortOption={setSortOption}
    showOnlySelected={showOnlySelected}
    setShowOnlySelected={setShowOnlySelected}
    filteredIds={filteredIds}
    areAllFilteredSelected={areAllFilteredSelected}
    handleSelectAllFiltered={handleSelectAllFiltered}
    followedPlaylistIds={followedPlaylistIds}
    />
    
    <div className="pt-6">
    <PlaylistDisplay 
    userId={userId} 
    isLoadingMore={isLoadingMore}
    nextUrl={nextUrl}
    searchTerm={searchTerm}
    showOnlySelected={showOnlySelected}
    onClearSearch={handleClearSearch}
    onFilteredChange={handleFilteredChange}
    onLoadMore={handleLoadMorePlaylists}
    sortOption={sortOption}
    />
    </div>
    
    <FloatingActionBar />
    <NowPlayingBar />
    </div>
  );
}