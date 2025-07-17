// /lib/actions.ts
'use server'; // ¡Muy importante! Esto marca todas las funciones exportadas como Server Actions.

import { auth } from '@/auth';
import { SpotifyPlaylist } from '@/types/spotify';
import { 
  getAllPlaylistTracks, 
  findUserPlaylistByName, 
  createNewPlaylist, 
  clearPlaylistTracks,
  addTracksToPlaylist
} from './spotify';
import { shuffleArray } from './utils';

interface PlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
}

/**
* ACCIÓN 1: Obtiene y prepara las URIs de las canciones.
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
* ACCIÓN 2: Encuentra o crea la playlist de destino y la prepara (limpiándola si existe).
*/
export async function findOrCreateAndPreparePlaylist(name: string) {
  // Bloque try...catch para logging detallado
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) {
      throw new Error('No autenticado, token o ID de usuario no disponible.');
    }
    const { accessToken, user } = session;
    
    const existingPlaylist = await findUserPlaylistByName(accessToken, name);
    
    if (existingPlaylist) {
      await clearPlaylistTracks(accessToken, existingPlaylist.id);
      return existingPlaylist.id;
    } else {
      const newPlaylist = await createNewPlaylist(accessToken, user.id, name);
      return newPlaylist.id;
    }
  } catch (error) {
    console.error('[ACTION_ERROR:findOrCreateAndPreparePlaylist] Fallo al preparar la playlist.', error);
    throw error;
  }
}


/**
* ACCIÓN 3: Añade un lote de canciones a una playlist.
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