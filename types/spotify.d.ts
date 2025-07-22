// types/spotify.d.ts

// Representa un único track de una playlist
export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string; // El identificador único para añadir a la cola o a una playlist
  type: string;
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
}

export interface SpotifyArtist {
  name: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string }[];
  artists: SpotifyArtist[];
  uri: string;
}

// Tipo que describe los datos enriquecidos que vienen de la db
export interface MegalistClientData {
  isMegalist: true;
  isSyncable: boolean;
  type: PlaylistType;
  isFrozen: boolean;
}

export type PlaylistType = 'MEGALIST' | 'SURPRISE';

// Interfaz SpotifyPlaylist consolidada y unificada
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { id: string; display_name: string };
  uri: string;
  
  // Propiedades personalizadas para la lógica de la aplicación
  isMegalist?: boolean;
  isSyncable?: boolean;
  isFrozen?: boolean;
  playlistType?: PlaylistType;
}

/**
* Representa una respuesta estandarizada para las server actions.
* @template T El tipo de los datos devueltos en caso de éxito.
*/
export type ActionResult<T> =
| { success: true; data: T }
| { success: false; error: string };
