// /lib/actions/folder.actions.ts
'use server';

import { headers } from 'next/headers';
import { auth } from '@/auth';
import { db } from '../db';
import { ActionResult } from '@/types/spotify';
import { Folder } from '@prisma/client';

/**
* Crea una nueva carpeta para el usuario autenticado.
* @param name El nombre de la nueva carpeta.
* @returns El objeto de la carpeta creada.
*/
export async function createFolderAction(
  name: string
): Promise<ActionResult<Folder>> {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado.' };
  }
  
  try {
    const newFolder = await db.folder.create({
      data: {
        name,
        userId: session.user.id,
      },
    });
    return { success: true, data: newFolder };
  } catch (error) {
    console.error('[ACTION_ERROR:createFolderAction]', error);
    return { success: false, error: 'No se pudo crear la carpeta.' };
  }
}

/**
* Asigna una o más playlists a una carpeta, o las saca de ella.
* @param playlistIds IDs de las playlists a mover.
* @param folderId ID de la carpeta de destino, o null para sacar de la carpeta.
*/
export async function assignPlaylistsToFolderAction(
  playlistIds: string[],
  folderId: string | null
): Promise<ActionResult<{ count: number }>> {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado.' };
  }
  
  try {
    const result = await db.megalist.updateMany({
      where: {
        id: { in: playlistIds },
        spotifyUserId: session.user.id, // Seguridad: Solo puede modificar sus propias playlists
      },
      data: {
        folderId: folderId,
      },
    });
    return { success: true, data: { count: result.count } };
  } catch (error) {
    console.error('[ACTION_ERROR:assignPlaylistsToFolderAction]', error);
    return { success: false, error: 'No se pudo asignar las playlists.' };
  }
}

/**
* Renombra una carpeta existente.
* @param folderId El ID de la carpeta a renombrar.
* @param newName El nuevo nombre para la carpeta.
*/
export async function renameFolderAction(
  folderId: string,
  newName: string
): Promise<ActionResult<Folder>> {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado.' };
  }
  
  try {
    const updatedFolder = await db.folder.update({
      where: {
        id: folderId,
        userId: session.user.id, // Seguridad: Solo puede renombrar sus propias carpetas
      },
      data: {
        name: newName,
      },
    });
    return { success: true, data: updatedFolder };
  } catch (error) {
    console.error('[ACTION_ERROR:renameFolderAction]', error);
    return { success: false, error: 'No se pudo renombrar la carpeta.' };
  }
}

/**
* Elimina una carpeta. Las playlists contenidas no se eliminan,
* sino que se desvinculan (folderId pasa a ser null).
* @param folderId El ID de la carpeta a eliminar.
*/
export async function deleteFolderAction(
  folderId: string
): Promise<ActionResult<{ id: string }>> {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado.' };
  }
  
  try {
    await db.folder.delete({
      where: {
        id: folderId,
        userId: session.user.id, // Seguridad: Solo puede eliminar sus propias carpetas
      },
    });
    return { success: true, data: { id: folderId } };
  } catch (error) {
    console.error('[ACTION_ERROR:deleteFolderAction]', error);
    return { success: false, error: 'No se pudo eliminar la carpeta.' };
  }
}