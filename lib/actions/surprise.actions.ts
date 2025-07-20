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

export async function createOrUpdateSurpriseMixAction(
  sourcePlaylistIds: string[],
  targetTrackCount: number,
  newPlaylistName: string,
  playlistIdToOverwrite?: string
): Promise<ActionResult<SpotifyPlaylist>> {
  const session = await auth();
  if (!session?.accessToken || !session.user?.id) {
    return { success: false, error: 'No autenticado' };
  }
  const { accessToken, user } = session;
  
  try {
    if (!playlistIdToOverwrite) {
      const existingPlaylist = await findUserPlaylistByName(accessToken, newPlaylistName);
      if (existingPlaylist) {
        return { success: false, error: `PLAYLIST_EXISTS::${existingPlaylist.id}` };
      }
    }
    
    const allUniqueTracksUris = await getTrackUris(sourcePlaylistIds);
    if (allUniqueTracksUris.length < targetTrackCount) {
      return { success: false, error: `Canciones solicitadas (${targetTrackCount}) exceden las disponibles (${allUniqueTracksUris.length}).` };
    }
    
    const finalShuffledTracksUris = shuffleArray(allUniqueTracksUris).slice(0, targetTrackCount);
    let finalPlaylistId = playlistIdToOverwrite;
    let playlistObject: SpotifyPlaylist;
    
    if (finalPlaylistId) {
      await replacePlaylistTracks(accessToken, finalPlaylistId, finalShuffledTracksUris);
      playlistObject = await getPlaylistDetails(accessToken, finalPlaylistId);
    } else {
      const newPlaylist = await createNewPlaylist(accessToken, user.id, newPlaylistName);
      await replacePlaylistTracks(accessToken, newPlaylist.id, finalShuffledTracksUris);
      finalPlaylistId = newPlaylist.id;
      playlistObject = newPlaylist;
    }
    
    if (!finalPlaylistId) return { success: false, error: "No se pudo obtener un ID de playlist final." };
    
    await db.megalist.upsert({
      where: { id: finalPlaylistId },
      update: { sourcePlaylistIds, trackCount: finalShuffledTracksUris.length, type: 'SURPRISE', updatedAt: new Date() },
      create: { id: finalPlaylistId, spotifyUserId: user.id, sourcePlaylistIds, trackCount: finalShuffledTracksUris.length, type: 'SURPRISE' },
    });
    
    const enrichedPlaylist: SpotifyPlaylist = {
      ...playlistObject,
      isMegalist: true, // A surprise list is a type of "megalist" in our system
      isSyncable: false,
      playlistType: 'SURPRISE',
      tracks: { ...playlistObject.tracks, total: finalShuffledTracksUris.length },
    };
    
    return { success: true, data: enrichedPlaylist };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error creando la lista sorpresa.";
    return { success: false, error: msg };
  }
}