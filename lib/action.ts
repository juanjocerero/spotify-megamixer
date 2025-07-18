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
  getPlaylistDetails,
  getSourcePlaylistIds, 
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
  forceNoSync: boolean = false
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
      const idsToStore = forceNoSync ? [] : sourcePlaylistIds;
      const newPlaylist = await createNewPlaylist(accessToken, user.id, name, idsToStore);
      
      // Persistencia en base de datos
      try {
        await db.megalist.create({
          data: {
            id: newPlaylist.id, // El ID de la playlist de Spotify va en el campo `id`
            spotifyUserId: user.id,
            sourcePlaylistIds: idsToStore,
            trackCount: 0, // Una megalista nueva siempre empieza con 0 canciones
          },
        });
        console.log(`[DB] Creado el registro para la nueva Megalista ${newPlaylist.id}`);
      } catch (dbError) {
        console.error(`[DB_ERROR] Fallo al crear el registro para la Megalista ${newPlaylist.id}`, dbError);
      }
      
      if (!newPlaylist.owner) {
        newPlaylist.owner = { display_name: session.user.name || 'Tú' };
      }
      
      return { playlist: newPlaylist, exists: false };
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
): Promise<{ finalCount: number; isSyncable: boolean }> {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    // --- Lógica de metadatos ---
    // 1. Obtener la playlist de destino para leer su descripción actual
    const targetPlaylist = await getPlaylistDetails(accessToken, targetPlaylistId);
    const existingSourceIds = getSourcePlaylistIds(targetPlaylist) || [];
    
    // Combinar las fuentes antiguas y nuevas sin duplicados
    const allSourceIds = Array.from(new Set([...existingSourceIds, ...newSourceIds]));
    
    // Reconstruir la descripción y comprobar el límite de caracteres
    const DESCRIPTION_CHAR_LIMIT = 4000;
    const baseDescription = `Generada por Spotify Megamixer el ${new Date().toLocaleDateString()}. __MEGAMIXER_APP_V1__`;
    const sourcesTag = ` __MEGAMIXER_SOURCES:[${allSourceIds.join(',')}]__`;
    const fullDescription = baseDescription + sourcesTag;
    let finalDescription = baseDescription;
    let isSyncable = false;
    
    if (fullDescription.length < DESCRIPTION_CHAR_LIMIT) {
      finalDescription = fullDescription;
      isSyncable = true;
    } else {
      console.warn(`[ACTION] La nueva descripción para ${targetPlaylistId} excede el límite. Se guardará sin fuentes.`);
    }
    
    // Actualizar la descripción en Spotify si ha cambiado
    if (finalDescription !== targetPlaylist.description) {
      await updatePlaylistDetails(accessToken, targetPlaylistId, { description: finalDescription });
    }
    
    // --- LÓGICA DE CANCIONES ---
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
    return { finalCount: shuffledTracks.length, isSyncable };
    
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
* @param playlistId - El ID de la Megalista a sincronizar.
* @returns Un objeto con el resultado de la sincronización.
*/
export async function syncMegalist(playlistId: string) {
  console.log(`[ACTION:syncMegalist] Iniciando sincronización para ${playlistId}`);
  
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    // Obtener los detalles de la Megalista y parsear sus fuentes
    const megalist = await getPlaylistDetails(accessToken, playlistId);
    const sourceIds = getSourcePlaylistIds(megalist);
    
    if (!sourceIds) {
      console.warn(`[ACTION:syncMegalist] La playlist ${playlistId} no es sincronizable.`);
      throw new Error("Esta Megalista no es sincronizable (no contiene los metadatos de origen).");
    }
    
    // Obtener las canciones actuales de la Megalista y las actualizadas de las fuentes
    const [initialTrackUris, finalTrackUris] = await Promise.all([
      getAllPlaylistTracks(accessToken, playlistId),
      getTrackUris(sourceIds) // Esta acción ya obtiene, unifica, elimina duplicados y baraja
    ]);
    
    // Calcular las diferencias para el informe
    const initialTracksSet = new Set(initialTrackUris);
    const finalTracksSet = new Set(finalTrackUris);
    
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
    
    // Si no hay cambios, no hacemos nada más.
    if (addedCount === 0 && removedCount === 0) {
      console.log(`[ACTION:syncMegalist] La playlist ${playlistId} ya estaba sincronizada.`);
      return { success: true, added: 0, removed: 0, finalCount: initialTrackUris.length, message: "Ya estaba sincronizada." };
    }
    
    // Si hay cambios, reemplazar los tracks de la playlist
    console.log(`[ACTION:syncMegalist] Actualizando ${playlistId}. Añadiendo: ${addedCount}, Eliminando: ${removedCount}`);
    await replacePlaylistTracks(accessToken, playlistId, finalTrackUris);
    
    // Devolver el resultado
    return { 
      success: true, 
      added: addedCount, 
      removed: removedCount, 
      finalCount: finalTrackUris.length 
    };
    
  } catch (error) {
    console.error(`[ACTION_ERROR:syncMegalist] Fallo al sincronizar la playlist ${playlistId}.`, error);
    // Relanzamos el error para que el cliente lo pueda capturar y mostrar un toast.
    throw error;
  }
}