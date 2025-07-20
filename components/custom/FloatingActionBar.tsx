// /components/custom/FloatingActionBar.tsx
'use client';

import { useMemo } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { useActions } from '@/lib/contexts/ActionProvider';

// Componentes UI de Shadcn
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Shuffle, XCircle, PlusSquare, ListPlus, RefreshCw, Trash2, Wand2 } from 'lucide-react';

export default function FloatingActionBar() {
  
  // Obtenemos todo el estado y acciones necesarios del store de Zustand
  const {
    selectedPlaylistIds,
    clearSelection,
    megamixCache,
    playlistCache,
  } = usePlaylistStore();
  
  const { 
    isProcessing, 
    openCreateMegalistDialog, 
    openAddToMegalistDialog,
    openSurpriseMixDialog,
    openShuffleDialog,
    openSyncDialog, 
    openDeleteDialog, 
  } = useActions();
  
  const playlistsInSelection = useMemo(() => 
    playlistCache.filter(p => selectedPlaylistIds.includes(p.id)), [selectedPlaylistIds, playlistCache]);
    
  // Saber si hay algo que sincronizar
  const megalistsInSelection = useMemo(
    () => megamixCache.filter(p => selectedPlaylistIds.includes(p.id) && p.isMegalist),
    [selectedPlaylistIds, megamixCache]
  );

  const syncableMegalistsInSelection = useMemo(() =>
    usePlaylistStore.getState().playlistCache.filter(p =>
    selectedPlaylistIds.includes(p.id) && p.isSyncable), 
    [selectedPlaylistIds]
  );
  
  const hasSyncableMegalists = syncableMegalistsInSelection.length > 0;
  const hasMegalistsInSelection = megalistsInSelection.length > 0;
  
  if (selectedPlaylistIds.length === 0) {
    return null; // El estado de "Resumable" se ha eliminado por simplicidad, se puede re-añadir si es crítico.
  }
  
  return (
    <>
    <TooltipProvider delayDuration={0}>
    <div className="fixed bottom-0 left-0 right-0 z-20 flex h-20 items-center justify-center border-t border-gray-700 bg-gray-800/95 px-4 shadow-lg backdrop-blur-sm sm:h-24">    <div className="flex w-full max-w-4xl items-center justify-between">
    
    {/* El div que contiene los botones */}
    <div className="flex w-full max-w-4xl items-center justify-between">
    <div className="hidden text-sm text-gray-300 sm:block">
    <p className="font-bold text-white">{selectedPlaylistIds.length} playlist(s)</p>
    <p>seleccionada(s)</p>
    </div>
    
    <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-end">
    
    {/* Limpiar */}
    <Tooltip>
    <TooltipTrigger asChild>
    <Button variant="ghost" size="lg" onClick={clearSelection} className="h-14 w-14 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2">
    <XCircle className="h-6 w-6 sm:h-5 sm:w-5" />
    <span className="hidden sm:inline-block text-sm">Limpiar</span>
    </Button>
    </TooltipTrigger>
    <TooltipContent><p>Limpiar Selección</p></TooltipContent>
    </Tooltip>
    
    {/* Eliminar */}
    <Tooltip>
    <TooltipTrigger asChild>
    <Button
    variant="ghost"
    size="lg"
    onClick={() => openDeleteDialog(playlistsInSelection)}
    disabled={isProcessing} 
    className="h-14 w-14 text-red-500 hover:bg-red-500/10 hover:text-red-500 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2"
    >
    <Trash2 className="h-6 w-6 sm:h-5 sm:w-5" />
    <span className="hidden sm:inline-block text-sm">Eliminar</span>
    </Button>
    </TooltipTrigger>
    <TooltipContent><p>Eliminar Seleccionada(s)</p></TooltipContent>
    </Tooltip>
    
    {/* Reordenar */}
    {hasMegalistsInSelection && (
      <Tooltip>
      <TooltipTrigger asChild>
      <Button
      variant="ghost"
      size="lg"
      onClick={() => openShuffleDialog(playlistsInSelection)}
      disabled={isProcessing}
      className="h-14 w-14 text-orange-500 hover:bg-orange-500/10 hover:text-orange-500 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2"
      >
      <Shuffle className="h-6 w-6 sm:h-5 sm:w-5" />
      <span className="hidden sm:inline-block text-sm">Reordenar</span>
      </Button>
      </TooltipTrigger>
      <TooltipContent>
      <p>Reordenar {megalistsInSelection.length} Megalista(s) seleccionada(s)</p>
      </TooltipContent>
      </Tooltip>
    )}
    
    {/* Sincronizar */}
    {hasSyncableMegalists && (
      <Tooltip>
      <TooltipTrigger asChild>
      <Button
      variant="ghost"
      size="lg"
      // La solución: Envolvemos la llamada en una arrow function
      onClick={() => openSyncDialog(syncableMegalistsInSelection)}
      disabled={isProcessing}
      className="h-14 w-14 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2"
      >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <RefreshCw className="h-6 w-6 sm:h-5 sm:w-5" />
      )}
      <span className="hidden sm:inline-block text-sm">Sincronizar</span>
      </Button>
      </TooltipTrigger>
      <TooltipContent>
      {/* Usamos la misma variable para consistencia en el texto */}
      <p>Sincronizar {syncableMegalistsInSelection.length} Megalista(s) seleccionada(s)</p>
      </TooltipContent>
      </Tooltip>
    )}
    
    {/* Crear lista sorpresa*/}
    <Tooltip>
    <TooltipTrigger asChild>
    <Button variant="ghost" size="lg" onClick={() => openSurpriseMixDialog(selectedPlaylistIds)} disabled={isProcessing}>
    <Wand2 />
    </Button>
    </TooltipTrigger>
    <TooltipContent><p>Crear Lista Sorpresa desde Selección</p></TooltipContent>
    </Tooltip>
    
    {/* Añadir */}
    <Tooltip>
    <TooltipTrigger asChild>
    <Button variant="ghost" size="lg" onClick={() => openAddToMegalistDialog(selectedPlaylistIds)} disabled={isProcessing}>
    <ListPlus />
    </Button>
    </TooltipTrigger>
    <TooltipContent><p>Añadir a Megalista Existente</p></TooltipContent>
    </Tooltip>
    
    {/* Crear */}
    {selectedPlaylistIds.length >= 2 && (
      <Tooltip>
      <TooltipTrigger asChild>
      <Button size="lg" onClick={() => openCreateMegalistDialog(selectedPlaylistIds)} disabled={isProcessing}>
      <PlusSquare />
      </Button>
      </TooltipTrigger>
      <TooltipContent><p>Crear Nueva Megalista</p></TooltipContent>
      </Tooltip>
    )}
    </div>
    </div>
    </div>
    </div>
    </TooltipProvider>
    
    </>
  );
}