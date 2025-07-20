'use client';

import { useState, useMemo } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { shufflePlaylistsAction } from '@/lib/action';

import ConfirmationDialog from './ConfirmationDialog';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
    <ConfirmationDialog
    isOpen={shuffleAlertOpen}
    onClose={() => setShuffleAlertOpen(false)}
    onConfirm={handleConfirmGlobalShuffle}
    isLoading={isLoading}
    title="Confirmar Reordenado Global"
    description={
      <div>
      Vas a reordenar todas tus{' '}
      <strong className="text-white">{allMegalists.length}</strong> Megalistas. Esta acción reordenará completamente cada lista y no se puede deshacer.
      </div>
    }
    confirmButtonText="Sí, continuar"
    confirmButtonVariant="destructive"
    />
    </TooltipProvider>
  );
}