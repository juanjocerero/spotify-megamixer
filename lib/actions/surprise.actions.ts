// lib/actions/surprise.actions.ts (NUEVO FICHERO)

'use server';
import { auth } from '@/auth';
import { db } from '../db';
import { shuffleArray } from '../utils';
import { ActionResult, SpotifyPlaylist } from '@/types/spotify';
import { findUserPlaylistByName, replacePlaylistTracks, createNewPlaylist, getPlaylistDetails } from '../spotify';
import { getTrackUris } from './spotify.actions';

export async function getUniqueTrackCountFromPlaylistsAction(playlistIds: string[]): Promise<number> {
  try {
    const uniqueTrackUris = await getTrackUris(playlistIds);
    return uniqueTrackUris.length;
  } catch (error) {
    console.error('[ACTION_ERROR:getUniqueTrackCount]', error);
    throw error;
  }
}

/**
* Crea o sobrescribe una playlist "Sorpresa".
* - Si no se provee `playlistIdToOverwrite`, crea una nueva playlist.
* - Si se provee, sobrescribe la playlist existente con ese ID.
* @param sourcePlaylistIds - IDs de las playlists de las que obtener canciones.
* @param targetTrackCount - Número de canciones que tendrá la playlist final.
* @param newPlaylistName - Nombre para la nueva playlist (o para renombrar la existente, aunque la API de Spotify no lo soporte en una sola llamada).
* @param playlistIdToOverwrite - (Opcional) El ID de la playlist a sobrescribir.
*/
export async function createOrUpdateSurpriseMixAction(
  sourcePlaylistIds: string[],
  targetTrackCount: number,
  newPlaylistName: string,
  playlistIdToOverwrite?: string
): Promise<ActionResult<SpotifyPlaylist>> {
  console.log(
    `[ACTION:createOrUpdateSurpriseMixAction] Iniciando. Modo: ${
      playlistIdToOverwrite ? 'Sobrescribir' : 'Crear'
    }`
  );
  
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    return { success: false, error: 'No autenticado, token o ID de usuario no disponible.' };
  }
  const { accessToken, user } = session;
  
  try {
    // Validar si la playlist ya existe (solo en modo creación)
    if (!playlistIdToOverwrite) {
      const existingPlaylist = await findUserPlaylistByName(
        accessToken,
        newPlaylistName
      );
      if (existingPlaylist) {
        // Lanzamos un error específico que la UI puede interceptar para pedir confirmación.
        return { success: false, error: `PLAYLIST_EXISTS::${existingPlaylist.id}` };
      }
    }
    
    // Obtener y seleccionar canciones
    const allUniqueTracksUris = await getTrackUris(sourcePlaylistIds);
    if (allUniqueTracksUris.length < targetTrackCount) {
      // Lanzamos un error si no hay suficientes canciones disponibles.
      return {
        success: false,
        error: `El número de canciones solicitado (${targetTrackCount}) excede las canciones únicas disponibles (${allUniqueTracksUris.length}).`
      };
    }
    const finalShuffledTracksUris = shuffleArray(allUniqueTracksUris).slice(
      0,
      targetTrackCount
    );
    
    let finalPlaylistId = playlistIdToOverwrite;
    let playlistObject: SpotifyPlaylist;
    
    // Actuar en Spotify (Crear o Sobrescribir)
    if (finalPlaylistId) {
      // Modo Sobrescribir
      console.log(`[Spotify] Sobrescribiendo playlist ${finalPlaylistId}...`);
      await replacePlaylistTracks(
        accessToken,
        finalPlaylistId,
        finalShuffledTracksUris
      );
      // Obtenemos los detalles actualizados
      playlistObject = await getPlaylistDetails(accessToken, finalPlaylistId);
      
    } else {
      // Modo Crear
      console.log(`[Spotify] Creando nueva playlist llamada "${newPlaylistName}"...`);
      const newPlaylist = await createNewPlaylist(
        accessToken,
        user.id,
        newPlaylistName
      );
      await replacePlaylistTracks(
        accessToken,
        newPlaylist.id,
        finalShuffledTracksUris
      );
      finalPlaylistId = newPlaylist.id;
      playlistObject = newPlaylist;
    }
    
    if (!finalPlaylistId) {
      return { success: false, error: "No se pudo obtener un ID de playlist final." };
    }
    
    // Actuar en la base de datos (crear o actualizar) usando upsert
    console.log(`[DB] Realizando upsert para la playlist ${finalPlaylistId}...`);
    await db.megalist.upsert({
      where: { id: finalPlaylistId },
      update: {
        sourcePlaylistIds: sourcePlaylistIds,
        trackCount: finalShuffledTracksUris.length,
        type: 'SURPRISE',
        updatedAt: new Date(),
      },
      create: {
        id: finalPlaylistId,
        spotifyUserId: user.id,
        sourcePlaylistIds: sourcePlaylistIds,
        trackCount: finalShuffledTracksUris.length,
        type: 'SURPRISE',
      },
    });
    
    // Devolver el objeto enriquecido para la caché del cliente
    const enrichedPlaylist: SpotifyPlaylist = {
      ...playlistObject,
      isMegalist: true, // Una "Sorpresa" es un tipo de Megalista gestionada por la app.
      isSyncable: false, // Las listas sorpresa no son sincronizables.
      playlistType: 'SURPRISE',
      tracks: {
        ...playlistObject.tracks,
        total: finalShuffledTracksUris.length,
      },
    };
    
    return { success: true, data: enrichedPlaylist };
  } catch (error) {
    // Re-lanzar el error para que el cliente lo pueda gestionar (especialmente el PLAYLIST_EXISTS).
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al crear la lista sorpresa.";
    return { success: false, error: errorMessage };
  }
}