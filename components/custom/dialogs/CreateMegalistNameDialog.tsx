// components/custom/dialogs/CreateMegalistNameDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateMegalistNameDialogProps {
  /** Controla si el diálogo está visible. */
  isOpen: boolean;
  /** Función a llamar cuando el diálogo se cierra sin confirmar. */
  onClose: () => void;
  /** Función a llamar al confirmar, pasando el nombre introducido por el usuario. */
  onConfirm: (playlistName: string) => void;
}

/**
* Diálogo simple que solicita al usuario un nombre para una nueva playlist que se va a crear.
* Gestiona su propio estado interno para el campo de texto.
*/
export default function CreateMegalistNameDialog({
  isOpen,
  onClose,
  onConfirm,
}: CreateMegalistNameDialogProps) {
  // Este componente ahora gestiona su propio estado.
  const [name, setName] = useState('');
  
  const handleConfirm = () => {
    // Validamos que el nombre no esté vacío antes de confirmar.
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Nombre para la lista</DialogTitle>
    </DialogHeader>
    <Input
    placeholder="Ej: Mi Megalista"
    value={name}
    onChange={(e) => setName(e.target.value)}
    autoFocus
    />
    <DialogFooter>
    <Button variant="outline" onClick={onClose}>
    Cancelar
    </Button>
    <Button onClick={handleConfirm} disabled={!name.trim()}>
    Crear
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}