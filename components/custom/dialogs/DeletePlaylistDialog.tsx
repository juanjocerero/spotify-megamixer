// components/custom/dialogs/DeletePlaylistDialog.tsx
'use client';

import { useActions } from '@/lib/contexts/ActionProvider';
import { type ActionPlaylist } from '@/lib/hooks/usePlaylistActions';
import ConfirmationDialog from '@/components/custom/dialogs/ConfirmationDialog';

interface DeletePlaylistDialogProps {
  isOpen: boolean;
  playlists: ActionPlaylist[];
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeletePlaylistDialog({
  isOpen,
  playlists,
  onClose,
  onConfirm,
}: DeletePlaylistDialogProps) {
  // Obtenemos el estado de carga desde el contexto
  const { isProcessing } = useActions();
  
  // La lógica para construir la descripción ahora vive aquí.
  const description =
  playlists.length === 1
  ? `Esta acción es irreversible. Vas a eliminar la playlist "${playlists[0].name}".`
  : `Vas a eliminar permanentemente ${playlists.length} playlist(s). Esta acción es irreversible.`;
  
  return (
    <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    isLoading={isProcessing}
    title="¿Estás absolutamente seguro?"
    description={description}
    confirmButtonText="Sí, eliminar"
    confirmButtonVariant="destructive"
    />
  );
}