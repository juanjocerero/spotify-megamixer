// lib/hooks/usePlaylistActions.ts

'use client';

import { useReducer, useState } from 'react';
import { toast } from 'sonner';
import { usePlaylistStore } from '@/lib/store';
import {
  unfollowPlaylistsBatch,
  shufflePlaylistsAction,
  previewBatchSync,
  executeMegalistSync,
  getTrackUris,
  findOrCreatePlaylist,
  addTracksBatch,
  addTracksToMegalistAction,
  createOrUpdateSurpriseMixAction,
  getUniqueTrackCountFromPlaylistsAction,
} from '@/lib/action';
import { shuffleArray } from '@/lib/utils';

// Tipos de datos que usan las acciones
export type ActionPlaylist = { id: string; name: string };

// Define todos los posibles diálogos o pasos en un flujo
type DialogVariant =
| 'none'
| 'delete'
| 'shuffle'
| 'syncPreview'
| 'syncShuffleChoice'
| 'createName'
| 'createShuffleChoice'
| 'createOverwrite'
| 'addToSelect'
| 'addToShuffleChoice'
| 'surpriseGlobal' // Para pedir número de playlists fuente
| 'surpriseTargeted' // Para pedir número de canciones de una selección
| 'surpriseName'; // Paso final para nombrar la playlist sorpresa

// El estado centralizado que controla los diálogos
interface DialogState {
  variant: DialogVariant;
  props: {
    playlists?: ActionPlaylist[];
    sourceIds?: string[];
    targetId?: string;
    playlistName?: string;
    overwriteId?: string;
    syncStats?: { added: number; removed: number };
    uniqueTrackCount?: number;
    targetTrackCount?: number;
    isOverwrite?: boolean;
  };
}

// Acciones que pueden modificar el estado del diálogo
type ReducerAction =
| { type: 'OPEN'; payload: { variant: DialogVariant; props?: Partial<DialogState['props']> } }
| { type: 'UPDATE_PROPS'; payload: Partial<DialogState['props']> }
| { type: 'CLOSE' };

const initialDialogState: DialogState = {
  variant: 'none',
  props: {},
};

function dialogReducer(state: DialogState, action: ReducerAction): DialogState {
  switch (action.type) {
    case 'OPEN':
    return {
      ...state,
      variant: action.payload.variant,
      props: action.payload.props || {},
    };
    case 'UPDATE_PROPS':
    return {
      ...state,
      props: { ...state.props, ...action.payload },
    };
    case 'CLOSE':
    return initialDialogState;
    default:
    return state;
  }
}

export function usePlaylistActions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogState, dispatch] = useReducer(dialogReducer, initialDialogState);
  
  const {
    addPlaylistToCache,
    updatePlaylistInCache,
    removeMultipleFromCache,
    clearSelection,
    megamixCache,
    playlistCache,
  } = usePlaylistStore();
  
  // Lógica de negocio (qué hacer al confirmar)
  
  const handleConfirmDelete = async () => {
    const playlists = dialogState.props.playlists;
    if (!playlists || playlists.length === 0) return;
    
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });
    const idsToDelete = playlists.map((p) => p.id);
    const toastId = toast.loading(`Eliminando ${idsToDelete.length} playlist(s)...`);
    try {
      await unfollowPlaylistsBatch(idsToDelete);
      removeMultipleFromCache(idsToDelete);
      toast.success('Playlist(s) eliminadas con éxito.', { id: toastId });
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron eliminar.';
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleConfirmShuffle = async () => {
    const playlists = dialogState.props.playlists;
    if (!playlists || playlists.length === 0) return;
    
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });
    const idsToShuffle = playlists.map((p) => p.id);
    const toastId = toast.loading(`Reordenando ${idsToShuffle.length} playlist(s)...`);
    try {
      await shufflePlaylistsAction(idsToShuffle);
      toast.success(`${idsToShuffle.length} playlist(s) reordenadas.`, { id: toastId });
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron reordenar.';
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleExecuteSync = async (shouldShuffle: boolean) => {
    const playlistsToSync = dialogState.props.playlists;
    if (!playlistsToSync || playlistsToSync.length === 0) return;
    
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });
    const toastId = toast.loading(`Sincronizando ${playlistsToSync.length} playlist(s)...`);
    try {
      const syncPromises = playlistsToSync.map(p => executeMegalistSync(p.id, shouldShuffle));
      const results = await Promise.allSettled(syncPromises);
      
      let successCount = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
          const playlistId = playlistsToSync[index].id;
          const { finalCount } = result.value;
          updatePlaylistInCache(playlistId, { trackCount: finalCount });
        } else {
          console.error(`Fallo al sincronizar la playlist ${playlistsToSync[index].name}:`, result.status === 'rejected' ? result.reason : 'Error desconocido');
        }
      });
      
      toast.success(`Sincronización completada. ${successCount} de ${playlistsToSync.length} Megalistas actualizadas.`, { id: toastId });
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado durante la sincronización.';
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCreateOrUpdateMegalist = async (shouldShuffle: boolean, mode: 'create' | 'update' | 'replace' = 'create') => {
    const { sourceIds, playlistName, targetId, overwriteId } = dialogState.props;
    
    if (!sourceIds || !playlistName) {
      toast.error("Faltan datos para la operación.");
      return;
    }
    
    const finalTargetId = mode === 'update' ? targetId : overwriteId;
    
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });
    const toastId = toast.loading(mode === 'replace' ? 'Reemplazando playlist...' : mode === 'update' ? 'Actualizando playlist...' : 'Creando Megalista...');
    
    try {
      // Caso 1: Actualizar (Añadir a existente)
      if (mode === 'update' && finalTargetId) {
        const { finalCount, addedCount } = await addTracksToMegalistAction(finalTargetId, sourceIds, shouldShuffle);
        updatePlaylistInCache(finalTargetId, { trackCount: finalCount, playlistType: 'MEGALIST' });
        if (addedCount > 0) {
          toast.success(`¡Megalista actualizada! Se añadieron ${addedCount} canciones nuevas.`, { id: toastId });
        } else {
          toast.info('La Megalista ya contenía todas las canciones.', { id: toastId });
        }
      } else { // Caso 2: Crear o Reemplazar
        const trackUris = await getTrackUris(sourceIds);
        if (trackUris.length === 0) {
          toast.error('No se encontraron canciones en las playlists seleccionadas.', { id: toastId });
          setIsProcessing(false);
          return;
        }
        
        const tracksToMix = shouldShuffle ? shuffleArray(trackUris) : trackUris;
        
        // Si es una creación nueva, primero comprobamos si ya existe.
        if (mode === 'create') {
          const { playlist, exists } = await findOrCreatePlaylist(playlistName, sourceIds, tracksToMix.length);
          if (exists) {
            setIsProcessing(false);
            toast.dismiss(toastId);
            dispatch({ type: 'OPEN', payload: { variant: 'createOverwrite', props: { playlistName, sourceIds, overwriteId: playlist.id } } });
            return; // Detenemos la ejecución aquí, el usuario decidirá en el nuevo diálogo
          }
          // Si no existe, la hemos creado y procedemos a añadirle canciones.
          addPlaylistToCache(playlist);
          toast.loading(`Añadiendo ${tracksToMix.length} canciones a "${playlistName}"...`, { id: toastId });
          await addTracksBatch(playlist.id, tracksToMix);
          updatePlaylistInCache(playlist.id, { trackCount: tracksToMix.length });
          
        } else if (mode === 'replace' && finalTargetId) { // Reemplazar existente
          await addTracksBatch(finalTargetId, []); // Vaciarla primero
          await addTracksBatch(finalTargetId, tracksToMix);
          updatePlaylistInCache(finalTargetId, { trackCount: tracksToMix.length, playlistType: 'MEGALIST' });
        }
        
        toast.success(`¡Megalista "${playlistName}" ${mode === 'replace' ? 'reemplazada' : 'creada'} con éxito!`, { id: toastId });
      }
      
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCreateSurpriseMix = async () => {
    const { sourceIds, targetTrackCount, playlistName, overwriteId } = dialogState.props;
    if (!sourceIds || !targetTrackCount || !playlistName) {
      toast.error("Faltan datos para crear la Lista Sorpresa.");
      return;
    }
    
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });
    const toastId = toast.loading(`Creando tu Lista Sorpresa "${playlistName}"...`);
    
    try {
      const newPlaylist = await createOrUpdateSurpriseMixAction(sourceIds, targetTrackCount, playlistName, overwriteId);
      
      if (overwriteId) {
        updatePlaylistInCache(overwriteId, { trackCount: newPlaylist.tracks.total, playlistType: 'SURPRISE' });
        toast.success(`¡Lista Sorpresa "${newPlaylist.name}" actualizada!`, { id: toastId });
      } else {
        addPlaylistToCache(newPlaylist);
        toast.success(`¡Lista Sorpresa "${newPlaylist.name}" creada con éxito!`, { id: toastId });
      }
      
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
      if (message.startsWith('PLAYLIST_EXISTS::')) {
        const existingId = message.split('::')[1];
        toast.dismiss(toastId);
        setIsProcessing(false);
        dispatch({ type: 'OPEN', payload: { 
          variant: 'surpriseName', 
          props: { ...dialogState.props, isOverwrite: true, overwriteId: existingId } 
        }});
      } else {
        toast.error(message, { id: toastId });
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Acciones públicas (para abrir los diálogos)
  
  const openDeleteDialog = (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    dispatch({ type: 'OPEN', payload: { variant: 'delete', props: { playlists } } });
  };
  
  const openShuffleDialog = (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    dispatch({ type: 'OPEN', payload: { variant: 'shuffle', props: { playlists } } });
  };
  
  const openSyncDialog = async (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    setIsProcessing(true);
    const toastId = toast.loading(`Calculando cambios para ${playlists.length} playlist(s)...`);
    try {
      const idsToPreview = playlists.map((p) => p.id);
      const { totalAdded, totalRemoved } = await previewBatchSync(idsToPreview);
      if (totalAdded === 0 && totalRemoved === 0) {
        toast.success("¡Todo al día!", { id: toastId, description: "Las playlists seleccionadas ya están sincronizadas." });
        setIsProcessing(false);
        return;
      }
      toast.dismiss(toastId);
      dispatch({ type: 'OPEN', payload: { variant: 'syncPreview', props: { playlists, syncStats: { added: totalAdded, removed: totalRemoved } } } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo previsualizar la sincronización.";
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const openCreateMegalistDialog = (sourceIds: string[]) => {
    if (sourceIds.length < 2) {
      toast.info('Selecciona al menos 2 playlists para crear una Megalista.');
      return;
    }
    dispatch({ type: 'OPEN', payload: { variant: 'createName', props: { sourceIds } } });
  };
  
  const openAddToMegalistDialog = (sourceIds: string[]) => {
    if (sourceIds.length === 0) return;
    if (megamixCache.length === 0) {
      toast.info('No tienes ninguna Megalista creada por la app a la que añadir canciones.');
      return;
    }
    dispatch({ type: 'OPEN', payload: { variant: 'addToSelect', props: { sourceIds } } });
  };
  
  const openSurpriseMixDialog = async (sourceIds?: string[]) => {
    setIsProcessing(true);
    const toastId = toast.loading("Preparando el generador de sorpresas...");
    
    try {
      // Flujo 1: Sorpresa Global (sin selección previa)
      if (!sourceIds || sourceIds.length === 0) {
        dispatch({ type: 'OPEN', payload: { variant: 'surpriseGlobal' } });
      } else { // Flujo 2: Sorpresa desde Selección
        const count = await getUniqueTrackCountFromPlaylistsAction(sourceIds);
        dispatch({ type: 'OPEN', payload: { variant: 'surpriseTargeted', props: { sourceIds, uniqueTrackCount: count } } });
      }
      toast.dismiss(toastId);
    } catch (err) {
      toast.error('No se pudo obtener la información de las playlists.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Callbacks para los componentes de diálogos
  
  const dialogCallbacks = {
    onClose: () => dispatch({ type: 'CLOSE' }),
    
    // Callbacks genéricos para diálogos de confirmación
    onConfirmDelete: handleConfirmDelete,
    onConfirmShuffle: handleConfirmShuffle,
    
    // Flujo de Sincronización
    onConfirmSyncPreview: () => dispatch({ type: 'OPEN', payload: { variant: 'syncShuffleChoice', props: dialogState.props } }),
    onConfirmSyncShuffleChoice: (shouldShuffle: boolean) => handleExecuteSync(shouldShuffle),
    
    // Flujo de Creación de Megalista
    onConfirmCreateName: (playlistName: string) => dispatch({ type: 'OPEN', payload: { variant: 'createShuffleChoice', props: { ...dialogState.props, playlistName } } }),
    onConfirmCreateShuffleChoice: (shouldShuffle: boolean) => handleCreateOrUpdateMegalist(shouldShuffle, 'create'),
    onConfirmOverwrite: (mode: 'update' | 'replace') => {
      if (mode === 'update') {
        // Si eligen 'actualizar', lo tratamos como "Añadir a" pero con reordenado forzado
        dispatch({ type: 'OPEN', payload: { variant: 'addToShuffleChoice', props: { ...dialogState.props, targetId: dialogState.props.overwriteId } } });
      } else {
        handleCreateOrUpdateMegalist(true, 'replace');
      }
    },
    
    // Flujo de Añadir a Megalista
    onConfirmAddToSelect: (targetId: string) => dispatch({ type: 'OPEN', payload: { variant: 'addToShuffleChoice', props: { ...dialogState.props, targetId } } }),
    onConfirmAddToShuffleChoice: (shouldShuffle: boolean) => handleCreateOrUpdateMegalist(shouldShuffle, 'update'),
    
    // Flujo de Lista Sorpresa
    onConfirmSurpriseGlobal: (count: number) => {
      const randomPlaylists = shuffleArray([...playlistCache]).slice(0, count);
      const sourceIds = randomPlaylists.map(p => p.id);
      openSurpriseMixDialog(sourceIds);
    },
    onConfirmSurpriseTargeted: (trackCount: number) => dispatch({ type: 'OPEN', payload: { variant: 'surpriseName', props: { ...dialogState.props, targetTrackCount: trackCount } } }),
    onConfirmSurpriseName: (playlistName: string) => {
      dispatch({ type: 'UPDATE_PROPS', payload: { playlistName } });
      // Usamos un timeout corto para asegurar que el estado se actualiza antes de llamar a la acción
      setTimeout(handleCreateSurpriseMix, 0);
    },
  };
  
  return {
    isProcessing,
    dialogState,
    dialogCallbacks,
    
    // Acciones para exponer a la UI
    openDeleteDialog,
    openShuffleDialog,
    openSyncDialog,
    openCreateMegalistDialog,
    openAddToMegalistDialog,
    openSurpriseMixDialog,
  };
}