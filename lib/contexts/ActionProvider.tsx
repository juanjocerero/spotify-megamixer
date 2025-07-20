'use client';

import { createContext, useContext, useMemo } from 'react';
import { usePlaylistActions, ActionPlaylist } from '../hooks/usePlaylistActions';

import ConfirmationDialog from '@/components/custom/ConfirmationDialog';
import ShuffleChoiceDialog from '@/components/custom/ShuffleChoiceDialog';

// Definimos la forma del contexto que los componentes consumirán.
type ActionContextType = {
  actions: {
    syncPlaylists: (playlists: ActionPlaylist[]) => Promise<void>;
    shufflePlaylists: (playlists: ActionPlaylist[]) => void;
    deletePlaylists: (playlists: ActionPlaylist[]) => void;
  };
  isProcessing: boolean;
};

// Creamos el contexto.
const ActionContext = createContext<ActionContextType | undefined>(undefined);

// Creamos el componente Provider.
export function ActionProvider({ children }: { children: React.ReactNode }) {
  const { 
    isProcessing, 
    actions, 
    syncPreviewDialogState,
    syncPreviewDialogCallbacks,
    syncShuffleChoiceDialogState, 
    syncShuffleChoiceDialogCallbacks,  
    shuffleDialogState, 
    shuffleDialogCallbacks, 
    deletionDialogState, 
    deletionDialogCallbacks 
  } = usePlaylistActions();
  
  // Memoizamos el valor del contexto para evitar re-renders innecesarios.
  const contextValue = useMemo(() => ({ actions, isProcessing }), [actions, isProcessing]);
  
  
  // Añadir descripción para el diálogo de sincronización
  const syncPreviewDescription = useMemo(() => {
    const count = syncPreviewDialogState.playlists.length;
    const title = count === 1 ? `"${syncPreviewDialogState.playlists[0].name}"` : `${count} Megalista(s)`;
    return (
      <div className="text-sm text-slate-400">
      Vas a sincronizar <strong className="text-white">{title}</strong>.
      <ul className="list-disc pl-5 mt-3 space-y-1">
      <li className="text-green-400">
      Se añadirán <strong className="text-green-300">{syncPreviewDialogState.added}</strong> canciones.
      </li>
      <li className="text-red-400">
      Se eliminarán <strong className="text-red-300">{syncPreviewDialogState.removed}</strong> canciones.
      </li>
      </ul>
      <p className="mt-3">¿Deseas continuar?</p>
      </div>
    );
  }, [syncPreviewDialogState]);
  
  // Añadir descripción para el diálogo de reordenado
  const shuffleDescription = useMemo(() => {
    const count = shuffleDialogState.playlists.length;
    if (count === 1) {
      return (
        <span>
        Vas a reordenar todas las canciones de la playlist{' '}
        <strong className="text-white">&quot;{shuffleDialogState.playlists[0].name}&quot;</strong>. Esta acción no se puede deshacer.
        </span>
      );
    }
    return (
      <span>
      Vas a reordenar las canciones de{' '}
      <strong className="text-white">{count}</strong> playlist(s) seleccionada(s). Esta acción no se puede deshacer.
      </span>
    );
  }, [shuffleDialogState.playlists]);
  
  // Generamos la descripción para el diálogo de eliminación.
  const deletionDescription = useMemo(() => {
    if (deletionDialogState.playlists.length === 1) {
      return (
        <span>
        Esta acción es irreversible. Vas a eliminar la playlist{' '}
        <strong className="text-white">
        &quot;{deletionDialogState.playlists[0].name}&quot;
        </strong>.
        </span>
      );
    }
    return (
      <span>
      Vas a eliminar permanentemente{' '}
      <strong className="text-white">{deletionDialogState.playlists.length} playlist(s)</strong>{' '}
      de tu librería. Esta acción es irreversible.
      </span>
    );
  }, [deletionDialogState.playlists]);
  
  return (
    <ActionContext.Provider value={contextValue}>
    {children}
    
    {/* Diálogo de sincronización */}
    <ConfirmationDialog
    isOpen={syncPreviewDialogState.isOpen}
    onClose={syncPreviewDialogCallbacks.onClose}
    onConfirm={syncPreviewDialogCallbacks.onConfirm}
    isLoading={isProcessing}
    title="Confirmar Sincronización"
    description={syncPreviewDescription}
    confirmButtonText="Sí, continuar"
    />
    
    {/* Diálogo de reordenado. */}
    <ConfirmationDialog
    isOpen={shuffleDialogState.isOpen}
    onClose={shuffleDialogCallbacks.onClose}
    onConfirm={shuffleDialogCallbacks.onConfirm}
    isLoading={isProcessing}
    title="Confirmar Reordenado"
    description={shuffleDescription}
    confirmButtonText="Sí, reordenar"
    confirmButtonVariant="destructive"
    />
    
    {/* Diálogo de eliminación. */}
    <ConfirmationDialog
    isOpen={deletionDialogState.isOpen}
    onClose={deletionDialogCallbacks.onClose}
    onConfirm={deletionDialogCallbacks.onConfirm}
    isLoading={isProcessing}
    title="¿Estás absolutamente seguro?"
    description={deletionDescription}
    confirmButtonText="Sí, eliminar"
    confirmButtonVariant="destructive"
    />
    </ActionContext.Provider>
  );
}

// Hook personalizado para consumir el contexto fácilmente.
export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActions debe ser usado dentro de un ActionProvider');
  }
  return context;
};