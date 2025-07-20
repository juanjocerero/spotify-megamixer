// components/custom/ShuffleAllButton.tsx

'use client';
import { Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { usePlaylistStore } from '@/lib/store';
import { useActions } from '@/lib/contexts/ActionProvider';
import HeaderIconButton from './buttons/HeaderIconButton';

export default function ShuffleAllButton() {
  const allMegalists = usePlaylistStore((state) =>
    state.playlistCache.filter((p) => p.isMegalist)
);
const { openShuffleDialog, isProcessing } = useActions();

const handleShuffleAll = () => {
  if (allMegalists.length === 0) {
    toast.info('No se encontraron Megalistas para reordenar.');
    return;
  }
  openShuffleDialog(allMegalists.map((p) => ({ id: p.id, name: p.name })));
};

const tooltipText =
allMegalists.length > 0
? `Reordenar ${allMegalists.length} Megalista(s)`
: 'No hay Megalistas para reordenar';

return (
  <HeaderIconButton
  tooltipText={tooltipText}
  onClick={handleShuffleAll}
  disabled={isProcessing || allMegalists.length === 0}
  >
  <Shuffle className="h-5 w-5" />
  </HeaderIconButton>
);
}