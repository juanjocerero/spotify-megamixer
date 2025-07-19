// /components/custom/FloatingActionBar.tsx
'use client';

import { useState, useMemo } from 'react';
import { usePlaylistStore } from '@/lib/store';

// Lógica de acciones del backend
import {
  getTrackUris,
  findOrCreatePlaylist,
  addTracksBatch,
  clearPlaylist,
  updateAndReorderPlaylist,
  syncMegalist, 
  unfollowPlaylistsBatch
} from '@/lib/action';

// Componentes UI de Shadcn
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogTitle, 
  AlertDialogHeader, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Shuffle, XCircle, PlusSquare, ListPlus, RefreshCw, Trash2 } from 'lucide-react';

export default function FloatingActionBar() {
  
  // Obtenemos todo el estado y acciones necesarios del store de Zustand
  const {
    selectedPlaylistIds,
    clearSelection,
    megamixCache,
    addPlaylistToCache,
    updatePlaylistInCache,
    removeMultipleFromCache,
  } = usePlaylistStore();
  
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
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [deleteBatchAlertOpen, setDeleteBatchAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isProcessing = step === 'fetching' || step === 'processing' || isSyncingAll;
  
  // Memoizamos el cálculo para saber si hay algo que sincronizar
  const syncableMegalists = useMemo(
    () => megamixCache.filter(p => p.isSyncable),
    [megamixCache]
  );
  const hasSyncableMegalists = syncableMegalists.length > 0;
  
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
      setStep('confirming'); // Pasa directamente a la confirmación
      
    } catch (error: unknown) {
      console.error('[UI_ERROR:handleInitiateMix] Error al obtener las canciones:', error);
      toast.error(`Falló la obtención de canciones. Revisa la consola.`, { id: toastId });
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
      const { playlist, exists } = await findOrCreatePlaylist(
        newPlaylistName, 
        selectedPlaylistIds, 
        progress.total
      );
      
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
      updatePlaylistInCache(playlist.id, { trackCount: tracksToMix.length });
      
      // Si todo va bien, nos aseguramos de desactivar el modo reanudación.
      setIsResumable(false);
      
      // Limpia la selección actual
      clearSelection();
      
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
      
      updatePlaylistInCache(playlistId, { trackCount: tracksToMix.length });
      toast.success('¡Playlist reemplazada con éxito!', { id: toastId });
      
      // Limpiar selección actual tras éxito
      clearSelection();
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
      const { finalCount } = await updateAndReorderPlaylist(playlistId, selectedPlaylistIds);
      updatePlaylistInCache(playlistId, { trackCount: finalCount });
      
      toast.success(`¡Playlist actualizada con éxito! Ahora tiene ${finalCount} canciones.`, { id: toastId });
      // Actualizamos el progreso para reflejar el estado final
      setProgress({ added: finalCount, total: finalCount });
      
      // Limpiar selección actual tras éxito
      clearSelection();
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
      
      updatePlaylistInCache(playlistIdForResume!, { trackCount: progress.total });
      toast.success('¡Megalista completada con éxito!', { id: toastId, duration: 5000 });
      setIsResumable(false); // Desactivamos el modo reanudar al terminar.
      
      // Limpiar selección actual tras éxito
      clearSelection();
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
    // No necesitamos una validación de número de playlists, la lógica ya lo maneja
    const sourcePlaylistIds = selectedPlaylistIds;
    const targetPlaylistId = selectedTargetId;
    
    setAddToDialog({ open: false });
    setStep('processing'); // Mostramos el diálogo de progreso
    
    const toastId = toast.loading('Actualizando Megalista de destino...');
    
    try {
      // La llamada a la acción ahora es más simple desde el cliente.
      // Le pasamos los IDs y la acción se encarga de todo.
      const { finalCount } = await updateAndReorderPlaylist(targetPlaylistId, sourcePlaylistIds);
      
      // Actualizamos la caché con toda la nueva información.
      updatePlaylistInCache(targetPlaylistId, { trackCount: finalCount });
      
      toast.success(`¡Megalista actualizada con éxito!`, {
        id: toastId,
        description: `Ahora tiene ${finalCount} canciones.`,
      });
      
      clearSelection();
      
    } catch (error: unknown) {
      console.error('[UI_ERROR:handleConfirmAddToExisting]', error);
      const message = error instanceof Error ? error.message : 'Error al actualizar la Megalista.';
      toast.error(message, { id: toastId });
    } finally {
      setStep('idle');
      // Limpiamos el estado de progreso para la próxima operación
      setProgress({ added: 0, total: 0 }); 
    }
  };
  
  // Sincronizar todas las megalistas
  const handleSyncAll = async () => {
    if (syncableMegalists.length === 0) {
      toast.info("No se encontraron Megalistas para sincronizar.");
      return;
    }
    
    setIsSyncingAll(true);
    const toastId = toast.loading(`Sincronizando ${syncableMegalists.length} Megalista(s)...`);
    
    // Creamos un array de promesas para cada sincronización
    const syncPromises = syncableMegalists.map(p => syncMegalist(p.id));
    
    // Usamos Promise.allSettled para que no se detenga si una falla
    const results = await Promise.allSettled(syncPromises);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Procesamos los resultados
    results.forEach((result, index) => {
      const playlistName = syncableMegalists[index].name;
      if (result.status === 'fulfilled') {
        successCount++;
        // Si la sincronización tuvo éxito, actualizamos la caché con el nuevo total de canciones
        const syncResult = result.value;
        updatePlaylistInCache(syncableMegalists[index].id, { trackCount: syncResult.finalCount });
      } else {
        failureCount++;
        console.error(`Fallo al sincronizar "${playlistName}":`, result.reason);
      }
    });
    
    // Mostramos un resumen al usuario
    if (failureCount === 0) {
      toast.success(`¡${successCount} Megalista(s) sincronizadas con éxito!`, { id: toastId, duration: 5000 });
    } else if (successCount > 0) {
      toast.warning(`${successCount} sincronizadas, ${failureCount} fallaron.`, { id: toastId, duration: 5000, description: "Revisa la consola para más detalles." });
    } else {
      toast.error("No se pudo sincronizar ninguna Megalista.", { id: toastId, duration: 5000, description: "Revisa la consola para más detalles." });
    }
    
    setIsSyncingAll(false);
  };
  
  // Maneja la eliminación de playlists en lote
  const handleConfirmDeleteBatch = async () => {
    if (selectedPlaylistIds.length === 0) return;
    
    setIsDeleting(true);
    const toastId = toast.loading(`Eliminando ${selectedPlaylistIds.length} playlist(s)...`);
    
    try {
      await unfollowPlaylistsBatch(selectedPlaylistIds);
      
      removeMultipleFromCache(selectedPlaylistIds);
      clearSelection(); // Limpiamos la selección tras el éxito
      
      toast.success('Playlists eliminadas con éxito.', { id: toastId });
      setDeleteBatchAlertOpen(false);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron eliminar.';
      toast.error(message, { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (selectedPlaylistIds.length === 0 && !isResumable) {
    return null;
  }
  
  return (
    <>
    <TooltipProvider delayDuration={0}>
    <div className="fixed bottom-0 left-0 right-0 z-20 flex h-20 items-center justify-center border-t border-gray-700 bg-gray-800/95 px-4 shadow-lg backdrop-blur-sm sm:h-24">    <div className="flex w-full max-w-4xl items-center justify-between">
    <div className="hidden text-sm text-gray-300 sm:block">
    <p className="font-bold text-white">{selectedPlaylistIds.length} playlist(s)</p>
    <p>seleccionada(s)</p>
    </div>
    
    {/* El div que contiene los botones */}
    <div className="flex w-full max-w-4xl items-center justify-between">
    <div className="hidden text-sm text-gray-300 sm:block">
    <p className="font-bold text-white">{selectedPlaylistIds.length} playlist(s)</p>
    <p>seleccionada(s)</p>
    </div>
    
    {/* Reemplaza desde este div... */}
    <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-end">
    {isResumable ? (
      <>
      {/* --- Botones de Reanudar/Cancelar (estilo actualizado) --- */}
      <Tooltip>
      <TooltipTrigger asChild>
      <Button variant="ghost" onClick={handleCancelResume} className="h-14 w-14 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2">
      <XCircle className="h-6 w-6 sm:h-5 sm:w-5" />
      <span className="hidden sm:inline-block text-sm">Cancelar</span>
      </Button>
      </TooltipTrigger>
      <TooltipContent><p>Cancelar Proceso</p></TooltipContent>
      </Tooltip>
      
      <Tooltip>
      <TooltipTrigger asChild>
      <Button 
      onClick={handleResumeMix} 
      disabled={isProcessing} 
      className="h-14 w-14 bg-green-600 text-white hover:bg-green-700 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2"
      >
      {isProcessing ? <Loader2 className="h-6 w-6 sm:h-5 sm:w-5 animate-spin" /> : <Shuffle className="h-6 w-6 sm:h-5 sm:w-5" />}
      <span className="hidden sm:inline-block text-sm">{step === 'idle' ? 'Reanudar' : 'Procesando'}</span>
      </Button>
      </TooltipTrigger>
      <TooltipContent><p>Reanudar Mezcla</p></TooltipContent>
      </Tooltip>
      </>
    ) : (
      <>
      {/* --- Botonera Principal (reordenada y rediseñada) --- */}
      
      {/* 1. Limpiar */}
      <Tooltip>
      <TooltipTrigger asChild>
      <Button variant="ghost" size="lg" onClick={clearSelection} className="h-14 w-14 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2">
      <XCircle className="h-6 w-6 sm:h-5 sm:w-5" />
      <span className="hidden sm:inline-block text-sm">Limpiar</span>
      </Button>
      </TooltipTrigger>
      <TooltipContent><p>Limpiar Selección</p></TooltipContent>
      </Tooltip>
      
      {/* 2. Eliminar */}
      <Tooltip>
      <TooltipTrigger asChild>
      <Button
      variant="ghost"
      size="lg"
      onClick={() => setDeleteBatchAlertOpen(true)}
      disabled={isProcessing}
      className="h-14 w-14 text-red-500 hover:bg-red-500/10 hover:text-red-500 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2"
      >
      <Trash2 className="h-6 w-6 sm:h-5 sm:w-5" />
      <span className="hidden sm:inline-block text-sm">Eliminar</span>
      </Button>
      </TooltipTrigger>
      <TooltipContent><p>Eliminar Seleccionada(s)</p></TooltipContent>
      </Tooltip>
      
      {/* 3. Sincronizar */}
      {hasSyncableMegalists && (
        <Tooltip>
        <TooltipTrigger asChild>
        <Button 
        variant="ghost" 
        size="lg" 
        onClick={handleSyncAll} 
        disabled={isProcessing} 
        className="h-14 w-14 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2"
        >
        {isSyncingAll ? <Loader2 className="h-6 w-6 sm:h-5 sm:w-5 animate-spin"/> : <RefreshCw className="h-6 w-6 sm:h-5 sm:w-5" />}
        <span className="hidden sm:inline-block text-sm">Sincronizar</span>
        </Button>
        </TooltipTrigger>
        <TooltipContent><p>Sincronizar {syncableMegalists.length} Megalista(s)</p></TooltipContent>
        </Tooltip>
      )}
      
      {/* 4. Añadir */}
      <Tooltip>
      <TooltipTrigger asChild>
      <Button variant="ghost" size="lg" onClick={handleInitiateAddToExisting} disabled={isProcessing} className="h-14 w-14 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2">
      <ListPlus className="h-6 w-6 sm:h-5 sm:w-5" />
      <span className="hidden sm:inline-block text-sm">Añadir</span>
      </Button>
      </TooltipTrigger>
      <TooltipContent><p>Añadir a Megalista Existente</p></TooltipContent>
      </Tooltip>
      
      {/* 5. Crear */}
      {selectedPlaylistIds.length >= 2 && (
        <Tooltip>
        <TooltipTrigger asChild>
        <Button size="lg" onClick={handleInitiateMix} disabled={isProcessing} className="h-14 w-14 bg-green-600 text-white hover:bg-green-700 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2">
        <PlusSquare className="h-6 w-6 sm:h-5 sm:w-5" />
        <span className="hidden sm:inline-block text-sm">Crear</span>
        </Button>
        </TooltipTrigger>
        <TooltipContent><p>Crear Nueva Megalista</p></TooltipContent>
        </Tooltip>
      )}
      </>
    )}
    </div>
    </div>
    </div>
    </div>
    </TooltipProvider>
    
    {/* Diálogo de Nombrar Playlist */}
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
    
    {/* Diálogo de progreso */}
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
    
    {/* Diálogo: Reemplazar o actualizar */}
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
    
    {/* Diálogo: Añadir a megalista existente */}
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
    
    {/* Diálogo de confirmación de eliminación en lote */}
    <AlertDialog open={deleteBatchAlertOpen} onOpenChange={setDeleteBatchAlertOpen}>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
    <AlertDialogDescription>
    Vas a eliminar permanentemente {selectedPlaylistIds.length} playlist(s) de tu librería de Spotify.
    Esta acción es irreversible.
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
    <AlertDialogAction
    disabled={isDeleting}
    className="text-white bg-red-600 hover:bg-red-700"
    onClick={handleConfirmDeleteBatch} // Conectamos la función
    >
    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
    </AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    
    </>
  );
}