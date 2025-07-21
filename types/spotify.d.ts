// types/spotify.d.ts

// Esta es una técnica llamada "declaration merging".
// Le decimos a TypeScript que queremos añadir una nueva propiedad a la interfaz existente.
declare module '@/types/spotify' {
  interface SpotifyPlaylist {
    isSyncable?: boolean; // true si la playlist tiene metadatos para sincronizar.
    isFrozen?: boolean;
  }
}

export type PlaylistType = 'MEGALIST' | 'SURPRISE';

// Usaremos esto para representar una playlist en nuestra UI
export interface SpotifyPlaylist {
  id: string;
  name: string;
  images: { url: string; }[];
  tracks: {
    total: number;
  };
  owner: {
    display_name: string;
  };
  description?: string;
  isMegalist?: boolean;
  playlistType?: PlaylistType;
  isFrozen?: boolean;
}

// Representa un único track de una playlist
export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string; // El identificador único para añadir a la cola o a una playlist
  type: string;
  album: {
    name: string;
    images: { url: string; }[];
  };
  artists: {
    name: string;
  }[];
}

// Tipo que describe los datos enriquecidos que vienen de la db
export interface MegalistClientData {
  isMegalist: true;
  isSyncable: boolean;
  type: PlaylistType;
  isFrozen: boolean;
}

/**
* Representa una respuesta estandarizada para las server actions.
* @template T El tipo de los datos devueltos en caso de éxito.
*/
export type ActionResult<T> =
| { success: true; data: T }
| { success: false; error: string };