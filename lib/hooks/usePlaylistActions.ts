// lib/hooks/usePlaylistActions.ts

'use client';

import { useReducer, useState, useCallback } from 'react';
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

import { toast } from 'sonner';

// Tipos de datos que usan las acciones
export type ActionPlaylist = { id: string; name: string };

type DialogState =
| { variant: 'none' }
| { variant: 'delete'; props: { playlists: ActionPlaylist[] } }
| { variant: 'shuffle'; props: { playlists: ActionPlaylist[] } }
| {
  variant: 'syncPreview';
  props: {
    playlists: ActionPlaylist[];
    syncStats: { added: number; removed: number };
  };
}
| { variant: 'syncShuffleChoice'; props: { playlists: ActionPlaylist[] } }
| { variant: 'createName'; props: { sourceIds: string[] } }
| {
  variant: 'createShuffleChoice';
  props: { sourceIds: string[]; playlistName: string };
}
| {
  variant: 'createOverwrite';
  props: {
    sourceIds: string[];
    playlistName: string;
    overwriteId: string;
  };
}
| { variant: 'addToSelect'; props: { sourceIds: string[] } }
| {
  variant: 'addToShuffleChoice';
  props: { sourceIds: string[]; targetId: string };
}
| { variant: 'surpriseGlobal'; }
| {
  variant: 'surpriseTargeted';
  props: { sourceIds: string[]; uniqueTrackCount: number };
}
| {
  variant: 'surpriseName';
  props: {
    sourceIds: string[];
    targetTrackCount: number;
    isOverwrite?: boolean;
    overwriteId?: string;
  };
};

type OpenActionPayload = Exclude<DialogState, { variant: 'none' }>;
// Acciones que pueden modificar el estado del diálogo
type ReducerAction =
| { type: 'OPEN'; payload: OpenActionPayload }
| { type: 'CLOSE' };

const initialDialogState: DialogState = {
  variant: 'none',
};

function dialogReducer(state: DialogState, action: ReducerAction): DialogState {
  switch (action.type) {
    case 'OPEN':
    return action.payload; // El payload es ahora el estado completo
    case 'CLOSE':
    return { variant: 'none' };
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
  
  // Wrapper para acciones asíncronas que se ejecutan sobre una sola lista
  const executeAction = useCallback(async <T, P extends unknown[]>(
    actionFn: (...args: P) => Promise<T>,
    params: P,
    options: {
      loading: string;
      success: string;
      error: string;
      onSuccess?: (result: T) => void;
    }
  ): Promise<void> => {
    setIsProcessing(true);
    const toastId = toast.loading(options.loading);
    
    try {
      const result = await actionFn(...params);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      toast.success(options.success, { id: toastId });
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : options.error;
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  }, [clearSelection]);
  
  // Wrapper para acciones asíncronas que se ejecutan sobre múltiples listas
  const executeBatchAction = useCallback(async <T, P>(
    items: P[],
    actionFn: (item: P) => Promise<T>,
    options: {
      loading: string;
      onSuccess: (results: PromiseSettledResult<T>[], items: P[]) => string;
      error: string;
    }
  ): Promise<void> => {
    setIsProcessing(true);
    const toastId = toast.loading(options.loading);
    
    try {
      const promises = items.map(item => actionFn(item));
      const results = await Promise.allSettled(promises);
      
      const successMessage = options.onSuccess(results, items);
      
      toast.success(successMessage, { id: toastId });
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : options.error;
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  }, [clearSelection]);
  
  // Lógica de negocio (qué hacer al confirmar)
  const handleConfirmDelete = async () => {
    if (dialogState.variant !== 'delete') return;
    
    const { playlists } = dialogState.props;
    
    dispatch({ type: 'CLOSE' });
    const idsToDelete = playlists.map((p) => p.id);
    
    await executeAction(
      unfollowPlaylistsBatch,
      [idsToDelete],
      {
        loading: `Eliminando ${idsToDelete.length} playlist(s)...`,
        success: 'Playlist(s) eliminadas con éxito.',
        error: 'No se pudieron eliminar.',
        onSuccess: () => removeMultipleFromCache(idsToDelete),
      }
    );
  };
  
  const handleConfirmShuffle = async () => {
    if (dialogState.variant !== 'shuffle') return;
    const { playlists } = dialogState.props;
    
    dispatch({ type: 'CLOSE' });
    const idsToShuffle = playlists.map((p) => p.id);
    
    await executeAction(
      shufflePlaylistsAction,
      [idsToShuffle],
      {
        loading: `Reordenando ${idsToShuffle.length} playlist(s)...`,
        success: `${idsToShuffle.length} playlist(s) reordenadas.`,
        error: 'No se pudieron reordenar.',
      }
    );
  };
  
  const handleExecuteSync = async (shouldShuffle: boolean) => {
    if (dialogState.variant !== 'syncShuffleChoice') return;
    const { playlists } = dialogState.props;
    
    dispatch({ type: 'CLOSE' });
    
    await executeBatchAction(
      playlists,
      (p) => executeMegalistSync(p.id, shouldShuffle),
      {
        loading: `Sincronizando ${playlists.length} playlist(s)...`,
        error: 'Ocurrió un error inesperado durante la sincronización.',
        onSuccess: (results, items) => {
          let successCount = 0;
          results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
              successCount++;
              const { finalCount } = result.value;
              updatePlaylistInCache(items[index].id, { trackCount: finalCount });
            }
          });
          return `Sincronización completada. ${successCount} de ${items.length} Megalistas actualizadas.`;
        }
      }
    );
  };
  
  const handleCreateOrUpdateMegalist = async (
    shouldShuffle: boolean,
    mode: 'create' | 'update' | 'replace'
  ) => {
    // La guarda de tipo inicial sigue siendo una buena práctica.
    if (
      !(
        (mode === 'create' && dialogState.variant === 'createShuffleChoice') ||
        (mode === 'update' && dialogState.variant === 'addToShuffleChoice') ||
        (mode === 'replace' && dialogState.variant === 'createOverwrite')
      )
    ) {
      return;
    }
    
    // A partir de aquí, TypeScript sabe que `dialogState` es uno de los 3 tipos válidos.
    // Inicializamos las variables que vamos a necesitar.
    let playlistName: string;
    let finalTargetId: string | undefined;
    const { sourceIds } = dialogState.props; // `sourceIds` es la única prop común que podemos sacar de forma segura.
    
    // Usamos un `switch` sobre la `variant` para que TypeScript pueda reducir el tipo en cada bloque.
    switch (dialogState.variant) {
      case 'createShuffleChoice':
      // Dentro de este bloque, TypeScript sabe que `dialogState.props` tiene `playlistName`.
      playlistName = dialogState.props.playlistName;
      break;
      
      case 'addToShuffleChoice':
      // Aquí, sabe que `dialogState.props` tiene `targetId`.
      finalTargetId = dialogState.props.targetId;
      const targetPlaylist = playlistCache.find(p => p.id === finalTargetId);
      playlistName = targetPlaylist?.name || "Megalista existente";
      break;
      
      case 'createOverwrite':
      // Y aquí, sabe que tiene `playlistName` y `overwriteId`.
      playlistName = dialogState.props.playlistName;
      finalTargetId = dialogState.props.overwriteId;
      break;
    }
    
    if (!playlistName) {
      toast.error("Faltan datos para la operación.");
      return;
    }
    
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });
    const toastId = toast.loading(mode === 'replace' ? 'Reemplazando playlist...' : mode === 'update' ? 'Actualizando playlist...' : 'Creando Megalista...');
    
    try {
      if (mode === 'update' && finalTargetId) {
        const { finalCount, addedCount } = await addTracksToMegalistAction(finalTargetId, sourceIds, shouldShuffle);
        updatePlaylistInCache(finalTargetId, { trackCount: finalCount, playlistType: 'MEGALIST' });
        if (addedCount > 0) {
          toast.success(`¡Megalista actualizada! Se añadieron ${addedCount} canciones nuevas.`, { id: toastId });
        } else {
          toast.info('La Megalista ya contenía todas las canciones.', { id: toastId });
        }
      } else {
        const trackUris = await getTrackUris(sourceIds);
        if (trackUris.length === 0) {
          toast.error('No se encontraron canciones en las playlists seleccionadas.', { id: toastId });
          setIsProcessing(false);
          return;
        }
        const tracksToMix = shouldShuffle ? shuffleArray(trackUris) : trackUris;
        
        if (mode === 'create') {
          const { playlist, exists } = await findOrCreatePlaylist(playlistName, sourceIds, tracksToMix.length);
          if (exists) {
            setIsProcessing(false);
            toast.dismiss(toastId);
            dispatch({ type: 'OPEN', payload: { variant: 'createOverwrite', props: { playlistName, sourceIds, overwriteId: playlist.id } } });
            return;
          }
          addPlaylistToCache(playlist);
          toast.loading(`Añadiendo ${tracksToMix.length} canciones a "${playlistName}"...`, { id: toastId });
          await addTracksBatch(playlist.id, tracksToMix);
          updatePlaylistInCache(playlist.id, { trackCount: tracksToMix.length });
        } else if (mode === 'replace' && finalTargetId) {
          await addTracksBatch(finalTargetId, []);
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
  
  const handleCreateSurpriseMix = async (playlistName: string) => {
    if (dialogState.variant !== 'surpriseName') return;
    const { sourceIds, targetTrackCount, overwriteId } = dialogState.props;
    
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });
    const toastId = toast.loading(`Creando tu Lista Sorpresa "${playlistName}"...`);
    
    try {
      const newPlaylist = await createOrUpdateSurpriseMixAction(sourceIds, targetTrackCount, playlistName, overwriteId);
      if (overwriteId) {
        updatePlaylistInCache(overwriteId, { trackCount: newPlaylist.tracks.total, playlistType: 'SURPRISE' });
        toast.success(`Lista Sorpresa "${newPlaylist.name}" actualizada.`, { id: toastId });
      } else {
        addPlaylistToCache(newPlaylist);
        toast.success(`Lista Sorpresa "${newPlaylist.name}" creada con éxito.`, { id: toastId });
      }
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
      if (message.startsWith('PLAYLIST_EXISTS::')) {
        const existingId = message.split('::')[1];
        toast.dismiss(toastId);
        setIsProcessing(false);
        dispatch({ type: 'OPEN', payload: { ...dialogState, props: { ...dialogState.props, isOverwrite: true, overwriteId: existingId } }});
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
      if (!sourceIds || sourceIds.length === 0) {
        dispatch({ type: 'OPEN', payload: { variant: 'surpriseGlobal' } });
      } else {
        const count = await getUniqueTrackCountFromPlaylistsAction(sourceIds);
        dispatch({ type: 'OPEN', payload: { variant: 'surpriseTargeted', props: { sourceIds, uniqueTrackCount: count } } });
      }
      toast.dismiss(toastId);
    } catch (err) {
      console.error('Error obteniendo la información de las playlists', err);
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
    onConfirmSyncPreview: () => {
      if (dialogState.variant !== 'syncPreview') return;
      dispatch({ type: 'OPEN', payload: { variant: 'syncShuffleChoice', props: { playlists: dialogState.props.playlists } } });
    },
    onConfirmSyncShuffleChoice: (shouldShuffle: boolean) => handleExecuteSync(shouldShuffle),
    
    // Flujo de Creación de Megalista
    onConfirmCreateName: (playlistName: string) => {
      if (dialogState.variant !== 'createName') return;
      dispatch({ type: 'OPEN', payload: { variant: 'createShuffleChoice', props: { ...dialogState.props, playlistName } } });
    },
    onConfirmCreateShuffleChoice: (shouldShuffle: boolean) => {
      if (dialogState.variant !== 'createShuffleChoice') return;
      handleCreateOrUpdateMegalist(shouldShuffle, 'create');
    },
    onConfirmOverwrite: (mode: 'update' | 'replace') => {
      if (dialogState.variant !== 'createOverwrite') return;
      if (mode === 'update') {
        dispatch({ type: 'OPEN', payload: { variant: 'addToShuffleChoice', props: { sourceIds: dialogState.props.sourceIds, targetId: dialogState.props.overwriteId } } });
      } else {
        // Para 'replace', cambiamos el estado para que handleCreate sepa qué hacer
        handleCreateOrUpdateMegalist(true, 'replace');
      }
    },
    
    // Flujo de Añadir a Megalista
    onConfirmAddToSelect: (targetId: string) => {
      if (dialogState.variant !== 'addToSelect') return;
      dispatch({ type: 'OPEN', payload: { variant: 'addToShuffleChoice', props: { ...dialogState.props, targetId } } });
    },
    onConfirmAddToShuffleChoice: (shouldShuffle: boolean) => {
      if (dialogState.variant !== 'addToShuffleChoice') return;
      handleCreateOrUpdateMegalist(shouldShuffle, 'update');
    },
    
    // Flujo de Lista Sorpresa
    onConfirmSurpriseGlobal: (count: number) => {
      const randomPlaylists = shuffleArray([...playlistCache]).slice(0, count);
      const sourceIds = randomPlaylists.map(p => p.id);
      openSurpriseMixDialog(sourceIds);
    },
    onConfirmSurpriseTargeted: (trackCount: number) => {
      if (dialogState.variant !== 'surpriseTargeted') return;
      dispatch({ type: 'OPEN', payload: { variant: 'surpriseName', props: { ...dialogState.props, targetTrackCount: trackCount } } });
    },
    onConfirmSurpriseName: (playlistName: string) => {
      if(playlistName.trim() === '') {
        toast.error("El nombre de la playlist no puede estar vacío.");
        return;
      }
      handleCreateSurpriseMix(playlistName);
    },
  };
  
  return {
    isProcessing,
    dialogState,
    dialogCallbacks,
    openDeleteDialog,
    openShuffleDialog,
    openSyncDialog,
    openCreateMegalistDialog,
    openAddToMegalistDialog,
    openSurpriseMixDialog,
  };
}