// /lib/actions.ts
'use server'; // ¡Muy importante! Esto marca todas las funciones exportadas como Server Actions.

import { Resend } from 'resend';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { SpotifyPlaylist } from '@/types/spotify';
import { 
  getAllPlaylistTracks, 
  findUserPlaylistByName, 
  createNewPlaylist, 
  clearPlaylistTracks,
  addTracksToPlaylist, 
  replacePlaylistTracks,
  getPlaylistDetails, 
  updatePlaylistDetails, 
  removeTracksFromPlaylist
} from './spotify';
import { shuffleArray } from './utils';
import { ContactEmailTemplate } from '@/components/emails/ContactEmailTemplate';

interface PlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
}

/**
* Obtiene y prepara las URIs de las canciones.
*/
export async function getTrackUris(playlistIds: string[]) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    const trackPromises = playlistIds.map((id) =>
      getAllPlaylistTracks(accessToken, id).then(tracks => tracks.map(t => t.uri)));
    const tracksPerPlaylist = await Promise.all(trackPromises);
    
    const uniqueTrackUris = [...new Set(tracksPerPlaylist.flat())];
    // Se elimina la llamada a shuffleArray. La función ahora es neutral.
    return uniqueTrackUris; 
  } catch (error) {
    console.error('[ACTION_ERROR:getTrackUris] Fallo al obtener las URIs.', error);
    throw error;
  }
}

/**
* Encuentra o crea la playlist de destino.
* Puede forzar la creación sin metadatos de sincronización si la descripción es muy larga.
* @param name - El nombre de la playlist.
* @param sourcePlaylistIds - Los IDs de las playlists de origen.
* @param forceNoSync - Si es true, la playlist se creará sin los metadatos de las fuentes.
* @returns Un objeto con el ID de la playlist y un booleano 'exists'.
*/
export async function findOrCreatePlaylist(
  name: string,
  sourcePlaylistIds: string[],
  initialTrackCount: number 
): Promise<{ playlist: SpotifyPlaylist; exists: boolean }> {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) {
      throw new Error('No autenticado, token o ID de usuario no disponible.');
    }
    const { accessToken, user } = session;
    
    const existingPlaylist = await findUserPlaylistByName(accessToken, name);
    
    if (existingPlaylist) {
      return { playlist: existingPlaylist, exists: true };
    } else {
      // Si se fuerza 'no sync', pasamos un array vacío a la función de creación.
      const idsToStore = sourcePlaylistIds;
      const newPlaylist = await createNewPlaylist(accessToken, user.id, name);
      
      // Persistencia en base de datos
      try {
        await db.megalist.create({
          data: {
            id: newPlaylist.id, // El ID de la playlist de Spotify va en el campo `id`
            spotifyUserId: user.id,
            sourcePlaylistIds: idsToStore,
            trackCount: initialTrackCount, // Una megalista nueva siempre empieza con 0 canciones
          },
        });
        console.log(`[DB] Creado el registro para la nueva Megalista ${newPlaylist.id}`);
      } catch (dbError) {
        console.error(`[DB_ERROR] Fallo al crear el registro para la Megalista ${newPlaylist.id}`, dbError);
      }
      
      // No devolvemos `newPlaylistFromSpotify` directamente. Creamos nuestro propio objeto "enriquecido".
      const enrichedPlaylist: SpotifyPlaylist = {
        ...newPlaylist, // Usamos la base del objeto de Spotify (id, name, owner, etc.)
        isMegalist: true,          // La marcamos como Megalista
        isSyncable: true,          // Por definición, una nueva megalista es sincronizable
        tracks: {
          ...newPlaylist.tracks,
          total: initialTrackCount, // Sobrescribimos el `total: 0` con nuestro recuento real
        },
      };
      
      if (!enrichedPlaylist.owner) {
        enrichedPlaylist.owner = { display_name: session.user.name || 'Tú' };
      }
      
      // Devolvemos el objeto enriquecido
      return { playlist: enrichedPlaylist, exists: false };
    }
  } catch (error) {
    console.error('[ACTION_ERROR:findOrCreatePlaylist] Fallo al buscar o crear la playlist.', error);
    throw error;
  }
}


/**
* Añade un lote de canciones a una playlist.
*/
export async function addTracksBatch(
  playlistId: string,
  trackUrisBatch: string[]
) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    // Esta función ahora puede lanzar errores de rate-limiting, que serán capturados aquí
    await addTracksToPlaylist(accessToken, playlistId, trackUrisBatch);
  } catch (error) {
    console.error('[ACTION_ERROR:addTracksBatch] Fallo al añadir un lote de canciones.', error);
    throw error;
  }
}

export async function addTracksToMegalistAction(
  targetPlaylistId: string,
  newSourceIds: string[], 
  shouldShuffle: boolean
): Promise<{ finalCount: number; addedCount: number; }> {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    // Obtiene el estado actual de la megalista y las nuevas canciones
    const megalist = await db.megalist.findUnique({ where: { id: targetPlaylistId } });
    const allSourceIds = Array.from(new Set([...(megalist?.sourcePlaylistIds || []), ...newSourceIds]));
    
    const [existingTracks, newTracksFromSources] = await Promise.all([
      getAllPlaylistTracks(accessToken, targetPlaylistId),
      getTrackUris(newSourceIds)
    ]);
    
    const existingTracksSet = new Set(existingTracks.map(t => t.uri));
    
    // Calcula solo las canciones que realmente son nuevas
    const tracksToAdd = newTracksFromSources.filter(uri => !existingTracksSet.has(uri));
    
    // Si hay canciones nuevas, las añade al final de la playlist
    if (tracksToAdd.length > 0) {
      await addTracksToPlaylist(accessToken, targetPlaylistId, tracksToAdd);
    }
    
    const finalCount = existingTracks.length + tracksToAdd.length;
    
    // Si se añadieron canciones y el usuario eligió reordenar, se ejecuta la acción de reordenado.
    if (tracksToAdd.length > 0 && shouldShuffle) {
      console.log(`[ACTION:addTracksToMegalistAction] Reordenando la playlist ${targetPlaylistId} tras la actualización.`);
      await shufflePlaylistsAction([targetPlaylistId]);
    }
    
    // Actualiza el registro en la base de datos
    await db.megalist.upsert({
      where: { id: targetPlaylistId },
      update: { sourcePlaylistIds: allSourceIds, trackCount: finalCount },
      create: {
        id: targetPlaylistId,
        spotifyUserId: session.user.id,
        sourcePlaylistIds: allSourceIds,
        trackCount: finalCount,
      },
    });
    
    return { finalCount, addedCount: tracksToAdd.length };
  } catch (error) {
    console.error(`[ACTION_ERROR:addTracksToMegalistAction] Fallo al añadir canciones a ${targetPlaylistId}.`, error);
    throw error;
  }
}

/**
* Acción para vaciar una playlist.
*/
export async function clearPlaylist(playlistId: string) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    await clearPlaylistTracks(session.accessToken, playlistId);
  } catch (error) {
    console.error(`[ACTION_ERROR:clearPlaylist] Fallo al vaciar la playlist ${playlistId}.`, error);
    throw error;
  }
}

export async function fetchMorePlaylists(
  url: string
): Promise<PlaylistsApiResponse> {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('Not authenticated');
    }
    
    // --- Modificamos la URL para asegurarnos de que incluye los campos ---
    // Esto es crucial porque la URL 'next' de Spotify no hereda los parámetros 'fields'.
    const urlObject = new URL(url);
    const fields = "items(id,name,description,images,owner,tracks(total)),next";
    
    // Usamos .set() para añadir o sobreescribir el parámetro de campos.
    urlObject.searchParams.set('fields', fields);
    
    const response = await fetch(urlObject.toString(), {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    
    if (!response.ok) {
      // Este error ya era explícito, lo mantenemos
      const errorData = await response.json();
      console.error('Failed to fetch more playlists:', errorData);
      throw new Error(`Failed to fetch more playlists. Status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      items: data.items,
      next: data.next,
    };
  } catch (error) {
    console.error('[ACTION_ERROR:fetchMorePlaylists] Fallo al cargar más playlists.', error);
    throw error;
  }
}

/**
* Deja de seguir (elimina de la librería del usuario) una playlist.
* @param playlistId - El ID de la playlist a dejar de seguir.
*/
export async function unfollowPlaylist(playlistId: string): Promise<void> {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[ACTION_ERROR:unfollowPlaylist] Fallo al dejar de seguir la playlist ${playlistId}.`, errorData);
      throw new Error(`Spotify respondió con ${response.status}: ${errorData.error?.message || 'Error desconocido'}`);
    }
    
    console.log(`[ACTION] Playlist ${playlistId} dejada de seguir con éxito.`);
    
    // Persistir en base de datos
    try {
      // Usamos deleteMany porque no lanza un error si el registro no existe,
      // lo cual es perfecto si el usuario elimina una playlist que no era una Megalista.
      await db.megalist.deleteMany({
        where: { id: playlistId },
      });
      console.log(`[DB] Eliminado el registro para la (posible) Megalista ${playlistId}`);
    } catch (dbError) {
      console.error(`[DB_ERROR] Fallo al eliminar el registro para la Megalista ${playlistId}`, dbError);
    }
    
  } catch (error) {
    console.error(`[ACTION_ERROR:unfollowPlaylist] Error en la acción de dejar de seguir la playlist ${playlistId}.`, error);
    throw error;
  }
}

/**
* [HELPER INTERNO] Calcula los cambios que ocurrirían durante una sincronización
* sin ejecutar ninguna acción de escritura.
* @returns Un objeto con los datos calculados para la previsualización y ejecución.
*/
async function _calculateSyncChanges(playlistId: string, accessToken: string) {
  const megalist = await db.megalist.findUnique({
    where: { id: playlistId },
  });
  if (!megalist) {
    throw new Error("Esta Megalista no es sincronizable o no fue creada por la aplicación.");
  }
  
  const initialTracks = await getAllPlaylistTracks(accessToken, playlistId);
  const initialTrackUris = initialTracks.map(t => t.uri);
  const sourceIds = megalist.sourcePlaylistIds;
  
  const trackUrisPromises = sourceIds.map(id =>
    getAllPlaylistTracks(accessToken, id)
    .then(tracks => tracks.map(t => t.uri))
    .catch(error => {
      console.warn(`[SYNC_WARN] No se pudo obtener la playlist fuente ${id}. Será omitida.`, error);
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
  
  // Se elimina el reordenado para preservar el orden original de las canciones.
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
* Previsualiza los cambios de una sincronización de Megalista.
* No modifica ni la playlist en Spotify ni la base de datos.
* @param playlistId El ID de la Megalista a previsualizar.
* @returns Un informe con las canciones a añadir, eliminar y el conteo final.
*/
export async function previewMegalistSync(playlistId: string) {
  console.log(`[ACTION:previewMegalistSync] Iniciando previsualización para ${playlistId}`);
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
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
* Previsualiza los cambios para un lote de Megalistas.
* @param playlistIds Los IDs de las Megalistas a previsualizar.
* @returns Un informe agregado con el total de canciones a añadir y eliminar.
*/
export async function previewBatchSync(playlistIds: string[]) {
  console.log(`[ACTION:previewBatchSync] Iniciando previsualización para un lote de ${playlistIds.length} playlists.`);
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
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
* Ejecuta la sincronización de una Megalista.
* Reemplaza el contenido en Spotify y actualiza la base de datos.
* @param playlistId El ID de la Megalista a sincronizar.
* @returns Un informe del resultado de la sincronización.
*/
export async function executeMegalistSync(playlistId: string, shouldShuffle: boolean) {
  console.log(`[ACTION:executeMegalistSync] Iniciando ejecución de sincronización para ${playlistId}`);
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    const {
      megalist,
      initialTrackUris,
      uniqueFinalTracks,
      validSourceIds,
      addedCount,
      removedCount,
    } = await _calculateSyncChanges(playlistId, accessToken);
    
    const hasChanges = addedCount > 0 || removedCount > 0;
    
    if (!hasChanges && validSourceIds.length === megalist.sourcePlaylistIds.length) {
      console.log(`[ACTION:executeMegalistSync] La playlist ${playlistId} ya estaba sincronizada.`);
      return { success: true, added: 0, removed: 0, finalCount: uniqueFinalTracks.length, message: "Ya estaba sincronizada." };
    }
    
    const initialTracksSet = new Set(initialTrackUris);
    const finalTracksSet = new Set(uniqueFinalTracks);
    const tracksToAdd = uniqueFinalTracks.filter(uri => !initialTracksSet.has(uri));
    const tracksToRemove = initialTrackUris.filter(uri => !finalTracksSet.has(uri));
    
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
      },
    });
    
    return { success: true, added: tracksToAdd.length, removed: tracksToRemove.length, finalCount: uniqueFinalTracks.length };
  } catch (error) {
    console.error(`[ACTION_ERROR:executeMegalistSync] Fallo al ejecutar la sincronización para ${playlistId}.`, error);
    throw error;
  }
}

export async function shufflePlaylistsAction(playlistIds: string[]): Promise<void> {
  console.log(`[ACTION:shufflePlaylistsAction] Iniciando reordenado para ${playlistIds.length} playlist(s).`);
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    const shufflePromises = playlistIds.map(async (playlistId) => {
      console.log(`[SHUFFLE] Obteniendo canciones para ${playlistId}...`);
      const tracks = await getAllPlaylistTracks(accessToken, playlistId);
      const trackUris = tracks.map(t => t.uri);
      
      if (trackUris.length <= 1) {
        console.log(`[SHUFFLE] La playlist ${playlistId} tiene muy pocas canciones para reordenar. Omitiendo.`);
        return;
      }
      
      console.log(`[SHUFFLE] Reordenando ${trackUris.length} canciones para ${playlistId}...`);
      const shuffledUris = shuffleArray(trackUris);
      
      console.log(`[SHUFFLE] Reemplazando canciones en ${playlistId}...`);
      await replacePlaylistTracks(accessToken, playlistId, shuffledUris);
      console.log(`[SHUFFLE] Playlist ${playlistId} reordenada con éxito.`);
    });
    
    await Promise.all(shufflePromises);
    
  } catch (error) {
    console.error(`[ACTION_ERROR:shufflePlaylistsAction] Fallo al reordenar las playlists.`, error);
    throw error;
  }
}

/**
* Actualiza los detalles de una playlist (nombre/descripción) en Spotify.
*/
export async function updatePlaylistDetailsAction(
  playlistId: string,
  newName: string,
  newDescription: string
): Promise<void> {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    
    // Reutilizamos la función helper que ya existe en lib/spotify.ts
    await updatePlaylistDetails(session.accessToken, playlistId, {
      name: newName,
      description: newDescription,
    });
    
    console.log(`[ACTION] Detalles de la playlist ${playlistId} actualizados.`);
    
  } catch (error) {
    console.error(`[ACTION_ERROR:updatePlaylistDetailsAction] Fallo al actualizar detalles de ${playlistId}.`, error);
    throw error;
  }
}

// /lib/action.ts (añadir esta nueva función)

/**
* Deja de seguir (elimina) un lote de playlists de la librería del usuario.
*/
export async function unfollowPlaylistsBatch(playlistIds: string[]): Promise<void> {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    // Ejecutamos las peticiones a la API de Spotify en paralelo
    const unfollowPromises = playlistIds.map(id =>
      fetch(`https://api.spotify.com/v1/playlists/${id}/followers`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    );
    await Promise.all(unfollowPromises);
    
    // Eliminamos todos los registros de nuestra base de datos en una sola operación
    await db.megalist.deleteMany({
      where: { id: { in: playlistIds } },
    });
    
    console.log(`[ACTION] Lote de ${playlistIds.length} playlists eliminadas.`);
    
  } catch (error) {
    console.error('[ACTION_ERROR:unfollowPlaylistsBatch] Fallo al eliminar el lote de playlists.', error);
    throw error;
  }
}

/**
* Crea una Megalista "Sorpresa" con un número específico de canciones
* seleccionadas aleatoriamente de un conjunto de playlists de origen.
*
* @param sourcePlaylistIds - Los IDs de las playlists de las que se cogerán las canciones.
* @param targetTrackCount - El número deseado de canciones en la playlist final.
* @param newPlaylistName - El nombre para la nueva playlist.
* @returns El objeto de la playlist enriquecida y recién creada.
*/
export async function createSurpriseMegalist(
  sourcePlaylistIds: string[],
  targetTrackCount: number,
  newPlaylistName: string
): Promise<SpotifyPlaylist> {
  console.log(`[ACTION:createSurpriseMegalist] Iniciando. 
    Fuentes: ${sourcePlaylistIds.length},
     Objetivo: ${targetTrackCount} canciones.`
  );
  
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    throw new Error('No autenticado, token o ID de usuario no disponible.');
  }
  const { accessToken, user } = session;
  
  try {
    // Comprar si existe una playlist con este nombre. Si ya existe,
    // lanzar un error con el id existente para confirmar sobrescritura.
    const existingPlaylist = await findUserPlaylistByName(accessToken, newPlaylistName);
    if (existingPlaylist) {
      throw new Error(`PLAYLIST_EXISTS::${existingPlaylist.id}`);
    }
    
    // Aquí, getAllPlaylistTracks devuelve { uri, name, artists }
    const tracksPerPlaylistPromises = sourcePlaylistIds.map(id =>
      getAllPlaylistTracks(accessToken, id).catch(err => {
        console.warn(`[SURPRISE_MIX] No se pudo obtener la playlist ${id}, se omitirá.`, err);
        return []; // Devolver array vacío en caso de error
      })
    );
    // Extraemos solo las URIs de los resultados
    const tracksPerPlaylistUris = (await Promise.all(tracksPerPlaylistPromises)).map(tracks => tracks.map(t => t.uri));
    
    // Algoritmo de selección de canciones
    let selectedTracksUris: string[];
    const allUniqueTracksUris = [...new Set(tracksPerPlaylistUris.flat())];
    
    if (allUniqueTracksUris.length <= targetTrackCount) {
      console.log(`[SURPRISE_MIX] Menos canciones (${allUniqueTracksUris.length}) que el objetivo. Se usarán todas.`);
      selectedTracksUris = allUniqueTracksUris;
    } else {
      const selectedTracksUrisSet = new Set<string>();
      const remainingTracksPoolUris: string[] = [];
      const quota = Math.floor(targetTrackCount / sourcePlaylistIds.length);
      
      tracksPerPlaylistUris.forEach(playlistTracksUris => {
        const shuffled = shuffleArray([...playlistTracksUris]);
        const toAdd = shuffled.slice(0, quota);
        const remaining = shuffled.slice(quota);
        toAdd.forEach(trackUri => selectedTracksUrisSet.add(trackUri));
        remainingTracksPoolUris.push(...remaining);
      });
      
      const remainingNeeded = targetTrackCount - selectedTracksUrisSet.size;
      if (remainingNeeded > 0) {
        const shuffledPool = shuffleArray(remainingTracksPoolUris);
        for (const trackUri of shuffledPool) {
          if (selectedTracksUrisSet.size >= targetTrackCount) break;
          selectedTracksUrisSet.add(trackUri);
        }
      }
      selectedTracksUris = Array.from(selectedTracksUrisSet);
    }
    
    // Asegurar el recuento final y reordenar
    const finalShuffledTracksUris = shuffleArray(selectedTracksUris).slice(0, targetTrackCount);
    
    // Crear la playlist en Spotify y añadir las canciones
    const newPlaylist = await createNewPlaylist(accessToken, user.id, newPlaylistName);
    await replacePlaylistTracks(accessToken, newPlaylist.id, finalShuffledTracksUris);
    
    // Persistir la nueva Megalista en nuestra base de datos
    await db.megalist.create({
      data: {
        id: newPlaylist.id,
        spotifyUserId: user.id,
        sourcePlaylistIds: sourcePlaylistIds,
        trackCount: finalShuffledTracksUris.length,
      },
    });
    console.log(`[DB] Creado el registro para la nueva Megalista Sorpresa ${newPlaylist.id}`);
    
    // Devolver el objeto enriquecido para la UI
    const enrichedPlaylist: SpotifyPlaylist = {
      ...newPlaylist,
      isMegalist: true,
      isSyncable: true, // Por definición, una nueva megalista es sincronizable
      tracks: {
        ...newPlaylist.tracks,
        total: finalShuffledTracksUris.length,
      },
    };
    return enrichedPlaylist;
    
  } catch (error) {
    console.error('[ACTION_ERROR:createSurpriseMegalist] Fallo al crear la Megalista Sorpresa.', error);
    throw error;
  }
}

/**
* Sobrescribe una Megalista "Sorpresa" existente con un nuevo conjunto de canciones.
*
* @param playlistId - El ID de la playlist a sobrescribir.
* @param sourcePlaylistIds - Los IDs de las nuevas playlists de origen.
* @param targetTrackCount - El número deseado de canciones.
* @returns El objeto de la playlist enriquecida y actualizada.
*/
/**
* Sobrescribe una Megalista "Sorpresa" existente con un nuevo conjunto de canciones.
*/
export async function overwriteSurpriseMegalist(
  playlistId: string,
  sourcePlaylistIds: string[],
  targetTrackCount: number
): Promise<SpotifyPlaylist> {
  console.log(`[ACTION:overwriteSurpriseMegalist] Iniciando sobrescritura para ${playlistId}.`);
  
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    throw new Error('No autenticado, token o ID de usuario no disponible.');
  }
  const { accessToken } = session;
  
  try {
    // Obtener y seleccionar las canciones
    // Aquí, getAllPlaylistTracks devuelve { uri, name, artists }
    const tracksPerPlaylistPromises = sourcePlaylistIds.map(id =>
      getAllPlaylistTracks(accessToken, id).catch(() => [])
    );
    // Extraemos solo las URIs de los resultados
    const tracksPerPlaylistUris = (await Promise.all(tracksPerPlaylistPromises)).map(tracks => tracks.map(t => t.uri));
    
    let selectedTracksUris: string[];
    const allUniqueTracksUris = [...new Set(tracksPerPlaylistUris.flat())];
    
    if (allUniqueTracksUris.length <= targetTrackCount) {
      selectedTracksUris = allUniqueTracksUris;
    } else {
      const selectedTracksUrisSet = new Set<string>();
      const remainingTracksPoolUris: string[] = [];
      const quota = Math.floor(targetTrackCount / sourcePlaylistIds.length);
      
      tracksPerPlaylistUris.forEach(playlistTracksUris => {
        const shuffled = shuffleArray([...playlistTracksUris]);
        const toAdd = shuffled.slice(0, quota);
        const remaining = shuffled.slice(quota);
        toAdd.forEach(trackUri => selectedTracksUrisSet.add(trackUri));
        remainingTracksPoolUris.push(...remaining);
      });
      
      const remainingNeeded = targetTrackCount - selectedTracksUrisSet.size;
      if (remainingNeeded > 0) {
        const shuffledPool = shuffleArray(remainingTracksPoolUris);
        for (const trackUri of shuffledPool) {
          if (selectedTracksUrisSet.size >= targetTrackCount) break;
          selectedTracksUrisSet.add(trackUri);
        }
      }
      selectedTracksUris = Array.from(selectedTracksUrisSet);
    }
    
    const finalShuffledTracksUris = shuffleArray(selectedTracksUris).slice(0, targetTrackCount);
    
    // Reemplazar el contenido de la playlist existente
    await replacePlaylistTracks(accessToken, playlistId, finalShuffledTracksUris);
    
    // Actualizar el registro en nuestra base de datos
    await db.megalist.update({
      where: { id: playlistId },
      data: {
        sourcePlaylistIds: sourcePlaylistIds,
        trackCount: finalShuffledTracksUris.length,
        updatedAt: new Date(),
      },
    });
    console.log(`[DB] Actualizado el registro para la Megalista Sorpresa ${playlistId}`);
    
    // Obtener los detalles actualizados de la playlist de Spotify
    const updatedPlaylistFromSpotify = await getPlaylistDetails(accessToken, playlistId);
    
    // Devolver el objeto enriquecido
    return {
      ...updatedPlaylistFromSpotify,
      isMegalist: true,
      isSyncable: true,
      tracks: {
        ...updatedPlaylistFromSpotify.tracks,
        total: finalShuffledTracksUris.length,
      },
    };
    
  } catch (error) {
    console.error(`[ACTION_ERROR:overwriteSurpriseMegalist] Fallo al sobrescribir ${playlistId}.`, error);
    throw error;
  }
}

/**
* Server Action para obtener los nombres de las canciones y los artistas de una playlist.
* Utiliza la optimización donde getAllPlaylistTracks ya trae los detalles necesarios.
* @param playlistId El ID de la playlist de Spotify.
* @returns Un array de objetos con el nombre y los artistas de cada canción.
*/
export async function getPlaylistTracksDetailsAction(playlistId: string): Promise<{ name: string; artists: string; }[]> {
  console.log(`[ACTION:getPlaylistTracksDetailsAction] Iniciando obtención de detalles para la playlist ${playlistId}`);
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    // Paso único: Obtener todas las canciones con sus detalles directamente
    // getAllPlaylistTracks ahora devuelve objetos como { uri: string; name: string; artists: string; }[]
    const detailedTracksWithUri = await getAllPlaylistTracks(accessToken, playlistId);
    console.log(`[ACTION:getPlaylistTracksDetailsAction] Obtenidos detalles para ${detailedTracksWithUri.length} canciones.`);
    
    // Mapear para devolver solo 'name' y 'artists', como requiere el componente TrackDetailView
    return detailedTracksWithUri.map(track => ({ name: track.name, artists: track.artists }));
  } catch (error) {
    console.error(`[ACTION_ERROR:getPlaylistTracksDetailsAction] Fallo al obtener detalles de las canciones para la playlist ${playlistId}.`, error);
    throw error;
  }
}

// Enviar correo electrónico de contacto
export async function sendContactEmailAction(formData: {
  name: string;
  email: string;
  subject:string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const { name, email, subject, message } = formData;
  
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_EMAIL_TO) {
    console.error("Las variables de entorno de Resend no están configuradas.");
    return { success: false, error: "El servicio de correo no está configurado." };
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    await resend.emails.send({
      from: 'Spotify Megamixer <onboarding@resend.dev>',
      to: process.env.CONTACT_EMAIL_TO,
      replyTo: email,
      subject: `Nuevo Mensaje: ${subject}`,
      react: ContactEmailTemplate({ name, email, subject, message }) as React.ReactElement,
    });
    return { success: true };
  } catch (error) {
    console.error("[ACTION_ERROR:sendContactEmail]", error);
    return { success: false, error: "No se pudo enviar el mensaje." };
  }
}