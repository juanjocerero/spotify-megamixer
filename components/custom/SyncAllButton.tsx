// components/custom/SyncAllButton.tsx

'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { usePlaylistStore } from '@/lib/store';
import { useActions } from '@/lib/contexts/ActionProvider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function SyncAllButton() {
  const { megamixCache } = usePlaylistStore();
  // Obtenemos openSyncDialog directamente del hook
  const { openSyncDialog, isProcessing } = useActions();
  
  const syncableMegalists = useMemo(
    () => megamixCache.filter((p) => p.isSyncable),
    [megamixCache]
  );
  
  const handleSyncAll = () => {
    if (syncableMegalists.length === 0) {
      toast.info('No se encontraron Megalistas para sincronizar.');
      return;
    }
    // Llamamos a la nueva función que inicia el flujo de sincronización
    openSyncDialog(
      syncableMegalists.map((p) => ({ id: p.id, name: p.name }))
    );
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
    {isProcessing ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : (
      <RefreshCw className="h-5 w-5" />
    )}
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    <p>
    {syncableMegalists.length > 0
      ? `Sincronizar ${syncableMegalists.length} Megalista(s)`
      : 'No hay Megalistas para sincronizar'}
      </p>
      </TooltipContent>
      </Tooltip>
      </TooltipProvider>
    );
  }