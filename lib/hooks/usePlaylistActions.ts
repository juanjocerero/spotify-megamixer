'use client';

import { useState } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { toast } from 'sonner';
import { SpotifyPlaylist } from '@/types/spotify';
import { unfollowPlaylistsBatch } from '@/lib/action';

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
  
  // Función PÚBLICA que los componentes llamarán.
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
    deletePlaylists, 
  };
  
  return {
    isProcessing: isLoading,
    actions,
    // Devolvemos el estado y los callbacks para que el Provider pueda controlar el diálogo.
    deletionDialogState: deletionDialog,
    deletionDialogCallbacks: {
      onConfirm: _handleConfirmDelete,
      onClose: () => setDeletionDialog({ isOpen: false, playlists: [] }),
    },
  };
}