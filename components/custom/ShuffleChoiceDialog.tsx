'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ShuffleChoiceDialogProps {
  // Controla si el diálogo está visible o no.
  isOpen: boolean;
  // Función que se llama cuando el diálogo se cierra sin tomar una decisión (ej. clic fuera o tecla Esc).
  onClose: () => void;
  // Función callback que se ejecuta cuando el usuario elige una opción.
  // Recibe `true` si elige "Reordenar" y `false` si elige "Mantener Orden".
  onConfirm: (shouldShuffle: boolean) => void;
  // Título opcional para el diálogo.
  title?: string;
  // Descripción opcional para el diálogo. Puede ser un string o un componente React.
  description?: React.ReactNode;
}

export default function ShuffleChoiceDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Cómo quieres ordenar las canciones?',
  description = 'Puedes mantener el orden original de las canciones o reordenarlas para crear una mezcla aleatoria.',
}: ShuffleChoiceDialogProps) {
  const handleConfirm = (shouldShuffle: boolean) => {
    onConfirm(shouldShuffle);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>{title}</DialogTitle>
    <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
    <Button
    variant="outline"
    className="flex-1"
    onClick={() => handleConfirm(false)}
    >
    Mantener orden
    </Button>
    <Button
    className="flex-1"
    onClick={() => handleConfirm(true)}
    >
    Reordenar canciones
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}