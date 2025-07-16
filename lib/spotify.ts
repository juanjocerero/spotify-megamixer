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

interface UserPlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
  total: number;
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


/**
* Busca una playlist de un usuario por su nombre.
* La búsqueda es insensible a mayúsculas y minúsculas.
* @returns El objeto de la playlist si se encuentra, si no, null.
*/
export async function findUserPlaylistByName(
  accessToken: string,
  name: string
): Promise<SpotifyPlaylist | null> {
  let url: string | null = `${SPOTIFY_API_BASE}/me/playlists?limit=50`;
  const lowerCaseName = name.toLowerCase();
  
  // Usamos un bucle 'while' en lugar de 'do...while' para tener un control más claro del flujo.
  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      throw new Error("Fallo al obtener las playlists del usuario.");
    }
    
    // <<<<<<< PASO CLAVE >>>>>>>
    // Tipamos explícitamente el resultado de response.json() al asignarlo a 'data'.
    // Esto informa a TypeScript de la "forma" exacta de los datos.
    const data: UserPlaylistsApiResponse = await response.json();
    
    // Ahora TypeScript sabe que 'data.items' es un array de SpotifyPlaylist.
    const foundPlaylist = data.items.find(
      (playlist) => playlist.name.toLowerCase() === lowerCaseName
    );
    
    if (foundPlaylist) {
      // Si la encontramos, la devolvemos y salimos del bucle.
      return foundPlaylist;
    }
    
    // Reasignamos la variable 'url' para la siguiente iteración.
    // TypeScript ahora sabe que 'data.next' es de tipo 'string | null',
    // lo que coincide con el tipo de 'url', eliminando el error de asignación implícita.
    url = data.next;
  }
  
  // Si el bucle termina (porque url se vuelve null), significa que no encontramos nada.
  return null;
}

/**
* Crea una nueva playlist vacía para un usuario.
* @returns El objeto de la playlist recién creada.
*/
export async function createNewPlaylist(
  accessToken: string,
  userId: string,
  name: string
): Promise<SpotifyPlaylist> {
  const response = await fetch(`${SPOTIFY_API_BASE}/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      description: `Megalista generada por Spotify Megamixer el ${new Date().toLocaleDateString()}`,
      public: false, // Las creamos como privadas por defecto
    }),
  });
  
  if (!response.ok) {
    throw new Error("Fallo al crear la nueva playlist.");
  }
  return response.json();
}

/**
* Elimina todas las canciones de una playlist.
* @param accessToken - El token de acceso del usuario.
* @param playlistId - El ID de la playlist a vaciar.
*/
export async function clearPlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<void> {
  // La API de Spotify vacía una playlist haciendo una petición PUT con un array de URIs vacío.
  const response = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [] }),
  });
  
  if (!response.ok) {
    throw new Error("Fallo al limpiar la playlist.");
  }
}

/**
* Añade canciones a una playlist en lotes de 100.
* @param accessToken - El token de acceso del usuario.
* @param playlistId - El ID de la playlist a la que se añadirán las canciones.
* @param trackUris - Un array de URIs de las canciones a añadir.
*/
export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  const spotifyApiUrl = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`;
  
  // La API de Spotify solo permite añadir 100 canciones a la vez.
  const batchSize = 100;
  
  for (let i = 0; i < trackUris.length; i += batchSize) {
    const batch = trackUris.slice(i, i + batchSize);
    
    const response = await fetch(spotifyApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: batch }),
    });
    
    if (!response.ok) {
      console.error(`Fallo al añadir un lote de canciones a la playlist ${playlistId}`);
      throw new Error('Fallo al añadir canciones a la playlist.');
    }
    
    console.log(`[SPOTIFY_API] Añadido un lote de ${batch.length} canciones.`);
  }
}