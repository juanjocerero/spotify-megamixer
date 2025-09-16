// lib/actions/player.actions.ts

'use server';

import { headers } from 'next/headers';
import { auth } from '@/auth';
import { ActionResult, SpotifyTrack } from '@/types/spotify';

/**
* @internal
* Define la estructura de la respuesta esperada de la API de Spotify
* para el endpoint `currently-playing`.
*/
interface CurrentlyPlayingResponse {
  is_playing: boolean;
  item: SpotifyTrack | null;
}

/**
* Define la estructura de los datos que la Server Action devolverá con éxito
* al cliente si hay una canción activa.
*/
interface CurrentlyPlayingData {
  track: SpotifyTrack;
  is_playing: boolean;
}

/**
* Obtiene la canción que el usuario está reproduciendo actualmente en Spotify.
* Esta acción del servidor se comunica directamente con la API de Spotify.
*
* @returns Una `Promise` que se resuelve en un objeto `ActionResult`.
*   - Si tiene éxito (`success: true`), el campo `data` contendrá:
*     - Un objeto `CurrentlyPlayingData` si una canción está sonando activamente.
*     - `null` si no hay nada sonando, la reproducción está en pausa o la respuesta
*       de la API es 204 No Content.
*   - Si falla (`success: false`), el campo `error` contendrá un mensaje
*     descriptivo del error.
*/
export async function getCurrentlyPlayingAction(): Promise<
ActionResult<CurrentlyPlayingData | null>
> {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session) {
    return { success: false, error: 'No autenticado.' };
  }
  
  try {
    const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'spotify' },
        headers: new Headers(await headers())
    });
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        // Se deshabilita la caché para esta petición para asegurar datos en tiempo real.
        cache: 'no-store',
      },
    );
    
    // Si la respuesta es 204, significa que no hay contenido (nada sonando).
    // Es un caso de éxito, pero sin datos.
    if (response.status === 204) {
      return { success: true, data: null };
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[ACTION_ERROR:getCurrentlyPlayingAction]', errorData);
      throw new Error(
        'No se pudo obtener la información de reproducción de Spotify.',
      );
    }
    
    const data: CurrentlyPlayingResponse = await response.json();
    
    // Solo devolvemos datos si existe un 'item' (la canción) y 'is_playing' es true.
    if (data.item && data.is_playing) {
      return {
        success: true,
        data: { track: data.item, is_playing: data.is_playing },
      };
    }
    
    // En cualquier otro caso (ej: en pausa), se considera que no hay una canción activa para mostrar.
    return { success: true, data: null };
  } catch (error) {
    const errorMessage =
    error instanceof Error
    ? error.message
    : 'Error desconocido al consultar la reproducción actual.';
    return { success: false, error: errorMessage };
  }
}