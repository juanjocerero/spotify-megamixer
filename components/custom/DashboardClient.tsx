'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { usePlaylistStore } from '@/lib/store';
import { fetchMorePlaylists } from '@/lib/actions/spotify.actions';
// LÍNEA CORREGIDA: Importación por defecto sin llaves
import PlaylistDisplay from './PlaylistDisplay';
import FloatingActionBar from './FloatingActionBar';
import DashboardHeader from './DashboardHeader';

export type SortOption =
| 'custom'
| 'megalist_first'
| 'name_asc'
| 'name_desc'
| 'tracks_desc'
| 'tracks_asc'
| 'owner_asc';

export const sortLabels: Record<SortOption, string> = {
  custom: 'Orden por defecto',
  megalist_first: 'Megalistas Primero',
  name_asc: 'Nombre (A-Z)',
  name_desc: 'Nombre (Z-A)',
  tracks_desc: 'Canciones (Más a Menos)',
  tracks_asc: 'Canciones (Menos a Más)',
  owner_asc: 'Propietario (A-Z)',
};

interface DashboardClientProps {
  initialNextUrl: string | null;
}

export default function DashboardClient({ initialNextUrl }: DashboardClientProps) {
  const {
    selectedPlaylistIds,
    addMultipleToSelection,
    removeMultipleFromSelection,
    showOnlySelected,
    setShowOnlySelected,
    playlistCache,
    addMoreToCache,
  } = usePlaylistStore();
  
  const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('custom');
  
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
  
  return (
    <div className="relative">
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
    </div>
  );
}