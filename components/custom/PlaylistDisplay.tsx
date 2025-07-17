// /components/custom/PlaylistDisplay.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { SpotifyPlaylist } from '@/types/spotify';
import {
  fetchMorePlaylists,
  getTrackUris,
  findOrCreatePlaylist,
  addTracksBatch, 
  clearPlaylist, 
  updateAndReorderPlaylist
} from '@/lib/action';
import { usePlaylistStore } from '@/lib/store';
import { cn } from '@/lib/utils';

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
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  // Obtener el estado del store
  const { 
    togglePlaylist, 
    isSelected, 
    selectedPlaylistIds, 
    clearSelection, 
    playlistCache, // Esta es la fuente de verdad
    setPlaylistCache, 
    addMoreToCache, 
    megamixCache, 
    addPlaylistToCache, 
    updatePlaylistInCache,
    addMultipleToSelection
  } = usePlaylistStore();
  
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
  const [overwriteDialog, setOverwriteDialog] = useState({
    open: false,
    playlistId: '',
    playlistName: '',
  });
  const [addToDialog, setAddToDialog] = useState({ open: false });
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  
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
      threshold: 0.7,
      ignoreLocation: true,
      useExtendedSearch: true,
    }),
    []
  );
  
  const filteredPlaylists = useMemo(() => {
    let items = playlistCache; // Usa el estado del store
    if (showOnlySelected) {
      items = items.filter((p) => selectedPlaylistIds.includes(p.id));
    }
    if (searchTerm.trim() !== '') {
      const fuseInstance = new Fuse(items, fuseOptions);
      items = fuseInstance.search(searchTerm).map((result) => result.item);
    }
    return items;
  }, [playlistCache, searchTerm, showOnlySelected, selectedPlaylistIds, fuseOptions]);
  
  // Limpiar foco si el filtro cambia
  useEffect(() => {
    setFocusedIndex(null);
  }, [searchTerm, showOnlySelected]);
  
  const areAllFilteredSelected = useMemo(() => {
    if (searchTerm.trim() === '' || filteredPlaylists.length === 0) {
      return false; // No hay búsqueda o no hay resultados
    }
    // Devuelve true si CADA playlist filtrada ya está en la selección
    return filteredPlaylists.every(p => selectedPlaylistIds.includes(p.id));
  }, [filteredPlaylists, selectedPlaylistIds, searchTerm]);
  
  const handleSelectAllFiltered = () => {
    if (areAllFilteredSelected) return; // No hacer nada si ya están todas seleccionadas
    const filteredIds = filteredPlaylists.map(p => p.id);
    addMultipleToSelection(filteredIds);
    toast.info(`${filteredIds.length} playlists de la búsqueda han sido añadidas a la selección.`);
  };
  
  // Manejo de la navegación por teclado de la lista de playlists
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (filteredPlaylists.length === 0) return; // No hacer nada si no hay filas
    
    switch (event.key) {
      case 'ArrowDown':
      event.preventDefault();
      const nextIndex = focusedIndex === null ? 0 : Math.min(focusedIndex + 1, filteredPlaylists.length - 1);
      setFocusedIndex(nextIndex);
      rowRefs.current.get(nextIndex)?.scrollIntoView({ block: 'nearest' });
      break;
      
      case 'ArrowUp':
      event.preventDefault();
      const prevIndex = focusedIndex === null ? 0 : Math.max(focusedIndex - 1, 0);
      setFocusedIndex(prevIndex);
      rowRefs.current.get(prevIndex)?.scrollIntoView({ block: 'nearest' });
      break;
      
      case ' ': // Barra espaciadora
      if (focusedIndex !== null) {
        event.preventDefault();
        const focusedPlaylistId = filteredPlaylists[focusedIndex].id;
        togglePlaylist(focusedPlaylistId);
      }
      break;
      
      case 'Escape':
      event.preventDefault();
      setFocusedIndex(null); // Quitar el foco
      setSearchTerm(''); // Limpiar búsqueda para volver a la vista general
      break;
    }
  }, [focusedIndex, filteredPlaylists, togglePlaylist]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
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
    
    // Usamos una variable `let` en el ámbito de la función.
    // Esto nos permitirá capturar el ID de la playlist creada y usarlo en el bloque `catch`.
    let createdPlaylistId: string | null = null;
    
    try {
      const { playlist, exists } = await findOrCreatePlaylist(newPlaylistName);
      createdPlaylistId = playlist.id;
      
      if (exists) {
        setStep('idle');
        toast.dismiss(toastId);
        setOverwriteDialog({
          open: true,
          playlistId: playlist.id,
          playlistName: newPlaylistName,
        });
        return;
      }
      
      // Si la playlist no existía, significa que se acaba de crear.
      // La añadimos a nuestro estado local para que la UI se actualice.
      addPlaylistToCache(playlist);
      
      // Guardamos el ID de la playlist en el estado inmediatamente.
      setPlaylistIdForResume(playlist.id);
      toast.loading('Playlist preparada, iniciando adición de canciones...', { id: toastId });
      
      const batchSize = 100;
      for (let i = 0; i < tracksToMix.length; i += batchSize) {
        const batch = tracksToMix.slice(i, i + batchSize);
        toast.loading(`Añadiendo canciones... ${i + batch.length} / ${progress.total}`, { id: toastId });
        await addTracksBatch(playlist.id, batch);
        setProgress((prev) => ({ ...prev, added: prev.added + batch.length }));
      }
      
      toast.success('¡Megalista creada con éxito!', { id: toastId, duration: 5000 });
      
      // Ahora que la playlist está llena, actualizamos su contador en la caché.
      updatePlaylistInCache(playlist.id, tracksToMix.length);
      
      // Si todo va bien, nos aseguramos de desactivar el modo reanudación.
      setIsResumable(false);
      
    } catch (error: unknown) { // CAMBIO 2: Tipado correcto del error
      console.error('[UI_ERROR:handleExecuteMix] Ocurrió un error durante la mezcla:', error);
      
      // Comprobar el tipo de error
      let errorMessage = 'Ocurrió un error durante la mezcla.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
      
      // La condición ahora usa la variable local `createdPlaylistId`.
      // Si el error ocurrió después de crear la playlist, esta variable tendrá un valor
      // y activaremos correctamente el modo de reanudación.
      if (createdPlaylistId) {
        setIsResumable(true);
      }
    } finally {
      // Si la mezcla fue completamente exitosa, limpiamos el estado.
      if (progress.added > 0 && progress.added === progress.total) {
        setTracksToMix([]);
        setNewPlaylistName('');
        setProgress({ added: 0, total: 0 });
      }
      setStep('idle');
    }
  };
  
  // Manejador para la opción "Reemplazar por completo"
  const handleConfirmReplace = async () => {
    const { playlistId } = overwriteDialog;
    setOverwriteDialog({ ...overwriteDialog, open: false }); // Cierra el diálogo
    setStep('processing'); // Muestra el diálogo de progreso
    
    const toastId = toast.loading(`Vaciando "${overwriteDialog.playlistName}"...`);
    
    try {
      await clearPlaylist(playlistId);
      toast.loading(`Añadiendo ${tracksToMix.length} canciones...`, { id: toastId });
      
      // Reutilizamos el bucle de añadir por lotes
      const batchSize = 100;
      for (let i = 0; i < tracksToMix.length; i += batchSize) {
        const batch = tracksToMix.slice(i, i + batchSize);
        await addTracksBatch(playlistId, batch);
        setProgress((prev) => ({ ...prev, added: prev.added + batch.length }));
      }
      
      updatePlaylistInCache(playlistId, tracksToMix.length);
      toast.success('¡Playlist reemplazada con éxito!', { id: toastId });
    } catch (error: unknown) {
      console.error('[UI_ERROR:handleConfirmReplace]', error);
      const message = error instanceof Error ? error.message : 'Error al reemplazar la playlist.';
      toast.error(message, { id: toastId });
    } finally {
      setStep('idle');
      // Aquí podrías decidir si limpiar el estado o no
    }
  };
  
  // Manejador para la opción "Actualizar y Reordenar"
  const handleConfirmUpdate = async () => {
    const { playlistId } = overwriteDialog;
    setOverwriteDialog({ ...overwriteDialog, open: false });
    setStep('processing');
    
    const toastId = toast.loading(`Actualizando "${overwriteDialog.playlistName}"...`);
    
    try {
      const { finalCount } = await updateAndReorderPlaylist(playlistId, tracksToMix);
      
      updatePlaylistInCache(playlistId, finalCount);
      
      toast.success(`¡Playlist actualizada con éxito! Ahora tiene ${finalCount} canciones.`, { id: toastId });
      // Actualizamos el progreso para reflejar el estado final
      setProgress({ added: finalCount, total: finalCount });
    } catch (error: unknown) {
      console.error('[UI_ERROR:handleConfirmUpdate]', error);
      const message = error instanceof Error ? error.message : 'Error al actualizar la playlist.';
      toast.error(message, { id: toastId });
    } finally {
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
      
      updatePlaylistInCache(playlistIdForResume!, progress.total);
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
  
  // Inicia el flujo para añadir una playlist a una Megalista existente.
  const handleInitiateAddToExisting = () => {
    if (megamixCache.length === 0) {
      toast.info('No se encontraron Megalistas creadas por la app.', {
        description: 'Primero, crea una nueva Megalista para poder añadirle canciones.',
      });
      return;
    }
    // Reseteamos la selección anterior por si el diálogo se vuelve a abrir
    setSelectedTargetId(null); 
    setAddToDialog({ open: true });
  };
  
  // Ejecuta la acción de añadir las canciones a la Megalista seleccionada.
  const handleConfirmAddToExisting = async () => {
    if (!selectedTargetId) {
      toast.error('Por favor, selecciona una Megalista de destino.');
      return;
    }
    if (selectedPlaylistIds.length !== 1) return;
    
    const sourcePlaylistIds = selectedPlaylistIds;
    const targetPlaylistId = selectedTargetId;
    
    setAddToDialog({ open: false }); // Cierra el diálogo de selección
    setStep('processing'); // Muestra el diálogo de progreso
    
    const toastId = toast.loading('Obteniendo canciones de la playlist de origen...');
    
    try {
      const trackUris = await getTrackUris(sourcePlaylistIds);
      
      // Reseteamos el estado de progreso con los datos de ESTA operación.
      setProgress({ added: 0, total: trackUris.length });
      // Ahora el diálogo de progreso que se abra a continuación tendrá los datos correctos.
      setStep('processing');
      
      if (trackUris.length === 0) {
        toast.info('La playlist de origen no tiene canciones para añadir.', { id: toastId });
        setStep('idle');
        return;
      }
      
      toast.loading('Actualizando la Megalista de destino...', { id: toastId });
      
      const { finalCount } = await updateAndReorderPlaylist(targetPlaylistId, trackUris);
      
      // Actualizamos también el contador de la playlist de destino.
      updatePlaylistInCache(targetPlaylistId, finalCount);
      
      toast.success(`¡Megalista actualizada con éxito!`, {
        id: toastId,
        description: `Ahora tiene ${finalCount} canciones únicas.`,
      });
      
    } catch (error: unknown) {
      console.error('[UI_ERROR:handleConfirmAddToExisting]', error);
      const message = error instanceof Error ? error.message : 'Error al actualizar la Megalista.';
      toast.error(message, { id: toastId });
    } finally {
      setStep('idle');
      clearSelection(); // Limpiamos la selección para finalizar el flujo
    }
  };
  
  return (
    <div>
    {/* CONTROLES DE VISTA */}
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
    <div className="relative flex-grow">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
    <Input
    type="text"
    placeholder="Filtrar por nombre..."
    // Se añade padding a la derecha para que el texto no quede debajo del botón
    className="pl-10 pr-32"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    />
    {/* El nuevo botón, condicional y posicionado de forma absoluta */}
    {searchTerm.trim() !== '' && filteredPlaylists.length > 0 && (
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
    {(selectedPlaylistIds.length > 0 || isResumable) && (
      <div className="mb-4">
      <Separator className="mb-4 bg-gray-700" />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg bg-gray-800 p-4">
      <span className="text-sm font-medium text-gray-300">
      {isResumable
        ? `Mezcla pausada con ${progress.added} de ${progress.total} canciones.`
        : `${selectedPlaylistIds.length} playlist(s) seleccionada(s)`}
        </span>
        
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
        {isResumable ? (
          // --- Escenario 1: Reanudar mezcla (sin cambios) ---
          <>
          <Button variant="ghost" onClick={handleCancelResume}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar
          </Button>
          <Button onClick={handleResumeMix} disabled={isProcessing}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
          {step === 'idle' ? 'Reanudar Mezcla' : 'Procesando...'}
          </Button>
          </>
        ) : (
          // --- Escenario 2: Lógica unificada para selección (1 o más playlists) ---
          <>
          <Button variant="ghost" onClick={clearSelection}>
          <XCircle className="mr-2 h-4 w-4" />
          Limpiar Selección
          </Button>
          {/* Botón "Añadir a..." - Siempre visible si hay selección */}
          <Button variant="outline" onClick={handleInitiateAddToExisting} disabled={isProcessing}>
          Añadir a Megalista...
          </Button>
          {/* Botón "Crear" - Visible solo si hay 2 o más playlists seleccionadas */}
          {selectedPlaylistIds.length >= 2 && (
            <Button onClick={handleInitiateMix} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
            {step === 'idle' ? 'Crear Megalista' : 'Procesando...'}
            </Button>
          )}
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
      {filteredPlaylists.map((playlist, index) => { // <-- Añadimos el 'index'
        const selected = isSelected(playlist.id);
        const focused = index === focusedIndex;
        
        return (
          <TableRow
          key={playlist.id}
          // Guardar la referencia del DOM para poder hacer scroll hacia ella
          ref={(node) => {
            if (node) rowRefs.current.set(index, node);
            else rowRefs.current.delete(index);
          }}
          // Añadir el manejador onClick a toda la fila
          onClick={() => togglePlaylist(playlist.id)}
          // Añadir clases dinámicas para selección, foco y cursor
          className={cn(
            'border-gray-800 transition-colors cursor-pointer',
            {
              'bg-green-900/40 hover:bg-green-900/60': selected,
              'hover:bg-white/5': !selected,
              // Estilo de foco: un anillo de color visible que no interfiere con el fondo
              'outline outline-2 outline-offset-[-2px] outline-blue-500': focused,
            }
          )}
          >
          <TableCell>
          <Checkbox
          id={`select-${playlist.id}`}
          checked={selected}
          // Detener la propagación del evento para evitar el doble disparo
          onClick={(e) => e.stopPropagation()}
          // El onCheckedChange sigue funcionando para accesibilidad y clics directos
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
      
      {/* DIÁLOGO: REEMPLAZAR O ACTUALIZAR */}
      <Dialog open={overwriteDialog.open} onOpenChange={(isOpen) => !isOpen && setOverwriteDialog({ ...overwriteDialog, open: false })}>
      <DialogContent>
      <DialogHeader>
      <DialogTitle>Playlist Existente</DialogTitle>
      <DialogDescription>
      La playlist llamada &quot;{overwriteDialog.playlistName}&quot; ya existe. ¿Qué te gustaría hacer?
      </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
      <p className="text-sm text-muted-foreground">
      Vas a mezclar <strong>{tracksToMix.length}</strong> canciones de tu selección.
      </p>
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
      <Button variant="outline" onClick={() => setOverwriteDialog({ ...overwriteDialog, open: false })}>
      Cancelar
      </Button>
      <div className="flex flex-col sm:flex-row gap-2">
      <Button variant="destructive" onClick={handleConfirmReplace}>
      Reemplazar por Completo
      </Button>
      <Button onClick={handleConfirmUpdate}>
      Actualizar y Reordenar
      </Button>
      </div>
      </DialogFooter>
      </DialogContent>
      </Dialog>
      
      {/* DIÁLOGO: AÑADIR A MEGALISTA EXISTENTE */}
      <Dialog open={addToDialog.open} onOpenChange={(isOpen) => !isOpen && setAddToDialog({ open: false })}>
      <DialogContent>
      <DialogHeader>
      <DialogTitle>Añadir a Megalista Existente</DialogTitle>
      <DialogDescription>
      Selecciona una de tus Megalistas para añadirle las canciones de la(s) playlist(s) seleccionada(s). Las canciones duplicadas se omitirán y el orden final será aleatorio.
      </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
      <Label htmlFor="megalista-target">Megalista de Destino</Label>
      <Select onValueChange={(value: string) => setSelectedTargetId(value)}>
      <SelectTrigger id="megalista-target">
      <SelectValue placeholder="Elige una playlist..." />
      </SelectTrigger>
      <SelectContent>
      {megamixCache.map((playlist) => (
        <SelectItem key={playlist.id} value={playlist.id}>
        {playlist.name} ({playlist.tracks.total} canciones)
        </SelectItem>
      ))}
      </SelectContent>
      </Select>
      </div>
      <DialogFooter>
      <Button variant="outline" onClick={() => setAddToDialog({ open: false })}>
      Cancelar
      </Button>
      <Button onClick={handleConfirmAddToExisting} disabled={!selectedTargetId}>
      Confirmar y Añadir
      </Button>
      </DialogFooter>
      </DialogContent>
      </Dialog>
      </div>
    );
  }