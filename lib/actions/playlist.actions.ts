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
  updatePlaylistDetails,
} from '../spotify';
import { getTrackUris } from './spotify.actions';

interface PlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
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

export async function getUniqueTrackCountFromPlaylistsAction(playlistIds: string[]): Promise<number> {
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
    return uniqueTrackUris.length;
  } catch (error) {
    console.error('[ACTION_ERROR:getUniqueTrackCountFromPlaylistsAction]', error);
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
): Promise<ActionResult<{ finalCount: number; addedCount: number }>> {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) {
      return { success: false, error: 'No autenticado o token no disponible.' };
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
    await db.megalist.upsert({ // Usamos upsert para cubrir todos los casos
      where: { id: targetPlaylistId },
      update: { // Si existe, actualizamos su tipo a MEGALIST
        sourcePlaylistIds: allSourceIds,
        trackCount: finalCount,
        type: 'MEGALIST', 
      },
      create: { // Si no existe, la creamos como MEGALIST
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