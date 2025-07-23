// lib/hooks/usePlaylistActions.ts
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { usePlaylistStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
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
  convertToMegalistAction
} from '@/lib/actions/playlist.actions';
import { getTrackUris, fetchMorePlaylists } from '@/lib/actions/spotify.actions';
import {
  previewBatchSync,
  executeMegalistSync,
} from '@/lib/actions/sync.action';
import { createOrUpdateSurpriseMixAction } from '@/lib/actions/surprise.actions';
import { shuffleArray } from '../utils';
import { ActionResult, SpotifyPlaylist } from '@/types/spotify';
import { OpenActionPayload } from './useDialogManager';

/**
* Define la estructura mínima de una playlist necesaria para realizar una acción.
* Usado para pasar datos a los diálogos y a los manejadores de acciones.
*/
export type ActionPlaylist = { id: string; name: string };

/**
* Hook que encapsula TODA la lógica de negocio para las acciones sobre playlists.
* No gestiona el estado de los diálogos, pero sí los abre a través del `dispatch`
* que recibe. Su responsabilidad es ejecutar las Server Actions, manejar el estado
* de carga (`isProcessing`), actualizar el store global (Zustand) y notificar
* al usuario del resultado de las operaciones.
*
* @param dispatch La función dispatch del hook `useDialogManager` para abrir diálogos.
* @returns Un objeto con el estado `isProcessing` y todas las funciones para
* iniciar flujos de acción (tanto las que abren diálogos como las que ejecutan la lógica).
*/
export function usePlaylistActions(
  dispatch: React.Dispatch<{ type: 'OPEN'; payload: OpenActionPayload } | { type: 'CLOSE' }>,
  startPolling: (id: string, config: { isInitiallyEmpty: boolean }) => void
) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Usamos un selector con `useShallow` para optimizar re-renderizados.
  const {
    addPlaylistToCache,
    updatePlaylistInCache,
    removeMultipleFromCache,
    clearSelection,
    playlistCache,
    addMoreToCache,
    nextUrl, 
    setNextUrl, 
  } = usePlaylistStore(
    useShallow((state) => ({
      addPlaylistToCache: state.addPlaylistToCache,
      updatePlaylistInCache: state.updatePlaylistInCache,
      removeMultipleFromCache: state.removeMultipleFromCache,
      clearSelection: state.clearSelection,
      playlistCache: state.playlistCache,
      addMoreToCache: state.addMoreToCache,
      nextUrl: state.nextUrl,
      setNextUrl: state.setNextUrl,
    })),
  );
  
  /**
  * Ejecuta una única Server Action, gestionando el estado de carga y las notificaciones.
  * @template T - El tipo de dato que la acción devuelve en caso de éxito.
  * @template P - El tipo de los argumentos que la acción recibe.
  * @param actionFn - La Server Action a ejecutar.
  * @param params - Los argumentos para la Server Action.
  * @param options - Configuración para los mensajes de toast y el callback de éxito.
  * @param options.loading - Mensaje para la notificación de carga.
  * @param options.success - Mensaje para la notificación de éxito.
  * @param options.error - Mensaje para la notificación de error.
  * @param options.onSuccess - Callback opcional que se ejecuta con el resultado si la acción es exitosa.
  */
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
  
  /**
  * Ejecuta una Server Action en paralelo para un lote de elementos, gestionando el estado y las notificaciones.
  * @template T - El tipo de dato que la acción devuelve en caso de éxito.
  * @template P - El tipo de cada elemento en el lote.
  * @param items - El array de elementos a procesar.
  * @param actionFn - La Server Action a ejecutar para cada elemento.
  * @param options - Configuración para los mensajes y el callback de éxito.
  * @param options.onSuccess - Callback que se ejecuta con los resultados de todas las promesas.
  */
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
  
  // Lógica de negocio (Handlers)
  
  /**
  * Maneja la creación de una nueva playlist vacía después de que el usuario introduce un nombre.
  * @param playlistName - El nombre para la nueva playlist.
  */
  const handleConfirmCreateEmpty = async (playlistName: string) => {
    dispatch({ type: 'CLOSE' });
    await executeAction(createEmptyMegalistAction, [playlistName], {
      loading: `Creando la lista "${playlistName}"...`,
      success: '¡Lista vacía creada con éxito!',
      error: 'No se pudo crear la lista.',
      onSuccess: result => {
        if (result.success) {
          addPlaylistToCache(result.data);
          // Iniciamos polling (es vacía, así que isInitiallyEmpty: true)
          startPolling(result.data.id, { isInitiallyEmpty: true });
        }
      },
    });
  };
  
  /**
  * Maneja la actualización de los detalles (nombre, descripción) de una playlist.
  * @param playlistId - El ID de la playlist a editar.
  * @param newName - El nuevo nombre.
  * @param newDescription - La nueva descripción.
  */
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
  
  /**
  * Maneja el cambio de estado de "congelación" de una Megalista.
  * @param playlistId - El ID de la Megalista.
  * @param shouldFreeze - `true` para congelar, `false` para descongelar.
  */
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
  
  /**
  * Maneja la eliminación (dejar de seguir) de una o varias playlists.
  * @param playlists - Array de playlists a eliminar.
  */
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
  
  /**
  * Maneja el reordenado aleatorio de las canciones de una o varias playlists.
  * @param playlists - Array de playlists a reordenar.
  */
  const handleConfirmShuffle = async (playlists: ActionPlaylist[]) => {
    dispatch({ type: 'CLOSE' });
    const idsToShuffle = playlists.map(p => p.id);
    await executeAction(shufflePlaylistsAction, [idsToShuffle], {
      loading: `Reordenando ${idsToShuffle.length} playlist(s)...`,
      success: `${idsToShuffle.length} playlist(s) reordenadas.`,
      error: 'No se pudieron reordenar.',
    });
  };
  
  /**
  * Ejecuta la sincronización para un lote de Megalistas.
  * @param playlists - Las Megalistas a sincronizar.
  * @param shouldShuffle - Si las canciones deben reordenarse después de sincronizar.
  */
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
          results.forEach((result) => {
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
  
  /**
  * Ejecuta conversión de una lista no marcada como Megalista en una que sí lo es.
  * @param playlist - La lista que convertir.
  */
  // Ajustamos la llamada a la acción y la actualización del estado
  const handleConfirmConvertToMegalist = async (playlist: SpotifyPlaylist) => {
    dispatch({ type: 'CLOSE' });
    await executeAction(convertToMegalistAction, [playlist], {
      loading: `Convirtiendo "${playlist.name}"...`,
      success: '¡Lista convertida a Megalista con éxito!',
      error: 'No se pudo convertir la lista.',
      onSuccess: (result) => {
        if (result.success) {
          updatePlaylistInCache(result.data.id, {
            isMegalist: true, // Marcarla como gestionada
            playlistType: 'MEGALIST',
            isSyncable: true,
            isFrozen: false,
          });
        }
      },
    });
  };
  
  // Flujo de Creación/Actualización de Megalistas
  
  /**
  * Maneja la adición de tracks a una Megalista existente.
  * @internal
  */
  const _handleUpdateMode = async (props: {
    targetId: string;
    sourceIds: string[];
    shouldShuffle: boolean;
    toastId: string | number;
  }) => {
    const { targetId, sourceIds, shouldShuffle, toastId } = props;
    const targetPlaylist = playlistCache.find(p => p.id === targetId);
    const wasEmptyAndFrozen =
    targetPlaylist?.isFrozen && targetPlaylist.tracks.total === 0;
    
    const result = await addTracksToMegalistAction(
      targetId,
      sourceIds,
      shouldShuffle,
    );
    
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
        toast.success(
          `¡Megalista actualizada! Se añadieron ${addedCount} canciones nuevas.`,
          { id: toastId },
        );
      } else {
        toast.info('La Megalista ya contenía todas las canciones.', {
          id: toastId,
        });
      }
    } else {
      toast.error(result.error, { id: toastId });
    }
  };
  
  /**
  * Añade el lote inicial de canciones a una Megalista nueva o reemplazada.
  * @internal
  */
  const _populateNewOrReplacedMegalist = async (
    playlistId: string,
    trackUris: string[],
    playlistName: string,
    toastId: string | number,
  ) => {
    toast.loading(`Añadiendo ${trackUris.length} canciones a "${playlistName}"...`, {
      id: toastId,
    });
    await addTracksBatch(playlistId, trackUris);
    updatePlaylistInCache(playlistId, { trackCount: trackUris.length });
  };
  
  /**
  * Maneja el flujo de creación de una nueva Megalista desde cero.
  * @internal
  */
  const _handleCreationMode = async (props: {
    playlistName: string;
    sourceIds: string[];
    tracksToMix: string[];
    toastId: string | number;
  }) => {
    const { playlistName, sourceIds, tracksToMix, toastId } = props;
    
    const { playlist, exists } = await findOrCreatePlaylist(
      playlistName,
      sourceIds,
      tracksToMix.length,
    );
    
    if (exists) {
      toast.dismiss(toastId);
      dispatch({
        type: 'OPEN',
        payload: {
          variant: 'createOverwrite',
          props: { playlistName, sourceIds, overwriteId: playlist.id },
        },
      });
      // Detenemos la ejecución porque se abrirá un nuevo diálogo
      return { success: false };
    }
    
    addPlaylistToCache(playlist);
    
    startPolling(playlist.id, { isInitiallyEmpty: false });
    await _populateNewOrReplacedMegalist(playlist.id, tracksToMix, playlistName, toastId);
    return { success: true, name: playlistName };
  };
  
  /**
  * Maneja el reemplazo completo de una Megalista existente.
  * @internal
  */
  const _handleReplaceMode = async (props: {
    targetId: string;
    playlistName: string;
    tracksToMix: string[];
    toastId: string | number;
  }) => {
    const { targetId, playlistName, tracksToMix, toastId } = props;
    await addTracksBatch(targetId, []); // Vacía la lista
    await _populateNewOrReplacedMegalist(targetId, tracksToMix, playlistName, toastId);
    updatePlaylistInCache(targetId, { playlistType: 'MEGALIST' });
    return { success: true, name: playlistName };
  };
  
  /**
  * Orquesta la creación, actualización o reemplazo de una Megalista.
  * Es el punto de entrada para flujos complejos que involucran múltiples pasos y diálogos.
  * @param props - Propiedades que definen la operación.
  * @param props.mode - 'create', 'update' o 'replace'.
  * @param props.playlistName - El nombre de la playlist.
  * @param props.sourceIds - Los IDs de las playlists fuente.
  * @param props.shouldShuffle - Si las canciones deben mezclarse.
  * @param props.targetId - (Opcional) El ID de la Megalista a actualizar/reemplazar.
  */
  const handleCreateOrUpdateMegalist = async (props: {
    sourceIds: string[];
    playlistName: string;
    shouldShuffle: boolean;
    mode: 'create' | 'update' | 'replace';
    targetId?: string;
  }) => {
    const { sourceIds, playlistName, shouldShuffle, mode, targetId } = props;
    setIsProcessing(true);
    dispatch({ type: 'CLOSE' });
    
    const toastId = toast.loading(
      mode === 'replace' ? `Reemplazando "${playlistName}"...`
      : mode === 'update' ? `Actualizando "${playlistName}"...`
      : `Creando "${playlistName}"...`,
    );
    
    try {
      if (mode === 'update' && targetId) {
        await _handleUpdateMode({ targetId, sourceIds, shouldShuffle, toastId });
      } else {
        const trackUris = await getTrackUris(sourceIds);
        if (trackUris.length === 0) {
          toast.error('No se encontraron canciones en las playlists seleccionadas.', { id: toastId });
          setIsProcessing(false);
          return;
        }
        const tracksToMix = shouldShuffle ? shuffleArray(trackUris) : trackUris;
        
        let result: { success: boolean, name?: string };
        if (mode === 'create') {
          result = await _handleCreationMode({ playlistName, sourceIds, tracksToMix, toastId });
        } else if (mode === 'replace' && targetId) {
          result = await _handleReplaceMode({ targetId, playlistName, tracksToMix, toastId });
        } else {
          // Si no es ni create ni replace (con targetId), es un error de lógica.
          throw new Error("Parámetros inválidos para la operación de Megalista.");
        }
        
        if (result.success) {
          toast.success(`¡Megalista "${result.name}" ${mode === 'replace' ? 'reemplazada' : 'creada'} con éxito!`, { id: toastId });
        }
      }
      
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
  * Maneja la creación o actualización de una playlist "Sorpresa".
  * @param props - Propiedades para la creación.
  * @param props.sourceIds - Playlists de origen para las canciones.
  * @param props.targetTrackCount - Número de canciones en la lista final.
  * @param props.playlistName - Nombre de la nueva lista.
  * @param props.overwriteId - (Opcional) ID de una lista "Sorpresa" a sobrescribir.
  */
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
        // Iniciamos polling
        startPolling(newPlaylist.id, { isInitiallyEmpty: false });
        toast.success(`Lista Sorpresa "${newPlaylist.name}" creada con éxito.`, { id: toastId });
      }
      clearSelection();
    } else {
      const errorMessage = result.error;
      // Si la playlist ya existe, la app ofrece sobrescribirla
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
  
  /**
  * Maneja la adición de un conjunto de URIs de tracks a una Megalista específica.
  * @param targetPlaylistId - La Megalista de destino.
  * @param trackUris - Las URIs de las canciones a añadir.
  */
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
  
  // Funciones para abrir diálogos (API pública del hook)
  
  /**
  * Abre el diálogo para nombrar y crear una nueva Megalista vacía.
  */
  const openCreateEmptyMegalistDialog = () => dispatch({ type: 'OPEN', payload: { variant: 'createEmpty' } });
  
  /**
  * Abre el diálogo para editar los detalles de una playlist.
  * @param playlist - El objeto completo de la playlist a editar.
  */
  const openEditDialog = (playlist: SpotifyPlaylist) => dispatch({ type: 'OPEN', payload: { variant: 'edit', props: { playlist } } });
  
  /**
  * Abre el diálogo de confirmación para eliminar una o varias playlists.
  * @param playlists - Array de playlists a eliminar.
  */
  const openDeleteDialog = (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    dispatch({ type: 'OPEN', payload: { variant: 'delete', props: { playlists } } });
  };
  
  /**
  * Abre el diálogo de confirmación para reordenar las canciones de una o varias playlists.
  * @param playlists - Array de playlists a reordenar.
  */
  const openShuffleDialog = (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    dispatch({ type: 'OPEN', payload: { variant: 'shuffle', props: { playlists } } });
  };
  
  /**
  * Abre el diálogo para confirmar la congelación o descongelación de una Megalista.
  * @param playlist - La Megalista sobre la que se actuará.
  */
  const openFreezeDialog = (playlist: SpotifyPlaylist) => {
    if (!playlist.isMegalist || playlist.playlistType !== 'MEGALIST') {
      toast.error('Esta acción solo está disponible para Megalistas.');
      return;
    }
    dispatch({ type: 'OPEN', payload: { variant: 'freezeConfirmation', props: { playlist } } });
  };
  
  /**
  * Inicia el flujo de sincronización: calcula los cambios y, si hay, abre el diálogo de previsualización.
  * @param playlists - Array de Megalistas a sincronizar.
  */
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
  
  /**
  * Abre el diálogo para nombrar una nueva Megalista a partir de una selección.
  * @param sourceIds - IDs de las playlists fuente.
  */
  const openCreateMegalistDialog = (sourceIds: string[]) => {
    if (sourceIds.length < 2) {
      toast.info('Selecciona al menos 2 playlists para crear una Megalista.');
      return;
    }
    dispatch({ type: 'OPEN', payload: { variant: 'createName', props: { sourceIds } } });
  };
  
  /**
  * Abre el diálogo para seleccionar una Megalista existente a la cual añadir otras playlists.
  * @param sourceIds - IDs de las playlists que se añadirán como fuente.
  */
  const openAddToMegalistDialog = (sourceIds: string[]) => {
    if (sourceIds.length === 0) return;
    const existingMegalists = playlistCache.filter(p => p.playlistType === 'MEGALIST');
    if (existingMegalists.length === 0) {
      toast.info('No tienes ninguna Megalista creada por la app a la que añadir canciones.');
      return;
    }
    dispatch({ type: 'OPEN', payload: { variant: 'addToSelect', props: { sourceIds } } });
  };
  
  /**
  * Inicia el flujo para crear una "Lista Sorpresa".
  * Si no se proporcionan IDs, abre el diálogo global.
  * Si se proporcionan, calcula las pistas únicas y abre el diálogo específico.
  * @param sourceIds - (Opcional) IDs de las playlists fuente.
  */
  const openSurpriseMixDialog = async (sourceIds?: string[]) => {
    // Caso 1: Flujo "dirigido" (no cambia)
    if (sourceIds && sourceIds.length > 0) {
      setIsProcessing(true);
      const toastId = toast.loading('Preparando el generador de sorpresas...');
      try {
        const count = await getUniqueTrackCountFromPlaylistsAction(sourceIds);
        dispatch({
          type: 'OPEN',
          payload: {
            variant: 'surpriseTargeted',
            props: { sourceIds, uniqueTrackCount: count },
          },
        });
        toast.dismiss(toastId);
      } catch (err) {
        console.error('Error obteniendo la información de las playlists', err);
        toast.error('No se pudo obtener la información de las playlists.', { id: toastId });
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    // Caso 2: Flujo "Global" (corregido para no usar getState)
    setIsProcessing(true);
    const toastId = toast.loading('Calculando total de playlists...');
    
    try {
      // Iniciar el bucle con el `nextUrl` del estado suscrito
      let currentNextUrl = nextUrl;
      // Hacemos una copia local de la caché para llevar la cuenta
      const accumulatedPlaylists = [...playlistCache];
      
      while (currentNextUrl) {
        const result = await fetchMorePlaylists(currentNextUrl);
        
        // Actualizamos el store central con las acciones del hook
        addMoreToCache(result.items);
        setNextUrl(result.next);
        
        // Actualizamos nuestras variables locales para el bucle y el conteo final
        accumulatedPlaylists.push(...result.items);
        currentNextUrl = result.next;
      }
      
      toast.dismiss(toastId);
      
      const finalPlaylistCount = accumulatedPlaylists.length;
      
      dispatch({
        type: 'OPEN',
        payload: {
          variant: 'surpriseGlobal',
          props: { totalPlaylists: finalPlaylistCount },
        },
      });
      
    } catch (error) {
      const message =
      error instanceof Error
      ? error.message
      : 'No se pudo cargar la lista completa de playlists.';
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
  * Abre el diálogo para seleccionar una Megalista a la que añadir un conjunto de canciones.
  * @param trackUris - URIs de las canciones a añadir.
  */
  const openAddTracksDialog = (trackUris: string[]) => {
    const existingMegalists = playlistCache.filter(p => p.playlistType === 'MEGALIST');
    if (existingMegalists.length === 0) {
      toast.info('No tienes ninguna Megalista creada para añadir canciones.');
      return;
    }
    dispatch({ type: 'OPEN', payload: { variant: 'addTracksToMegalist', props: { trackUris } } });
  };
  
  /**
  * Abre el diálogo para convertir en una Megalista una lista que no lo es.
  * @param playlist - El objeto de la Playlist para convertir.
  */
  const openConvertToMegalistDialog = (playlist: SpotifyPlaylist) => {
    dispatch({
      type: 'OPEN',
      payload: { variant: 'convertToMegalist', props: { playlist } },
    });
  };
  
  return {
    isProcessing,
    // Handlers de Lógica (internos al patrón, llamados por ActionProvider)
    handleConfirmCreateEmpty,
    handleConfirmEdit,
    handleConfirmDelete,
    handleConfirmShuffle,
    handleConfirmFreeze,
    handleExecuteSync,
    handleCreateOrUpdateMegalist,
    handleCreateSurpriseMix,
    handleConfirmAddTracks,
    handleConfirmConvertToMegalist,
    // Openers de Diálogos (API pública para los componentes de UI)
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
    openConvertToMegalistDialog,
  };
}