// components/custom/SyncAllButton.tsx

'use client';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePlaylistStore } from '@/lib/store';
import { useActions } from '@/lib/contexts/ActionProvider';
import HeaderIconButton from './buttons/HeaderIconButton';

export default function SyncAllButton() {
  const syncableMegalists = usePlaylistStore((state) =>
    state.playlistCache.filter((p) => p.isSyncable)
);
const { openSyncDialog, isProcessing } = useActions();

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