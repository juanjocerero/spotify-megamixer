// lib/actions/spotify.actions.ts

'use server';

import { auth } from '@/auth';
import { db } from '../db';
import { getPlaylistTracksPage, getAllPlaylistTracks } from '../spotify';
import { SpotifyPlaylist, MegalistClientData } from '@/types/spotify';
import { Megalist } from '@prisma/client';

interface PlaylistsApiResponse {
  items: SpotifyPlaylist[];
  next: string | null;
}

/**
* Obtiene y prepara las URIs de las canciones.
*/
export async function getTrackUris(playlistIds: string[]) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    const trackPromises = playlistIds.map((id) =>
      getAllPlaylistTracks(accessToken, id).then(tracks => tracks.map(t => t.uri)));
    const tracksPerPlaylist = await Promise.all(trackPromises);
    
    const uniqueTrackUris = [...new Set(tracksPerPlaylist.flat())];
    // Se elimina la llamada a shuffleArray. La función ahora es neutral.
    return uniqueTrackUris; 
  } catch (error) {
    console.error('[ACTION_ERROR:getTrackUris] Fallo al obtener las URIs.', error);
    throw error;
  }
}

export async function fetchMorePlaylists(
  url: string
): Promise<PlaylistsApiResponse> {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to fetch more playlists:', errorData);
      throw new Error(`Failed to fetch more playlists. Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // La lógica de enriquecimiento que ya corregimos antes
    const playlistIds = data.items.map((p: SpotifyPlaylist) => p.id);
    const userMegalists = await db.megalist.findMany({
      where: {
        id: { in: playlistIds },
        spotifyUserId: session.user.id
      },
    });
    
    const megalistDataMap = new Map<string, MegalistClientData>(
      userMegalists.map((m: Megalist) => [
        m.id,
        {
          isMegalist: true,
          isSyncable: m.type === 'MEGALIST' && !m.isFrozen,
          type: m.type,
          isFrozen: m.isFrozen,
        },
      ])
    );
    
    const finalPlaylists: SpotifyPlaylist[] = data.items.map((p: SpotifyPlaylist) => {
      const megalistData = megalistDataMap.get(p.id);
      if (megalistData) {
        return {
          ...p,
          isMegalist: megalistData.isMegalist,
          isSyncable: megalistData.isSyncable,
          playlistType: megalistData.type,
          isFrozen: megalistData.isFrozen,
        };
      }
      return p;
    });
    
    return {
      items: finalPlaylists,
      next: data.next,
    };
  } catch (error) {
    console.error('[ACTION_ERROR:fetchMorePlaylists] Fallo al cargar más playlists.', error);
    throw error;
  }
}

export async function getPlaylistTracksDetailsAction(
  playlistId: string,
  fetchUrl?: string | null
): Promise<{ tracks: { name: string; artists: string }[]; next: string | null }> {
  console.log(`[ACTION:getPlaylistTracksDetailsAction] Obteniendo página de tracks para ${playlistId}`);
  try {
    const session = await auth();
    if (!session?.accessToken) {
      throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    // Construye la URL inicial si no se proporciona una. Limitamos a 75 para una carga rápida.
    const urlToFetch =
    fetchUrl ||
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(name,artists(name),type,uri)),next&limit=75`;
    
    const { tracks: detailedTracks, next } = await getPlaylistTracksPage(accessToken, urlToFetch);
    
    console.log(`[ACTION:getPlaylistTracksDetailsAction] Obtenidos ${detailedTracks.length} tracks.`);
    
    const tracksForClient = detailedTracks.map(track => ({
      name: track.name,
      artists: track.artists
    }));
    
    return { tracks: tracksForClient, next };
    
  } catch (error) {
    console.error(`[ACTION_ERROR:getPlaylistTracksDetailsAction] Fallo al obtener página de tracks para ${playlistId}.`, error);
    throw error;
  }
}