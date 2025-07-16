// /lib/spotify.ts
import { SpotifyPlaylist, SpotifyTrack } from "@/types/spotify.d";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// Definimos la estructura de la respuesta de la API para las playlists
interface PlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
  // ... y otros campos que no usaremos por ahora
}

// Definimos la estructura que esperamos de la API de tracks
interface PlaylistTracksApiResponse {
  items: { track: SpotifyTrack | null }[];
  next: string | null;
}

/**
* Obtiene TODAS las canciones de una playlist, manejando la paginación.
* @param accessToken - El token de acceso del usuario.
* @param playlistId - El ID de la playlist de la que obtener las canciones.
* @returns Una promesa que se resuelve a un array de URIs de las canciones.
*/
export async function getAllPlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<string[]> {
  let allTrackUris: string[] = [];
  // Hacemos la petición inicial más ligera pidiendo solo los campos que necesitamos.
  let nextUrl: string | null = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?fields=items(track(uri)),next&limit=100`;
  
  do {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Fallo al obtener los tracks de la playlist ${playlistId}:`, errorData);
      throw new Error(`Fallo al obtener los tracks de la playlist ${playlistId}`);
    }
    
    const data: PlaylistTracksApiResponse = await response.json();
    
    // Extraemos las URIs, filtrando cualquier posible track nulo (ej. canciones locales no disponibles)
    const uris = data.items
    .map(item => item.track?.uri)
    .filter((uri): uri is string => !!uri); // Filtro de tipo para asegurar que solo tenemos strings
    
    allTrackUris.push(...uris);
    
    nextUrl = data.next;
  } while (nextUrl);
  
  return allTrackUris;
}

export async function getUserPlaylists(accessToken: string): Promise<PlaylistsApiResponse> {
  const response = await fetch(`${SPOTIFY_API_BASE}/me/playlists?limit=50`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    // En el futuro, manejaremos los errores de forma más elegante
    throw new Error("Failed to fetch playlists");
  }
  
  return response.json();
}