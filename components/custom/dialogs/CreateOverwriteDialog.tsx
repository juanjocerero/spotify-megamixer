// components/custom/dialogs/CreateOverwriteDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CreateOverwriteDialogProps {
  /** Controla si el diálogo está visible. */
  isOpen: boolean;
  /** El nombre de la playlist que ya existe. */
  playlistName: string;
  /** Función a llamar cuando el diálogo se cierra. */
  onClose: () => void;
  /** Función a llamar al confirmar, pasando el modo elegido ('update' o 'replace'). */
  onConfirm: (mode: 'update' | 'replace') => void;
}

/**
* Diálogo que se muestra cuando un usuario intenta crear una Megalista con un nombre
* que ya existe. Le ofrece dos opciones: añadir las canciones a la existente ('update')
* o reemplazarla por completo ('replace').
*/
export default function CreateOverwriteDialog({
  isOpen,
  playlistName,
  onClose,
  onConfirm,
}: CreateOverwriteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Playlist Existente</DialogTitle>
    <DialogDescription>
    La playlist &quot;<strong className="text-white">{playlistName}</strong>&quot; ya existe. ¿Qué quieres hacer?
    </DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
    <Button
    variant="outline"
    className="flex-1"
    onClick={() => onConfirm('update')}
    >
    Añadir Canciones
    </Button>
    <Button
    variant="destructive"
    className="flex-1"
    onClick={() => onConfirm('replace')}
    >
    Reemplazarla por Completo
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}