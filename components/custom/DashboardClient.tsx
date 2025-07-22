// /components/custom/DashboardClient.tsx
'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { SpotifyPlaylist } from '@/types/spotify';
import { usePlaylistStore } from '@/lib/store';
import { useSpotifySearch } from '@/lib/hooks/useSpotifySearch';
import SearchResultsPopover from './search/SearchResultsPopover';

// Importamos los componentes que va a orquestar
import PlaylistDisplay from './PlaylistDisplay';
import FloatingActionBar from './FloatingActionBar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Search, ListChecks, XCircle, ListX, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

// Tipos para la ordenación de playlists locales
type SortOption =
| 'custom'
| 'megalist_first'
| 'name_asc'
| 'name_desc'
| 'tracks_desc'
| 'tracks_asc'
| 'owner_asc';

// Mapeo para mostrar un texto legible en el botón
const sortLabels: Record<SortOption, string> = {
  custom: 'Orden por defecto',
  megalist_first: 'Megalistas Primero',
  name_asc: 'Nombre (A-Z)',
  name_desc: 'Nombre (Z-A)',
  tracks_desc: 'Canciones (Más a Menos)',
  tracks_asc: 'Canciones (Menos a Más)',
  owner_asc: 'Propietario (A-Z)',
};

// Definimos las props que recibirá este componente desde la página del servidor
interface DashboardClientProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
}

export default function DashboardClient({ initialNextUrl }: DashboardClientProps) {
  
  const { 
    selectedPlaylistIds, 
    addMultipleToSelection, 
    removeMultipleFromSelection, 
    showOnlySelected, 
    setShowOnlySelected 
  } = usePlaylistStore();
  
  const { playlistCache } = usePlaylistStore();
  const followedPlaylistIds = useMemo(
    () => playlistCache.map(p => p.id),
    [playlistCache]
  );
  
  // El estado se levanta aquí
  // El estado para la búsqueda y el filtro ahora vive en este componente padre.
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('custom');
  
  const spotifySearchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Elementos de integración de estado de la búsqueda en Spotify
  const {
    query: spotifyQuery,
    setQuery: setSpotifyQuery,
    results,
    isLoading,
  } = useSpotifySearch();
  
  const handleFilteredChange = useCallback((ids: string[]) => {
    setFilteredIds(ids);
  }, []);
  
  const handleClearSearch = () => {
    setSearchTerm('');
  };
  
  // Lógica para determinar si el botón debe estar deshabilitado
  const areAllFilteredSelected = useMemo(() => {
    if (filteredIds.length === 0) return false;
    return filteredIds.every(id => selectedPlaylistIds.includes(id));
  }, [filteredIds, selectedPlaylistIds]);
  
  // Manejador para el botón de selección múltiple en el filtrado
  const handleSelectAllFiltered = () => {
    if (areAllFilteredSelected) {
      removeMultipleFromSelection(filteredIds);
      toast.info(`${filteredIds.length} playlists de la búsqueda han sido deseleccionadas.`);
    } else {
      addMultipleToSelection(filteredIds);
      toast.info(`${filteredIds.length} playlists de la búsqueda han sido añadidas.`);
    }
  };
  
  return (
    <div className="relative">
    {/* Inicio: cabecera fija */}
    <div className="sticky top-0 z-40 bg-gray-900/80 py-4 backdrop-blur-md">
    {/* Contenedor principal de los controles superiores */}
    <div className="flex flex-col sm:flex-row items-center gap-4">
    {/* Contenedor de las dos barras de búsqueda */}
    <div className="flex flex-1 flex-col sm:flex-row w-full gap-4">
    {/* Filtro Local */}
    <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
    <Input
    type="text"
    placeholder="Filtrar playlists"
    className="pl-10 pr-[160px] text-base w-full"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    />
    
    
    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
    {searchTerm.trim() !== '' && (
      <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-full"
      onClick={() => setSearchTerm('')}
      >
      <XCircle className="h-5 w-5 text-muted-foreground" />
      </Button>
    )}
    {searchTerm.trim() !== '' && filteredIds.length > 0 && (
      <>
      <Button variant="ghost" size="sm" className="h-8" onClick={handleSelectAllFiltered}>
      {areAllFilteredSelected ? <ListX className="mr-2 h-4 w-4" /> : <ListChecks className="mr-2 h-4 w-4" />}
      {/* {areAllFilteredSelected ? 'Deseleccionar' : 'Seleccionar'} */}
      </Button>
      <div className="mx-1 h-6 w-px bg-gray-600"></div>
      </>
    )}
    
    
    {/* Nuevo menú de ordenaciones */}
    <DropdownMenu>
    <Tooltip>
    <TooltipTrigger asChild>
    <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="h-9 w-9">
    <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
    </Button>
    </DropdownMenuTrigger>
    </TooltipTrigger>
    <TooltipContent>
    <p>Ordenar por: {sortLabels[sortOption]}</p>
    </TooltipContent>
    </Tooltip>
    <DropdownMenuContent align="end">
    <DropdownMenuItem onSelect={() => setSortOption('custom')}>
    Orden por defecto
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('megalist_first')}>
    Megalistas Primero
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('name_asc')}>
    Nombre (A-Z)
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('name_desc')}>
    Nombre (Z-A)
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('tracks_desc')}>
    Nº de Canciones (Descendente)
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('tracks_asc')}>
    Nº de Canciones (Ascendente)
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('owner_asc')}>
    Propietario (A-Z)
    </DropdownMenuItem>
    </DropdownMenuContent>
    </DropdownMenu>
    </div>
    
    </div>
    
    {/* Búsqueda Global en Spotify */}
    <div ref={searchContainerRef} className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
    <Input
    ref={spotifySearchRef}
    type="text"
    placeholder="Buscar en todo Spotify..."
    className="pl-10 text-base w-full"
    value={spotifyQuery}
    onChange={(e) => setSpotifyQuery(e.target.value)}
    />
    {/* YA NO HAY CONTROLES DE ORDENACIÓN AQUÍ */}
    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
    {spotifyQuery.trim() !== '' && (
      <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-full"
      onClick={() => setSpotifyQuery('')}
      >
      <XCircle className="h-5 w-5 text-muted-foreground" />
      </Button>
    )}
    </div>
    </div>
    
    {/* Contenedor del switch "Mostrar solo seleccionadas" */}
    <div className="flex items-center space-x-2">
    <Switch
    id="show-selected-main"
    checked={showOnlySelected}
    onCheckedChange={(isChecked) => {
      setShowOnlySelected(isChecked);
      if (isChecked) setSearchTerm('');
    }}
    />
    <Label htmlFor="show-selected-main" className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
    <ListChecks className="h-5 w-5" />
    Selección
    </Label>
    </div>
    </div>
    </div>
    {/* FIN: CABECERA FIJA */}
    
    {/* El Popover se renderiza aquí, fuera del flujo de la cabecera */}
    <SearchResultsPopover
    query={spotifyQuery}
    results={results}
    isLoading={isLoading}
    setQuery={setSpotifyQuery}
    anchorRef={searchContainerRef} 
    followedPlaylistIds={followedPlaylistIds}
    />
    
    {/* Contenedor de la lista principal de playlists */}
    <div className="pt-6">
    <PlaylistDisplay
    initialNextUrl={initialNextUrl}
    searchTerm={searchTerm}
    showOnlySelected={showOnlySelected}
    onClearSearch={handleClearSearch}
    onFilteredChange={handleFilteredChange}
    sortOption={sortOption}
    />
    </div>
    
    {/* La barra de acciones flotante */}
    <FloatingActionBar />
    </div>
    </div>
  );
}