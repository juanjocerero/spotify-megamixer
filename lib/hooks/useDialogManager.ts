// lib/hooks/useDialogManager.ts
'use client';

import { useReducer } from 'react';
import { SpotifyPlaylist } from '@/types/spotify';
import { ActionPlaylist } from './usePlaylistActions';

/**
* Representa todos los estados posibles de los diálogos en la aplicación.
* Es una unión discriminada donde la propiedad `variant` determina qué diálogo se muestra
* y la propiedad `props` contiene los datos necesarios para ese diálogo específico.
* - `variant: 'none'`: Ningún diálogo está abierto.
* - `variant: 'edit'`: Muestra el diálogo para editar una playlist.
* - `variant: 'syncPreview'`: Muestra el resumen de una sincronización.
* ... y así sucesivamente para cada interacción modal.
*/
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
| { variant: 'surpriseGlobal'; props: { totalPlaylists: number } }
| {
  variant: 'surpriseTargeted';
  props: { sourceIds: string[]; uniqueTrackCount: number };
}
| {
  variant: 'isolateConfirmation';
  props: { playlists: ActionPlaylist[]; isolate: boolean };
}
| {
  variant: 'surpriseName';
  props: {
    sourceIds: string[];
    targetTrackCount: number;
    isOverwrite?: boolean;
    overwriteId?: string;
  };
}
| { variant: 'convertToMegalist'; props: { playlist: SpotifyPlaylist } };

/**
* Representa la carga útil (`payload`) para una acción de apertura de diálogo.
* Excluye el estado 'none', ya que solo se pueden abrir diálogos con un estado válido.
*/
export type OpenActionPayload = Exclude<DialogState, { variant: 'none' }>;

/**
* Define las acciones que se pueden enviar al `dialogReducer`.
* - `OPEN`: Abre un diálogo específico, pasando su `variant` y `props`.
* - `CLOSE`: Cierra cualquier diálogo abierto, volviendo al estado 'none'.
*/
type ReducerAction =
| { type: 'OPEN'; payload: OpenActionPayload }
| { type: 'CLOSE' };

/**
* El estado inicial del gestor de diálogos, donde ningún diálogo está activo.
*/
const initialDialogState: DialogState = { variant: 'none' };

/**
* Función reductora pura que gestiona las transiciones de estado de los diálogos.
* @param state - El estado actual del diálogo.
* @param action - La acción a realizar (`OPEN` o `CLOSE`).
* @returns El nuevo estado del diálogo.
*/
function dialogReducer(state: DialogState, action: ReducerAction): DialogState {
  switch (action.type) {
    case 'OPEN':
    // El nuevo estado es directamente la carga útil de la acción.
    return action.payload;
    case 'CLOSE':
    // Vuelve al estado inicial.
    return { variant: 'none' };
    default:
    return state;
  }
}

/**
* Hook dedicado exclusivamente a gestionar el estado de los diálogos en
* toda la aplicación. Actúa como una máquina de estados para la UI modal.
* Utiliza un `useReducer` para garantizar transiciones de estado predecibles y centralizadas.
*
* @returns Un objeto que contiene:
* - `dialogState`: El objeto de estado actual, que determina qué diálogo se renderiza.
* - `dispatch`: La función para enviar acciones (`'OPEN'`, `'CLOSE'`) y cambiar el estado.
*/
export function useDialogManager() {
  const [dialogState, dispatch] = useReducer(dialogReducer, initialDialogState);
  return { dialogState, dispatch };
}