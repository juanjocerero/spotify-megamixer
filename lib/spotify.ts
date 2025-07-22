// /lib/spotify.ts
import { SpotifyPlaylist, SpotifyTrack } from "@/types/spotify.d";

/**
* Este fichero actúa como una capa de bajo nivel para interactuar con la API Web de Spotify.
* Abstrae las llamadas `fetch` y maneja la paginación y la lógica específica de cada endpoint,
* proporcionando funciones más simples y reutilizables para las Server Actions.
*/

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

/** @internal */
// Definimos la estructura de la respuesta de la API para las playlists
interface PlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
  // ... y otros campos que no usaremos por ahora
}

/** @internal */
// Definimos la estructura que esperamos de la API de tracks
interface PlaylistTracksApiResponse {
  items: { track: SpotifyTrack | null }[];
  next: string | null;
}

/** @internal */
interface UserPlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
  total: number;
}

/**
* Obtiene TODAS las canciones de una playlist, manejando automáticamente la paginación.
* Filtra pistas locales o que no sean canciones (ej. podcasts).
* @param accessToken - Token de acceso de Spotify.
* @param playlistId - El ID de la playlist.
* @returns Una promesa que se resuelve a un array de objetos con detalles de cada canción.
*/
export async function getAllPlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<{ uri: string; name: string; artists: string; }[]> { // <-- ¡Tipo de retorno actualizado!
  const allTracksDetails: { uri: string; name: string; artists: string; }[] = []; // <-- ¡Nuevo array para almacenar los detalles!
  // Incluimos 'name' y 'artists(name)' en los campos de la petición
  let nextUrl: string | null = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?fields=items(track(uri,name,artists(name),type)),next&limit=100`; // <-- ¡Campos actualizados!
  
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
    const tracksInBatch = data.items
    .filter(item => item && item.track && item.track.type === 'track' && item.track.uri && !item.track.uri.startsWith('spotify:local:'))
    .map(item => ({
      uri: item.track!.uri,
      name: item.track!.name,
      artists: item.track!.artists.map(artist => artist.name).join(', '), // Unir nombres de artistas
    }));
    allTracksDetails.push(...tracksInBatch); // <-- ¡Guardar los objetos con detalles!
    nextUrl = data.next;
  } while (nextUrl);
  
  return allTracksDetails;
}

/**
* Obtiene una ÚNICA PÁGINA de canciones de una playlist desde una URL específica.
* @param accessToken - Token de acceso de Spotify.
* @param url - La URL completa para la página de tracks a obtener.
* @returns Una promesa que se resuelve a un objeto con los tracks de esa página y la URL de la siguiente.
*/
export async function getPlaylistTracksPage(
  accessToken: string,
  url: string
): Promise<{ tracks: { uri: string; name: string; artists: string }[]; next: string | null }> {
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Fallo al obtener la página de tracks de la playlist:`, errorData);
    throw new Error(`Fallo al obtener la página de tracks de la playlist`);
  }
  
  const data: PlaylistTracksApiResponse = await response.json();
  
  const tracksInBatch = data.items
  .filter(item => item && item.track && item.track.type === 'track' && item.track.uri && !item.track.uri.startsWith('spotify:local:'))
  .map(item => ({
    uri: item.track!.uri,
    name: item.track!.name,
    artists: item.track!.artists.map(artist => artist.name).join(', '),
  }));
  
  return { tracks: tracksInBatch, next: data.next };
}

/**
* Obtiene el objeto completo de una playlist por su ID.
* @param accessToken - El token de acceso del usuario.
* @param playlistId - El ID de la playlist a obtener.
* @returns El objeto completo de la playlist.
*/
export async function getPlaylistDetails(
  accessToken: string,
  playlistId: string
): Promise<SpotifyPlaylist> {
  const url = `${SPOTIFY_API_BASE}/playlists/${playlistId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Fallo al obtener los detalles de la playlist ${playlistId}:`, errorData);
    throw new Error(`Fallo al obtener los detalles de la playlist ${playlistId}`);
  }
  
  return response.json();
}

/**
* Obtiene la primera página de playlists del usuario actual (máximo 50).
* @param accessToken - El token de acceso del usuario.
* @returns La respuesta de la API con el primer lote de playlists y la URL para la siguiente página.
*/
export async function getUserPlaylists(accessToken: string): Promise<PlaylistsApiResponse> {
  const fields = "items(id,name,description,images,owner,tracks(total)),next";
  const url = `${SPOTIFY_API_BASE}/me/playlists?limit=50&fields=${encodeURIComponent(fields)}`;
  
  const response = await fetch(url, {
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
* Busca una playlist de un usuario por su nombre exacto (insensible a mayúsculas/minúsculas).
* Pagina a través de todas las playlists del usuario hasta encontrarla.
* @param accessToken - El token de acceso del usuario.
* @param name - El nombre de la playlist a buscar.
* @returns El objeto de la playlist si se encuentra; de lo contrario, `null`.
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
* Crea una nueva playlist vacía, privada y no colaborativa para el usuario.
* @param accessToken - El token de acceso del usuario.
* @param userId - El ID del usuario de Spotify.
* @param name - El nombre para la nueva playlist.
* @returns El objeto de la playlist recién creada.
*/
export async function createNewPlaylist(
  accessToken: string,
  userId: string,
  name: string,
): Promise<SpotifyPlaylist> {
  
  const response = await fetch(`${SPOTIFY_API_BASE}/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      // Añadimos un identificador único en la descripción para poder identificarla después como propia
      description: `Generada por Spotify Megamixer el ${new Date().toLocaleDateString()}.`,
      public: false, // Las creamos como privadas por defecto
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('[SPOTIFY_API_ERROR_DETAILS]', errorData); 
    throw new Error(`Spotify respondió con ${response.status}: ${errorData.error?.message || 'Error desconocido al crear la playlist.'}`);
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
* Añade canciones a una playlist, manejando la división en lotes de 100 y reintentos básicos de rate-limiting.
* @param accessToken - El token de acceso del usuario.
* @param playlistId - El ID de la playlist de destino.
* @param trackUris - Un array con todas las URIs de canciones a añadir.
*/
export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  const spotifyApiUrl = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`;
  const batchSize = 100; // La API de Spotify solo permite añadir 100 canciones a la vez.
  
  let i = 0;
  while (i < trackUris.length) {
    const batch = trackUris.slice(i, i + batchSize);
    
    const response = await fetch(spotifyApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: batch }),
    });
    
    if (response.ok) {
      console.log(
        `[SPOTIFY_API] Añadido un lote de ${batch.length} canciones.`
      );
      i += batchSize; // El lote fue exitoso, avanzamos al siguiente.
      
      // NUEVO: Throttling proactivo. Pequeña pausa para no saturar la API.
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms de espera
      continue; // Pasamos a la siguiente iteración del bucle
    }
    
    // NUEVO: Manejo del error de Rate Limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      // Si el header no viene, esperamos 5 segundos por defecto.
      const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 5;
      
      console.warn(
        `[SPOTIFY_API] Rate limited. Esperando ${waitSeconds} segundos para reintentar.`
      );
      
      // Esperamos el tiempo indicado más un pequeño margen
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000 + 500));
      
      // NO incrementamos 'i', para que el bucle reintente el MISMO lote.
      continue;
    }
    
    // NUEVO: Manejo de otros errores de la API
    const errorData = await response.json();
    console.error(
      `[SPOTIFY_API] Fallo al añadir un lote de canciones a la playlist ${playlistId}`,
      { status: response.status, error: errorData }
    );
    throw new Error(
      `Fallo al añadir canciones. Spotify respondió con ${response.status}: ${
        errorData.error?.message || 'Error desconocido'
      }`
    );
  }
}

export async function removeTracksFromPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  const spotifyApiUrl = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`;
  const batchSize = 100;
  let i = 0;
  while (i < trackUris.length) {
    const batchUris = trackUris.slice(i, i + batchSize);
    const tracksToRemove = batchUris.map(uri => ({ uri }));
    
    const response = await fetch(spotifyApiUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks: tracksToRemove }),
    });
    
    if (response.ok) {
      console.log(
        `[SPOTIFY_API] Eliminado un lote de ${batchUris.length} canciones.`
      );
      i += batchSize;
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 5;
      console.warn(
        `[SPOTIFY_API] Rate limited. Esperando ${waitSeconds} segundos para reintentar la eliminación.`
      );
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000 + 500));
      continue;
    }
    
    const errorData = await response.json();
    console.error(
      `[SPOTIFY_API] Fallo al eliminar un lote de canciones de la playlist ${playlistId}`,
      { status: response.status, error: errorData }
    );
    throw new Error(
      `Fallo al eliminar canciones. Spotify respondió con ${response.status}: ${
        errorData.error?.message || 'Error desconocido'
      }`
    );
  }
}

/**
* Reemplaza TODAS las canciones de una playlist con un nuevo conjunto de canciones.
* Lo hace en dos pasos: primero vacía la playlist y luego añade las nuevas.
* @param accessToken - El token de acceso del usuario.
* @param playlistId - El ID de la playlist a modificar.
* @param trackUris - El nuevo conjunto de URIs de canciones para la playlist.
*/
export async function replacePlaylistTracks(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  // Paso 1: Vaciar la playlist por completo.
  // La API de Spotify lo hace con una petición PUT y un array de URIs vacío.
  await clearPlaylistTracks(accessToken, playlistId);
  
  // Si no hay nuevas canciones que añadir, nuestro trabajo ha terminado.
  if (trackUris.length === 0) {
    console.log(`[SPOTIFY_API] Playlist ${playlistId} vaciada y no hay nuevas canciones que añadir.`);
    return;
  }
  
  // Paso 2: Añadir las nuevas canciones.
  // Reutilizamos la lógica de 'addTracksToPlaylist' que ya es resiliente al rate-limiting.
  console.log(`[SPOTIFY_API] Playlist ${playlistId} vaciada. Añadiendo ${trackUris.length} nuevas canciones...`);
  await addTracksToPlaylist(accessToken, playlistId, trackUris);
}

/**
* Actualiza los detalles de una playlist (nombre, descripción, etc.).
* @param accessToken - El token de acceso del usuario.
* @param playlistId - El ID de la playlist a modificar.
* @param details - Un objeto con los detalles a actualizar.
*/
export async function updatePlaylistDetails(
  accessToken: string,
  playlistId: string,
  details: { name?: string; description?: string; public?: boolean; collaborative?: boolean }
): Promise<void> {
  const response = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(details),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`[SPOTIFY_API] Fallo al actualizar los detalles de la playlist ${playlistId}`, errorData);
    throw new Error(`Spotify respondió con ${response.status} al intentar actualizar los detalles.`);
  }
  
  console.log(`[SPOTIFY_API] Detalles de la playlist ${playlistId} actualizados con éxito.`);
}