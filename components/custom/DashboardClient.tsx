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
import { Search, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

// Definimos las props que recibirá este componente desde la página del servidor
interface DashboardClientProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
}

export default function DashboardClient({ initialPlaylists, initialNextUrl }: DashboardClientProps) {
  // El estado se levanta aquí
  // El estado para la búsqueda y el filtro ahora vive en este componente padre.
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  
  const { 
    selectedPlaylistIds, 
    addMultipleToSelection, 
    showOnlySelected, 
    setShowOnlySelected 
  } = usePlaylistStore();
  
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
  
  // Manejador para el botón 
  const handleSelectAllFiltered = () => {
    if (areAllFilteredSelected) return;
    addMultipleToSelection(filteredIds);
    toast.info(`${filteredIds.length} playlists de la búsqueda han sido añadidas.`);
  };
  
  return (
    <>
    {/* Cabecera de control fija (Sticky) */}
    {/* Este div se quedará pegado en la parte superior de la página al hacer scroll */}
    <div className="sticky top-0 z-10 bg-gray-900/80 py-4 backdrop-blur-md">
    <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
    <Input
    type="text"
    placeholder="Filtrar por nombre..."
    // Padding a la derecha para que el texto no quede debajo del botón
    className="pl-10 pr-32 text-base"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    />
    
    {/* Renderizado condicional del botón de añadir resultados de búsqueda */}
    {searchTerm.trim() !== '' && filteredIds.length > 0 && (
      <Button
      variant="ghost"
      size="sm"
      className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
      onClick={handleSelectAllFiltered}
      disabled={areAllFilteredSelected}
      >
      <ListChecks className="mr-2 h-4 w-4" />
      {areAllFilteredSelected ? 'Seleccionado' : 'Seleccionar'}
      </Button>
    )}
    
    </div>
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
    initialPlaylists={initialPlaylists}
    initialNextUrl={initialNextUrl}
    searchTerm={searchTerm}
    showOnlySelected={showOnlySelected} 
    onClearSearch={handleClearSearch}
    onFilteredChange={handleFilteredChange}
    />
    </div>
    
    <FloatingActionBar />
    </>
  );
}