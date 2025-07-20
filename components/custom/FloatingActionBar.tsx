// /components/custom/FloatingActionBar.tsx
'use client';

import { useState, useMemo } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { useActions } from '@/lib/contexts/ActionProvider';
import { shuffleArray } from '@/lib/utils';

// Lógica de acciones del backend
import {
  getTrackUris,
  findOrCreatePlaylist,
  addTracksBatch,
  clearPlaylist,
  addTracksToMegalistAction,
  executeMegalistSync, 
  previewBatchSync, 
} from '@/lib/action';

import ConfirmationDialog from './ConfirmationDialog';
import ShuffleChoiceDialog from './ShuffleChoiceDialog';
import SurpriseMixDialog from './SurpriseMixDialog';

// Componentes UI de Shadcn
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Shuffle, XCircle, PlusSquare, ListPlus, RefreshCw, Trash2, Wand2 } from 'lucide-react';

export default function FloatingActionBar() {
  
  // Obtenemos todo el estado y acciones necesarios del store de Zustand
  const {
    selectedPlaylistIds,
    clearSelection,
    megamixCache,
    addPlaylistToCache,
    updatePlaylistInCache,
    playlistCache,
  } = usePlaylistStore();
  
  const { actions, isProcessing } = useActions(); 
  
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
  const [surpriseDialog, setSurpriseDialog] = useState({ open: false });
  
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
  
  const handleSyncClick = () => {
    actions.syncPlaylists(
      syncableMegalistsInSelection.map(p => ({ id: p.id, name: p.name }))
    );
  };
  
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
  
  const handleShuffleClick = () => {
    const playlistsToShuffle = megamixCache.filter(p => selectedPlaylistIds.includes(p.id) && p.isMegalist);
    actions.shufflePlaylists(playlistsToShuffle.map(p => ({ id: p.id, name: p.name })));
  };
  
  // Obtenemos los nombres de las playlists para el diálogo.
  const handleDeleteClick = () => {
    const playlistsToDelete = playlistCache.filter(p => selectedPlaylistIds.includes(p.id))
    .map(p => ({ id: p.id, name: p.name }));
    actions.deletePlaylists(playlistsToDelete);
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
      
      {/* Eliminar */}
      <Tooltip>
      <TooltipTrigger asChild>
      <Button
      variant="ghost"
      size="lg"
      onClick={() => handleDeleteClick}
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
        onClick={() => handleShuffleClick}
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
        onClick={handleSyncClick} 
        disabled={isProcessing} 
        className="h-14 w-14 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2"
        >
        {isProcessing ? <Loader2 className="h-6 w-6 sm:h-5 sm:w-5 animate-spin"/> : <RefreshCw className="h-6 w-6 sm:h-5 sm:w-5" />}
        <span className="hidden sm:inline-block text-sm">Sincronizar</span>
        </Button>
        </TooltipTrigger>
        <TooltipContent><p>Sincronizar {syncableMegalists.length} Megalista(s)</p></TooltipContent>
        </Tooltip>
      )}
      
      {/* Crear lista sorpresa*/}
      <Tooltip>
      <TooltipTrigger asChild>
      <Button variant="ghost" size="lg" onClick={() => setSurpriseDialog({ open: true })} disabled={isProcessing} className="h-14 w-14 text-blue-500 hover:bg-blue-500/10 hover:text-blue-500 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2">
      <Wand2 className="h-6 w-6 sm:h-5 sm:w-5" />
      <span className="hidden sm:inline-block text-sm">Sorpresa</span>
      </Button>
      </TooltipTrigger>
      <TooltipContent>
      <p>Crear Lista Sorpresa</p>
      </TooltipContent>
      </Tooltip>
      
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
    <ShuffleChoiceDialog
    isOpen={step === 'askingOrder'}
    onClose={() => setStep('idle')}
    onConfirm={handleExecuteMix}
    title="¿Cómo quieres ordenar las canciones?"
    description="Puedes mantener el orden original de las canciones tal y como aparecen en tus playlists, o reordenarlas para crear una mezcla aleatoria."
    />
    
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
    <ShuffleChoiceDialog
    isOpen={shuffleChoice.open}
    onClose={() => setShuffleChoice({ ...shuffleChoice, open: false })}
    onConfirm={handleExecuteUpdateOrAdd}
    title="¿Actualizar y reordenar?"
    description={
      <span>
      Se añadirán canciones a la playlist{' '}
      <strong className="text-white">
      &quot;{shuffleChoice.playlistName}&quot;
      </strong>. Puedes mantener el orden actual de las canciones (añadiendo las nuevas al final) o reordenar toda la playlist de forma aleatoria.
      </span>
    }
    />
    
    {/* Diálogo de creación de lista sorpresa */}
    <SurpriseMixDialog
    isOpen={surpriseDialog.open}
    onClose={() => setSurpriseDialog({ open: false })}
    sourceIds={selectedPlaylistIds}
    />
    
    </>
  );
}