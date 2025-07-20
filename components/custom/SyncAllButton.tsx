// components/custom/SyncAllButton.tsx
'use client';

import { useState, useMemo } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { previewBatchSync, executeMegalistSync } from '@/lib/action';

import ConfirmationDialog from './ConfirmationDialog';
import ShuffleChoiceDialog from './ShuffleChoiceDialog';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogTitle, 
  AlertDialogHeader, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from '@/components/ui/alert-dialog';
import {
  Dialog, 
  DialogHeader, 
  DialogTitle, 
  DialogContent,
  DialogDescription, 
  DialogFooter
} from '@/components/ui/dialog';
import { RefreshCw, Loader2 } from 'lucide-react';

export default function SyncAllButton() {
  const { megamixCache, updatePlaylistInCache } = usePlaylistStore();
  const [isLoading, setIsLoading] = useState(false); // Para el estado del botón principal
  const [syncAlert, setSyncAlert] = useState({
    open: false,
    added: 0,
    removed: 0,
    isExecuting: false,
  });
  const [shuffleGlobalSyncChoice, setShuffleGlobalSyncChoice] = useState({ open: false });
  
  const syncableMegalists = useMemo(
    () => megamixCache.filter(p => p.isSyncable),
    [megamixCache]
  );
  
  const handleInitiateGlobalSync = async () => {
    if (syncableMegalists.length === 0) {
      toast.info("No se encontraron Megalistas para sincronizar.");
      return;
    }
    
    setIsLoading(true);
    const toastId = toast.loading(`Calculando cambios para ${syncableMegalists.length} Megalista(s)...`);
    
    try {
      const syncableIds = syncableMegalists.map(p => p.id);
      const { totalAdded, totalRemoved } = await previewBatchSync(syncableIds);
      
      if (totalAdded === 0 && totalRemoved === 0) {
        toast.success("¡Todo al día!", {
          id: toastId,
          description: "Todas tus Megalistas ya están sincronizadas.",
        });
      } else {
        toast.dismiss(toastId);
        setSyncAlert({ open: true, added: totalAdded, removed: totalRemoved, isExecuting: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo previsualizar la sincronización.";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmGlobalSync = async () => {
    // Cierra el diálogo de previsualización y abre el de reordenado
    setSyncAlert(prev => ({ ...prev, open: false, isExecuting: false }));
    setShuffleGlobalSyncChoice({ open: true });
  };
  
  const handleExecuteGlobalSync = async (shouldShuffle: boolean) => {    
    setShuffleGlobalSyncChoice({ open: false });
    setSyncAlert(prev => ({ ...prev, isExecuting: true }));
    const toastId = toast.loading(`Sincronizando ${syncableMegalists.length} Megalista(s)...`);
    
    const syncableIds = syncableMegalists.map(p => p.id);
    const syncPromises = syncableIds.map(id => executeMegalistSync(id, shouldShuffle));
    const results = await Promise.allSettled(syncPromises);
    
    let successCount = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
        updatePlaylistInCache(syncableIds[index], { trackCount: result.value.finalCount });
      }
    });
    
    toast.success(`Sincronización completada. ${successCount} de ${syncableIds.length} Megalistas actualizadas.`, { id: toastId });
    setSyncAlert({ open: false, added: 0, removed: 0, isExecuting: false });
  };
  
  return (
    <TooltipProvider>
    <Tooltip>
    <TooltipTrigger asChild>
    <Button
    variant="ghost"
    size="icon"
    onClick={handleInitiateGlobalSync}
    disabled={isLoading || syncableMegalists.length === 0}
    >
    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    <p>Sincronizar {syncableMegalists.length} Megalista(s)</p>
    </TooltipContent>
    </Tooltip>
    
    <ConfirmationDialog
    isOpen={syncAlert.open}
    onClose={() => setSyncAlert(prev => ({ ...prev, open: false }))}
    onConfirm={handleConfirmGlobalSync}
    isLoading={isLoading}
    title="Confirmar Sincronización Global"
    description={
      <div className="text-sm text-slate-400"> {/* Puedes usar un div o un fragmento <> */}
      Vas a sincronizar todas tus{' '}
      <strong className="text-white">{syncableMegalists.length}</strong> Megalistas.
      <ul className="list-disc pl-5 mt-3 space-y-1">
      <li className="text-green-400">
      Se añadirán un total de{' '}
      <strong className="text-green-300">{syncAlert.added}</strong> canciones.
      </li>
      <li className="text-red-400">
      Se eliminarán un total de{' '}
      <strong className="text-red-300">{syncAlert.removed}</strong> canciones.
      </li>
      </ul>
      <p className="mt-3">
      Los cambios se aplicarán a cada playlist correspondiente. ¿Deseas continuar?
      </p>
      </div>
    }
    confirmButtonText="Sí, continuar"
    />
    
    {/* Diálogo global */}
    <ShuffleChoiceDialog
    isOpen={shuffleGlobalSyncChoice.open}
    onClose={() => setShuffleGlobalSyncChoice({ open: false })}
    onConfirm={handleExecuteGlobalSync}
    title="¿Reordenar las playlists tras sincronizar?"
    description="Solo se reordenarán aquellas playlists que tengan cambios. ¿Quieres reordenar su contenido de forma aleatoria después de actualizarlas?"
    />
    </TooltipProvider>
  );
}