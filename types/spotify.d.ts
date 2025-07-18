// types/spotify.d.ts

// Esta es una técnica llamada "declaration merging".
// Le decimos a TypeScript que queremos añadir una nueva propiedad a la interfaz existente.
declare module '@/types/spotify' {
  interface SpotifyPlaylist {
    isSyncable?: boolean; // true si la playlist tiene metadatos para sincronizar.
  }
}

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
  // Podemos añadir más campos de la API de Spotify aquí si los necesitamos
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