'use client';

import { useState } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { toast } from 'sonner';
import { SpotifyPlaylist } from '@/types/spotify';
import { 
  unfollowPlaylistsBatch, 
  shufflePlaylistsAction, 
  previewBatchSync, 
  executeMegalistSync 
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

// Estados para los diálogos de sincronización
type SyncPreviewDialogState = {
  isOpen: boolean;
  playlists: ActionPlaylist[];
  added: number;
  removed: number;
};

type SyncShuffleChoiceDialogState = {
  isOpen: boolean;
  playlists: ActionPlaylist[];
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
  
  const [syncPreviewDialog, setSyncPreviewDialog] = useState<SyncPreviewDialogState>({
    isOpen: false, playlists: [], added: 0, removed: 0,
  });
  
  const [shuffleDialog, setShuffleDialog] = useState<ShuffleDialogState>({
    isOpen: false, playlists: [],
  });
  const [syncShuffleChoiceDialog, setSyncShuffleChoiceDialog] = useState<SyncShuffleChoiceDialogState>({
    isOpen: false, playlists: [],
  });
  
  const [deletionDialog, setDeletionDialog] = useState<DeletionDialogState>({
    isOpen: false, playlists: [], 
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
  
  // Handler para ejecutar la sincronización final
  const _handleExecuteSync = async (shouldShuffle: boolean) => {
    const playlistsToSync = syncShuffleChoiceDialog.playlists;
    setSyncShuffleChoiceDialog({ isOpen: false, playlists: [] }); // Cerrar diálogo inmediatamente
    setIsLoading(true);
    const toastId = toast.loading(`Sincronizando ${playlistsToSync.length} playlist(s)...`);
    
    const syncPromises = playlistsToSync.map(p => executeMegalistSync(p.id, shouldShuffle));
    const results = await Promise.allSettled(syncPromises);
    
    let successCount = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
        updatePlaylistInCache(playlistsToSync[index].id, { trackCount: result.value.finalCount });
      } else {
        console.error(`Fallo al sincronizar la playlist ${playlistsToSync[index].name}:`, result.status === 'rejected' ? result.reason : 'unknown error');
      }
    });
    
    toast.success(`Sincronización completada. ${successCount} de ${playlistsToSync.length} Megalistas actualizadas.`, { id: toastId });
    setIsLoading(false);
    clearSelection();
  };
  
  // Handler para la transición entre diálogos
  const _handleConfirmSyncPreview = () => {
    setSyncShuffleChoiceDialog({
      isOpen: true,
      playlists: syncPreviewDialog.playlists,
    });
    setSyncPreviewDialog({ isOpen: false, playlists: [], added: 0, removed: 0 });
  };
  
  // Función interna que ejecuta la lógica de reordenado
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
  
  // Función pública para iniciar la sincronización
  const syncPlaylists = async (playlists: ActionPlaylist[]) => {
    if (playlists.length === 0) return;
    setIsLoading(true);
    const toastId = toast.loading(`Calculando cambios para ${playlists.length} Megalista(s)...`);
    
    try {
      const idsToPreview = playlists.map(p => p.id);
      const { totalAdded, totalRemoved } = await previewBatchSync(idsToPreview);
      
      if (totalAdded === 0 && totalRemoved === 0) {
        toast.success("¡Todo al día!", { id: toastId, description: "Las playlists seleccionadas ya están sincronizadas." });
        setIsLoading(false);
        return;
      }
      
      toast.dismiss(toastId);
      setSyncPreviewDialog({
        isOpen: true,
        playlists,
        added: totalAdded,
        removed: totalRemoved,
      });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo previsualizar la sincronización.";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
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
    syncPlaylists, 
    shufflePlaylists,
    deletePlaylists, 
  };
  
  return {
    isProcessing: isLoading,
    actions,
    
    syncPreviewDialogState: syncPreviewDialog,
    syncPreviewDialogCallbacks: {
      onConfirm: _handleConfirmSyncPreview,
      onClose: () => setSyncPreviewDialog({ isOpen: false, playlists: [], added: 0, removed: 0 }),
    },
    
    shuffleDialogState: shuffleDialog,
    shuffleDialogCallbacks: {
      onConfirm: _handleConfirmShuffle,
      onClose: () => setShuffleDialog({ isOpen: false, playlists: [] }),
    },
    syncShuffleChoiceDialogState: syncShuffleChoiceDialog,
    syncShuffleChoiceDialogCallbacks: {
      onConfirm: _handleExecuteSync,
      onClose: () => setSyncShuffleChoiceDialog({ isOpen: false, playlists: [] }),
    },
    
    deletionDialogState: deletionDialog,
    deletionDialogCallbacks: {
      onConfirm: _handleConfirmDelete,
      onClose: () => setDeletionDialog({ isOpen: false, playlists: [] }),
    },
  };
}