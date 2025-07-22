// /components/custom/DashboardHeader.tsx
'use client';

import { useRef } from 'react';
import {
  Search,
  XCircle,
  ArrowUpDown,
  ListChecks,
  ListX,
} from 'lucide-react';
import { useSpotifySearch } from '@/lib/hooks/useSpotifySearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import SearchResultsPopover from '../search/SearchResultsPopover';
import { SortOption, sortLabels } from './DashboardClient'; // Reutilizamos los tipos

interface DashboardHeaderProps {
  // Props para el filtro local
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredIds: string[];
  areAllFilteredSelected: boolean;
  handleSelectAllFiltered: () => void;
  // Props para la ordenación
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  // Props para el switch de selección
  showOnlySelected: boolean;
  setShowOnlySelected: (show: boolean) => void;
  // Props para la búsqueda global
  followedPlaylistIds: string[];
}

/**
* Componente que renderiza la cabecera "sticky" del dashboard.
* Encapsula todos los controles de usuario para la interacción principal con la lista de playlists.
*
* Responsabilidades:
* - **Filtro Local:** Proporciona un `Input` para filtrar en tiempo real las playlists del usuario.
* - **Ordenación Local:** Ofrece un `DropdownMenu` para cambiar el orden de las playlists mostradas.
* - **Búsqueda Global:** Integra el hook `useSpotifySearch` para buscar en todo Spotify. Muestra los resultados en `SearchResultsPopover`.
* - **Control de Selección:** Incluye un `Switch` para alternar la vista entre todas las playlists y solo las seleccionadas.
* - **Acciones de Búsqueda:** Proporciona botones para limpiar la búsqueda y seleccionar/deseleccionar todos los resultados del filtro.
*
* @param {DashboardHeaderProps} props - El estado y los callbacks necesarios, gestionados por el componente padre `DashboardClient`.
*/
export default function DashboardHeader({
  searchTerm,
  setSearchTerm,
  sortOption,
  setSortOption,
  showOnlySelected,
  setShowOnlySelected,
  filteredIds,
  areAllFilteredSelected,
  handleSelectAllFiltered,
  followedPlaylistIds,
}: DashboardHeaderProps) {
  
  // Hook para la lógica de búsqueda global en Spotify
  const {
    query: spotifyQuery,
    setQuery: setSpotifyQuery,
    results,
    isLoading,
  } = useSpotifySearch();
  
  // Referencias para posicionar el popover de búsqueda
  const spotifySearchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className="sticky top-0 z-40 bg-gray-900/80 py-4 backdrop-blur-md">
    <div className="flex flex-col sm:flex-row items-center gap-4">
    <div className="flex flex-1 flex-col sm:flex-row w-full gap-4">
    {/* Filtro Local */}
    <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
    <Input
    type="text"
    placeholder="Filtrar playlists"
    className="pl-10 pr-[160px] text-base w-full"
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
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
      <Button
      variant="ghost"
      size="sm"
      className="h-8"
      onClick={handleSelectAllFiltered}
      >
      {areAllFilteredSelected ? (
        <ListX className="mr-2 h-4 w-4" />
      ) : (
        <ListChecks className="mr-2 h-4 w-4" />
      )}
      </Button>
      <div className="mx-1 h-6 w-px bg-gray-600"></div>
      </>
    )}
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
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => setSortOption('megalist_first')}>
    Megalistas Primero
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('frozen_first')}>
    Congeladas Primero
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('empty_first')}>
    Vacías Primero
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => setSortOption('name_asc')}>
    Nombre (A-Z)
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('name_desc')}>
    Nombre (Z-A)
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => setSortOption('tracks_desc')}>
    Canciones (Más a Menos)
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('tracks_asc')}>
    Canciones (Menos a Más)
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => setSortOption('owner_asc')}>
    Propietario (A-Z)
    </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setSortOption('owner_desc')}>
    Propietario (Z-A)
    </DropdownMenuItem>
    </DropdownMenuContent>
    
    </DropdownMenu>
    </div>
    </div>
    
    {/* Búsqueda Global */}
    <div ref={searchContainerRef} className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
    <Input
    ref={spotifySearchRef}
    type="text"
    placeholder="Buscar en todo Spotify..."
    className="pl-10 text-base w-full"
    value={spotifyQuery}
    onChange={e => setSpotifyQuery(e.target.value)}
    />
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
    
    {/* Switch de Selección */}
    <div className="flex items-center space-x-2">
    <Switch
    id="show-selected-main"
    checked={showOnlySelected}
    onCheckedChange={isChecked => {
      setShowOnlySelected(isChecked);
      if (isChecked) setSearchTerm('');
    }}
    />
    <Label
    htmlFor="show-selected-main"
    className="flex items-center gap-2 cursor-pointer whitespace-nowrap"
    >
    <ListChecks className="h-5 w-5" /> Selección
    </Label>
    </div>
    </div>
    </div>
    
    {/* Popover de Búsqueda */}
    <SearchResultsPopover
    query={spotifyQuery}
    results={results}
    isLoading={isLoading}
    setQuery={setSpotifyQuery}
    anchorRef={searchContainerRef}
    followedPlaylistIds={followedPlaylistIds}
    />
    </div>
  );
}