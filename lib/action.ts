// /lib/actions.ts
'use server'; // ¡Muy importante! Esto marca todas las funciones exportadas como Server Actions.

import { auth } from '@/auth';
import { SpotifyPlaylist } from '@/types/spotify';
import { getAllPlaylistTracks } from './spotify';

interface PlaylistsApiResponse {
    items: SpotifyPlaylist[];
    next: string | null;
}

export async function fetchMorePlaylists(url: string): Promise<PlaylistsApiResponse> {
    const session = await auth();
    if (!session?.accessToken) {
        throw new Error('Not authenticated');
    }
    
    // A diferencia de la primera carga, aquí usamos la URL completa que nos da Spotify.
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${session.accessToken}`,
        },
    });
    
    if (!response.ok) {
        console.error('Failed to fetch more playlists:', await response.json());
        throw new Error('Failed to fetch more playlists');
    }
    
    const data = await response.json();
    
    // Devolvemos solo lo que necesitamos: los nuevos items y la siguiente URL.
    return {
        items: data.items,
        next: data.next,
    };
}

export async function createMegaPlaylist(
    playlistIds: string[],
    newPlaylistName: string
) {
    const session = await auth();
    if (!session?.accessToken) {
        return { success: false, message: 'No estás autenticado.', trackCount: 0 };
    }
    const { accessToken } = session;
    
    console.log(`[ACCIÓN DE SERVIDOR] Iniciando la creación de la Megamix "${newPlaylistName}"...`);
    console.log(`[ACCIÓN DE SERVIDOR] Obteniendo canciones de ${playlistIds.length} playlists.`);
    
    try {
        // 1. Obtener todas las canciones de todas las playlists en paralelo
        const trackPromises = playlistIds.map(id => 
            getAllPlaylistTracks(accessToken, id)
        );
        const tracksPerPlaylist = await Promise.all(trackPromises);
        
        // 2. Combinar todas las canciones en un único array
        const allTrackUris = tracksPerPlaylist.flat();
        console.log(`[ACCIÓN DE SERVIDOR] Total de canciones obtenidas (con duplicados): ${allTrackUris.length}`);
        
        // 3. Eliminar duplicados de forma eficiente
        const uniqueTrackUris = [...new Set(allTrackUris)];
        console.log(`[ACCIÓN DE SERVIDOR] Canciones únicas encontradas: ${uniqueTrackUris.length}`);
        
        // --- PUNTO DE CONTROL ---
        // Por ahora, solo devolvemos éxito y la cuenta.
        // En el siguiente paso, usaremos 'uniqueTrackUris' para modificar Spotify.
        
        return {
            success: true,
            message: `Se han recopilado ${uniqueTrackUris.length} canciones únicas para "${newPlaylistName}".`,
            trackCount: uniqueTrackUris.length,
        };
        
    } catch (error) {
        console.error('[ACCIÓN DE SERVIDOR] Error creando la Megamix:', error);
        return {
            success: false,
            message: 'Ha ocurrido un error al obtener las canciones de las playlists.',
            trackCount: 0,
        };
    }
}