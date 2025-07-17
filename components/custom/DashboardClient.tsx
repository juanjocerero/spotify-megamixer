// /components/custom/DashboardClient.tsx
'use client';

import { useState } from 'react';
import { SpotifyPlaylist } from '@/types/spotify';

// Importamos los componentes que va a orquestar
import PlaylistDisplay from './PlaylistDisplay';
import FloatingActionBar from './FloatingActionBar';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, ListChecks } from 'lucide-react';

// Definimos las props que recibirá este componente desde la página del servidor
interface DashboardClientProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
}

export default function DashboardClient({ initialPlaylists, initialNextUrl }: DashboardClientProps) {
  // El estado se levanta aquí
  // El estado para la búsqueda y el filtro ahora vive en este componente padre.
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  
  const handleClearSearch = () => {
    setSearchTerm('');
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
    className="pl-10 text-base"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    />
    </div>
    <div className="flex items-center space-x-2 pt-4">
    <Switch
    id="show-selected-main" // ID único
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
    
    {/* 3. CONTENIDO PRINCIPAL */}
    {/* Añadimos un padding para separar la cabecera del contenido */}
    <div className="pt-6">
    <PlaylistDisplay
    initialPlaylists={initialPlaylists}
    initialNextUrl={initialNextUrl}
    onClearSearch={handleClearSearch}
    // Pasamos el estado y el filtro como props al componente hijo
    searchTerm={searchTerm}
    showOnlySelected={showOnlySelected}
    />
    </div>
    
    {/* 4. LA BARRA DE ACCIONES FLOTANTE NO NECESITA CAMBIOS */}
    <FloatingActionBar />
    </>
  );
}