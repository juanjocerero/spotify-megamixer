// lib/actions/playlist.actions.ts

'use server';
import { auth } from '@/auth';
import { db } from '../db';
import { shuffleArray } from '../utils';
import { ActionResult, SpotifyPlaylist } from '@/types/spotify';
import {
  getAllPlaylistTracks,
  findUserPlaylistByName,
  clearPlaylistTracks,
  createNewPlaylist,
  addTracksToPlaylist,
  replacePlaylistTracks,
  getPlaylistDetails,
  updatePlaylistDetails,
  getUserPlaylists
} from '../spotify';
import { getTrackUris } from './spotify.actions';
import { MegalistClientData } from '@/types/spotify';
import { Megalist } from '@prisma/client';

/**
* Encapsula la lógica de carga inicial de datos
* Su objetivo es mostrar el skeleton UI
* @returns Un ActionResult con una lista de playlists
*/
export async function getInitialDashboardDataAction(): Promise<
ActionResult<{
  playlists: SpotifyPlaylist[];
  nextUrl: string | null;
}>
> {
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const userMegalists = await db.megalist.findMany({
      where: { spotifyUserId: session.user.id },
    });
    
    const megalistDataMap = new Map<string, MegalistClientData>(
      userMegalists.map((m: Megalist) => [
        m.id,
        {
          isMegalist: true,
          isSyncable: m.type === 'MEGALIST' && !m.isFrozen,
          type: m.type,
          isFrozen: m.isFrozen,
        },
      ])
    );
    
    const initialData = await getUserPlaylists(session.accessToken);
    const initialPlaylists = initialData.items;
    
    const finalPlaylists: SpotifyPlaylist[] = initialPlaylists.map(p => {
      const megalistData = megalistDataMap.get(p.id);
      if (megalistData) {
        return {
          ...p,
          isMegalist: megalistData.isMegalist,
          isSyncable: megalistData.isSyncable,
          playlistType: megalistData.type,
          isFrozen: megalistData.isFrozen,
        };
      }
      return p;
    });
    
    return {
      success: true,
      data: { playlists: finalPlaylists, nextUrl: initialData.next },
    };
  } catch (error) {
    console.error('[ACTION_ERROR:getInitialDashboardData]', error);
    const message =
    error instanceof Error ? error.message : 'Failed to load initial data.';
    return { success: false, error: message };
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
            type: 'MEGALIST',
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
        playlistType: 'MEGALIST',
      };
      
      if (!enrichedPlaylist.owner) {
        enrichedPlaylist.owner = {
          id: user.id,
          display_name: session.user.name || 'Tú',
        };
      }
      
      // Devolvemos el objeto enriquecido
      return { playlist: enrichedPlaylist, exists: false };
    }
  } catch (error) {
    console.error('[ACTION_ERROR:findOrCreatePlaylist] Fallo al buscar o crear la playlist.', error);
    throw error;
  }
}

export async function getUniqueTrackCountFromPlaylistsAction(
  playlistIds: string[],
): Promise<number> {
  try {
    // Lógica simplificada para reutilizar la acción existente
    const uniqueTrackUris = await getTrackUris(playlistIds);
    return uniqueTrackUris.length;
  } catch (error) {
    console.error(
      '[ACTION_ERROR:getUniqueTrackCountFromPlaylistsAction]',
      error,
    );
    throw error;
  }
}

/**
* Añade un conjunto de URIs de canciones a una playlist específica y actualiza
* el recuento de pistas en la base de datos si es una Megalista registrada.
* Esta acción NO modifica las 'sourcePlaylistIds'.
*
* @param {object} params - Los parámetros para la acción.
* @param {string} params.playlistId - El ID de la playlist a la que se añadirán las canciones.
* @param {string[]} params.trackUris - Un array de URIs de las canciones a añadir.
* @returns Un ActionResult con el nuevo recuento total de canciones.
*/
export async function addTracksToPlaylistAction({
  playlistId,
  trackUris,
}: {
  playlistId: string;
  trackUris: string[];
}): Promise<ActionResult<{ newTrackCount: number }>> {
  if (!playlistId || !trackUris || trackUris.length === 0) {
    return { success: false, error: 'Faltan datos para realizar la acción.' };
  }
  
  const session = await auth();
  if (!session?.accessToken) {
    return { success: false, error: 'No autenticado.' };
  }
  const { accessToken } = session;
  
  try {
    // 1. Añadir las canciones a la playlist en Spotify
    await addTracksToPlaylist(accessToken, playlistId, trackUris);
    
    // 2. Obtener el estado actualizado de la playlist de Spotify para el nuevo recuento
    const updatedPlaylist = await getPlaylistDetails(accessToken, playlistId);
    const newTrackCount = updatedPlaylist.tracks.total;
    
    // 3. Actualizar el recuento en nuestra DB si es una Megalista
    // Usamos updateMany para que no falle si la playlist no está en nuestra DB.
    await db.megalist.updateMany({
      where: { id: playlistId },
      data: {
        trackCount: newTrackCount,
      },
    });
    
    // 4. Devolver éxito con el nuevo recuento
    return { success: true, data: { newTrackCount } };
  } catch (error) {
    console.error('[ACTION_ERROR:addTracksToPlaylistAction]', error);
    const errorMessage =
    error instanceof Error
    ? error.message
    : 'Error al añadir las canciones a la playlist.';
    return { success: false, error: errorMessage };
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
): Promise<ActionResult<{ finalCount: number; addedCount: number }>> {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) {
      return { success: false, error: 'No autenticado o token no disponible.' };
    }
    const { accessToken } = session;
    
    // Obtiene el estado actual de la megalista y las nuevas canciones
    const megalist = await db.megalist.findUnique({
      where: { id: targetPlaylistId },
    });
    const isActivatingEmptyList = megalist?.isFrozen && megalist.sourcePlaylistIds.length === 0;
    
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
    
    // Actualizar isFrozen si se está actualizando una lista vacía
    const updateData = {
      sourcePlaylistIds: allSourceIds,
      trackCount: finalCount,
      type: 'MEGALIST' as const,
      isFrozen: isActivatingEmptyList ? false : megalist?.isFrozen, // Descongelar si se activa
    };
    
    // Actualiza el registro en la base de datos
    await db.megalist.upsert({
      where: { id: targetPlaylistId },
      update: updateData,
      create: {
        id: targetPlaylistId,
        spotifyUserId: session.user.id,
        sourcePlaylistIds: allSourceIds,
        trackCount: finalCount,
        type: 'MEGALIST',
      },
    });
    
    return { success: true, data: { finalCount, addedCount: tracksToAdd.length } };
  } catch (error) {
    console.error(`[ACTION_ERROR:addTracksToMegalistAction] Fallo al añadir canciones a ${targetPlaylistId}.`, error);
    const errorMessage = error instanceof Error ? error.message : `Fallo al añadir canciones a ${targetPlaylistId}.`;
    return { success: false, error: errorMessage };
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

// Maneja el estado de 'congelación' (no sincronizable) de una megalista
export async function toggleFreezeStateAction(
  playlistId: string,
  freeze: boolean
): Promise<ActionResult<{ id: string; isFrozen: boolean }>> {
  console.log(`[ACTION] Cambiando estado de congelado a ${freeze} para la playlist ${playlistId}`);
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Usuario no autenticado.' };
    }
    
    const updatedMegalist = await db.megalist.update({
      where: {
        id: playlistId,
        // Nos aseguramos de que solo el propietario pueda modificarla
        spotifyUserId: session.user.id,
      },
      data: {
        isFrozen: freeze,
      },
    });
    
    return {
      success: true,
      data: { id: updatedMegalist.id, isFrozen: updatedMegalist.isFrozen },
    };
  } catch (error) {
    console.error(`[ACTION_ERROR:toggleFreezeState]`, error);
    const action = freeze ? 'congelar' : 'descongelar';
    return {
      success: false,
      error: `No se pudo ${action} la playlist. Puede que no sea una Megalista gestionada por esta app.`,
    };
  }
}

/**
* Crea una nueva playlist vacía en Spotify y la registra en la base de datos
* como una Megalista no sincronizable (congelada por defecto).
* @param name El nombre de la nueva playlist.
* @returns Un ActionResult con el objeto de la playlist creada y enriquecida.
*/
export async function createEmptyMegalistAction(
  name: string
): Promise<ActionResult<SpotifyPlaylist>> {
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    return { success: false, error: 'No autenticado.' };
  }
  const { accessToken, user } = session;
  
  try {
    // Crear la playlist en Spotify
    const newPlaylist = await createNewPlaylist(accessToken, user.id, name);
    
    // Registrar en la base de datos como "vacía" y "congelada"
    await db.megalist.create({
      data: {
        id: newPlaylist.id,
        spotifyUserId: user.id,
        sourcePlaylistIds: [], // Sin fuentes
        trackCount: 0,
        type: 'MEGALIST',
        isFrozen: true, // Congelada por defecto para que no sea sincronizable
      },
    });
    
    // Enriquecer el objeto para el cliente
    const enrichedPlaylist: SpotifyPlaylist = {
      ...newPlaylist,
      isMegalist: true,
      isSyncable: false, // No es sincronizable porque está congelada
      isFrozen: true,
      playlistType: 'MEGALIST',
      tracks: { ...newPlaylist.tracks, total: 0 },
    };
    
    return { success: true, data: enrichedPlaylist };
  } catch (error) {
    console.error('[ACTION_ERROR:createEmptyMegalist]', error);
    const errorMessage =
    error instanceof Error ? error.message : 'Error al crear la playlist.';
    return { success: false, error: errorMessage };
  }
}