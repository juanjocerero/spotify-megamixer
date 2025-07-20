// lib/actions/sync.actions.ts

'use server';
import { auth } from '@/auth';
import { db } from '../db';
import { ActionResult } from '@/types/spotify';
import { getAllPlaylistTracks, removeTracksFromPlaylist, addTracksToPlaylist } from '../spotify';
import { shufflePlaylistsAction } from './playlist.actions';

async function _calculateSyncChanges(playlistId: string, accessToken: string) {
  const megalist = await db.megalist.findUnique({ where: { id: playlistId } });
  if (!megalist) throw new Error("Megalista no encontrada en la BD.");
  
  const initialTracks = await getAllPlaylistTracks(accessToken, playlistId);
  const initialTrackUris = initialTracks.map(t => t.uri);
  
  const sourceIds = megalist.sourcePlaylistIds;
  const trackUrisPromises = sourceIds.map(id => 
    getAllPlaylistTracks(accessToken, id)
    .then(tracks => tracks.map(t => t.uri))
    .catch(error => {
      console.warn(`[SYNC_WARN] Playlist fuente ${id} no encontrada. Será omitida.`, error);
      return { id, error: true };
    })
  );
  
  const results = await Promise.all(trackUrisPromises);
  const validSourceIds: string[] = [];
  const finalTrackUris: string[] = [];
  results.forEach((result, index) => {
    if (Array.isArray(result)) {
      validSourceIds.push(sourceIds[index]);
      finalTrackUris.push(...result);
    }
  });
  
  const uniqueFinalTracks = [...new Set(finalTrackUris)];
  const initialTracksSet = new Set(initialTrackUris);
  const finalTracksSet = new Set(uniqueFinalTracks);
  
  const addedCount = uniqueFinalTracks.filter(uri => !initialTracksSet.has(uri)).length;
  const removedCount = initialTrackUris.filter(uri => !finalTracksSet.has(uri)).length;
  
  return { megalist, initialTrackUris, uniqueFinalTracks, validSourceIds, addedCount, removedCount };
}

export async function previewBatchSync(playlistIds: string[]) {
  const session = await auth();
  if (!session?.accessToken) throw new Error('No autenticado');
  let totalAdded = 0;
  let totalRemoved = 0;
  
  const accessToken = session.accessToken;
  const previewPromises = playlistIds.map(id => _calculateSyncChanges(id, accessToken));
  const results = await Promise.all(previewPromises);
  
  results.forEach(result => {
    totalAdded += result.addedCount;
    totalRemoved += result.removedCount;
  });
  
  return { totalAdded, totalRemoved };
}

export async function executeMegalistSync(
  playlistId: string,
  shouldShuffle: boolean
): Promise<ActionResult<{ id: string; finalCount: number }>> {
  try {
    const session = await auth();
    if (!session?.accessToken) return { success: false, error: 'No autenticado' };
    
    const { accessToken } = session;
    const { megalist, initialTrackUris, uniqueFinalTracks, validSourceIds, addedCount, removedCount } = await _calculateSyncChanges(playlistId, accessToken);
    
    const hasChanges = addedCount > 0 || removedCount > 0;
    const sourcesChanged = validSourceIds.length !== megalist.sourcePlaylistIds.length;
    
    if (!hasChanges && !sourcesChanged) {
      return { success: true, data: { id: playlistId, finalCount: uniqueFinalTracks.length } };
    }
    
    const initialTracksSet = new Set(initialTrackUris);
    const finalTracksSet = new Set(uniqueFinalTracks);
    const tracksToAdd = uniqueFinalTracks.filter(uri => !initialTracksSet.has(uri));
    const tracksToRemove = initialTrackUris.filter(uri => !finalTracksSet.has(uri));
    
    if (tracksToRemove.length > 0) {
      await removeTracksFromPlaylist(accessToken, playlistId, tracksToRemove);
    }
    if (tracksToAdd.length > 0) {
      await addTracksToPlaylist(accessToken, playlistId, tracksToAdd);
    }
    if (hasChanges && shouldShuffle) {
      await shufflePlaylistsAction([playlistId]);
    }
    
    await db.megalist.update({
      where: { id: playlistId },
      data: { sourcePlaylistIds: validSourceIds, trackCount: uniqueFinalTracks.length, type: 'MEGALIST' },
    });
    
    return { success: true, data: { id: playlistId, finalCount: uniqueFinalTracks.length } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : `Fallo al sincronizar ${playlistId}.`;
    return { success: false, error: msg };
  }
}