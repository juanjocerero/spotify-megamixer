// lib/actions/spotify.actions.ts

'use server';

import { auth } from '@/auth';
import { getAllPlaylistTracks } from '../spotify';
import { SpotifyPlaylist } from '@/types/spotify';

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

export async function getPlaylistTracksDetailsAction(playlistId: string): Promise<{ name: string; artists: string; }[]> {
  console.log(`[ACTION:getPlaylistTracksDetailsAction] Iniciando obtención de detalles para la playlist ${playlistId}`);
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    const detailedTracksWithUri = await getAllPlaylistTracks(accessToken, playlistId);
    console.log(`[ACTION:getPlaylistTracksDetailsAction] Obtenidos detalles para ${detailedTracksWithUri.length} canciones.`);
    return detailedTracksWithUri.map(track => ({
      name: track.name,
      artists: track.artists,
    }));
  } catch (error) {
    console.error(`[ACTION_ERROR:getPlaylistTracksDetailsAction] Fallo al obtener detalles de las canciones para la playlist ${playlistId}.`, error);
    throw error;
  }
}