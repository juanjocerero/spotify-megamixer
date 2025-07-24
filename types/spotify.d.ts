// types/spotify.d.ts

/**
* Representa un único track de una playlist de Spotify.
*/
/**
* Representa un único track (canción) de Spotify.
*/
export interface SpotifyTrack {
  id: string;
  name: string;
  /** El identificador único de la canción, utilizado para añadirla a playlists. */
  uri: string;
  /** El tipo de recurso, ej. "track". */
  type: string;
  /** El álbum al que pertenece la canción. */
  album: SpotifyAlbum;
  /** Un array de artistas que participaron en la canción. */
  artists: SpotifyArtist[];
}

/**
* Representa un único artista de Spotify.
*/
export interface SpotifyArtist {
  name: string;
}

/**
* Representa un álbum de Spotify, incluyendo sus imágenes y artistas.
*/
export interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string }[];
  artists: SpotifyArtist[];
  uri: string;
}

/**
* Estructura de datos que enriquece una playlist de Spotify con metadatos
* específicos de la aplicación, obtenidos de la base de datos local.
*/
export interface MegalistClientData {
  /** Siempre `true` para indicar que es una playlist gestionada por la app. */
  isMegalist: true;
  /** `true` si es una Megalista que se puede sincronizar (no está congelada). */
  isSyncable: boolean;
  /** El tipo de playlist personalizada (`MEGALIST` o `SURPRISE`). */
  type: PlaylistType;
  /** `true` si la Megalista está congelada y no participa en sincronizaciones. */
  isFrozen: boolean;
  /** `true` si la Megalista está aislada y no participa en listas sorpresa. */
  isIsolated: boolean;
}


/**
* Define los tipos de playlists personalizadas gestionadas por la aplicación.
* - `MEGALIST`: Una playlist que se puede sincronizar con otras.
* - `SURPRISE`: Una playlist generada aleatoriamente que no se sincroniza.
*/
export type PlaylistType = 'MEGALIST' | 'SURPRISE' | 'ADOPTED';

/**
* La interfaz consolidada y unificada para una playlist dentro de la aplicación.
* Combina las propiedades estándar de una playlist de la API de Spotify con
* las propiedades personalizadas (`isMegalist`, `isSyncable`, etc.) que
* se añaden en el backend para controlar la lógica de la UI.
*/
export interface SpotifyPlaylist {
  // --- Propiedades estándar de la API de Spotify ---
  id: string;
  name: string;
  description?: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { id: string; display_name: string };
  uri: string;
  
  // --- Propiedades personalizadas añadidas por la aplicación ---
  /** `true` si la playlist es una "Megalista" o "Sorpresa" creada por la app. */
  isMegalist?: boolean;
  /** `true` si la playlist es una Megalista activa y puede ser sincronizada. */
  isSyncable?: boolean;
  /** `true` si la Megalista está "congelada", es decir, no se puede sincronizar. */
  isFrozen?: boolean;
  /** `true` si la Megalista está "congelada", es decir, no puede formar parte de listas sorpresa. */
  isIsolated?: boolean;
  /** Define si es una 'MEGALIST' o una 'SURPRISE'. */
  playlistType?: PlaylistType;
  /** Id de la carpeta que la contiene, si existe. */
  folderId?: string | null;
}

export interface Folder { 
  id: string;
  name: string;
  userId: string; // Para consistencia, aunque no se use directamente en el cliente
  createdAt: Date;
  updatedAt: Date;
}

/**
* Representa una respuesta estandarizada para las Server Actions.
* Es una unión discriminada que asegura que cada acción devuelva
* un resultado predecible, ya sea de éxito o de error.
*
* @template T - El tipo de los datos (`data`) devueltos en caso de éxito.
*/
export type ActionResult<T> =
| { success: true; data: T }
| { success: false; error: string };