'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { usePlaylistStore } from '@/lib/store';
import {
  unfollowPlaylistsBatch,
  shufflePlaylistsAction,
  findOrCreatePlaylist,
  addTracksBatch,
  addTracksToMegalistAction,
  updatePlaylistDetailsAction,
  toggleFreezeStateAction,
  createEmptyMegalistAction,
  addTracksToPlaylistAction,
  getUniqueTrackCountFromPlaylistsAction,
} from '@/lib/actions/playlist.actions';
import { getTrackUris } from '@/lib/actions/spotify.actions';
import {
  previewBatchSync,
  executeMegalistSync,
} from '@/lib/actions/sync.action';
import { createOrUpdateSurpriseMixAction } from '@/lib/actions/surprise.actions';
import { shuffleArray } from '../utils';
import { ActionResult, SpotifyPlaylist } from '@/types/spotify';
import { OpenActionPayload } from './useDialogManager';

export type ActionPlaylist = { id: string; name: string };

/**
 * Hook que encapsula TODA la lógica de negocio de las acciones sobre playlists.
 * NO gestiona el estado de los diálogos, solo ejecuta las operaciones y
 * actualiza el estado global (Zustand) y notifica al usuario.
 * @param dispatch - La función dispatch del gestor de diálogos para abrirlos.
 */
export function usePlaylistActions(
  dispatch: React.Dispatch<{ type: 'OPEN'; payload: OpenActionPayload } | { type: 'CLOSE' }>,
) {
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    addPlaylistToCache,
    updatePlaylistInCache,
    removeMultipleFromCache,
    clearSelection,
    playlistCache,
  } = usePlaylistStore();

  const executeAction = useCallback(
    async <T, P extends unknown[]>(
      actionFn: (...args: P) => Promise<T>,
      params: P,
      options: {
        loading: string;
        success: string;
        error: string;
        onSuccess?: (result: T) => void;
      },
    ): Promise<void> => {
      setIsProcessing(true);
      const toastId = toast.loading(options.loading);
      try {
        const result = await actionFn(...params);
        toast.success(options.success, { id: toastId });
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        clearSelection();
      } catch (error) {
        const message = error instanceof Error ? error.message : options.error;
        toast.error(message, { id: toastId });
      } finally {
        setIsProcessing(false);
      }
    },
    [clearSelection],
  );

  const executeBatchAction = useCallback(
    async <T, P>(
      items: P[],
      actionFn: (item: P) => Promise<ActionResult<T>>,
      options: {
        loading: string;
        onSuccess: (
          results: PromiseSettledResult<ActionResult<T>>[],
          items: P[],
        ) => string;
        error: string;
      },
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
    },
    [clearSelection],
  );

  // --- LÓGICA DE NEGOCIO (HANDLERS) ---

  const handleConfirmCreateEmpty = async (playlistName: string) => {
    dispatch({ type: 'CLOSE' });
    await executeAction(createEmptyMegalistAction, [playlistName], {
      loading: `Creando la lista "${playlistName}"...`,
      success: '¡Lista vacía creada con éxito!',
      error: 'No se pudo crear la lista.',
      onSuccess: result => {
        if (result.success) addPlaylistToCache(result.data);
      },
    });
  };

  const handleConfirmEdit = async (
    playlistId: string,
    newName: string,
    newDescription: string,
  ) => {
    dispatch({ type: 'CLOSE' });
    await executeAction(
      updatePlaylistDetailsAction,
      [playlistId, newName, newDescription],
      {
        loading: 'Guardando cambios...',
        success: '¡Playlist actualizada!',
        error: 'No se pudieron guardar los cambios.',
        onSuccess: () => {
          updatePlaylistInCache(playlistId, {
            name: newName,
            description: newDescription,
          });
        },
      },
    );
  };

  const handleConfirmFreeze = async (
    playlistId: string,
    shouldFreeze: boolean,
  ) => {
    const actionText = shouldFreeze ? 'Congelando' : 'Descongelando';
    const successText = shouldFreeze ? 'congelada' : 'descongelada';
    dispatch({ type: 'CLOSE' });
    await executeAction(toggleFreezeStateAction, [playlistId, shouldFreeze], {
      loading: `${actionText} la playlist...`,
      success: `¡Playlist ${successText} con éxito!`,
      error: `No se pudo actualizar la playlist.`,
      onSuccess: result => {
        if (result.success) {
          updatePlaylistInCache(playlistId, {
            isFrozen: result.data.isFrozen,
            isSyncable: !result.data.isFrozen,
          });
        }
      },
    });
  };

  const handleConfirmDelete = async (playlists: ActionPlaylist[]) => {
    dispatch({ type: 'CLOSE' });
    const idsToDelete = playlists.map(p => p.id);
    await executeAction(unfollowPlaylistsBatch, [idsToDelete], {
      loading: `Eliminando ${idsToDelete.length} playlist(s)...`,
      success: 'Playlist(s) eliminadas con éxito.',
      error: 'No se pudieron eliminar.',
      onSuccess: () => removeMultipleFromCache(idsToDelete),
    });
  };

  const handleConfirmShuffle = async (playlists: ActionPlaylist[]) => {
    dispatch({ type: 'CLOSE' });
    const idsToShuffle = playlists.map(p => p.id);
    await executeAction(shufflePlaylistsAction, [idsToShuffle], {
      loading: `Reordenando ${idsToShuffle.length} playlist(s)...`,
      success: `${idsToShuffle.length} playlist(s) reordenadas.`,
      error: 'No se pudieron reordenar.',
    });
  };

  const handleExecuteSync = async (
    playlists: ActionPlaylist[],
    shouldShuffle: boolean,
  ) => {
    dispatch({ type: 'CLOSE' });
    await executeBatchAction(
      playlists,
      p => executeMegalistSync(p.id, shouldShuffle),
      {
        loading: `Sincronizando ${playlists.length} playlist(s)...`,
        error: 'Ocurrió un error inesperado durante la sincronización.',
        onSuccess: (results, items) => {
          let successCount = 0;
          results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
              successCount++;
              const { id, finalCount } = result.value.data;
              updatePlaylistInCache(id, { trackCount: finalCount });
            } else {
              // ... (manejo de errores)
            }
          });
          return `Sincronización completada. ${successCount} de ${items.length} Megalistas actualizadas.`;
        },
      },
    );
  };

  const handleCreateOrUpdateMegalist = async (
    props: {
      sourceIds: string[];
      playlistName: string;
      shouldShuffle: boolean;
      mode: 'create' | 'update' | 'replace';
      targetId?: string;
    },
  ) => {
    const { sourceIds, playlistName, shouldShuffle, mode, targetId } = props;
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });

    const toastId = toast.loading(
      mode === 'replace'
        ? 'Reemplazando playlist...'
        : mode === 'update'
        ? 'Actualizando playlist...'
        : 'Creando Megalista...',
    );

    try {
      if (mode === 'update' && targetId) {
        // ... Lógica de actualización (addTracksToMegalistAction) ...
        const targetPlaylist = playlistCache.find(p => p.id === targetId);
        const wasEmptyAndFrozen = targetPlaylist?.isFrozen && targetPlaylist.tracks.total === 0;
        const result = await addTracksToMegalistAction(targetId, sourceIds, shouldShuffle);
        if (result.success) {
            const { finalCount, addedCount } = result.data;
            const cacheUpdates: Parameters<typeof updatePlaylistInCache>[1] = { 
                trackCount: finalCount, 
                playlistType: 'MEGALIST',
            };
            if (wasEmptyAndFrozen) {
                cacheUpdates.isFrozen = false;
                cacheUpdates.isSyncable = true;
            }
            updatePlaylistInCache(targetId, cacheUpdates);
            if (addedCount > 0) {
                toast.success(`¡Megalista actualizada! Se añadieron ${addedCount} canciones nuevas.`, { id: toastId });
            } else {
                toast.info('La Megalista ya contenía todas las canciones.', { id: toastId });
            }
        } else {
            toast.error(result.error, { id: toastId });
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

        } else if (mode === 'replace' && targetId) {
            await addTracksBatch(targetId, []); // Vacía la lista
            await addTracksBatch(targetId, tracksToMix);
            updatePlaylistInCache(targetId, { trackCount: tracksToMix.length, playlistType: 'MEGALIST' });
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
  
  const handleCreateSurpriseMix = async (props: {
    sourceIds: string[];
    targetTrackCount: number;
    playlistName: string;
    overwriteId?: string;
  }) => {
    const { sourceIds, targetTrackCount, playlistName, overwriteId } = props;
    if (playlistName.trim() === '') {
        toast.error("El nombre de la playlist no puede estar vacío.");
        return;
    }
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });
    const toastId = toast.loading(`Creando tu Lista Sorpresa "${playlistName}"...`);
    const result = await createOrUpdateSurpriseMixAction(sourceIds, targetTrackCount, playlistName, overwriteId);

    if (result.success) {
        const newPlaylist = result.data;
        if (overwriteId) {
            updatePlaylistInCache(overwriteId, { trackCount: newPlaylist.tracks.total, playlistType: 'SURPRISE' });
            toast.success(`Lista Sorpresa "${newPlaylist.name}" actualizada.`, { id: toastId });
        } else {
            addPlaylistToCache(newPlaylist);
            toast.success(`Lista Sorpresa "${newPlaylist.name}" creada con éxito.`, { id: toastId });
        }
        clearSelection();
    } else {
        const errorMessage = result.error;
        if (errorMessage.startsWith('PLAYLIST_EXISTS::')) {
            const existingId = errorMessage.split('::')[1];
            toast.dismiss(toastId);
            dispatch({ type: 'OPEN', payload: { 
                variant: 'surpriseName', 
                props: { sourceIds, targetTrackCount, isOverwrite: true, overwriteId: existingId },
            }});
        } else {
            toast.error(errorMessage, { id: toastId });
        }
    }
    setIsProcessing(false);
  };

  const handleConfirmAddTracks = async (targetPlaylistId: string, trackUris: string[]) => {
    dispatch({ type: 'CLOSE' });
    await executeAction(
      addTracksToPlaylistAction,
      [{ playlistId: targetPlaylistId, trackUris }],
      {
        loading: 'Añadiendo canciones...',
        success: `${trackUris.length} cancion(es) añadidas con éxito.`,
        error: 'No se pudieron añadir las canciones.',
        onSuccess: (result) => {
          if (result.success) {
            updatePlaylistInCache(targetPlaylistId, { trackCount: result.data.newTrackCount });
          }
        },
      },
    );
  };

  // --- FUNCIONES PARA ABRIR DIÁLOGOS ---

  const openCreateEmptyMegalistDialog = () => dispatch({ type: 'OPEN', payload: { variant: 'createEmpty' } });
  const openEditDialog = (playlist: SpotifyPlaylist) => dispatch({ type: 'OPEN', payload: { variant: 'edit', props: { playlist } } });
  const openDeleteDialog = (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    dispatch({ type: 'OPEN', payload: { variant: 'delete', props: { playlists } } });
  };
  const openShuffleDialog = (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    dispatch({ type: 'OPEN', payload: { variant: 'shuffle', props: { playlists } } });
  };
   const openFreezeDialog = (playlist: SpotifyPlaylist) => {
    if (!playlist.isMegalist || playlist.playlistType !== 'MEGALIST') {
      toast.error('Esta acción solo está disponible para Megalistas.');
      return;
    }
    dispatch({ type: 'OPEN', payload: { variant: 'freezeConfirmation', props: { playlist } } });
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
    const existingMegalists = playlistCache.filter(p => p.playlistType === 'MEGALIST');
    if (existingMegalists.length === 0) {
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
  const openAddTracksDialog = (trackUris: string[]) => {
    const existingMegalists = playlistCache.filter(p => p.playlistType === 'MEGALIST');
    if (existingMegalists.length === 0) {
      toast.info('No tienes ninguna Megalista creada para añadir canciones.');
      return;
    }
    dispatch({ type: 'OPEN', payload: { variant: 'addTracksToMegalist', props: { trackUris } } });
  };

  return {
    isProcessing,
    // Handlers de Lógica
    handleConfirmCreateEmpty,
    handleConfirmEdit,
    handleConfirmDelete,
    handleConfirmShuffle,
    handleConfirmFreeze,
    handleExecuteSync,
    handleCreateOrUpdateMegalist,
    handleCreateSurpriseMix,
    handleConfirmAddTracks,
    // Openers de Diálogos
    openCreateEmptyMegalistDialog,
    openEditDialog,
    openDeleteDialog,
    openShuffleDialog,
    openFreezeDialog,
    openSyncDialog,
    openCreateMegalistDialog,
    openAddToMegalistDialog,
    openSurpriseMixDialog,
    openAddTracksDialog,
  };
}