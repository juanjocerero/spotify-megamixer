// /components/custom/FloatingActionBar.tsx
'use client';

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlaylistStore } from '@/lib/store';
import { useActions } from '@/lib/contexts/ActionProvider';
import ActionBarButton from '@/components/custom/buttons/ActionBarButton';
import { Button } from '@/components/ui/button';
import {
  XCircle,
  Trash2,
  Shuffle,
  RefreshCw,
  Loader2,
  Wand2,
  ListPlus,
  PlusSquare,
} from 'lucide-react';

/**
* Una barra de acciones contextual que aparece en la parte inferior de la pantalla
* cuando una o más playlists están seleccionadas.
*
* Responsabilidades:
* - Se muestra solo si hay al menos una playlist en `selectedPlaylistIds` (del store de Zustand).
* - Extrae las funciones de acción (`open...Dialog`) del contexto `useActions`.
* - Calcula qué botones de acción mostrar basándose en las propiedades de las playlists seleccionadas
*   (ej. el botón "Sincronizar" solo aparece si se seleccionan Megalistas sincronizables).
* - Renderiza los botones de acción (Eliminar, Reordenar, Sincronizar, etc.) que
*   disparan los flujos de trabajo correspondientes al hacer clic.
* - Muestra un estado de carga en botones de larga duración como "Sincronizar".
*/
export default function FloatingActionBar() {
  
  const { selectedPlaylistIds, clearSelection, playlistCache } = usePlaylistStore(
    useShallow((state) => ({
      selectedPlaylistIds: state.selectedPlaylistIds,
      clearSelection: state.clearSelection,
      playlistCache: state.playlistCache,
    })),
  );
  
  const {
    isProcessing,
    openCreateMegalistDialog,
    openAddToMegalistDialog,
    openSurpriseMixDialog,
    openShuffleDialog,
    openSyncDialog,
    openDeleteDialog,
  } = useActions();
  
  const playlistsInSelection = useMemo(
    () => playlistCache.filter(p => selectedPlaylistIds.includes(p.id)),
    [selectedPlaylistIds, playlistCache]
  );
  
  const syncableMegalistsInSelection = useMemo(
    () => playlistsInSelection.filter(p => p.isSyncable),
    [playlistsInSelection]
  );
  
  const hasMegalistsInSelection = useMemo(
    () => playlistsInSelection.some(p => p.isMegalist),
    [playlistsInSelection]
  );
  
  if (selectedPlaylistIds.length === 0) {
    return null;
  }
  
  return (
    // Envolvemos toda la barra en un único TooltipProvider
    <div className="fixed bottom-0 left-0 right-0 z-20 flex h-20 items-center justify-center border-t border-gray-700 bg-gray-800/95 px-4 shadow-lg backdrop-blur-sm sm:h-24">
    <div className="flex w-full max-w-4xl items-center justify-between">
    <div className="hidden text-sm text-gray-300 sm:block">
    <p className="font-bold text-white">{selectedPlaylistIds.length} playlist(s)</p>
    <p>seleccionada(s)</p>
    </div>
    <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-end">
    {/* Botón de Limpiar Selección */}
    <ActionBarButton
    tooltipText="Limpiar Selección"
    onClick={clearSelection}
    >
    <XCircle className="h-6 w-6 sm:h-5 sm:w-5" />
    <span className="hidden sm:inline-block text-sm">Limpiar</span>
    </ActionBarButton>
    
    {/* Botón de Eliminar */}
    <ActionBarButton
    tooltipText="Eliminar Seleccionada(s)"
    onClick={() => openDeleteDialog(playlistsInSelection)}
    disabled={isProcessing}
    className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
    >
    <Trash2 className="h-6 w-6 sm:h-5 sm:w-5" />
    <span className="hidden sm:inline-block text-sm">Eliminar</span>
    </ActionBarButton>
    
    {/* Botón de Reordenar (condicional) */}
    {hasMegalistsInSelection && (
      <ActionBarButton
      tooltipText={`Reordenar ${playlistsInSelection.length} Megalista(s)`}
      onClick={() => openShuffleDialog(playlistsInSelection)}
      disabled={isProcessing}
      className="text-orange-500 hover:bg-orange-500/10 hover:text-orange-500"
      >
      <Shuffle className="h-6 w-6 sm:h-5 sm:w-5" />
      <span className="hidden sm:inline-block text-sm">Reordenar</span>
      </ActionBarButton>
    )}
    
    {/* Botón de Sincronizar (condicional) */}
    {syncableMegalistsInSelection.length > 0 && (
      <ActionBarButton
      tooltipText={`Sincronizar ${syncableMegalistsInSelection.length} Megalista(s)`}
      onClick={() => openSyncDialog(syncableMegalistsInSelection)}
      disabled={isProcessing}
      >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <RefreshCw className="h-6 w-6 sm:h-5 sm:w-5" />
      )}
      <span className="hidden sm:inline-block text-sm">Sincronizar</span>
      </ActionBarButton>
    )}
    
    {/* Botón de Crear Sorpresa */}
    <ActionBarButton
    tooltipText="Crear Lista Sorpresa desde Selección"
    onClick={() => openSurpriseMixDialog(selectedPlaylistIds)}
    disabled={isProcessing}
    >
    <Wand2 className="h-6 w-6 sm:h-5 sm:w-5" />
    <span className="hidden sm:inline-block text-sm">Sorpresa</span>
    </ActionBarButton>
    
    {/* Botón de Añadir a Existente */}
    <ActionBarButton
    tooltipText="Añadir a Megalista Existente"
    onClick={() => openAddToMegalistDialog(selectedPlaylistIds)}
    disabled={isProcessing}
    >
    <ListPlus className="h-6 w-6 sm:h-5 sm:w-5" />
    <span className="hidden sm:inline-block text-sm">Añadir</span>
    </ActionBarButton>
    
    {/* Botón principal de Crear Megalista (condicional) */}
    {selectedPlaylistIds.length >= 2 && (
      // Este no usa el wrapper porque tiene un estilo diferente (no es 'ghost')
      <Button
      size="lg"
      onClick={() => openCreateMegalistDialog(selectedPlaylistIds)}
      disabled={isProcessing}
      className="h-14 w-14 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
      >
      <PlusSquare className="h-6 w-6 sm:h-5 sm:w-5" />
      <span className="hidden sm:inline-block text-sm ml-2">Crear</span>
      </Button>
    )}
    </div>
    </div>
    </div>
  );
}