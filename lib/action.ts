// /lib/actions.ts
'use server'; // ¡Muy importante! Esto marca todas las funciones exportadas como Server Actions.

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
  updatePlaylistDetails
} from './spotify';
import { shuffleArray } from './utils';

interface PlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
}

/**
* Obtiene y prepara las URIs de las canciones.
*/
export async function getTrackUris(playlistIds: string[]) {
  // Bloque try...catch para logging detallado
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    const trackPromises = playlistIds.map((id) =>
      getAllPlaylistTracks(accessToken, id)
  );
  const tracksPerPlaylist = await Promise.all(trackPromises);
  const uniqueTrackUris = [...new Set(tracksPerPlaylist.flat())];
  
  return shuffleArray(uniqueTrackUris);
} catch (error) {
  console.error('[ACTION_ERROR:getTrackUris] Fallo al obtener las URIs.', error);
  // Relanzamos el error para que el cliente lo reciba
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

/**
* Acción para actualizar una playlist con nuevas canciones, metadatos y reordenarla.
* Ahora actualiza la descripción con las nuevas fuentes y devuelve si sigue siendo sincronizable.
*/
export async function updateAndReorderPlaylist(
  targetPlaylistId: string,
  newSourceIds: string[]
): Promise<{ finalCount: number; }> {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    const megalist = await db.megalist.findUnique({ where: { id: targetPlaylistId } });
    const existingSourceIds = megalist ? megalist.sourcePlaylistIds : [];
    const allSourceIds = Array.from(new Set([...existingSourceIds, ...newSourceIds]));
    
    // Obtener todas las canciones (existentes y nuevas)
    const [existingTracks, newTracks] = await Promise.all([
      getAllPlaylistTracks(accessToken, targetPlaylistId),
      getTrackUris(newSourceIds)
    ]);
    
    // Combinar, eliminar duplicados y barajar
    const combinedTracks = [...new Set([...existingTracks, ...newTracks])];
    const shuffledTracks = shuffleArray(combinedTracks);
    
    // Reemplazar el contenido de la playlist con el nuevo conjunto
    await replacePlaylistTracks(accessToken, targetPlaylistId, shuffledTracks);
    
    // Persistir en base de datos
    try {
      await db.megalist.upsert({
        where: { id: targetPlaylistId },
        update: {
          sourcePlaylistIds: allSourceIds,
          trackCount: shuffledTracks.length,
        },
        create: {
          id: targetPlaylistId,
          spotifyUserId: session.user.id,
          sourcePlaylistIds: allSourceIds,
          trackCount: shuffledTracks.length,
        },
      });
      console.log(`[DB] Actualizado el registro para la Megalista ${targetPlaylistId}`);
    } catch (dbError) {
      console.error(`[DB_ERROR] Fallo al actualizar el registro para la Megalista ${targetPlaylistId}`, dbError);
    }
    
    // Devolver el resultado completo
    return { finalCount: shuffledTracks.length };
    
  } catch (error) {
    console.error(`[ACTION_ERROR:updateAndReorderPlaylist] Fallo al actualizar la playlist ${targetPlaylistId}.`, error);
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
* Sincroniza una Megalista con sus playlists de origen.
* Es "autocurativa" y devuelve un informe detallado de los cambios.
* @param playlistId - El ID de la Megalista a sincronizar.
*/
export async function syncMegalist(playlistId: string) {
  console.log(`[ACTION:syncMegalist] Iniciando sincronización para ${playlistId}`);
  
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    
    // Obtener estado inicial de la megalista y sus fuentes
    const megalist = await db.megalist.findUnique({ where: { id: playlistId } });
    if (!megalist) {
      throw new Error("Esta Megalista no es sincronizable.");
    }
    
    // Si no está en la base de datos, no es sincronizable
    if (!megalist) {
      console.warn(`[ACTION:syncMegalist] La playlist ${playlistId} no se encontró en la base de datos.`);
      throw new Error("Esta Megalista no es sincronizable o no fue creada por la aplicación.");
    }
    
    const initialTrackUris = await getAllPlaylistTracks(accessToken, playlistId);
    const sourceIds = megalist.sourcePlaylistIds;
    
    // Lógica de autocuración
    // Trata de manejar el caso de que el usuario borre una playlist
    // que ya forma parte de una megalista. En este caso, ignora las que
    // ya no existe y las limpia de la base de datos
    
    const trackUrisPromises = sourceIds.map(id => 
      getAllPlaylistTracks(accessToken, id)
      .catch(error => {
        console.warn(`[SYNC_WARN] No se pudo obtener la playlist fuente ${id}.`, error);
        return { id, error: true };
      })
    );
    
    const results = await Promise.all(trackUrisPromises);
    
    const validSourceIds: string[] = [];
    const finalTrackUris: string[] = [];
    
    results.forEach((result, index) => {
      if (typeof result === 'object' && 'error' in result) {
        // Es una fuente inválida, no la incluimos
      } else {
        // Es un array de URIs válido
        validSourceIds.push(sourceIds[index]);
        finalTrackUris.push(...result);
      }
    });
    
    // Unificamos, eliminamos duplicados y barajamos
    const uniqueFinalTracks = shuffleArray([...new Set(finalTrackUris)]);
    
    // Calcular diferencias entre el estado inicial y el final
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
    
    // Optimizar. Si no hay cambios, salimos 
    if (addedCount === 0 && removedCount === 0 && validSourceIds.length === sourceIds.length) {
      console.log(`[ACTION:syncMegalist] La playlist ${playlistId} ya estaba sincronizada.`);
      return { success: true, added: 0, removed: 0, finalCount: initialTrackUris.length, message: "Ya estaba sincronizada." };
    }
    
    console.log(`[ACTION:syncMegalist] Actualizando ${playlistId}. 
      Fuentes válidas: ${validSourceIds.length}/${sourceIds.length}. 
      Canciones finales: ${uniqueFinalTracks.length}`
    );
    
    // Actualizamos la playlist en Spotify
    console.log(`[ACTION:syncMegalist] Actualizando ${playlistId}. Añadiendo: ${addedCount}, Eliminando: ${removedCount}`);
    await replacePlaylistTracks(accessToken, playlistId, uniqueFinalTracks);
    
    // Actualizamos nuestra base de datos para eliminar las referencias huérfanas
    await db.megalist.update({
      where: { id: playlistId },
      data: {
        sourcePlaylistIds: validSourceIds, // Actualizamos con las fuentes válidas
        trackCount: uniqueFinalTracks.length,
      },
    });
    
    // Devolvemos el informe completo
    return { 
      success: true, 
      added: addedCount, 
      removed: removedCount, 
      finalCount: uniqueFinalTracks.length 
    };
    
  } catch (error) {
    console.error(`[ACTION_ERROR:syncMegalist] Fallo al sincronizar la playlist ${playlistId}.`, error);
    // Relanzamos el error para que el cliente lo pueda capturar y mostrar un toast.
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