// /lib/actions.ts
'use server'; // ¡Muy importante! Esto marca todas las funciones exportadas como Server Actions.

import { auth } from '@/auth';
import { SpotifyPlaylist } from '@/types/spotify';
import { 
    getAllPlaylistTracks, 
    findUserPlaylistByName, 
    createNewPlaylist, 
    clearPlaylistTracks,
    addTracksToPlaylist
} from './spotify';
import { shuffleArray } from './utils';

interface PlaylistsApiResponse {
    items: SpotifyPlaylist[];
    next: string | null;
}

/**
* ACCIÓN 1: Obtiene y prepara las URIs de las canciones.
*/
export async function getTrackUris(playlistIds: string[]) {
    const session = await auth();
    // Comprobación explícita. Si no hay token, la acción falla inmediatamente.
    if (!session?.accessToken) {
        throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session; // Ahora TypeScript sabe que accessToken es un string.
    
    const trackPromises = playlistIds.map(id => getAllPlaylistTracks(accessToken, id));
    const tracksPerPlaylist = await Promise.all(trackPromises);
    const uniqueTrackUris = [...new Set(tracksPerPlaylist.flat())];
    
    return shuffleArray(uniqueTrackUris);
}

/**
* ACCIÓN 2: Encuentra o crea la playlist de destino y la prepara (limpiándola si existe).
*/
export async function findOrCreateAndPreparePlaylist(name: string) {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) {
        throw new Error('No autenticado, token o ID de usuario no disponible.');
    }
    const { accessToken, user } = session;
    
    const existingPlaylist = await findUserPlaylistByName(accessToken, name);
    
    if (existingPlaylist) {
        await clearPlaylistTracks(accessToken, existingPlaylist.id);
        return existingPlaylist.id;
    } else {
        const newPlaylist = await createNewPlaylist(accessToken, user.id, name);
        return newPlaylist.id;
    }
}

/**
* ACCIÓN 3: Añade un lote de canciones a una playlist.
*/
export async function addTracksBatch(playlistId: string, trackUrisBatch: string[]) {
    const session = await auth();
    // <<<<<<< CORRECCIÓN >>>>>>>
    if (!session?.accessToken) {
        throw new Error('No autenticado o token no disponible.');
    }
    const { accessToken } = session;
    
    await addTracksToPlaylist(accessToken, playlistId, trackUrisBatch);
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
    if (!session?.accessToken || !session.user?.id) {
        return { success: false, message: 'No estás autenticado.' };
    }
    const { accessToken, user } = session;
    
    console.log(`[ACCIÓN] Iniciando proceso para Megamix "${newPlaylistName}"...`);
    
    try {
        const trackPromises = playlistIds.map(id => getAllPlaylistTracks(accessToken, id));
        const tracksPerPlaylist = await Promise.all(trackPromises);
        const uniqueTrackUris = [...new Set(tracksPerPlaylist.flat())];
        
        const existingPlaylist = await findUserPlaylistByName(accessToken, newPlaylistName);
        
        if (existingPlaylist) {
            return {
                success: false,
                requiresConfirmation: true,
                existingPlaylistId: existingPlaylist.id,
                message: `Ya existe una playlist llamada "${existingPlaylist.name}".`,
                trackUris: uniqueTrackUris, // <<<<<<< Devolvemos las URIs para el siguiente paso
            };
        }
        
        const newPlaylist = await createNewPlaylist(accessToken, user.id, newPlaylistName);
        
        const shuffledTracks = shuffleArray(uniqueTrackUris);
        await addTracksToPlaylist(accessToken, newPlaylist.id, shuffledTracks);
        
        return {
            success: true,
            requiresConfirmation: false,
            message: `¡Éxito! Se ha creado y llenado la playlist "${newPlaylist.name}" con ${shuffledTracks.length} canciones.`,
        };
        
    } catch (error) {
        console.error('[ACCIÓN] Error crítico creando la Megamix:', error);
        return {
            success: false,
            message: 'Ha ocurrido un error en el servidor al procesar tu solicitud.',
        };
    }
}

/**
* Acción para sobrescribir una playlist existente.
* Por ahora, solo la vaciará.
* @param playlistId - El ID de la playlist a sobrescribir.
*/
export async function overwritePlaylist(
    playlistId: string,
    trackUris: string[]
) {
    const session = await auth();
    if (!session?.accessToken) {
        return { success: false, message: 'No estás autenticado.' };
    }
    const { accessToken } = session;
    
    console.log(`[SOBREESCRIBIR] Iniciando limpieza de la playlist ID: ${playlistId}`);
    
    try {
        await clearPlaylistTracks(accessToken, playlistId);
        
        const shuffledTracks = shuffleArray(trackUris);
        await addTracksToPlaylist(accessToken, playlistId, shuffledTracks);
        
        return {
            success: true,
            message: `La playlist ha sido sobrescrita con ${shuffledTracks.length} canciones.`,
        };
    } catch (error) {
        console.error(`[SOBREESCRIBIR] Error limpiando la playlist:`, error);
        return {
            success: false,
            message: 'Ha ocurrido un error al intentar vaciar la playlist existente.',
        };
    }
}