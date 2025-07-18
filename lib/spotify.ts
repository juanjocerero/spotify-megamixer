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
  const allTrackUris: string[] = [];
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

/**
* Obtiene el objeto completo de una playlist por su ID.
* @param accessToken - El token de acceso del usuario.
* @param playlistId - El ID de la playlist a obtener.
* @returns Una promesa que se resuelve al objeto completo de la playlist.
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
* Parsea la descripción de una playlist para extraer los IDs de sus fuentes.
* @param playlist - El objeto de la playlist.
* @returns Un array de IDs de las fuentes, o null si no es una Megalista sincronizable.
*/
export function getSourcePlaylistIds(playlist: SpotifyPlaylist): string[] | null {
  if (!playlist.description) {
    return null;
  }
  
  // Usamos una expresión regular para encontrar y extraer el contenido de nuestra etiqueta.
  const match = playlist.description.match(/<!-- MEGAMIXER_SOURCES:\[(.*?)] -->/);
  
  // match[0] es el texto completo, match[1] es el contenido del primer grupo de captura (.*?)
  if (match && match[1]) {
    // Si encontramos una coincidencia y tiene contenido, lo dividimos por la coma.
    return match[1].split(',');
  }
  
  return null;
}


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
  name: string,
  sourcePlaylistIds: string[] 
): Promise<SpotifyPlaylist> {
  const DESCRIPTION_CHAR_LIMIT = 4000; // Límite de seguridad para la descripción de Spotify.
  const baseDescription = `Generada por Spotify Megamixer el ${new Date().toLocaleDateString()}. <!-- MEGAMIXER_APP_V1 -->`;
  const sourcesTag = sourcePlaylistIds.length > 0 ? ` <!-- MEGAMIXER_SOURCES:[${sourcePlaylistIds.join(',')}] -->` : '';
  
  const fullDescription = baseDescription + sourcesTag;
  let finalDescription = baseDescription;
  
  if (fullDescription.length < DESCRIPTION_CHAR_LIMIT) {
    finalDescription = fullDescription;
    console.log('[SPOTIFY_API] Creando playlist con metadatos de sincronización.');
  } else {
    // Si la descripción es demasiado larga, la creamos sin los metadatos de las fuentes.
    // La playlist seguirá funcionando, pero no será sincronizable.
    console.warn('[SPOTIFY_API] La descripción es demasiado larga. Creando playlist sin metadatos de sincronización.');
  }
  
  const response = await fetch(`${SPOTIFY_API_BASE}/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      // Añadimos un identificador único en la descripción para poder identificarla después como propia
      description: finalDescription,
      public: false, // Las creamos como privadas por defecto
    }),
  });
  
  if (!response.ok) {
    throw new Error('Fallo al crear la nueva playlist.');
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

/**
* Reemplaza todas las canciones de una playlist con un nuevo conjunto de URIs.
* Esta función primero vacía la playlist y luego añade las nuevas canciones en lotes.
* @param accessToken - El token de acceso del usuario.
* @param playlistId - El ID de la playlist a modificar.
* @param trackUris - El array completo de las nuevas URIs para la playlist.
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