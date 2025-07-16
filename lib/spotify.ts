// /lib/spotify.ts
import { SpotifyPlaylist } from "@/types/spotify.d";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// Definimos la estructura de la respuesta de la API para las playlists
interface PlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
  // ... y otros campos que no usaremos por ahora
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