'use client';

import { useReducer } from 'react';
import { SpotifyPlaylist } from '@/types/spotify';
import { ActionPlaylist } from './usePlaylistActions';

// Todas las definiciones de estado y el reducer se han movido aquí.
export type DialogState =
| { variant: 'none' }
| { variant: 'createEmpty' }
| { variant: 'edit'; props: { playlist: SpotifyPlaylist } }
| { variant: 'delete'; props: { playlists: ActionPlaylist[] } }
| { variant: 'shuffle'; props: { playlists: ActionPlaylist[] } }
| {
  variant: 'syncPreview';
  props: {
    playlists: ActionPlaylist[];
    syncStats: { added: number; removed: number };
  };
}
| { variant: 'syncShuffleChoice'; props: { playlists: ActionPlaylist[] } }
| { variant: 'createName'; props: { sourceIds: string[] } }
| {
  variant: 'createShuffleChoice';
  props: { sourceIds: string[]; playlistName: string };
}
| { variant: 'freezeConfirmation'; props: { playlist: SpotifyPlaylist } }
| {
  variant: 'createOverwrite';
  props: { sourceIds: string[]; playlistName: string; overwriteId: string };
}
| { variant: 'addToSelect'; props: { sourceIds: string[] } }
| {
  variant: 'addToShuffleChoice';
  props: { sourceIds: string[]; targetId: string };
}
| { variant: 'addTracksToMegalist'; props: { trackUris: string[] } }
| { variant: 'surpriseGlobal' }
| {
  variant: 'surpriseTargeted';
  props: { sourceIds: string[]; uniqueTrackCount: number };
}
| {
  variant: 'surpriseName';
  props: {
    sourceIds: string[];
    targetTrackCount: number;
    isOverwrite?: boolean;
    overwriteId?: string;
  };
};

export type OpenActionPayload = Exclude<DialogState, { variant: 'none' }>;
type ReducerAction =
| { type: 'OPEN'; payload: OpenActionPayload }
| { type: 'CLOSE' };

const initialDialogState: DialogState = { variant: 'none' };

function dialogReducer(state: DialogState, action: ReducerAction): DialogState {
  switch (action.type) {
    case 'OPEN':
    return action.payload;
    case 'CLOSE':
    return { variant: 'none' };
    default:
    return state;
  }
}

/**
* Hook dedicado exclusivamente a gestionar el estado de los diálogos en
* toda la aplicación. Actúa como una máquina de estados para la UI modal.
* @returns El estado actual del diálogo (`dialogState`) y la función `dispatch`
* para abrir o cerrar diálogos.
*/
export function useDialogManager() {
  const [dialogState, dispatch] = useReducer(dialogReducer, initialDialogState);
  return { dialogState, dispatch };
}