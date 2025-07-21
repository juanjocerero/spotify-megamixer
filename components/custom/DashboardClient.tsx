// /components/custom/DashboardClient.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { SpotifyPlaylist } from '@/types/spotify';
import { usePlaylistStore } from '@/lib/store';

// Importamos los componentes que va a orquestar
import PlaylistDisplay from './PlaylistDisplay';
import FloatingActionBar from './FloatingActionBar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Search, ListChecks, XCircle, ListX, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

// Definimos las props que recibirá este componente desde la página del servidor
interface DashboardClientProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
}

// Definimos los tipos de ordenación para evitar errores
type SortOption = 'custom' | 'megalist_first' | 'name_asc' | 'name_desc' | 'tracks_desc' | 'tracks_asc' | 'owner_asc';

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

export default function DashboardClient({ initialNextUrl }: DashboardClientProps) {
  
  const { 
    selectedPlaylistIds, 
    addMultipleToSelection, 
    removeMultipleFromSelection, 
    showOnlySelected, 
    setShowOnlySelected 
  } = usePlaylistStore();
  
  // El estado se levanta aquí
  // El estado para la búsqueda y el filtro ahora vive en este componente padre.
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('custom');
  
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
    <>
    {/* Cabecera de control fija (Sticky) */}
    <div className="sticky top-0 z-10 bg-gray-900/80 py-4 backdrop-blur-md">
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
    {/* Barra de búsqueda */}
    <div className="relative flex-grow w-full sm:w-auto">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
    <Input
    type="text"
    placeholder="Filtrar por nombre..."
    className="pl-10 pr-[160px] text-base w-full"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    />
    
    {/* Botones internos */}
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
      <div className="mx-1 h-6 w-px bg-gray-600"></div>
      <Button variant="ghost" size="sm" className="h-8" onClick={handleSelectAllFiltered}>
      {areAllFilteredSelected ? <ListX className="mr-2 h-4 w-4" /> : <ListChecks className="mr-2 h-4 w-4" />}
      {areAllFilteredSelected ? 'Deseleccionar' : 'Seleccionar'}
      </Button>
      </>
    )}
    </div>
    </div>
    
    {/* Botón de ordenar */}
    <DropdownMenu>
    <DropdownMenuTrigger asChild>
    <Button
    variant="outline"
    className="w-full sm:w-auto whitespace-nowrap"
    >
    <ArrowUpDown className="mr-2 h-4 w-4" />
    {sortLabels[sortOption]}
    </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
    <DropdownMenuItem onSelect={() => setSortOption('custom')}>Orden por defecto</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('megalist_first')}>Megalistas Primero</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('name_asc')}>Nombre (A-Z)</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('name_desc')}>Nombre (Z-A)</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('tracks_desc')}>Nº de Canciones (Descendente)</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('tracks_asc')}>Nº de Canciones (Ascendente)</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => setSortOption('owner_asc')}>Propietario (A-Z)</DropdownMenuItem>
    </DropdownMenuContent>
    </DropdownMenu>
    </div>
    
    {/* Switch de mostrar solo seleccionadas */}
    <div className="flex items-center space-x-2 pt-4">
    <Switch
    id="show-selected-main"
    checked={showOnlySelected}
    onCheckedChange={(isChecked) => {
      setShowOnlySelected(isChecked);
      if (isChecked) setSearchTerm('');
    }}
    />
    <Label htmlFor="show-selected-main" className="flex items-center gap-2 cursor-pointer">
    <ListChecks className="h-5 w-5" />
    Mostrar solo seleccionadas
    </Label>
    </div>
    </div>
    
    {/* Contenido principal */}
    {/* Añadimos un padding para separar la cabecera del contenido */}
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
    
    <FloatingActionBar />
    </>
  );
}