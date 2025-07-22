// lib/actions/spotify.actions.ts

'use server';

import { auth } from '@/auth';
import { db } from '../db';
import { getPlaylistTracksPage, getAllPlaylistTracks } from '../spotify';
import { SpotifyPlaylist, MegalistClientData, ActionResult, SpotifyTrack } from '@/types/spotify';
import { Megalist } from '@prisma/client';

/**
* La estructura esperada de la respuesta de la API para una página de playlists.
* @internal
*/
interface PlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
}


/**
* La estructura esperada de la respuesta de la API para los tracks de un álbum.
* @internal
*/
interface AlbumTracksResponse {
  items: SpotifyTrack[];
}

/**
* Obtiene todas las URIs de las canciones de un conjunto de playlists, las combina
* y devuelve un array plano sin duplicados.
* @param playlistIds - Un array de IDs de las playlists de origen.
* @returns Una promesa que se resuelve a un array de URIs de canciones únicas.
* @throws Si el usuario no está autenticado o si la obtención de tracks falla.
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
* Server Action para obtener la siguiente página de playlists del usuario (paginación).
* Enriquece las playlists obtenidas de Spotify con metadatos de la base de datos local.
* @param url - La URL completa para la siguiente página, proporcionada por la API de Spotify.
* @returns Una promesa que se resuelve a un objeto con las playlists de la página y la URL de la siguiente.
* @throws Si el usuario no está autenticado o si la petición a Spotify falla.
*/
export async function fetchMorePlaylists(
  url: string
): Promise<PlaylistsApiResponse> {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to fetch more playlists:', errorData);
      throw new Error(`Failed to fetch more playlists. Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // La lógica de enriquecimiento que ya corregimos antes
    const playlistIds = data.items.map((p: SpotifyPlaylist) => p.id);
    const userMegalists = await db.megalist.findMany({
      where: {
        id: { in: playlistIds },
        spotifyUserId: session.user.id
      },
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
    
    const finalPlaylists: SpotifyPlaylist[] = data.items.map((p: SpotifyPlaylist) => {
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
      items: finalPlaylists,
      next: data.next,
    };
  } catch (error) {
    console.error('[ACTION_ERROR:fetchMorePlaylists] Fallo al cargar más playlists.', error);
    throw error;
  }
}

/**
* Server Action para obtener los detalles de una página de canciones de una playlist.
* Devuelve una estructura de datos simplificada, optimizada para la vista de detalles.
* @param playlistId - El ID de la playlist.
* @param fetchUrl - (Opcional) La URL para la página específica de tracks a obtener (para paginación). Si se omite, obtiene la primera página.
* @returns Un objeto con un array de tracks simplificados y la URL de la siguiente página.
* @throws Si el usuario no está autenticado.
*/
export async function getPlaylistTracksDetailsAction(
  playlistId: string,
  fetchUrl?: string | null
): Promise<{ tracks: { name: string; artists: string }[]; next: string | null }> {
  console.log(`[ACTION:getPlaylistTracksDetailsAction] Obteniendo página de tracks para ${playlistId}`);
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    // Construye la URL inicial si no se proporciona una. Limitamos a 75 para una carga rápida.
    const urlToFetch =
    fetchUrl ||
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(name,artists(name),type,uri)),next&limit=75`;
    
    const { tracks: detailedTracks, next } = await getPlaylistTracksPage(accessToken, urlToFetch);
    
    console.log(`[ACTION:getPlaylistTracksDetailsAction] Obtenidos ${detailedTracks.length} tracks.`);
    
    const tracksForClient = detailedTracks.map(track => ({
      name: track.name,
      artists: track.artists
    }));
    
    return { tracks: tracksForClient, next };
    
  } catch (error) {
    console.error(`[ACTION_ERROR:getPlaylistTracksDetailsAction] Fallo al obtener página de tracks para ${playlistId}.`, error);
    throw error;
  }
}

/**
* Server Action para obtener todas las URIs de las canciones de un álbum específico.
* @param albumId - El ID del álbum de Spotify.
* @returns Un `ActionResult` con un array de URIs de las canciones.
*/
export async function getAlbumTracksAction(
  albumId: string
): Promise<ActionResult<string[]>> {
  const session = await auth();
  if (!session?.accessToken) {
    return { success: false, error: 'No autenticado.' };
  }
  const { accessToken } = session;
  
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Error al obtener las canciones del álbum: ${
          errorData.error?.message || response.status
        }`
      );
    }
    
    const data: AlbumTracksResponse = await response.json();
    const trackUris = data.items.map(track => track.uri);
    
    return { success: true, data: trackUris };
  } catch (error) {
    console.error('[ACTION_ERROR:getAlbumTracksAction]', error);
    const errorMessage =
    error instanceof Error ? error.message : 'Error desconocido.';
    return { success: false, error: errorMessage };
  }
}