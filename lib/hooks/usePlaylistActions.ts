'use client';

import { useState } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { toast } from 'sonner';
import { SpotifyPlaylist } from '@/types/spotify';

// Este tipo definirá el estado de cualquier acción en curso.
// Lo ampliaremos a medida que añadamos más acciones.
type ActionState = {
  isLoading: boolean;
  // Podríamos añadir más propiedades aquí en el futuro, como el tipo de acción actual.
};

/**
* Hook centralizado para gestionar todas las acciones de playlists (eliminar, sincronizar, crear, etc.).
* Encapsula la lógica de estado, diálogos y notificaciones.
*/
export function usePlaylistActions() {
  const [actionState, setActionState] = useState<ActionState>({ isLoading: false });
  
  // Obtenemos acceso al store de Zustand para leer y modificar el estado global.
  const {
    selectedPlaylistIds,
    playlistCache,
    megamixCache,
    clearSelection,
    removeMultipleFromCache,
    updatePlaylistInCache,
  } = usePlaylistStore();
  
  // Aquí definiremos todas las funciones que los componentes de la UI podrán llamar.
  // Por ahora, es un objeto vacío que llenaremos en los siguientes pasos.
  const actions = {
    // Ejemplo de cómo se verá una acción:
    // deletePlaylists: (playlistIds: string[]) => { ... }
  };
  
  return {
    // Los componentes de la UI podrán leer el estado de la acción para deshabilitar botones, etc.
    isProcessing: actionState.isLoading,
    // Los componentes de la UI llamarán a las funciones dentro de este objeto.
    actions,
  };
}