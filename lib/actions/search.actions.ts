// lib/actions/search.actions.ts

'use server';

import { headers } from 'next/headers';
import { auth } from '@/auth';
import {
  ActionResult,
  SpotifyAlbum,
  SpotifyPlaylist,
  SpotifyTrack,
} from '@/types/spotify';

/**
* La estructura de la respuesta de la API de búsqueda de Spotify.
* @internal
*/
interface SpotifySearchResponse {
  playlists: { items: SpotifyPlaylist[] };
  albums: { items: SpotifyAlbum[] };
  tracks: { items: SpotifyTrack[] };
}

/**
* La estructura de datos unificada para los resultados de búsqueda que se envían al cliente.
*/
export interface SearchResults {
  playlists: SpotifyPlaylist[];
  albums: SpotifyAlbum[];
  tracks: SpotifyTrack[];
}

/**
* Server Action para buscar en Spotify playlists, álbumes y canciones.
* Filtra las playlists de los resultados para excluir las que pertenecen al usuario actual.
*
* @param query - El término de búsqueda introducido por el usuario.
* @returns Un `ActionResult` que contiene un objeto `SearchResults` con los resultados de la búsqueda.
*          Si la `query` está vacía, devuelve un resultado exitoso con arrays vacíos.
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
    const params = new URLSearchParams({
      q: query,
      type: 'playlist,album,track',
      limit: '10', // Limita los resultados por cada tipo
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
    
    // Filtramos las playlists para excluir las propias del usuario
    // y cualquier item nulo
    const filteredPlaylists = results.playlists.items.filter(
      playlist => playlist && playlist.owner.id !== user.id
    );
    
    const finalResults: SearchResults = {
      playlists: filteredPlaylists,
      albums: results.albums.items.filter(album => album),
      tracks: results.tracks.items.filter(track => track),
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