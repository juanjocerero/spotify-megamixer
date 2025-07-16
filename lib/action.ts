// /lib/actions.ts
'use server'; // ¡Muy importante! Esto marca todas las funciones exportadas como Server Actions.

import { auth } from '@/auth';
import { SpotifyPlaylist } from '@/types/spotify';


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