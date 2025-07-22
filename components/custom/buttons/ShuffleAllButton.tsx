// /components/custom/buttons/ShuffleAllButton.tsx
'use client';

import { useMemo } from 'react';
import { Shuffle } from 'lucide-react';
import { toast } from 'sonner';

import { useActions } from '@/lib/contexts/ActionProvider';
import HeaderIconButton from './HeaderIconButton';
import { usePlaylistStore } from '@/lib/store';

export default function ShuffleAllButton() {
  // Obtenemos toda la caché de playlists
  const playlistCache = usePlaylistStore((state) => state.playlistCache);
  const { openShuffleDialog, isProcessing } = useActions();
  
  // Calculamos las megalistas usando useMemo para optimizar
  const allMegalists = useMemo(
    () => playlistCache.filter(p => p.isMegalist),
    [playlistCache]
  );
  
  const handleShuffleAll = () => {
    if (allMegalists.length === 0) {
      toast.info('No se encontraron Megalistas para reordenar.');
      return;
    }
    // Pasamos un objeto simplificado a la acción
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