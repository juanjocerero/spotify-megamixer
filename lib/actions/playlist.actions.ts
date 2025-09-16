// lib/actions/playlist.actions.ts

'use server';
import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { db } from '../db';
import { shuffleArray } from '../utils';
import { ActionResult, PlaylistType, SpotifyPlaylist } from '@/types/spotify';
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
import { Megalist, Folder } from '@prisma/client';

/**
* Server Action para obtener los datos iniciales necesarios para el dashboard.
* Recupera las primeras 50 playlists del usuario desde Spotify y las enriquece
* con metadatos de la base de datos local (ej. si es una Megalista).
* @returns Un `ActionResult` que contiene un objeto con las playlists iniciales y la URL para la siguiente página de resultados.
*/
export async function getInitialDashboardDataAction(): Promise<
ActionResult<{
  playlists: SpotifyPlaylist[];
  nextUrl: string | null;
  folders: Folder[]; // Añadido
}>
> {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    // Añadida la obtención de megalists y carpetas en paralelo
    const [userFolders, userMegalists] = await Promise.all([
      db.folder.findMany({
        where: { userId: session.user.id },
        orderBy: { name: 'asc' }, // Ordenar carpetas alfabéticamente
      }),
      db.megalist.findMany({
        where: { spotifyUserId: session.user.id },
      }),
    ]);
    
    // El mapa de datos de Megalist ahora también incluye el folderId
    const megalistDataMap = new Map<string, MegalistClientData & { folderId: string | null }>(
      userMegalists.map((m: Megalist) => [
        m.id,
        {
          isMegalist: true,
          isSyncable: m.type === 'MEGALIST' && !m.isFrozen,
          type: m.type,
          isFrozen: m.isFrozen,
          isIsolated: m.isIsolated,
          folderId: m.folderId, // Se añade el folderId
        },
      ])
    );
    
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    const initialData = await getUserPlaylists(accessToken);
    const initialPlaylists = initialData.items;
    
    // El enriquecimiento de datos de la playlist ahora incluye el folderId
    const finalPlaylists: SpotifyPlaylist[] = initialPlaylists.map(p => {
      const megalistData = megalistDataMap.get(p.id);
      if (megalistData) {
        return {
          ...p,
          isMegalist: megalistData.isMegalist,
          isSyncable: megalistData.isSyncable,
          playlistType: megalistData.type,
          isFrozen: megalistData.isFrozen,
          folderId: megalistData.folderId, // Se añade el folderId
        };
      }
      return p;
    });
    
    // Modificado el objeto de respuesta para incluir las carpetas
    return {
      success: true,
      data: {
        playlists: finalPlaylists,
        nextUrl: initialData.next,
        folders: userFolders,
      },
    };
  } catch (error) {
    console.error('[ACTION_ERROR:getInitialDashboardData]', error);
    const message =
    error instanceof Error ? error.message : 'Failed to load initial data.';
    return { success: false, error: message };
  }
}


/**
* Busca una playlist del usuario por su nombre. Si no la encuentra, crea una nueva.
* Si la crea, también la registra en la base de datos como una Megalista.
* @param name - El nombre de la playlist a buscar o crear.
* @param sourcePlaylistIds - Los IDs de las playlists fuente, para almacenar en la DB si se crea una nueva.
* @param initialTrackCount - El número inicial de canciones que tendrá la playlist.
* @returns Un objeto que contiene el objeto de la playlist (creada o encontrada) y un booleano `exists`.
* @throws Si el usuario no está autenticado.
*/
export async function findOrCreatePlaylist(
  name: string,
  sourcePlaylistIds: string[],
  initialTrackCount: number 
): Promise<{ playlist: SpotifyPlaylist; exists: boolean }> {
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session?.user?.id) {
      throw new Error('No autenticado, token o ID de usuario no disponible.');
    }
    const { user } = session;
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    
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

/**
* Calcula el número de canciones únicas a partir de un array de IDs de playlists.
* @param playlistIds - Un array de IDs de playlists de las cuales extraer las canciones.
* @returns El número total de canciones únicas.
* @throws Si ocurre un error durante la obtención de las URIs.
*/
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
* @param params - Los parámetros para la acción.
* @param params.playlistId - El ID de la playlist a la que se añadirán las canciones.
* @param params.trackUris - Un array de URIs de las canciones a añadir.
* @returns Un `ActionResult` con el nuevo recuento total de canciones.
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
  
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session) {
    return { success: false, error: 'No autenticado.' };
  }
  const { accessToken } = await auth.api.getAccessToken({
    body: { providerId: 'spotify' },
    headers: new Headers(await headers())
  });
  
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
* Añade un lote de canciones a una playlist en Spotify. Es un helper interno.
* @param playlistId - El ID de la playlist de destino.
* @param trackUrisBatch - Un array de URIs de canciones para añadir.
* @throws Si el usuario no está autenticado o si la API de Spotify falla.
*/
export async function addTracksBatch(
  playlistId: string,
  trackUrisBatch: string[]
) {
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    
    // Esta función ahora puede lanzar errores de rate-limiting, que serán capturados aquí
    await addTracksToPlaylist(accessToken, playlistId, trackUrisBatch);
  } catch (error) {
    console.error('[ACTION_ERROR:addTracksBatch] Fallo al añadir un lote de canciones.', error);
    throw error;
  }
}

/**
* Actualiza una Megalista existente añadiendo canciones de nuevas playlists fuente.
* Evita añadir duplicados y puede reordenar la lista final si se solicita.
* @param targetPlaylistId - El ID de la Megalista a actualizar.
* @param newSourceIds - Los IDs de las playlists fuente que se van a añadir.
* @param shouldShuffle - Si se debe reordenar la playlist después de añadir las canciones.
* @returns Un `ActionResult` con el recuento final y el número de canciones añadidas.
*/
export async function addTracksToMegalistAction(
  targetPlaylistId: string,
  newSourceIds: string[], 
  shouldShuffle: boolean
): Promise<ActionResult<{ finalCount: number; addedCount: number }>> {
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado o token no disponible.' };
    }
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    
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
* Deja de seguir (elimina de la librería) una playlist en Spotify
* y elimina sus registros correspondientes de la base de datos local.
* @param playlistIds - Un array de IDs de playlists a dejar de seguir.
* @throws Si el usuario no está autenticado.
*/
export async function unfollowPlaylist(playlistId: string): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    
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
* Deja de seguir (elimina de la librería) un lote de playlists en Spotify
* y elimina sus registros correspondientes de la base de datos local.
* @param playlistIds - Un array de IDs de playlists a dejar de seguir.
* @throws Si el usuario no está autenticado.
*/
export async function unfollowPlaylistsBatch(playlistIds: string[]): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    
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
* Reordena aleatoriamente las canciones dentro de una o varias playlists.
* @param playlistIds - Un array de IDs de las playlists a reordenar.
* @throws Si el usuario no está autenticado o si la API de Spotify falla.
*/
export async function shufflePlaylistsAction(playlistIds: string[]): Promise<void> {
  console.log(`[ACTION:shufflePlaylistsAction] Iniciando reordenado para ${playlistIds.length} playlist(s).`);
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    
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
* Actualiza los detalles (nombre y/o descripción) de una playlist en Spotify.
* @param playlistId - El ID de la playlist a actualizar.
* @param newName - El nuevo nombre para la playlist.
* @param newDescription - La nueva descripción para la playlist.
* @throws Si el usuario no está autenticado.
*/
export async function updatePlaylistDetailsAction(
  playlistId: string,
  newName: string,
  newDescription: string
): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session) {
      throw new Error('No autenticado o token no disponible.');
    }
    
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    // Reutilizamos la función helper que ya existe en lib/spotify.ts
    await updatePlaylistDetails(accessToken, playlistId, {
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
* @throws Si el usuario no está autenticado.
*/
export async function clearPlaylist(playlistId: string) {
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    await clearPlaylistTracks(accessToken, playlistId);
  } catch (error) {
    console.error(`[ACTION_ERROR:clearPlaylist] Fallo al vaciar la playlist ${playlistId}.`, error);
    throw error;
  }
}

/**
* Cambia el estado de "congelación" de una Megalista en la base de datos.
* Una Megalista congelada no es elegible para la sincronización.
* @param playlistId - El ID de la Megalista a modificar.
* @param freeze - `true` para congelar, `false` para descongelar.
* @returns Un `ActionResult` con el ID y el nuevo estado `isFrozen`.
*/
export async function toggleFreezeStateAction(
  playlistId: string,
  freeze: boolean
): Promise<ActionResult<{ id: string; isFrozen: boolean }>> {
  console.log(`[ACTION] Cambiando estado de congelado a ${freeze} para la playlist ${playlistId}`);
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
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
* como una Megalista congelada y sin fuentes.
* @param name - El nombre para la nueva playlist.
* @returns Un `ActionResult` con el objeto de la playlist creada y enriquecida.
*/
export async function createEmptyMegalistAction(
  name: string
): Promise<ActionResult<SpotifyPlaylist>> {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado.' };
  }
  const { user } = session;
  const { accessToken } = await auth.api.getAccessToken({
    body: { providerId: 'spotify' },
    headers: new Headers(await headers())
  });
  
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

/**
* Convierte una lista a Megalista.
* @param name - La playlist a convertir.
* @returns Un `ActionResult` con el objeto de la playlist con tipos
*/
export async function convertToMegalistAction(
  playlist: { id: string; tracks: { total: number } }
): Promise<ActionResult<{ id: string; type: PlaylistType; isFrozen: boolean }>> {
  const { id: playlistId, tracks } = playlist;
  console.log(`[ACTION] Convirtiendo la playlist ${playlistId} a Megalista.`);
  try {
    const session = await auth.api.getSession({ headers: new Headers(await headers()) });
    if (!session?.user?.id) {
      return { success: false, error: 'Usuario no autenticado.' };
    }
    
    const megalist = await db.megalist.upsert({
      where: { id: playlistId },
      // Si ya existe (era una 'SURPRISE'), la actualizamos.
      update: {
        type: 'MEGALIST',
        isFrozen: false,
      },
      // Si no existe, la creamos y "adoptamos".
      create: {
        id: playlistId,
        spotifyUserId: session.user.id,
        // La fuente de una lista adoptada es ella misma.
        sourcePlaylistIds: [playlistId],
        trackCount: tracks.total,
        type: 'MEGALIST',
        isFrozen: false,
      },
    });
    
    return {
      success: true,
      data: {
        id: megalist.id,
        type: megalist.type,
        isFrozen: megalist.isFrozen,
      },
    };
  } catch (error) {
    console.error(`[ACTION_ERROR:convertToMegalistAction]`, error);
    return {
      success: false,
      error: 'No se pudo convertir la playlist a Megalista.',
    };
  }
}

/**
* Obtiene nuevos datos para una playlist recién creada.
* Para el sistema de polling con nuevas playlists.
* @param id - El id de la playlist sobre la que hace la consulta.
* @returns Un `ActionResult` con la playlist actualizada
*/
export async function getFreshPlaylistDetailsAction(
  playlistId: string
): Promise<ActionResult<SpotifyPlaylist>> {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session) {
    return { success: false, error: 'No autenticado.' };
  }
  try {
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    const playlist = await getPlaylistDetails(accessToken, playlistId);
    return { success: true, data: playlist };
  } catch (error) {
    console.error(`[ACTION_ERROR:getFreshPlaylistDetailsAction]`, error);
    const errorMessage =
    error instanceof Error
    ? error.message
    : 'No se pudieron obtener los detalles de la playlist.';
    return { success: false, error: errorMessage };
  }
}

export type ActionablePlaylist = {
  id: string;
  tracks: { total: number };
};

/**
* Marca y desmarca una lista como aislada.
* Las listas aisladas no forman parte del pool para hacer listas sorpresas.
* @param playlists - El conjunto de playlists
* @param isolate - El valor del aislamiento: true o false
* @returns Un `ActionResult` con la playlist actualizada
*/
export async function toggleIsolateStateAction(
  playlists: ActionablePlaylist[],
  isolate: boolean,
): Promise<ActionResult<string[]>> {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session?.user?.id) {
    return { success: false, error: 'Usuario no autenticado.' };
  }
  const { user } = session;
  const playlistIds = playlists.map(p => p.id);
  
  try {
    // Primero, actualiza en bloque todas las playlists que ya existen en nuestra BBDD
    await db.megalist.updateMany({
      where: {
        id: { in: playlistIds },
      },
      data: {
        isIsolated: isolate,
      },
    });
    
    // Identifica las playlists que no existían para "adoptarlas"
    const existingIds = await db.megalist
    .findMany({
      where: { id: { in: playlistIds } },
      select: { id: true },
    })
    .then(results => new Set(results.map(r => r.id)));
    
    const playlistsToCreate = playlists.filter(p => !existingIds.has(p.id));
    
    // Si hay nuevas playlists que adoptar, créalas en bloque
    if (playlistsToCreate.length > 0) {
      await db.megalist.createMany({
        data: playlistsToCreate.map(p => ({
          id: p.id,
          spotifyUserId: user.id,
          sourcePlaylistIds: [p.id],
          trackCount: p.tracks.total,
          type: 'ADOPTED', // Usamos el nuevo tipo para no confundirlas con Megalistas
          isFrozen: false,
          isIsolated: isolate,
        })),
        skipDuplicates: true,
      });
    }
    
    return { success: true, data: playlistIds };
  } catch (error) {
    console.error(`[ACTION_ERROR:toggleIsolateStateAction]`, error);
    const action = isolate ? 'aislar' : 'quitar el aislamiento de';
    return {
      success: false,
      error: `No se pudo ${action} las playlists.`,
    };
  }
}

export const getCachedInitialData = cache(getInitialDashboardDataAction);