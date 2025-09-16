// lib/actions/sync.actions.ts

'use server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { db } from '../db';
import { ActionResult } from '@/types/spotify';
import { getAllPlaylistTracks, removeTracksFromPlaylist, addTracksToPlaylist } from '../spotify';
import { shufflePlaylistsAction } from './playlist.actions';

/**
* [HELPER INTERNO] Calcula los cambios que ocurrirían durante una sincronización
* sin ejecutar ninguna acción de escritura. Es el núcleo de la lógica de previsualización.
* @internal
* @param playlistId - El ID de la Megalista a analizar.
* @param accessToken - El token de acceso de Spotify.
* @returns Un objeto con los datos calculados para la previsualización y la posterior ejecución.
* @throws Si la Megalista no se encuentra en la base de datos.
*/
async function _calculateSyncChanges(playlistId: string, accessToken: string) {
  const megalist = await db.megalist.findUnique({
    where: { id: playlistId },
  });
  if (!megalist) {
    throw new Error("Esta Megalista no es sincronizable o no fue creada por la aplicación.");
  }
  
  // 1. Obtener estado actual y estado deseado
  const initialTracks = await getAllPlaylistTracks(accessToken, playlistId);
  const initialTrackUris = initialTracks.map(t => t.uri);
  const sourceIds = megalist.sourcePlaylistIds;
  
  const trackUrisPromises = sourceIds.map(id =>
    getAllPlaylistTracks(accessToken, id)
    .then(tracks => tracks.map(t => t.uri))
    .catch(error => {
      console.warn(`[SYNC_WARN] No se pudo obtener la playlist fuente ${id}. Será omitida.`, error);
      // Marcamos la fuente como inválida para poder actualizarla en la db
      return { id, error: true };
    })
  );
  const results = await Promise.all(trackUrisPromises);
  
  const validSourceIds: string[] = [];
  const finalTrackUris: string[] = [];
  results.forEach((result, index) => {
    if (Array.isArray(result)) {
      validSourceIds.push(sourceIds[index]);
      finalTrackUris.push(...result);
    }
  });
  
  // 2. Calcular las diferencias
  const uniqueFinalTracks = [...new Set(finalTrackUris)];
  const initialTracksSet = new Set(initialTrackUris);
  const finalTracksSet = new Set(uniqueFinalTracks);
  
  let addedCount = 0;
  for (const uri of finalTracksSet) {
    if (!initialTracksSet.has(uri)) {
      addedCount++;
    }
  }
  
  let removedCount = 0;
  for (const uri of initialTracksSet) {
    if (!finalTracksSet.has(uri)) {
      removedCount++;
    }
  }
  
  return {
    megalist,
    initialTrackUris,
    uniqueFinalTracks,
    validSourceIds,
    addedCount,
    removedCount,
  };
}

/**
* Server Action para previsualizar los cambios de una sincronización para una única Megalista.
* No modifica ni la playlist en Spotify ni la base de datos.
* @param playlistId - El ID de la Megalista a previsualizar.
* @returns Un informe con las canciones a añadir, eliminar y el conteo final.
* @throws Si ocurre un error durante el cálculo.
*/
export async function previewMegalistSync(playlistId: string) {
  console.log(`[ACTION:previewMegalistSync] Iniciando previsualización para ${playlistId}`);
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    
    const { megalist, addedCount, removedCount, validSourceIds, uniqueFinalTracks } = await _calculateSyncChanges(playlistId, accessToken);
    
    // Si no hay cambios y no se eliminaron fuentes, informa que ya está sincronizada.
    if (addedCount === 0 && removedCount === 0 && validSourceIds.length === megalist.sourcePlaylistIds.length) {
      return { added: 0, removed: 0, finalCount: uniqueFinalTracks.length, message: "Ya estaba sincronizada." };
    }
    
    return {
      added: addedCount,
      removed: removedCount,
      finalCount: uniqueFinalTracks.length,
    };
  } catch (error) {
    console.error(`[ACTION_ERROR:previewMegalistSync] Fallo al previsualizar la sincronización para ${playlistId}.`, error);
    throw error;
  }
}

/**
* Server Action para previsualizar los cambios para un lote de Megalistas.
* Agrega los totales de canciones a añadir y eliminar para todas las listas.
* @param playlistIds - Los IDs de las Megalistas a previsualizar.
* @returns Un informe agregado con el total de canciones a añadir y eliminar.
* @throws Si ocurre un error durante el cálculo en alguna de las playlists.
*/
export async function previewBatchSync(playlistIds: string[]) {
  console.log(`[ACTION:previewBatchSync] Iniciando previsualización para un lote de ${playlistIds.length} playlists.`);
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    
    let totalAdded = 0;
    let totalRemoved = 0;
    
    // Calculamos los cambios para cada playlist en paralelo
    const previewPromises = playlistIds.map(id => _calculateSyncChanges(id, accessToken));
    const results = await Promise.all(previewPromises);
    
    results.forEach(result => {
      totalAdded += result.addedCount;
      totalRemoved += result.removedCount;
    });
    
    return { totalAdded, totalRemoved };
    
  } catch (error) {
    console.error(`[ACTION_ERROR:previewBatchSync] Fallo al previsualizar el lote.`, error);
    throw error;
  }
}

/**
* Server Action para ejecutar la sincronización de una Megalista.
* Realiza una sincronización incremental, eliminando y añadiendo solo las canciones necesarias.
* Actualiza la playlist en Spotify y el registro en la base de datos.
* @param playlistId - El ID de la Megalista a sincronizar.
* @param shouldShuffle - Si `true`, reordena aleatoriamente la playlist después de la sincronización.
* @returns Un `ActionResult` con el ID de la playlist y el recuento final de canciones.
*/
export async function executeMegalistSync(
  playlistId: string,
  shouldShuffle: boolean
): Promise<ActionResult<{ id: string; finalCount: number }>> {
  
  console.log(`[ACTION:executeMegalistSync] Iniciando ejecución de sincronización para ${playlistId}`);
  
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session) {
      return { success: false, error: 'No autenticado o token no disponible.' };
    }
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    
    const {
      megalist,
      initialTrackUris,
      uniqueFinalTracks,
      validSourceIds,
      addedCount,
      removedCount,
    } = await _calculateSyncChanges(playlistId, accessToken);
    
    const hasChanges = addedCount > 0 || removedCount > 0;
    const sourcesChanged = validSourceIds.length !== megalist.sourcePlaylistIds.length;
    
    if (!hasChanges && !sourcesChanged) {
      console.log(`[ACTION:executeMegalistSync] La playlist ${playlistId} ya estaba sincronizada.`);
      // Sigue siendo un éxito, pero no necesitamos hacer nada.
      return { success: true, data: { id: playlistId, finalCount: uniqueFinalTracks.length } };
    }
    
    const initialTracksSet = new Set(initialTrackUris);
    const tracksToAdd = uniqueFinalTracks.filter(uri => !initialTracksSet.has(uri));
    const tracksToRemove = initialTrackUris.filter(uri => !initialTracksSet.has(uri));
    
    console.log(`[ACTION:executeMegalistSync] Ejecutando actualización para ${playlistId}. A añadir: ${tracksToAdd.length}, A eliminar: ${tracksToRemove.length}`);
    
    // Se reemplaza `replacePlaylistTracks` por las dos operaciones incrementales
    if (tracksToRemove.length > 0) {
      await removeTracksFromPlaylist(accessToken, playlistId, tracksToRemove);
    }
    if (tracksToAdd.length > 0) {
      await addTracksToPlaylist(accessToken, playlistId, tracksToAdd);
    }
    
    if (hasChanges && shouldShuffle) {
      console.log(`[ACTION:executeMegalistSync] Reordenando la playlist ${playlistId} tras la sincronización.`);
      await shufflePlaylistsAction([playlistId]);
    }
    
    await db.megalist.update({
      where: { id: playlistId },
      data: {
        sourcePlaylistIds: validSourceIds,
        trackCount: uniqueFinalTracks.length,
        type: 'MEGALIST',
      },
    });
    
    return { success: true, data: { id: playlistId, finalCount: uniqueFinalTracks.length } };
  } catch (error) {
    console.error(`[ACTION_ERROR:executeMegalistSync] Fallo al ejecutar la sincronización para ${playlistId}.`, error);
    const errorMessage = error instanceof Error ? error.message : `Fallo al sincronizar ${playlistId}.`;
    return { success: false, error: errorMessage };
  }
}