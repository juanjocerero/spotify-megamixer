// components/custom/dialogs/ShufflePlaylistDialog.tsx
'use client';

import { useActions } from '@/lib/contexts/ActionProvider';
import { type ActionPlaylist } from '@/lib/hooks/usePlaylistActions';
import ConfirmationDialog from '@/components/custom/dialogs/ConfirmationDialog';

interface ShufflePlaylistDialogProps {
  /** Controla si el diálogo está visible. */
  isOpen: boolean;
  /** Las playlists cuyas canciones se van a reordenar. */
  playlists: ActionPlaylist[];
  /** Función a llamar cuando el diálogo se cierra. */
  onClose: () => void;
  /** Función a llamar para confirmar la acción de reordenado. */
  onConfirm: () => void;
}

/**
* Diálogo de confirmación para la acción de reordenar las canciones de una o más playlists.
* Utiliza el componente genérico `ConfirmationDialog` con textos y estilos específicos.
*/
export default function ShufflePlaylistDialog({
  isOpen,
  playlists,
  onClose,
  onConfirm,
}: ShufflePlaylistDialogProps) {
  const { isProcessing } = useActions();
  
  // La lógica para construir la descripción vive aquí.
  const description =
  playlists.length === 1
  ? `Vas a reordenar todas las canciones de la playlist "${playlists[0].name}". Esta acción no se puede deshacer.`
  : `Vas a reordenar las canciones de ${playlists.length} playlist(s) seleccionada(s). Esta acción no se puede deshacer.`;
  
  return (
    <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    isLoading={isProcessing}
    title="Confirmar Reordenado"
    description={description}
    confirmButtonText="Sí, reordenar"
    confirmButtonVariant="destructive"
    />
  );
}