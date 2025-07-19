'use client';

import { useState, useMemo } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { shufflePlaylistsAction } from '@/lib/action';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Shuffle, Loader2 } from 'lucide-react';

export default function ShuffleAllButton() {
  const { megamixCache } = usePlaylistStore();
  const [isLoading, setIsLoading] = useState(false);
  const [shuffleAlertOpen, setShuffleAlertOpen] = useState(false);
  
  const allMegalists = useMemo(() => megamixCache.filter(p => p.isMegalist), [megamixCache]);
  
  const handleInitiateGlobalShuffle = () => {
    if (allMegalists.length === 0) {
      toast.info("No se encontraron Megalistas para reordenar.");
      return;
    }
    setShuffleAlertOpen(true);
  };
  
  const handleConfirmGlobalShuffle = async () => {
    setIsLoading(true);
    const toastId = toast.loading(`Reordenando ${allMegalists.length} Megalista(s)...`);
    
    try {
      const idsToShuffle = allMegalists.map(p => p.id);
      await shufflePlaylistsAction(idsToShuffle);
      toast.success(`Se han reordenado ${allMegalists.length} Megalista(s) con éxito.`, { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar el reordenado global.";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
      setShuffleAlertOpen(false);
    }
  };
  
  return (
    <TooltipProvider>
    <Tooltip>
    <TooltipTrigger asChild>
    <Button
    variant="ghost"
    size="icon"
    onClick={handleInitiateGlobalShuffle}
    disabled={isLoading || allMegalists.length === 0}
    >
    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shuffle className="h-5 w-5" />}
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    <p>Reordenar {allMegalists.length} Megalista(s)</p>
    </TooltipContent>
    </Tooltip>
    <AlertDialog
    open={shuffleAlertOpen}
    onOpenChange={(isOpen) => !isLoading && setShuffleAlertOpen(isOpen)}
    >
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>Confirmar Reordenado Global</AlertDialogTitle>
    <AlertDialogDescription asChild>
    <div>
    Vas a reordenar todas tus{' '}
    <strong className="text-white">{allMegalists.length}</strong> Megalistas. Esta
    acción reordenará completamente cada lista y no se puede deshacer. Este proceso
    puede ser lento. ¿Deseas continuar?
    </div>
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
    <AlertDialogAction
    onClick={handleConfirmGlobalShuffle}
    disabled={isLoading}
    className="bg-orange-600 hover:bg-orange-700 text-white"
    >
    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isLoading ? 'Reordenando...' : 'Sí, continuar'}
    </AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    </TooltipProvider>
  );
}