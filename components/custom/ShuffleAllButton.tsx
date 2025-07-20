// components/custom/ShuffleAllButton.tsx

'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';
import { Shuffle } from 'lucide-react';
import { usePlaylistStore } from '@/lib/store';
import { useActions } from '@/lib/contexts/ActionProvider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function ShuffleAllButton() {
  const { playlistCache } = usePlaylistStore(); 
  // Pedimos openShuffleDialog directamente en lugar de 'actions'
  const { openShuffleDialog, isProcessing } = useActions();
  
  const allMegalists = useMemo(() => playlistCache.filter((p) => p.isMegalist), [playlistCache]);
  
  const handleShuffleAll = () => {
    if (allMegalists.length === 0) {
      toast.info('No se encontraron Megalistas para reordenar.');
      return;
    }
    // Llamamos a la nueva función del hook
    openShuffleDialog(allMegalists.map((p) => ({ id: p.id, name: p.name })));
  };
  
  return (
    <TooltipProvider>
    <Tooltip>
    <TooltipTrigger asChild>
    <Button
    variant="ghost"
    size="icon"
    onClick={handleShuffleAll}
    disabled={isProcessing || allMegalists.length === 0}
    >
    <Shuffle className="h-5 w-5" />
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    <p>
    {allMegalists.length > 0
      ? `Reordenar ${allMegalists.length} Megalista(s)`
      : 'No hay Megalistas para reordenar'}
      </p>
      </TooltipContent>
      </Tooltip>
      </TooltipProvider>
    );
  }