// /components/custom/buttons/SyncAllButton.tsx
'use client';

import { useMemo } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useActions } from '@/lib/contexts/ActionProvider';
import { usePlaylistStore } from '@/lib/store';
import HeaderIconButton from './HeaderIconButton';

export default function SyncAllButton() {
  const playlistCache = usePlaylistStore((state) => state.playlistCache);
  const { openSyncDialog, isProcessing } = useActions();
  
  // Calculamos las megalistas sincronizables con useMemo
  const syncableMegalists = useMemo(
    () => playlistCache.filter(p => p.isSyncable),
    [playlistCache]
  );
  
  const handleSyncAll = () => {
    if (syncableMegalists.length === 0) {
      toast.info('No se encontraron Megalistas para sincronizar.');
      return;
    }
    openSyncDialog(syncableMegalists.map((p) => ({ id: p.id, name: p.name })));
  };
  
  const tooltipText =
  syncableMegalists.length > 0
  ? `Sincronizar ${syncableMegalists.length} Megalista(s)`
  : 'No hay Megalistas para sincronizar';
  
  return (
    <HeaderIconButton
    tooltipText={tooltipText}
    onClick={handleSyncAll}
    disabled={isProcessing || syncableMegalists.length === 0}
    >
    {isProcessing ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : (
      <RefreshCw className="h-5 w-5" />
    )}
    </HeaderIconButton>
  );
}