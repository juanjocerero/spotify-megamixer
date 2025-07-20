// components/custom/SyncAllButton.tsx
'use client';

import { useMemo } from 'react';
import { usePlaylistStore } from '@/lib/store';

import { useActions } from '@/lib/contexts/ActionProvider';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Loader2 } from 'lucide-react';

export default function SyncAllButton() {
  const { megamixCache, updatePlaylistInCache } = usePlaylistStore();
  const { actions, isProcessing } = useActions();
  
  
  const syncableMegalists = useMemo(
    () => megamixCache.filter(p => p.isSyncable),
    [megamixCache]
  );
  
  const handleSyncAll = () => {
    if (syncableMegalists.length === 0) {
      toast.info("No se encontraron Megalistas para sincronizar.");
      return;
    }
    actions.syncPlaylists(syncableMegalists.map(p => ({ id: p.id, name: p.name })));
  };
  
  return (
    <TooltipProvider>
    <Tooltip>
    <TooltipTrigger asChild>
    <Button
    variant="ghost"
    size="icon"
    onClick={handleSyncAll}
    disabled={isProcessing || syncableMegalists.length === 0}
    >
    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    <p>Sincronizar {syncableMegalists.length} Megalista(s)</p>
    </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}