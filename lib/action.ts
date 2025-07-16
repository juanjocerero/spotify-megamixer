// /lib/actions.ts
'use server'; // ¡Muy importante! Esto marca todas las funciones exportadas como Server Actions.

import { auth } from '@/auth';
import { SpotifyPlaylist } from '@/types/spotify';
import { 
    getAllPlaylistTracks, 
    findUserPlaylistByName, 
    createNewPlaylist, 
    clearPlaylistTracks
} from './spotify';

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
    if (!session?.accessToken || !session.user?.id) {
        return { success: false, message: 'No estás autenticado.' };
    }
    const { accessToken, user } = session;
    
    console.log(`[ACCIÓN] Iniciando proceso para Megamix "${newPlaylistName}"...`);
    
    try {
        // ---- PASO 1 (sin cambios): OBTENER Y UNIFICAR CANCIONES ----
        const trackPromises = playlistIds.map(id => getAllPlaylistTracks(accessToken, id));
        const tracksPerPlaylist = await Promise.all(trackPromises);
        const uniqueTrackUris = [...new Set(tracksPerPlaylist.flat())];
        console.log(`[ACCIÓN] ${uniqueTrackUris.length} canciones únicas encontradas.`);
        
        // ---- PASO 2: BUSCAR PLAYLIST EXISTENTE ----
        const existingPlaylist = await findUserPlaylistByName(accessToken, newPlaylistName);
        
        if (existingPlaylist) {
            console.log(`[ACCIÓN] Playlist existente encontrada: ${existingPlaylist.name} (ID: ${existingPlaylist.id})`);
            // Devolvemos un estado que requiere confirmación del frontend
            return {
                success: false,
                requiresConfirmation: true,
                existingPlaylistId: existingPlaylist.id,
                message: `Ya existe una playlist llamada "${existingPlaylist.name}".`,
            };
        }
        
        // ---- PASO 3: CREAR NUEVA PLAYLIST SI NO EXISTE ----
        console.log(`[ACCIÓN] No se encontró playlist existente. Creando una nueva...`);
        const newPlaylist = await createNewPlaylist(accessToken, user.id, newPlaylistName);
        console.log(`[ACCIÓN] Nueva playlist creada: ${newPlaylist.name} (ID: ${newPlaylist.id})`);
        
        // --- PUNTO DE CONTROL ---
        // Todavía no añadimos las canciones.
        
        return {
            success: true,
            requiresConfirmation: false,
            message: `¡Éxito! Se ha creado la nueva playlist (vacía) "${newPlaylist.name}".`,
            newPlaylistId: newPlaylist.id, // Devolvemos el ID para el siguiente paso
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
export async function overwritePlaylist(playlistId: string) {
    const session = await auth();
    if (!session?.accessToken) {
        return { success: false, message: 'No estás autenticado.' };
    }
    
    console.log(`[SOBREESCRIBIR] Iniciando limpieza de la playlist ID: ${playlistId}`);
    
    try {
        await clearPlaylistTracks(session.accessToken, playlistId);
        
        console.log(`[SOBREESCRIBIR] Playlist limpiada con éxito.`);
        
        // --- PUNTO DE CONTROL ---
        // Aquí es donde, en el futuro, añadiremos las nuevas canciones.
        
        return {
            success: true,
            message: 'La playlist existente ha sido vaciada con éxito.',
        };
    } catch (error) {
        console.error(`[SOBREESCRIBIR] Error limpiando la playlist:`, error);
        return {
            success: false,
            message: 'Ha ocurrido un error al intentar vaciar la playlist existente.',
        };
    }
}