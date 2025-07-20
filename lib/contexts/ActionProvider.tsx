'use client';

import { createContext, useContext, useMemo } from 'react';
import { usePlaylistActions, ActionPlaylist } from '../hooks/usePlaylistActions';
import ConfirmationDialog from '@/components/custom/ConfirmationDialog';

// Definimos la forma del contexto que los componentes consumirán.
type ActionContextType = {
  actions: {
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
    deletionDialogState, 
    deletionDialogCallbacks 
  } = usePlaylistActions();
  
  // Memoizamos el valor del contexto para evitar re-renders innecesarios.
  const contextValue = useMemo(() => ({ actions, isProcessing }), [actions, isProcessing]);
  
  // Generamos la descripción para el diálogo de eliminación.
  const deletionDescription = useMemo(() => {
    if (deletionDialogState.playlists.length === 1) {
      return (
        <span>
        Esta acción es irreversible. Vas a eliminar la playlist{' '}
        <strong className="text-white">
        "{deletionDialogState.playlists[0].name}"
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
    
    {/* Aquí vivirán TODOS nuestros diálogos de acción globales. */}
    {/* Por ahora, solo el de eliminación. */}
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