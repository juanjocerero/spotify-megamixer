// components/custom/dialogs/SyncPreviewDialog.tsx
'use client';

import { useActions } from '@/lib/contexts/ActionProvider';
import { type ActionPlaylist } from '@/lib/hooks/usePlaylistActions';
import ConfirmationDialog from '@/components/custom/dialogs/ConfirmationDialog';

interface SyncPreviewDialogProps {
  isOpen: boolean;
  playlists: ActionPlaylist[];
  syncStats: { added: number; removed: number };
  onClose: () => void;
  onConfirm: () => void;
}

export default function SyncPreviewDialog({
  isOpen,
  playlists,
  syncStats,
  onClose,
  onConfirm,
}: SyncPreviewDialogProps) {
  const { isProcessing } = useActions();
  
  // La lógica de presentación compleja ahora vive aquí.
  const title =
  playlists.length === 1
  ? `"${playlists[0].name}"`
  : `${playlists.length} Megalista(s)`;
  
  const description = (
    <div className="text-sm text-slate-400">
    Vas a sincronizar <strong className="text-white">{title}</strong>.
    <ul className="list-disc pl-5 mt-3 space-y-1">
    <li className="text-green-400">
    Se añadirán{' '}
    <strong className="text-green-300">{syncStats.added}</strong>{' '}
    canciones.
    </li>
    <li className="text-red-400">
    Se eliminarán{' '}
    <strong className="text-red-300">{syncStats.removed}</strong>{' '}
    canciones.
    </li>
    </ul>
    <p className="mt-3">¿Deseas continuar?</p>
    </div>
  );
  
  return (
    <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    isLoading={isProcessing}
    title="Resumen de Sincronización"
    description={description}
    confirmButtonText="Sí, continuar"
    />
  );
}