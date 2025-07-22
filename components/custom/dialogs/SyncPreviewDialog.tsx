// components/custom/dialogs/SyncPreviewDialog.tsx
'use client';

import { useActions } from '@/lib/contexts/ActionProvider';
import { type ActionPlaylist } from '@/lib/hooks/usePlaylistActions';
import ConfirmationDialog from '@/components/custom/dialogs/ConfirmationDialog';

interface SyncPreviewDialogProps {
  /** Controla si el diálogo está visible. */
  isOpen: boolean;
  /** Las Megalistas que se van a sincronizar. */
  playlists: ActionPlaylist[];
  /** Un objeto con el número de canciones a añadir y eliminar. */
  syncStats: { added: number; removed: number };
  /** Función a llamar cuando el diálogo se cierra. */
  onClose: () => void;
  /** Función a llamar para confirmar y ejecutar la sincronización. */
  onConfirm: () => void;
}

/**
* Diálogo que muestra un resumen de los cambios que se aplicarán durante una sincronización.
* Informa al usuario de cuántas canciones se añadirán y eliminarán.
* Utiliza el componente genérico `ConfirmationDialog` para la estructura base.
*/
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