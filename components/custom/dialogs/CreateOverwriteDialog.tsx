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
  isOpen: boolean;
  playlistName: string;
  onClose: () => void;
  onConfirm: (mode: 'update' | 'replace') => void;
}

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
    La playlist "<strong className="text-white">{playlistName}</strong>" ya existe. ¿Qué quieres hacer?
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