// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { SpotifyPlaylist } from '@/types/spotify';
import { fetchMorePlaylists, createMegaPlaylist } from '@/lib/action';
import { usePlaylistStore } from '@/lib/store';

// Componentes UI y Íconos
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Music, Search, ListChecks, Shuffle, XCircle } from 'lucide-react';

interface PlaylistDisplayProps {
  initialPlaylists: SpotifyPlaylist[];
  initialNextUrl: string | null;
}

function Loader() {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
    <Loader2 className="h-5 w-5 animate-spin" />
    <span>Cargando más playlists...</span>
    </div>
  );
}

export default function PlaylistDisplay({ initialPlaylists, initialNextUrl }: PlaylistDisplayProps) {
  const { togglePlaylist, isSelected, selectedPlaylistIds, clearSelection } = usePlaylistStore();
  
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>(initialPlaylists);
  const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isMixing, setIsMixing] = useState(false); 
  
  const { ref, inView } = useInView({ threshold: 0 });
  
  const loadMorePlaylists = useCallback(async () => {
    if (isLoading || !nextUrl || showOnlySelected) return;
    setIsLoading(true);
    try {
      const { items: newPlaylists, next: newNextUrl } = await fetchMorePlaylists(nextUrl);
      setPlaylists(prev => [...prev, ...newPlaylists]);
      setNextUrl(newNextUrl);
    } catch (error) {
      console.error("Error al cargar más playlists:", error);
    } finally {
      setIsLoading(false);
    }
  }, [nextUrl, isLoading, showOnlySelected]);
  
  useEffect(() => {
    if (inView) {
      loadMorePlaylists();
    }
  }, [inView, loadMorePlaylists]);
  
  const fuseOptions: IFuseOptions<SpotifyPlaylist> = useMemo(() => ({
    keys: ['name', 'owner.display_name'],
    threshold: 0.4,
    ignoreLocation: true,
    useExtendedSearch: true,
  }), []);
  
  const filteredPlaylists = useMemo(() => {
    let items = playlists;
    if (showOnlySelected) {
      items = items.filter(p => selectedPlaylistIds.includes(p.id));
    }
    if (searchTerm.trim() !== '') {
      const fuseInstance = new Fuse(items, fuseOptions);
      items = fuseInstance.search(searchTerm).map(result => result.item);
    }
    return items;
  }, [playlists, searchTerm, showOnlySelected, selectedPlaylistIds, fuseOptions]);
  
  const handleConfirmMix = async () => {
    if (!newPlaylistName.trim()) {
      alert("El nombre de la playlist no puede estar vacío.");
      return;
    }
    
    setIsMixing(true); // Activar estado de carga
    
    try {
      const result = await createMegaPlaylist(selectedPlaylistIds, newPlaylistName);
      
      if (result.success) {
        alert(result.message); // Usamos alert temporalmente para mostrar el resultado
      } else {
        alert(`Error: ${result.message}`);
      }
      
    } catch (error) {
      console.error("Error al llamar la acción createMegaPlaylist:", error);
      alert("Ocurrió un error inesperado al contactar con el servidor.");
    } finally {
      setIsMixing(false); // Desactivar estado de carga
      setIsDialogOpen(false); // Cerrar diálogo
      setNewPlaylistName(''); // Limpiar nombre
    }
  };
  
  return (
    <div>
    {/* ---- CONTROLES DE VISTA (BARRA SUPERIOR) ---- */}
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
    <div className="relative flex-grow">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
    <Input
    type="text"
    placeholder="Filtrar por nombre..."
    className="pl-10"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    />
    </div>
    <div className="flex items-center space-x-2">
    <Switch
    id="show-selected"
    checked={showOnlySelected}
    onCheckedChange={(isChecked) => {
      setShowOnlySelected(isChecked);
      if (isChecked) {
        setSearchTerm('');
      }
    }}
    />
    <Label htmlFor="show-selected" className="flex items-center gap-2 cursor-pointer">
    <ListChecks className="h-5 w-5" />
    Mostrar solo seleccionadas ({selectedPlaylistIds.length})
    </Label>
    </div>
    </div> {/* <<<<<<< FIN DEL DIV DE CONTROLES DE VISTA */}
    
    {/* ---- BARRA DE ACCIONES CONTEXTUAL (NUEVO BLOQUE SEPARADO) ---- */}
    {selectedPlaylistIds.length > 1 && (
      <div className="mb-4">
      <Separator className="mb-4 bg-gray-700" />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg bg-gray-800 p-4">
      <span className="text-sm font-medium text-gray-300">
      {selectedPlaylistIds.length} playlist(s) seleccionada(s)
      </span>
      <div className="flex items-center gap-4">
      {/* Botón secundario para limpiar */}
      <Button variant="ghost" onClick={clearSelection}>
      <XCircle className="mr-2 h-4 w-4" />
      Limpiar Selección
      </Button>
      {/* Botón primario para mezclar */}
      <Button
      onClick={() => setIsDialogOpen(true)}
      disabled={selectedPlaylistIds.length < 2}
      >
      <Shuffle className="mr-2 h-4 w-4" />
      Crear Megalista
      </Button>
      </div>
      </div>
      </div>
    )}
    
    {/* ---- TABLA DE PLAYLISTS ---- */}
    <div className="rounded-md border border-gray-700">
    <Table>
    <TableHeader>
    <TableRow className="hover:bg-transparent">
    <TableHead className="w-[50px]"></TableHead>
    <TableHead className="w-[80px] text-muted-foreground">Cover</TableHead>
    <TableHead className="text-muted-foreground">Nombre</TableHead>
    <TableHead className="text-muted-foreground">Propietario</TableHead>
    <TableHead className="text-right text-muted-foreground">Nº de Canciones</TableHead>
    </TableRow>
    </TableHeader>
    <TableBody>
    {filteredPlaylists.map((playlist) => {
      const selected = isSelected(playlist.id);
      return (
        <TableRow
        key={playlist.id}
        className={`border-gray-800 transition-colors ${selected ? 'bg-green-900/40 hover:bg-green-900/60' : 'hover:bg-white/5'}`}
        >
        <TableCell><Checkbox id={`select-${playlist.id}`} checked={selected} onCheckedChange={() => togglePlaylist(playlist.id)}/></TableCell>
        <TableCell><Avatar><AvatarImage src={playlist.images?.[0]?.url} alt={playlist.name} /><AvatarFallback><Music /></AvatarFallback></Avatar></TableCell>
        <TableCell className="font-medium">{playlist.name}</TableCell>
        <TableCell>{playlist.owner.display_name}</TableCell>
        <TableCell className="text-right">{playlist.tracks.total}</TableCell>
        </TableRow>
      );
    })}
    </TableBody>
    </Table>
    </div>
    
    {/* ---- TRIGGER Y LOADER PARA SCROLL INFINITO ---- */}
    {!showOnlySelected && nextUrl && (
      <div ref={ref} className="w-full h-10 mt-4">
      {isLoading && <Loader />}
      </div>
    )}
    
    {/* ---- DIÁLOGO ---- */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
    <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700">
    <DialogHeader>
    <DialogTitle className="text-white">Crear tu Megalista</DialogTitle>
    <DialogDescription>
    Elige un nombre para tu nueva playlist combinada.
    </DialogDescription>
    </DialogHeader>
    
    <div className="grid gap-4 py-4">
    <Label htmlFor="playlist-name" className="text-left text-gray-300">
    Nombre de la playlist
    </Label>
    <Input
    id="playlist-name"
    value={newPlaylistName}
    onChange={(e) => setNewPlaylistName(e.target.value)}
    placeholder="Ej: Mix Definitivo de Lunes"
    className="bg-gray-800 border-gray-600 text-white"
    disabled={isMixing} // Deshabilitar mientras se mezcla
    />
    </div>
    
    <DialogFooter>
    <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isMixing}>
    Cancelar
    </Button>
    <Button 
    onClick={handleConfirmMix}
    disabled={!newPlaylistName.trim() || isMixing}
    >
    {isMixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isMixing ? 'Mezclando...' : 'Confirmar y Mezclar'}
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    </div>
  );
}