// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { SpotifyPlaylist } from '@/types/spotify';
import {
  fetchMorePlaylists,
  getTrackUris,
  findOrCreateAndPreparePlaylist,
  addTracksBatch,
} from '@/lib/action';
import { usePlaylistStore } from '@/lib/store';

// Componentes UI e Íconos
import { toast } from 'sonner';
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
  const { togglePlaylist, 
    isSelected, 
    selectedPlaylistIds, 
    clearSelection, 
    setPlaylistCache, 
    addMoreToCache } = usePlaylistStore();
    
    const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>(initialPlaylists);
    const [nextUrl, setNextUrl] = useState<string | null>(initialNextUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlySelected, setShowOnlySelected] = useState(false);
    const [step, setStep] = useState<'idle' | 'fetching' | 'confirming' | 'processing'>('idle');
    const [progress, setProgress] = useState({ added: 0, total: 0 });
    const [tracksToMix, setTracksToMix] = useState<string[]>([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isResumable, setIsResumable] = useState(false);
    const [playlistIdForResume, setPlaylistIdForResume] = useState<string | null>(null);
    
    const { ref, inView } = useInView({ threshold: 0 });
    
    // Puebla la caché cuando el componente se carga por primera vez.
    useEffect(() => {
      if (initialPlaylists.length > 0) {
        setPlaylistCache(initialPlaylists);
      }
    }, [initialPlaylists, setPlaylistCache]);
    
    const isProcessing = step === 'fetching' || step === 'processing';
    
    const loadMorePlaylists = useCallback(async () => {
      if (isLoading || !nextUrl || showOnlySelected) return;
      setIsLoading(true);
      try {
        const { items: newPlaylists, next: newNextUrl } = await fetchMorePlaylists(nextUrl);
        setPlaylists((prev) => [...prev, ...newPlaylists]);
        addMoreToCache(newPlaylists);
        setNextUrl(newNextUrl);
      } catch {
        // silenciamos el error para evitar el warning
      } finally {
        setIsLoading(false);
      }
    }, [nextUrl, isLoading, showOnlySelected, addMoreToCache]);
    
    useEffect(() => {
      if (inView) {
        loadMorePlaylists();
      }
    }, [inView, loadMorePlaylists]);
    
    const fuseOptions: IFuseOptions<SpotifyPlaylist> = useMemo(
      () => ({
        keys: ['name', 'owner.display_name'],
        threshold: 0.4,
        ignoreLocation: true,
        useExtendedSearch: true,
      }),
      []
    );
    
    const filteredPlaylists = useMemo(() => {
      let items = playlists;
      if (showOnlySelected) {
        items = items.filter((p) => selectedPlaylistIds.includes(p.id));
      }
      if (searchTerm.trim() !== '') {
        const fuseInstance = new Fuse(items, fuseOptions);
        items = fuseInstance.search(searchTerm).map((result) => result.item);
      }
      return items;
    }, [playlists, searchTerm, showOnlySelected, selectedPlaylistIds, fuseOptions]);
    
    const handleInitiateMix = async () => {
      // Asegurarse de que cada nueva mezcla empiece de forma limpia.
      setIsResumable(false);
      setPlaylistIdForResume(null);
      
      // Limpiar el estado de ejecuciones anteriores al iniciar una nueva.
      // Esto previene la confusión del "estado sucio" si un intento anterior falló.
      setTracksToMix([]);
      setProgress({ added: 0, total: 0 });
      // Opcional: podrías decidir si quieres limpiar el nombre de la playlist aquí también.
      // setNewPlaylistName(''); 
      
      const toastId = toast.loading('Calculando canciones únicas...');
      setStep('fetching');
      
      try {
        const uris = await getTrackUris(selectedPlaylistIds);
        if (uris.length === 0) {
          toast.error('No se encontraron canciones en las playlists seleccionadas.', { id: toastId });
          setStep('idle');
          return;
        }
        
        toast.success(`Se encontraron ${uris.length} canciones únicas.`, { id: toastId });
        setTracksToMix(uris);
        setProgress({ added: 0, total: uris.length });
        setStep('confirming');
      } catch (error: unknown) { // Tipado correcto del error como 'unknown'
        console.error('[UI_ERROR:handleInitiateMix] Error al obtener las canciones:', error);
        
        // Comprobar el tipo de error antes de usarlo
        let errorMessage = 'Error al obtener las canciones.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        toast.error(errorMessage, { id: toastId });
        setStep('idle');
      }
    };
    
    const handleExecuteMix = async () => {
      if (!newPlaylistName.trim()) {
        toast.error('El nombre de la playlist no puede estar vacío.');
        return;
      }
      setStep('processing');
      const toastId = toast.loading('Preparando la playlist de destino...');
      
      let playlistId: string | null = null;
      
      try {
        playlistId = await findOrCreateAndPreparePlaylist(newPlaylistName);
        // Guardamos el ID de la playlist en el estado inmediatamente.
        setPlaylistIdForResume(playlistId);
        toast.loading('Playlist preparada, iniciando adición de canciones...', { id: toastId });
        
        const batchSize = 100;
        for (let i = 0; i < tracksToMix.length; i += batchSize) {
          const batch = tracksToMix.slice(i, i + batchSize);
          toast.loading(`Añadiendo canciones... ${i + batch.length} / ${progress.total}`, { id: toastId });
          await addTracksBatch(playlistId, batch);
          setProgress((prev) => ({ ...prev, added: prev.added + batch.length }));
        }
        
        toast.success('¡Megalista creada con éxito!', { id: toastId, duration: 5000 });
        // Si todo va bien, nos aseguramos de desactivar el modo reanudación.
        setIsResumable(false);
      } catch (error: unknown) { // CAMBIO 2: Tipado correcto del error
        console.error('[UI_ERROR:handleExecuteMix] Ocurrió un error durante la mezcla:', error);
        
        // CAMBIO 3: Comprobar el tipo de error
        let errorMessage = 'Ocurrió un error durante la mezcla.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        toast.error(errorMessage, { id: toastId });
        
        // Si tenemos un ID de playlist, activamos el modo de reanudación.
        if (playlistId) {
          setIsResumable(true);
        }
      } finally {
        // Ahora el bloque finally solo se encarga de resetear el paso de la UI.
        // La limpieza de estado se maneja al inicio o al final con éxito.
        // Si la mezcla fue exitosa, limpiamos todo para el próximo uso.
        if (progress.added > 0 && progress.added === progress.total) {
          setTracksToMix([]);
          setNewPlaylistName('');
          setProgress({ added: 0, total: 0 });
        }
        setStep('idle');
      }
    };
    
    // Función para reanudar una mezcla fallida.
    const handleResumeMix = async () => {
      if (!isResumable || !playlistIdForResume || tracksToMix.length === 0) {
        toast.error('No hay nada que reanudar o falta información crucial.');
        return;
      }
      
      setStep('processing'); // Reutilizamos el diálogo de progreso.
      const toastId = toast.loading(`Reanudando mezcla para ${newPlaylistName}"...`);
      
      try {
        // La lógica clave: procesar solo las canciones que faltan.
        const remainingTracks = tracksToMix.slice(progress.added);
        
        if (remainingTracks.length === 0) {
          toast.success('La mezcla ya estaba completa.', { id: toastId });
          setIsResumable(false);
          return;
        }
        
        const batchSize = 100;
        for (let i = 0; i < remainingTracks.length; i += batchSize) {
          const batch = remainingTracks.slice(i, i + batchSize);
          const newTotalAdded = progress.added + i + batch.length;
          toast.loading(`Añadiendo canciones... ${newTotalAdded} / ${progress.total}`, { id: toastId });
          
          await addTracksBatch(playlistIdForResume, batch);
          
          setProgress((prev) => ({ ...prev, added: prev.added + batch.length }));
        }
        
        toast.success('¡Megalista completada con éxito!', { id: toastId, duration: 5000 });
        setIsResumable(false); // Desactivamos el modo reanudar al terminar.
      } catch (error: unknown) {
        console.error('[UI_ERROR:handleResumeMix] Error durante la reanudación:', error);
        
        let errorMessage = 'Falló la reanudación. Puedes intentarlo de nuevo.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage, { id: toastId });
        // Mantenemos isResumable = true para permitir otro intento.
      } finally {
        setStep('idle');
      }
    };
    
    // Función para limpiar todo y permitir al usuario empezar de cero.
    const handleCancelResume = () => {
      setIsResumable(false);
      setPlaylistIdForResume(null);
      setTracksToMix([]);
      setNewPlaylistName('');
      setProgress({ added: 0, total: 0 });
      clearSelection(); // Limpiamos también la selección de playlists.
      toast.info('Proceso anterior cancelado. Puedes empezar una nueva mezcla.');
    };
    
    return (
      <div>
      {/* CONTROLES DE VISTA */}
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
      </div>
      
      {/* BARRA DE ACCIONES CONTEXTUAL */}
      {selectedPlaylistIds.length > 1 && (
        <div className="mb-4">
        <Separator className="mb-4 bg-gray-700" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg bg-gray-800 p-4">
        <span className="text-sm font-medium text-gray-300">
        {/* NUEVO: Mensaje dinámico */}
        {isResumable
          ? `Mezcla pausada con ${progress.added} de ${progress.total} canciones.`
          : `${selectedPlaylistIds.length} playlist(s) seleccionada(s)`}
          </span>
          
          {/* NUEVO: Lógica condicional para los botones de acción */}
          <div className="flex items-center gap-4">
          {isResumable ? (
            <>
            <Button variant="ghost" onClick={handleCancelResume}>
            <XCircle className="mr-2 h-4 w-4" />
            Cancelar
            </Button>
            <Button onClick={handleResumeMix} disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="mr-2 h-4 w-4" />
            )}
            {step === 'idle' ? 'Reanudar Mezcla' : 'Procesando...'}
            </Button>
            </>
          ) : (
            <>
            <Button variant="ghost" onClick={clearSelection}>
            <XCircle className="mr-2 h-4 w-4" />
            Limpiar Selección
            </Button>
            <Button onClick={handleInitiateMix} disabled={isProcessing || selectedPlaylistIds.length < 2}>
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="mr-2 h-4 w-4" />
            )}
            {step === 'idle' ? 'Crear Megalista' : 'Procesando...'}
            </Button>
            </>
          )}
          </div>
          </div>
          </div>
        )}
        
        {/* TABLA DE PLAYLISTS */}
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
            className={`border-gray-800 transition-colors ${
              selected ? 'bg-green-900/40 hover:bg-green-900/60' : 'hover:bg-white/5'
            }`}
            >
            <TableCell>
            <Checkbox
            id={`select-${playlist.id}`}
            checked={selected}
            onCheckedChange={() => togglePlaylist(playlist.id)}
            />
            </TableCell>
            <TableCell>
            <Avatar>
            <AvatarImage src={playlist.images?.[0]?.url} alt={playlist.name} />
            <AvatarFallback>
            <Music />
            </AvatarFallback>
            </Avatar>
            </TableCell>
            <TableCell className="font-medium">{playlist.name}</TableCell>
            <TableCell>{playlist.owner.display_name}</TableCell>
            <TableCell className="text-right">{playlist.tracks.total}</TableCell>
            </TableRow>
          );
        })}
        </TableBody>
        </Table>
        </div>
        
        {/* TRIGGER Y LOADER PARA SCROLL INFINITO */}
        {!showOnlySelected && nextUrl && (
          <div ref={ref} className="w-full h-10 mt-4">
          {isLoading && <Loader />}
          </div>
        )}
        
        {/* DIÁLOGO 1: NOMBRAR PLAYLIST */}
        <Dialog open={step === 'confirming'} onOpenChange={(isOpen) => !isOpen && setStep('idle')}>
        <DialogContent>
        <DialogHeader>
        <DialogTitle>Confirmar Creación</DialogTitle>
        <DialogDescription>
        Vas a crear una Megalista con un total de{' '}
        <strong>{progress.total}</strong> canciones únicas.
        </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
        <Label htmlFor="playlist-name">Nombre de la Megalista</Label>
        <Input
        id="playlist-name"
        value={newPlaylistName}
        onChange={(e) => setNewPlaylistName(e.target.value)}
        placeholder="Ej: Mix Definitivo"
        />
        </div>
        <DialogFooter>
        <Button variant="outline" onClick={() => setStep('idle')}>
        Cancelar
        </Button>
        <Button onClick={handleExecuteMix}>Confirmar y Empezar</Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
        
        {/* DIÁLOGO DE PROGRESO */}
        <Dialog open={step === 'processing'}>
        <DialogContent>
        <DialogHeader>
        <DialogTitle>Creando tu Megalista...</DialogTitle>
        <DialogDescription>
        Añadiendo canciones a &quot;{newPlaylistName}&quot;.
        </DialogDescription>
        </DialogHeader>
        <div className="py-4">
        <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
        className="bg-green-500 h-2.5 rounded-full"
        style={{ width: `${(progress.added / progress.total) * 100}%` }}
        ></div>
        </div>
        <p className="text-center text-sm text-gray-400 mt-2">
        {progress.added} / {progress.total} canciones añadidas
        </p>
        </div>
        </DialogContent>
        </Dialog>
        </div>
      );
    }