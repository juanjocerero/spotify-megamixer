'use client';

import React, { createContext, useContext, useMemo } from 'react';

import AddToMegalistDialog from '@/components/custom/dialogs/AddToMegalistDialog';
import ConfirmationDialog from '@/components/custom/dialogs/ConfirmationDialog';
import CreateMegalistNameDialog from '@/components/custom/dialogs/CreateMegalistNameDialog';
import CreateOverwriteDialog from '@/components/custom/dialogs/CreateOverwriteDialog';
import DeletePlaylistDialog from '@/components/custom/dialogs/DeletePlaylistDialog';
import EditPlaylistDialog from '@/components/custom/dialogs/EditPlaylistDialog';
import ShuffleChoiceDialog from '@/components/custom/dialogs/ShuffleChoiceDialog';
import ShufflePlaylistDialog from '@/components/custom/dialogs/ShufflePlaylistDialog';
import SurpriseGlobalDialog from '@/components/custom/dialogs/SurpriseGlobalDialog';
import SurpriseNameDialog from '@/components/custom/dialogs/SurpriseNameDialog';
import SurpriseTargetedDialog from '@/components/custom/dialogs/SurpriseTargetedDialog';
import SyncPreviewDialog from '@/components/custom/dialogs/SyncPreviewDialog';

import { usePlaylistActions, ActionPlaylist } from '@/lib/hooks/usePlaylistActions';
import { useDialogManager, DialogState } from '@/lib/hooks/useDialogManager';
import { SpotifyPlaylist } from '@/types/spotify';

// Esta interfaz define lo que el contexto expondrá a los componentes consumidores
interface ActionContextType {
  isProcessing: boolean;
  openCreateEmptyMegalistDialog: () => void;
  openFreezeDialog: (playlist: SpotifyPlaylist) => void;
  openEditDialog: (playlist: SpotifyPlaylist) => void;
  openDeleteDialog: (playlists: ActionPlaylist[]) => void;
  openShuffleDialog: (playlists: ActionPlaylist[]) => void;
  openSyncDialog: (playlists: ActionPlaylist[]) => Promise<void>;
  openCreateMegalistDialog: (sourceIds: string[]) => void;
  openAddToMegalistDialog: (sourceIds: string[]) => void;
  openSurpriseMixDialog: (sourceIds?: string[]) => Promise<void>;
  openAddTracksDialog: (trackUris: string[]) => void;
}

const ActionContext = createContext<ActionContextType | undefined>(undefined);

// Interfaz para los callbacks que se pasarán al DialogRenderer
export interface DialogCallbacks {
  onClose: () => void;
  onConfirmCreateEmpty: (playlistName: string) => void;
  onConfirmEdit: (newName: string, newDescription: string) => void;
  onConfirmDelete: () => void;
  onConfirmShuffle: () => void;
  onConfirmSyncPreview: () => void;
  onConfirmSyncShuffleChoice: (shouldShuffle: boolean) => void;
  onConfirmCreateName: (playlistName: string) => void;
  onConfirmCreateShuffleChoice: (shouldShuffle: boolean) => void;
  onConfirmOverwrite: (mode: 'update' | 'replace') => void;
  onConfirmAddToSelect: (targetId: string) => void;
  onConfirmAddToShuffleChoice: (shouldShuffle: boolean) => void;
  onConfirmAddTracks: (targetPlaylistId: string) => void;
  onConfirmSurpriseGlobal: (count: number) => void;
  onConfirmSurpriseTargeted: (trackCount: number) => void;
  onConfirmSurpriseName: (playlistName: string) => void;
  onConfirmFreeze: () => void;
}

const DialogRenderer: React.FC<{ dialogState: DialogState; dialogCallbacks: DialogCallbacks }> = ({ dialogState, dialogCallbacks }) => {
  switch (dialogState.variant) {
    case 'createEmpty':
    return <CreateMegalistNameDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmCreateEmpty} />;
    case 'freezeConfirmation': {
      const { playlist } = dialogState.props;
      const isFreezing = !playlist.isFrozen;
      const title = isFreezing ? '¿Congelar esta Megalista?' : '¿Descongelar esta Megalista?';
      const description = isFreezing ? `Si congelas "${playlist.name}", ya no podrás sincronizarla con sus listas de origen. Esta acción es reversible.` : `Si descongelas "${playlist.name}", volverá a ser sincronizable.`;
      return <ConfirmationDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmFreeze} title={title} description={description} confirmButtonText={isFreezing ? 'Sí, congelar' : 'Sí, descongelar'} />;
    }
    case 'edit':
    return <EditPlaylistDialog isOpen={true} playlist={dialogState.props.playlist} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmEdit} />;
    case 'delete':
    return <DeletePlaylistDialog isOpen={true} playlists={dialogState.props.playlists} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmDelete} />;
    case 'shuffle':
    return <ShufflePlaylistDialog isOpen={true} playlists={dialogState.props.playlists} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmShuffle} />;
    case 'syncPreview':
    return <SyncPreviewDialog isOpen={true} playlists={dialogState.props.playlists} syncStats={dialogState.props.syncStats} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmSyncPreview} />;
    case 'syncShuffleChoice':
    case 'createShuffleChoice':
    case 'addToShuffleChoice':
    return <ShuffleChoiceDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmSyncShuffleChoice} />;
    case 'createName':
    return <CreateMegalistNameDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmCreateName} />;
    case 'createOverwrite':
    return <CreateOverwriteDialog isOpen={true} playlistName={dialogState.props.playlistName} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmOverwrite} />;
    case 'addToSelect':
    return <AddToMegalistDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmAddToSelect} />;
    case 'addTracksToMegalist':
    return <AddToMegalistDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmAddTracks} isAddingTracks={true} />;
    case 'surpriseGlobal':
    return <SurpriseGlobalDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmSurpriseGlobal} />;
    case 'surpriseTargeted':
    return <SurpriseTargetedDialog isOpen={true} uniqueTrackCount={dialogState.props.uniqueTrackCount} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmSurpriseTargeted} />;
    case 'surpriseName':
    return <SurpriseNameDialog isOpen={true} isOverwrite={!!dialogState.props.isOverwrite} overwriteId={dialogState.props.overwriteId} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmSurpriseName} />;
    default:
    return null;
  }
};

export function ActionProvider({ children }: { children: React.ReactNode }) {
  const { dialogState, dispatch } = useDialogManager();
  const actions = usePlaylistActions(dispatch);
  
  // CONSTRUCCIÓN DE LOS CALLBACKS
  // Este es el punto de conexión: se une el estado del diálogo con la lógica de las acciones.
  const dialogCallbacks: DialogCallbacks = {
    onClose: () => dispatch({ type: 'CLOSE' }),
    onConfirmCreateEmpty: actions.handleConfirmCreateEmpty,
    onConfirmEdit: (newName, newDescription) => {
      if (dialogState.variant === 'edit') {
        actions.handleConfirmEdit(dialogState.props.playlist.id, newName, newDescription);
      }
    },
    onConfirmDelete: () => {
      if (dialogState.variant === 'delete') {
        actions.handleConfirmDelete(dialogState.props.playlists);
      }
    },
    onConfirmFreeze: () => {
      if (dialogState.variant === 'freezeConfirmation') {
        actions.handleConfirmFreeze(dialogState.props.playlist.id, !dialogState.props.playlist.isFrozen);
      }
    },
    onConfirmShuffle: () => {
      if (dialogState.variant === 'shuffle') {
        actions.handleConfirmShuffle(dialogState.props.playlists);
      }
    },
    onConfirmSyncPreview: () => {
      if (dialogState.variant === 'syncPreview') {
        dispatch({ type: 'OPEN', payload: { variant: 'syncShuffleChoice', props: { playlists: dialogState.props.playlists } }});
      }
    },
    onConfirmSyncShuffleChoice: (shouldShuffle) => {
      if (dialogState.variant === 'syncShuffleChoice') {
        actions.handleExecuteSync(dialogState.props.playlists, shouldShuffle);
      }
    },
    onConfirmCreateName: (playlistName) => {
      if (dialogState.variant === 'createName') {
        dispatch({ type: 'OPEN', payload: { variant: 'createShuffleChoice', props: { ...dialogState.props, playlistName } }});
      }
    },
    onConfirmCreateShuffleChoice: (shouldShuffle) => {
      if (dialogState.variant === 'createShuffleChoice') {
        actions.handleCreateOrUpdateMegalist({ ...dialogState.props, shouldShuffle, mode: 'create' });
      }
    },
    onConfirmOverwrite: (mode) => {
      if (dialogState.variant === 'createOverwrite') {
        if (mode === 'update') {
          dispatch({ type: 'OPEN', payload: { variant: 'addToShuffleChoice', props: { sourceIds: dialogState.props.sourceIds, targetId: dialogState.props.overwriteId } }});
        } else {
          actions.handleCreateOrUpdateMegalist({ ...dialogState.props, shouldShuffle: true, mode: 'replace', targetId: dialogState.props.overwriteId });
        }
      }
    },
    onConfirmAddToSelect: (targetId) => {
      if (dialogState.variant === 'addToSelect') {
        dispatch({ type: 'OPEN', payload: { variant: 'addToShuffleChoice', props: { ...dialogState.props, targetId } }});
      }
    },
    onConfirmAddToShuffleChoice: (shouldShuffle) => {
      if (dialogState.variant === 'addToShuffleChoice') {
        actions.handleCreateOrUpdateMegalist({ ...dialogState.props, shouldShuffle, mode: 'update', playlistName: '' });
      }
    },
    onConfirmAddTracks: (targetPlaylistId: string) => {
      if (dialogState.variant === 'addTracksToMegalist') {
        actions.handleConfirmAddTracks(targetPlaylistId, dialogState.props.trackUris);
      }
    },
    onConfirmSurpriseGlobal: (count: number) => {
      // La lógica para esto se puede quedar en el opener ya que no depende del estado del diálogo
    },
    onConfirmSurpriseTargeted: (trackCount: number) => {
      if (dialogState.variant === 'surpriseTargeted') {
        dispatch({ type: 'OPEN', payload: { variant: 'surpriseName', props: { ...dialogState.props, targetTrackCount: trackCount } }});
      }
    },
    onConfirmSurpriseName: (playlistName: string) => {
      if (dialogState.variant === 'surpriseName') {
        actions.handleCreateSurpriseMix({ ...dialogState.props, playlistName });
      }
    },
  };
  
  const contextValue = useMemo(() => ({
    isProcessing: actions.isProcessing,
    openCreateEmptyMegalistDialog: actions.openCreateEmptyMegalistDialog,
    openFreezeDialog: actions.openFreezeDialog,
    openEditDialog: actions.openEditDialog,
    openDeleteDialog: actions.openDeleteDialog,
    openShuffleDialog: actions.openShuffleDialog,
    openSyncDialog: actions.openSyncDialog,
    openCreateMegalistDialog: actions.openCreateMegalistDialog,
    openAddToMegalistDialog: actions.openAddToMegalistDialog,
    openSurpriseMixDialog: actions.openSurpriseMixDialog,
    openAddTracksDialog: actions.openAddTracksDialog,
  }), [actions]);
  
  return (
    <ActionContext.Provider value={contextValue}>
    {children}
    <DialogRenderer dialogState={dialogState} dialogCallbacks={dialogCallbacks} />
    </ActionContext.Provider>
  );
}

export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActions must be used within an ActionProvider');
  }
  return context;
};