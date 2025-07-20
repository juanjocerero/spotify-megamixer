'use client';

import { useState, useMemo } from 'react';

import { usePlaylistStore } from '@/lib/store';
import { useActions } from '@/lib/contexts/ActionProvider';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shuffle } from 'lucide-react';

export default function ShuffleAllButton() {
  const { megamixCache } = usePlaylistStore();
  const { actions, isProcessing } = useActions();
  
  const allMegalists = useMemo(() => megamixCache.filter(p => p.isMegalist), [megamixCache]);
  
  const handleShuffleAll = () => {
    if (allMegalists.length === 0) {
      toast.info("No se encontraron Megalistas para reordenar.");
      return;
    }
    actions.shufflePlaylists(allMegalists.map(p => ({ id: p.id, name: p.name })));
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
    {isProcessing ? <Shuffle className="h-5 w-5 text-gray-500" /> : <Shuffle className="h-5 w-5" />}
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    <p>Reordenar {allMegalists.length} Megalista(s)</p>
    </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}