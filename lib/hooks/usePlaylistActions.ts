'use client';

import { useState } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { toast } from 'sonner';
import { SpotifyPlaylist } from '@/types/spotify';
import { 
  unfollowPlaylistsBatch, 
  shufflePlaylistsAction  
} from '@/lib/action';

// Tipo para definir una playlist para una acción, solo necesitamos id y nombre.
export type ActionPlaylist = {
  id: string;
  name: string;
};

// Este tipo definirá el estado de cualquier acción en curso.
type ActionState = {
  isLoading: boolean;
  
  // Podríamos añadir más propiedades aquí en el futuro, como el tipo de acción actual.
};

// Estado para el diálogo de reordenado
type ShuffleDialogState = {
  isOpen: boolean;
  playlists: ActionPlaylist[];
};

// Estado para el diálogo de eliminación.
type DeletionDialogState = {
  isOpen: boolean;
  playlists: ActionPlaylist[];
};


/**
* Hook centralizado para gestionar todas las acciones de playlists (eliminar, sincronizar, crear, etc.).
* Encapsula la lógica de estado, diálogos y notificaciones.
*/
export function usePlaylistActions() {
  const [actionState, setActionState] = useState<ActionState>({ isLoading: false });
  const [isLoading, setIsLoading] = useState(false);
  const [shuffleDialog, setShuffleDialog] = useState<ShuffleDialogState>({
    isOpen: false,
    playlists: [],
  });
  const [deletionDialog, setDeletionDialog] = useState<DeletionDialogState>({
    isOpen: false,
    playlists: [],
  });
  
  // Obtenemos acceso al store de Zustand para leer y modificar el estado global.
  const {
    selectedPlaylistIds,
    playlistCache,
    megamixCache,
    clearSelection,
    removeMultipleFromCache,
    updatePlaylistInCache,
  } = usePlaylistStore();
  
  // Función interno que ejecuta la lógica de reordenado
  const _handleConfirmShuffle = async () => {
    setIsLoading(true);
    const toastId = toast.loading(`Reordenando ${shuffleDialog.playlists.length} playlist(s)...`);
    
    try {
      const idsToShuffle = shuffleDialog.playlists.map(p => p.id);
      await shufflePlaylistsAction(idsToShuffle);
      
      toast.success(`${shuffleDialog.playlists.length} playlist(s) reordenadas con éxito.`, { id: toastId });
      clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron reordenar las playlists.';
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
      setShuffleDialog({ isOpen: false, playlists: [] });
    }
  };
  
  // Función interna que realmente ejecuta la lógica de borrado.
  const _handleConfirmDelete = async () => {
    setIsLoading(true);
    const toastId = toast.loading(`Eliminando ${deletionDialog.playlists.length} playlist(s)...`);
    
    try {
      const idsToDelete = deletionDialog.playlists.map(p => p.id);
      await unfollowPlaylistsBatch(idsToDelete);
      
      removeMultipleFromCache(idsToDelete);
      toast.success('Playlist(s) eliminadas con éxito.', { id: toastId });
      
      // Limpiamos la selección si se eliminaron las seleccionadas.
      clearSelection(); 
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron eliminar.';
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
      setDeletionDialog({ isOpen: false, playlists: [] }); // Cierra el diálogo
    }
  };
  
  // Función pública para reordenar
  const shufflePlaylists = (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    setShuffleDialog({
      isOpen: true,
      playlists,
    });
  };
  
  // Función pública para eliminar que los componentes llamarán.
  // Su única responsabilidad es abrir el diálogo de confirmación con el contexto correcto.
  const deletePlaylists = (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    setDeletionDialog({
      isOpen: true,
      playlists,
    });
  };
  
  
  // Aquí definiremos todas las funciones que los componentes de la UI podrán llamar.
  // Por ahora, es un objeto vacío que llenaremos en los siguientes pasos.
  const actions = {
    shufflePlaylists,
    deletePlaylists, 
  };
  
  return {
    isProcessing: isLoading,
    actions,
    shuffleDialogState: shuffleDialog,
    shuffleDialogCallbacks: {
      onConfirm: _handleConfirmShuffle,
      onClose: () => setShuffleDialog({ isOpen: false, playlists: [] }),
    },
    deletionDialogState: deletionDialog,
    deletionDialogCallbacks: {
      onConfirm: _handleConfirmDelete,
      onClose: () => setDeletionDialog({ isOpen: false, playlists: [] }),
    },
  };
}