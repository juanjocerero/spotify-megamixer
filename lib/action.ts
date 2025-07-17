// /lib/actions.ts
'use server'; // ¡Muy importante! Esto marca todas las funciones exportadas como Server Actions.

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
  getSourcePlaylistIds
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
* Encuentra o crea la playlist de destino y la prepara.
* Ahora detecta si la playlist existe sin modificarla.
* @returns Un objeto con el ID de la playlist y un booleano 'exists'.
*/
export async function findOrCreatePlaylist(
  name: string,
  sourcePlaylistIds: string[]
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
      const newPlaylist = await createNewPlaylist(accessToken, user.id, name, sourcePlaylistIds);
      
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
* Acción para actualizar una playlist con nuevas canciones y reordenarla.
*/
export async function updateAndReorderPlaylist(
  playlistId: string,
  newTrackUris: string[]
) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    // 1. Obtener las canciones que ya están en la playlist
    const existingTracks = await getAllPlaylistTracks(accessToken, playlistId);
    
    // 2. Combinar, eliminar duplicados y barajar
    const combinedTracks = [...new Set([...existingTracks, ...newTrackUris])];
    const shuffledTracks = shuffleArray(combinedTracks);
    
    // 3. Reemplazar el contenido de la playlist con el nuevo conjunto
    await replacePlaylistTracks(accessToken, playlistId, shuffledTracks);
    
    return { finalCount: shuffledTracks.length };
    
  } catch (error) {
    console.error(`[ACTION_ERROR:updateAndReorderPlaylist] Fallo al actualizar la playlist ${playlistId}.`, error);
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
    
    const response = await fetch(url, {
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