// /lib/store.ts
import { create } from 'zustand';

// Definimos la "forma" de nuestro almacén de estado
interface PlaylistStore {
  selectedPlaylistIds: string[];
  togglePlaylist: (id: string) => void;
  isSelected: (id: string) => boolean;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  // Estado inicial: un array vacío para los IDs
  selectedPlaylistIds: [],
  
  // Acción para añadir/quitar un ID
  togglePlaylist: (id: string) => {
    set((state) => {
      const isAlreadySelected = state.selectedPlaylistIds.includes(id);
      if (isAlreadySelected) {
        // Si ya está, lo filtramos (quitamos)
        return { selectedPlaylistIds: state.selectedPlaylistIds.filter((pid) => pid !== id) };
      } else {
        // Si no está, lo añadimos
        return { selectedPlaylistIds: [...state.selectedPlaylistIds, id] };
      }
    });
  },
  
  // Función auxiliar para comprobar si un ID está seleccionado
  isSelected: (id: string) => {
    // 'get()' nos permite leer el estado actual fuera del 'set'
    return get().selectedPlaylistIds.includes(id);
  },
}));