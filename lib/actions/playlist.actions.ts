// lib/actions/playlist.actions.ts

'use server';
import { auth } from '@/auth';
import { db } from '../db';
import { shuffleArray } from '../utils';
import { ActionResult, SpotifyPlaylist } from '@/types/spotify';
import {
  getAllPlaylistTracks,
  findUserPlaylistByName,
  createNewPlaylist,
  clearPlaylistTracks,
  addTracksToPlaylist,
  replacePlaylistTracks,
  updatePlaylistDetails,
} from '../spotify';
import { getTrackUris } from './spotify.actions';

export async function findOrCreatePlaylist(
  name: string,
  sourcePlaylistIds: string[],
  initialTrackCount: number
): Promise<{ playlist: SpotifyPlaylist; exists: boolean }> {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) {
      throw new Error('No autenticado, token o ID de usuario no disponible.');
    }
    const { accessToken, user } = session;
    
    const existingPlaylist = await findUserPlaylistByName(accessToken, name);
    if (existingPlaylist) {
      return { playlist: existingPlaylist, exists: true };
    } else {
      const newPlaylist = await createNewPlaylist(accessToken, user.id, name);
      await db.megalist.create({
        data: {
          id: newPlaylist.id,
          spotifyUserId: user.id,
          sourcePlaylistIds,
          trackCount: initialTrackCount,
          type: 'MEGALIST',
        },
      });
      const enrichedPlaylist: SpotifyPlaylist = {
        ...newPlaylist,
        isMegalist: true,
        isSyncable: true,
        tracks: { ...newPlaylist.tracks, total: initialTrackCount },
        playlistType: 'MEGALIST',
        owner: newPlaylist.owner || { display_name: session.user.name || 'Tú' },
      };
      return { playlist: enrichedPlaylist, exists: false };
    }
  } catch (error) {
    console.error('[ACTION_ERROR:findOrCreatePlaylist]', error);
    throw error;
  }
}

export async function addTracksBatch(playlistId: string, trackUrisBatch: string[]) {
  try {
    const session = await auth();
    if (!session?.accessToken) throw new Error('No autenticado');
    await addTracksToPlaylist(session.accessToken, playlistId, trackUrisBatch);
  } catch (error) {
    console.error('[ACTION_ERROR:addTracksBatch]', error);
    throw error;
  }
}

export async function addTracksToMegalistAction(
  targetPlaylistId: string,
  newSourceIds: string[],
  shouldShuffle: boolean
): Promise<ActionResult<{ finalCount: number; addedCount: number }>> {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.id) return { success: false, error: 'No autenticado' };
    const { accessToken } = session;
    
    const megalist = await db.megalist.findUnique({ where: { id: targetPlaylistId } });
    const allSourceIds = Array.from(new Set([...(megalist?.sourcePlaylistIds || []), ...newSourceIds]));
    
    const [existingTracks, newTracksFromSources] = await Promise.all([
      getAllPlaylistTracks(accessToken, targetPlaylistId),
      getTrackUris(newSourceIds)
    ]);
    
    const existingTracksSet = new Set(existingTracks.map(t => t.uri));
    const tracksToAdd = newTracksFromSources.filter(uri => !existingTracksSet.has(uri));
    
    if (tracksToAdd.length > 0) {
      await addTracksToPlaylist(accessToken, targetPlaylistId, tracksToAdd);
    }
    
    const finalCount = existingTracks.length + tracksToAdd.length;
    if (tracksToAdd.length > 0 && shouldShuffle) {
      await shufflePlaylistsAction([targetPlaylistId]);
    }
    
    await db.megalist.upsert({
      where: { id: targetPlaylistId },
      update: { sourcePlaylistIds: allSourceIds, trackCount: finalCount, type: 'MEGALIST' },
      create: { id: targetPlaylistId, spotifyUserId: session.user.id, sourcePlaylistIds: allSourceIds, trackCount: finalCount, type: 'MEGALIST' },
    });
    
    return { success: true, data: { finalCount, addedCount: tracksToAdd.length } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Fallo al añadir canciones.';
    return { success: false, error: msg };
  }
}

export async function unfollowPlaylistsBatch(playlistIds: string[]): Promise<void> {
  const session = await auth();
  if (!session?.accessToken) throw new Error('No autenticado');
  const { accessToken } = session;
  const unfollowPromises = playlistIds.map(id =>
    fetch(`https://api.spotify.com/v1/playlists/${id}/followers`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  );
  await Promise.all(unfollowPromises);
  await db.megalist.deleteMany({ where: { id: { in: playlistIds } } });
}

export async function shufflePlaylistsAction(playlistIds: string[]): Promise<void> {
  const session = await auth();
  if (!session?.accessToken) throw new Error('No autenticado');
  const { accessToken } = session;
  const shufflePromises = playlistIds.map(async (playlistId) => {
    const tracks = await getAllPlaylistTracks(accessToken, playlistId);
    const trackUris = tracks.map(t => t.uri);
    if (trackUris.length <= 1) return;
    const shuffledUris = shuffleArray(trackUris);
    await replacePlaylistTracks(accessToken, playlistId, shuffledUris);
  });
  await Promise.all(shufflePromises);
}

export async function updatePlaylistDetailsAction(
  playlistId: string,
  newName: string,
  newDescription: string
): Promise<void> {
  const session = await auth();
  if (!session?.accessToken) throw new Error('No autenticado');
  await updatePlaylistDetails(session.accessToken, playlistId, { name: newName, description: newDescription });
}