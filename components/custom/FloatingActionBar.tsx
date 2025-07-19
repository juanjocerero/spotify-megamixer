// /components/custom/FloatingActionBar.tsx
'use client';

import { useState, useMemo } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { shuffleArray } from './../../lib/utils';

// Lógica de acciones del backend
import {
  getTrackUris,
  findOrCreatePlaylist,
  addTracksBatch,
  clearPlaylist,
  addTracksToMegalistAction,
  executeMegalistSync, 
  previewBatchSync, 
  unfollowPlaylistsBatch,
  shufflePlaylistsAction
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
  
  const [step, setStep] = useState<'idle' | 'fetching' | 'confirming' | 'askingOrder' | 'processing'>('idle');
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
  const [batchSyncAlert, setBatchSyncAlert] = useState<{
    open: boolean;
    added: number;
    removed: number;
  }>({ open: false, added: 0, removed: 0 });
  const [deleteBatchAlertOpen, setDeleteBatchAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [batchShuffleAlertOpen, setBatchShuffleAlertOpen] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleChoice, setShuffleChoice] = useState<{
    open: boolean;
    targetPlaylistId: string;
    sourcePlaylistIds: string[];
    playlistName?: string;
  }>({
    open: false,
    targetPlaylistId: '',
    sourcePlaylistIds: [],
  });
  const [shuffleBatchSyncChoice, setShuffleBatchSyncChoice] = useState({ open: false });
  
  const isProcessing = step === 'fetching' || step === 'processing' || isSyncingAll || isShuffling;
  
  // Saber si hay algo que sincronizar
  const syncableMegalists = useMemo(
    () => megamixCache.filter(p => p.isSyncable),
    [megamixCache]
  );
  const syncableMegalistsInSelection = useMemo(() =>
    usePlaylistStore.getState().playlistCache.filter(p =>
    selectedPlaylistIds.includes(p.id) && p.isSyncable), 
    [selectedPlaylistIds]
  );
  
  const hasSyncableMegalists = syncableMegalistsInSelection.length > 0;
  
  // Comprobación de megalistas en selección
  const megalistsInSelection = useMemo(
    () => megamixCache.filter(p => selectedPlaylistIds.includes(p.id) && p.isMegalist),
    [selectedPlaylistIds, megamixCache]
  );
  const hasMegalistsInSelection = megalistsInSelection.length > 0;
  
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
  
  const handleExecuteMix = async (shuffle: boolean) => {
    if (!newPlaylistName.trim()) {
      toast.error('El nombre de la playlist no puede estar vacío.');
      // Regresamos al paso anterior si hay un error
      setStep('confirming'); 
      return;
    }
    
    // Reordenamos la lista de canciones si el usuario lo ha elegido
    const tracksForExecution = shuffle ? shuffleArray([...tracksToMix]) : [...tracksToMix];
    // Actualizamos el estado para que la función de reanudar funcione correctamente
    setTracksToMix(tracksForExecution);
    
    setStep('processing');
    const toastId = toast.loading('Preparando la playlist de destino...');
    let createdPlaylistId: string | null = null;
    
    try {
      const { playlist, exists } = await findOrCreatePlaylist(
        newPlaylistName,
        selectedPlaylistIds,
        tracksForExecution.length
      );
      createdPlaylistId = playlist.id;
      
      if (exists) {
        setStep('idle');
        toast.dismiss(toastId);
        setOverwriteDialog({ open: true, playlistId: playlist.id, playlistName: newPlaylistName });
        return;
      }
      
      addPlaylistToCache(playlist);
      setPlaylistIdForResume(playlist.id);
      toast.loading('Playlist preparada, iniciando adición de canciones...', { id: toastId });
      
      const batchSize = 100;
      for (let i = 0; i < tracksForExecution.length; i += batchSize) {
        const batch = tracksForExecution.slice(i, i + batchSize);
        toast.loading(`Añadiendo canciones... ${i + batch.length} / ${progress.total}`, { id: toastId });
        await addTracksBatch(playlist.id, batch);
        setProgress((prev) => ({ ...prev, added: prev.added + batch.length }));
      }
      
      toast.success('¡Megalista creada con éxito!', { id: toastId, duration: 5000 });
      updatePlaylistInCache(playlist.id, { trackCount: tracksForExecution.length });
      setIsResumable(false);
      clearSelection();
      
    } catch (error: unknown) {
      console.error('[UI_ERROR:handleExecuteMix] Ocurrió un error durante la mezcla:', error);
      let errorMessage = 'Ocurrió un error durante la mezcla.';
      if (error instanceof Error) { errorMessage = error.message; }
      toast.error(errorMessage, { id: toastId });
      if (createdPlaylistId) {
        setIsResumable(true);
      }
    } finally {
      // Solo reseteamos todo si la mezcla fue exitosa
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
  
  // Manejador para la opción de actualizar
  const handleConfirmUpdate = async () => {
    const { playlistId, playlistName } = overwriteDialog;
    setOverwriteDialog({ ...overwriteDialog, open: false });
    setStep('processing');
    
    setShuffleChoice({
      open: true,
      targetPlaylistId: playlistId,
      sourcePlaylistIds: selectedPlaylistIds,
      playlistName: playlistName,
    });
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
  
  const handleExecuteUpdateOrAdd = async (shouldShuffle: boolean) => {
    const { targetPlaylistId, sourcePlaylistIds, playlistName } = shuffleChoice;
    setShuffleChoice({ ...shuffleChoice, open: false });
    setStep('processing');
    const toastId = toast.loading(`Actualizando "${playlistName || 'la Megalista'}"...`);
    
    try {
      const { finalCount, addedCount } = await addTracksToMegalistAction(
        targetPlaylistId,
        sourcePlaylistIds,
        shouldShuffle // Pasamos la decisión del usuario a la acción
      );
      updatePlaylistInCache(targetPlaylistId, { trackCount: finalCount });
      
      if (addedCount > 0) {
        toast.success(`¡Megalista actualizada!`, {
          id: toastId,
          description: `Se añadieron ${addedCount} canciones. ${
            shouldShuffle ? 'La playlist ha sido reordenada.' : 'Se mantuvo el orden original.'
          }`,
        });
      } else {
        toast.info(`La playlist ya contenía todas las canciones.`, {
          id: toastId,
          description: 'No se añadieron canciones nuevas.',
        });
      }
      clearSelection();
    } catch (error: unknown) {
      console.error('[UI_ERROR:handleExecuteUpdateOrAdd]', error);
      const message = error instanceof Error ? error.message : 'Error al actualizar la playlist.';
      toast.error(message, { id: toastId });
    } finally {
      setStep('idle');
    }
  };
  
  const handleConfirmAddToExisting = async () => {
    if (!selectedTargetId) {
      toast.error('Por favor, selecciona una Megalista de destino.');
      return;
    }
    const targetPlaylist = megamixCache.find(p => p.id === selectedTargetId);
    setAddToDialog({ open: false });
    
    // Preparamos la información para el diálogo de reordenado
    setShuffleChoice({
      open: true,
      targetPlaylistId: selectedTargetId,
      sourcePlaylistIds: selectedPlaylistIds,
      playlistName: targetPlaylist?.name,
    });
  };
  
  // Sincronizar todas las megalistas
  const handleSyncAll = async () => {
    const syncableIds = syncableMegalistsInSelection.map(p => p.id);
    if (syncableIds.length === 0) {
      toast.info("Ninguna de las playlists seleccionadas es una Megalista sincronizable.");
      return;
    }
    
    setIsSyncingAll(true); // Para el icono del botón
    const toastId = toast.loading(`Calculando cambios para ${syncableIds.length} Megalista(s)...`);
    
    try {
      const { totalAdded, totalRemoved } = await previewBatchSync(syncableIds);
      
      if (totalAdded === 0 && totalRemoved === 0) {
        toast.success("¡Todo al día!", {
          id: toastId,
          description: "Las Megalistas seleccionadas ya están sincronizadas.",
        });
      } else {
        toast.dismiss(toastId);
        setBatchSyncAlert({ open: true, added: totalAdded, removed: totalRemoved });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo previsualizar la sincronización.";
      toast.error(message, { id: toastId });
    } finally {
      setIsSyncingAll(false);
    }
  };
  
  const handleConfirmBatchSync = async () => {
    // Cierra el diálogo de previsualización y abre el de reordenado
    setBatchSyncAlert({ ...batchSyncAlert, open: false });
    setShuffleBatchSyncChoice({ open: true });
  };
  
  const handleExecuteBatchSync = async (shouldShuffle: boolean) => {
    setShuffleBatchSyncChoice({ open: false });
    const syncableIds = syncableMegalistsInSelection.map(p => p.id);
    setIsSyncingAll(true);
    setBatchSyncAlert({ ...batchSyncAlert, open: false }); // Cierra el diálogo
    const toastId = toast.loading(`Sincronizando ${syncableIds.length} Megalista(s)...`);
    
    const syncPromises = syncableIds.map(id => executeMegalistSync(id, shouldShuffle));
    const results = await Promise.allSettled(syncPromises);
    
    let successCount = 0;
    let failureCount = 0;
    results.forEach((result, index) => {
      const playlistId = syncableIds[index];
      if (result.status === 'fulfilled') {
        successCount++;
        const syncResult = result.value;
        // Actualiza la caché con el nuevo conteo de canciones
        updatePlaylistInCache(playlistId, { trackCount: syncResult.finalCount });
      } else {
        failureCount++;
        console.error(`Fallo al sincronizar la playlist ${playlistId}:`, result.reason);
      }
    });
    
    if (failureCount === 0) {
      toast.success(`¡${successCount} Megalista(s) sincronizadas con éxito!`, { id: toastId });
    } else if (successCount > 0) {
      toast.warning(`${successCount} sincronizadas, ${failureCount} fallaron.`, { id: toastId, description: "Revisa la consola para más detalles." });
    } else {
      toast.error("No se pudo sincronizar ninguna Megalista.", { id: toastId, description: "Revisa la consola para más detalles." });
    }
    
    clearSelection();
    setIsSyncingAll(false);
  };
  
  const handleConfirmBatchShuffle = async () => {
    if (megalistsInSelection.length === 0) return;
    
    setIsShuffling(true);
    const toastId = toast.loading(`Reordenando ${megalistsInSelection.length} playlist(s)...`);
    
    try {
      const idsToShuffle = megalistsInSelection.map(p => p.id);
      await shufflePlaylistsAction(idsToShuffle);
      toast.success(`${megalistsInSelection.length} playlist(s) reordenadas con éxito.`, { id: toastId });
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron reordenar las playlists.';
      toast.error(message, { id: toastId });
    } finally {
      setBatchShuffleAlertOpen(false);
      setIsShuffling(false);
    }
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
    
    {/* El div que contiene los botones */}
    <div className="flex w-full max-w-4xl items-center justify-between">
    <div className="hidden text-sm text-gray-300 sm:block">
    <p className="font-bold text-white">{selectedPlaylistIds.length} playlist(s)</p>
    <p>seleccionada(s)</p>
    </div>
    
    <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-end">
    {isResumable ? (
      <>
      {/* --- Botones de Reanudar/Cancelar --- */}
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
      
      {/* Limpiar */}
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
      
      {/* Reordenar */}
      {hasMegalistsInSelection && (
        <Tooltip>
        <TooltipTrigger asChild>
        <Button
        variant="ghost"
        size="lg"
        onClick={() => setBatchShuffleAlertOpen(true)}
        disabled={isProcessing}
        className="h-14 w-14 text-orange-500 hover:bg-orange-500/10 hover:text-orange-500 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2"
        >
        <Shuffle className="h-6 w-6 sm:h-5 sm:w-5" />
        <span className="hidden sm:inline-block text-sm">Reordenar</span>
        </Button>
        </TooltipTrigger>
        <TooltipContent>
        <p>Reordenar {megalistsInSelection.length} Megalista(s) seleccionada(s)</p>
        </TooltipContent>
        </Tooltip>
      )}
      
      {/* Sincronizar */}
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
      
      {/* Añadir */}
      <Tooltip>
      <TooltipTrigger asChild>
      <Button variant="ghost" size="lg" onClick={handleInitiateAddToExisting} disabled={isProcessing} className="h-14 w-14 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2">
      <ListPlus className="h-6 w-6 sm:h-5 sm:w-5" />
      <span className="hidden sm:inline-block text-sm">Añadir</span>
      </Button>
      </TooltipTrigger>
      <TooltipContent><p>Añadir a Megalista Existente</p></TooltipContent>
      </Tooltip>
      
      {/* Crear */}
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
    {/* Este botón ahora avanza al siguiente paso en lugar de ejecutar la mezcla */}
    <Button onClick={() => setStep('askingOrder')}>Continuar</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    {/* Diálogo para reordenar o no los elementos de la playlist */}
    <Dialog open={step === 'askingOrder'} onOpenChange={(isOpen) => !isOpen && setStep('idle')}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>¿Cómo quieres ordenar las canciones?</DialogTitle>
    <DialogDescription>
    Puedes mantener el orden original de las canciones tal y como aparecen en tus playlists, o reordenarlas para crear una mezcla aleatoria.
    </DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
    {/* El botón de la izquierda llama a la ejecución sin reordenar */}
    <Button variant="outline" className="flex-1" onClick={() => handleExecuteMix(false)}>
    Mantener Orden
    </Button>
    {/* El botón de la derecha llama a la ejecución CON reordenado */}
    <Button className="flex-1" onClick={() => handleExecuteMix(true)}>
    Reordenar Canciones
    </Button>
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
    Actualizar
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
    
    {/* Diálogo para la decisión de reordenado */}
    <Dialog open={shuffleChoice.open} onOpenChange={(isOpen) => !isOpen && setShuffleChoice({ ...shuffleChoice, open: false })}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>¿Cómo quieres ordenar las canciones?</DialogTitle>
    <DialogDescription>
    Se añadirán canciones a "{shuffleChoice.playlistName}". Puedes mantenerlas al final o reordenar la lista completa de forma aleatoria.
    </DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
    <Button variant="outline" className="flex-1" onClick={() => handleExecuteUpdateOrAdd(false)}>
    Mantener Orden
    </Button>
    <Button className="flex-1" onClick={() => handleExecuteUpdateOrAdd(true)}>
    Reordenar Canciones
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
    
    {/* Diálogo para sincronización en lote */}
    <AlertDialog open={batchSyncAlert.open} onOpenChange={(isOpen) => setBatchSyncAlert({ ...batchSyncAlert, open: isOpen })}>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>Confirmar Sincronización en Lote</AlertDialogTitle>
    <AlertDialogDescription asChild>
    <div>
    Vas a sincronizar <strong className="text-white">{syncableMegalistsInSelection.length}</strong> Megalista(s).
    <ul className="list-disc pl-5 mt-3 space-y-1">
    <li className="text-green-400">
    Se añadirán un total de <strong className="text-green-300">{batchSyncAlert.added}</strong> canciones.
    </li>
    <li className="text-red-400">
    Se eliminarán un total de <strong className="text-red-300">{batchSyncAlert.removed}</strong> canciones.
    </li>
    </ul>
    <p className="mt-3">
    Los cambios se aplicarán a cada playlist correspondiente. ¿Deseas continuar?
    </p>
    </div>
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel>Cancelar</AlertDialogCancel>
    <AlertDialogAction onClick={handleConfirmBatchSync}>Sí, continuar</AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    
    {/* Diálogo para reordenar en lote */}
    <Dialog open={shuffleBatchSyncChoice.open} onOpenChange={(isOpen) => !isOpen && setShuffleBatchSyncChoice({ open: false })}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>¿Reordenar las playlists tras sincronizar?</DialogTitle>
    <DialogDescription>
    Solo se reordenarán aquellas playlists que tengan cambios. ¿Quieres reordenar su contenido de forma aleatoria después de actualizarlas?
    </DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
    <Button variant="outline" className="flex-1" onClick={() => handleExecuteBatchSync(false)}>
    No, Mantener Orden
    </Button>
    <Button className="flex-1" onClick={() => handleExecuteBatchSync(true)}>
    Sí, Reordenar
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    {/* Diálogo para reordenación en lote */}
    <AlertDialog open={batchShuffleAlertOpen} onOpenChange={setBatchShuffleAlertOpen}>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
    <AlertDialogDescription>
    Vas a reordenar las canciones de{' '}
    <strong className="text-white">{megalistsInSelection.length}</strong> Megalista(s)
    seleccionada(s). Esta acción reordenará completamente cada lista y no se puede deshacer.
    Este proceso puede ser lento.
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel disabled={isShuffling}>Cancelar</AlertDialogCancel>
    <AlertDialogAction
    disabled={isShuffling}
    className="text-white bg-orange-600 hover:bg-orange-700"
    onClick={handleConfirmBatchShuffle}
    >
    {isShuffling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isShuffling ? 'Reordenando...' : 'Sí, reordenar'}
    </AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    
    </>
  );
}