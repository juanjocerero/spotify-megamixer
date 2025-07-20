// lib/contexts/ActionProvider.tsx

'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { usePlaylistActions, ActionPlaylist } from '@/lib/hooks/usePlaylistActions';
import { usePlaylistStore } from '@/lib/store';

import CreateMegalistNameDialog from '@/components/custom/dialogs/CreateMegalistNameDialog';
import AddToMegalistDialog from '@/components/custom/dialogs/AddToMegalistDialog';
import ShufflePlaylistDialog from '@/components/custom/dialogs/ShufflePlaylistDialog';
import SyncPreviewDialog from '@/components/custom/dialogs/SyncPreviewDialog';
import SurpriseNameDialog from '@/components/custom/dialogs/SurpriseNameDialog';
import SurpriseGlobalDialog from '@/components/custom/dialogs/SurpriseGlobalDialog';
import SurpriseTargetedDialog from '@/components/custom/dialogs/SurpriseTargetedDialog';
import CreateOverwriteDialog from '@/components/custom/dialogs/CreateOverwriteDialog';
import DeletePlaylistDialog from '@/components/custom/dialogs/DeletePlaylistDialog';

// Componentes de Diálogo y UI
import ShuffleChoiceDialog from '@/components/custom/ShuffleChoiceDialog';

// Definición del tipo para el contexto
interface ActionContextType {
  isProcessing: boolean;
  openDeleteDialog: (playlists: ActionPlaylist[]) => void;
  openShuffleDialog: (playlists: ActionPlaylist[]) => void;
  openSyncDialog: (playlists: ActionPlaylist[]) => Promise<void>;
  openCreateMegalistDialog: (sourceIds: string[]) => void;
  openAddToMegalistDialog: (sourceIds: string[]) => void;
  openSurpriseMixDialog: (sourceIds?: string[]) => Promise<void>;
}

// Creación del Contexto
const ActionContext = createContext<ActionContextType | undefined>(undefined);

// El Provider
export function ActionProvider({ children }: { children: React.ReactNode }) {
  const {
    isProcessing,
    dialogState,
    dialogCallbacks,
    openDeleteDialog,
    openShuffleDialog,
    openSyncDialog,
    openCreateMegalistDialog,
    openAddToMegalistDialog,
    openSurpriseMixDialog,
  } = usePlaylistActions();
  
  // El valor del contexto solo expone lo que los componentes hijos necesitan llamar
  const contextValue = useMemo(() => ({
    isProcessing,
    openDeleteDialog,
    openShuffleDialog,
    openSyncDialog,
    openCreateMegalistDialog,
    openAddToMegalistDialog,
    openSurpriseMixDialog,
  }), [isProcessing, openDeleteDialog, openShuffleDialog, openSyncDialog, openCreateMegalistDialog, openAddToMegalistDialog, openSurpriseMixDialog]);
  
  // --- Componente interno para renderizar los diálogos ---
  const DialogRenderer = () => {
    // Estado local para los inputs dentro de los diálogos
    const [inputValue, setInputValue] = useState('');
    const [sliderValue, setSliderValue] = useState([50]);
    
    // Resetea los valores de los inputs cuando se cierra un diálogo
    if (dialogState.variant === 'none' && (inputValue !== '' || sliderValue[0] !== 50)) {
      setInputValue('');
      setSliderValue([50]);
    }
    
    switch (dialogState.variant) {
      case 'delete': {
        return (
          <DeletePlaylistDialog
          isOpen={true}
          playlists={dialogState.props.playlists}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmDelete}
          />
        );
      }
      
      case 'shuffle': {
        return (
          <ShufflePlaylistDialog
          isOpen={true}
          playlists={dialogState.props.playlists}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmShuffle}
          />
        );
      }
      
      case 'syncPreview': {
        return (
          <SyncPreviewDialog
          isOpen={true}
          playlists={dialogState.props.playlists}
          syncStats={dialogState.props.syncStats}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmSyncPreview}
          />
        );
      }
      
      case 'syncShuffleChoice': {
        return (
          <ShuffleChoiceDialog
          isOpen={true}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmSyncShuffleChoice}
          />
        );
      }
      case 'createShuffleChoice': {
        return (
          <ShuffleChoiceDialog
          isOpen={true}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmCreateShuffleChoice}
          />
        );
      }
      case 'addToShuffleChoice': {
        return (
          <ShuffleChoiceDialog
          isOpen={true}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmAddToShuffleChoice}
          />
        );
      }
      
      case 'createName':
      return (
        <CreateMegalistNameDialog
        isOpen={true}
        onClose={dialogCallbacks.onClose}
        onConfirm={dialogCallbacks.onConfirmCreateName}
        />
      );
      
      case 'createOverwrite':
      return (
        <CreateOverwriteDialog
        isOpen={true}
        playlistName={dialogState.props.playlistName}
        onClose={dialogCallbacks.onClose}
        onConfirm={dialogCallbacks.onConfirmOverwrite}
        />
      );
      
      case 'addToSelect':
      return (
        <AddToMegalistDialog
        isOpen={true}
        onClose={dialogCallbacks.onClose}
        onConfirm={dialogCallbacks.onConfirmAddToSelect}
        />
      );
      
      case 'surpriseGlobal':
      return (
        <SurpriseGlobalDialog
        isOpen={true}
        onClose={dialogCallbacks.onClose}
        onConfirm={dialogCallbacks.onConfirmSurpriseGlobal}
        />
      );
      
      case 'surpriseTargeted': {
        return (
          <SurpriseTargetedDialog
          isOpen={true}
          uniqueTrackCount={dialogState.props.uniqueTrackCount}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmSurpriseTargeted}
          />
        );
      }
      
      case 'surpriseName': {
        return (
          <SurpriseNameDialog
          isOpen={true}
          isOverwrite={!!dialogState.props.isOverwrite}
          overwriteId={dialogState.props.overwriteId}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmSurpriseName}
          />
        );
      }
      
      default:
      return null;
    }
  };
  
  return (
    <ActionContext.Provider value={contextValue}>
    {children}
    <DialogRenderer />
    </ActionContext.Provider>
  );
}

// Hook para consumir el contexto fácilmente
export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActions debe ser usado dentro de un ActionProvider');
  }
  return context;
};