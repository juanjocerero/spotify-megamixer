// lib/contexts/ActionProvider.tsx
'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { usePlaylistStore } from '../store';
import { SpotifyPlaylist } from '@/types/spotify';

// Importa todos los componentes de diálogo para el renderer
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
import { usePlaylistPoller } from '@/lib/hooks/usePlaylistPoller';

/**
* Define la forma del objeto que `ActionContext` proveerá.
* Expone el estado de procesamiento (`isProcessing`) y todas las funciones
* que los componentes de la UI pueden llamar para iniciar un flujo de acción (ej. abrir un diálogo).
*/interface ActionContextType {
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
  openConvertToMegalistDialog: (playlist: SpotifyPlaylist) => void;
}

/**
* Contexto de React para proveer las acciones a cualquier componente hijo.
*/
const ActionContext = createContext<ActionContextType | undefined>(undefined);

/**
* Define la interfaz para el objeto de callbacks que se pasa al `DialogRenderer`.
* Cada función `onConfirm...` corresponde a la acción de confirmación de un diálogo específico.
* Esto desacopla al `DialogRenderer` de la lógica de negocio concreta.
*/
export interface DialogCallbacks {
  onClose: () => void;
  onConfirmCreateEmpty: (playlistName: string) => void;
  onConfirmEdit: (newName: string, newDescription: string) => void;
  onConfirmDelete: () => void;
  onConfirmShuffle: () => void;
  onConfirmSyncPreview: () => void;
  onConfirmShuffleChoice: (shouldShuffle: boolean) => void;
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
  onConfirmConvertToMegalist: () => void;
}

/**
* Componente funcional "tonto" que actúa como un 'switch'.
* Su única responsabilidad es renderizar el componente de diálogo correcto
* basándose en el `dialogState.variant` actual.
* @param {object} props - Las props del componente.
* @param {DialogState} props.dialogState - El estado actual del gestor de diálogos.
* @param {DialogCallbacks} props.dialogCallbacks - El objeto con las funciones de callback a pasar al diálogo.
* @returns El componente de diálogo correspondiente o `null` si no hay diálogo activo.
*/
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
    return (
      <ShuffleChoiceDialog
      isOpen={true}
      onClose={dialogCallbacks.onClose}
      onConfirm={dialogCallbacks.onConfirmShuffleChoice}
      />
    );
    case 'createName':
    return <CreateMegalistNameDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmCreateName} />;
    case 'createOverwrite':
    return <CreateOverwriteDialog isOpen={true} playlistName={dialogState.props.playlistName} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmOverwrite} />;
    case 'addToSelect':
    return <AddToMegalistDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmAddToSelect} />;
    case 'addTracksToMegalist':
    return <AddToMegalistDialog isOpen={true} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmAddTracks} isAddingTracks={true} />;
    case 'surpriseGlobal':
    return (
      <SurpriseGlobalDialog
      isOpen={true}
      onClose={dialogCallbacks.onClose}
      onConfirm={dialogCallbacks.onConfirmSurpriseGlobal}
      totalPlaylists={dialogState.props.totalPlaylists}
      />
    );
    case 'surpriseTargeted':
    return <SurpriseTargetedDialog isOpen={true} uniqueTrackCount={dialogState.props.uniqueTrackCount} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmSurpriseTargeted} />;
    case 'surpriseName':
    return <SurpriseNameDialog isOpen={true} isOverwrite={!!dialogState.props.isOverwrite} overwriteId={dialogState.props.overwriteId} onClose={dialogCallbacks.onClose} onConfirm={dialogCallbacks.onConfirmSurpriseName} />;
    case 'convertToMegalist': {
      const { playlist } = dialogState.props;
      const description = (
        <>
        La lista sorpresa{' '}
        <strong className="text-white">&quot;{playlist.name}&quot;</strong> se
        convertirá en una Megalista. <br />
        Podrás añadirle otras playlists y sincronizarla. Esta acción no se puede deshacer.
        </>
      );
      return (
        <ConfirmationDialog
        isOpen={true}
        onClose={dialogCallbacks.onClose}
        onConfirm={dialogCallbacks.onConfirmConvertToMegalist}
        title="¿Convertir a Megalista?"
        description={description}
        confirmButtonText="Sí, convertir"
        />
      );
    }
    default:
    return null;
  }
};

/**
* El proveedor de acciones, un componente compositor clave en la arquitectura.
* Responsabilidades:
* 1. Instancia los hooks "cerebro": `useDialogManager` y `usePlaylistActions`.
* 2. Conecta los cerebros "inyectando" el `dispatch` de los diálogos en el hook de acciones.
* 3. Construye los callbacks de confirmación (`dialogCallbacks`), uniendo el estado de un diálogo
*    (ej: el nombre de la playlist a crear) con la función de lógica de negocio correspondiente.
* 4. Renderiza el `DialogRenderer` con el estado y los callbacks correctos.
* 5. Provee las funciones para abrir diálogos (`open...`) al resto de la app a través del contexto `useActions`.
* @param {object} props - Props del componente, incluye `children`.
*/
export function ActionProvider({ children }: { children: React.ReactNode }) {
  const { dialogState, dispatch } = useDialogManager();
  const { startPolling } = usePlaylistPoller();
  const actions = usePlaylistActions(dispatch, startPolling);
  
  // Construcción de los callbacks
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
        dispatch({
          type: 'OPEN',
          payload: {
            variant: 'syncShuffleChoice',
            props: { playlists: dialogState.props.playlists },
          },
        });
      }
    },
    onConfirmShuffleChoice: (shouldShuffle) => {
      if (dialogState.variant === 'createShuffleChoice') {
        actions.handleCreateOrUpdateMegalist({
          ...dialogState.props,
          shouldShuffle,
          mode: 'create',
        });
      } else if (dialogState.variant === 'addToShuffleChoice') {
        actions.handleCreateOrUpdateMegalist({
          ...dialogState.props,
          shouldShuffle,
          mode: 'update',
          playlistName: '' // No es necesario para el modo 'update'
        });
      } else if (dialogState.variant === 'syncShuffleChoice') {
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
        // Pasa al siguiente paso: elegir si reordenar
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
      // Cerramos el diálogo actual y llamamos a la nueva lógica
      dispatch({ type: 'CLOSE' });
      actions.handleGlobalSurpriseCountSelected(count);
    },
    onConfirmSurpriseTargeted: (trackCount: number) => {
      if (dialogState.variant === 'surpriseTargeted') {
        dispatch({
          type: 'OPEN',
          payload: {
            variant: 'surpriseName', // Ahora este es el siguiente paso correcto
            props: { ...dialogState.props, targetTrackCount: trackCount },
          },
        });
      }
    },
    onConfirmSurpriseName: (playlistName: string) => {
      if (dialogState.variant === 'surpriseName') {
        actions.handleCreateSurpriseMix({ ...dialogState.props, playlistName });
      }
    },
    onConfirmConvertToMegalist: () => {
      if (dialogState.variant === 'convertToMegalist') {
        actions.handleConfirmConvertToMegalist(dialogState.props.playlist);
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
    openConvertToMegalistDialog: actions.openConvertToMegalistDialog,
  }), [actions]);
  
  return (
    <ActionContext.Provider value={contextValue}>
    {children}
    <DialogRenderer dialogState={dialogState} dialogCallbacks={dialogCallbacks} />
    </ActionContext.Provider>
  );
}

/**
* Hook de consumidor para acceder fácilmente a las funciones de acción
* proporcionadas por `ActionProvider`.
* Lanza un error si se utiliza fuera de un `ActionProvider` para asegurar
* un uso correcto del contexto.
* @returns El objeto de contexto con todas las funciones para abrir diálogos.
*/
export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActions must be used within an ActionProvider');
  }
  return context;
};