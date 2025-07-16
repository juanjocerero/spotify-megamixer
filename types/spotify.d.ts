// types/spotify.d.ts

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
  // Podemos añadir más campos de la API de Spotify aquí si los necesitamos
}

// Representa un único track de una playlist
export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string; // El identificador único para añadir a la cola o a una playlist
  album: {
    name: string;
    images: { url: string; }[];
  };
  artists: {
    name: string;
  }[];
}