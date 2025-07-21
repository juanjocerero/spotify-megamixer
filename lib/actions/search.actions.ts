// lib/actions/search.actions.ts

'use server';

import { auth } from '@/auth';
import {
  ActionResult,
  SpotifyAlbum,
  SpotifyPlaylist,
  SpotifyTrack,
} from '@/types/spotify';

interface SpotifySearchResponse {
  playlists: { items: SpotifyPlaylist[] };
  albums: { items: SpotifyAlbum[] };
  tracks: { items: SpotifyTrack[] };
}

export interface SearchResults {
  playlists: SpotifyPlaylist[];
  albums: SpotifyAlbum[];
  tracks: SpotifyTrack[];
}

/**
* Busca en Spotify playlists, álbumes y canciones.
* Filtra las playlists para excluir las del usuario actual.
* @param query El término de búsqueda.
* @returns Un ActionResult con los resultados de la búsqueda.
*/
export async function searchSpotifyAction(
  query: string
): Promise<ActionResult<SearchResults>> {
  if (!query) {
    return {
      success: true,
      data: { playlists: [], albums: [], tracks: [] },
    };
  }
  
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    return { success: false, error: 'No autenticado.' };
  }
  const { accessToken, user } = session;
  
  try {
    const params = new URLSearchParams({
      q: query,
      type: 'playlist,album,track',
      limit: '10',
    });
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[ACTION_ERROR:searchSpotifyAction]', errorData);
      throw new Error('La búsqueda en Spotify falló.');
    }
    
    const results: SpotifySearchResponse = await response.json();
    
    const filteredPlaylists = results.playlists.items.filter(
      playlist => playlist.owner.id !== user.id
    );
    
    const finalResults: SearchResults = {
      playlists: filteredPlaylists,
      albums: results.albums.items,
      tracks: results.tracks.items,
    };
    
    return { success: true, data: finalResults };
  } catch (error) {
    console.error('[ACTION_ERROR:searchSpotifyAction]', error);
    const errorMessage =
    error instanceof Error
    ? error.message
    : 'Error desconocido en la búsqueda.';
    return { success: false, error: errorMessage };
  }
}