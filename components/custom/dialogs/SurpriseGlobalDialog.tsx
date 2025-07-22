// components/custom/dialogs/SurpriseGlobalDialog.tsx
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
import { Label } from '@/components/ui/label';

interface SurpriseGlobalDialogProps {
  /** Controla si el diálogo está visible. */
  isOpen: boolean;
  /** Función a llamar cuando el diálogo se cierra. */
  onClose: () => void;
  /** Función a llamar al confirmar, pasando el número de playlists a usar. */
  onConfirm: (count: number) => void;
}

/**
* Diálogo para el flujo de "Megalista Sorpresa Global".
* Pregunta al usuario de cuántas de sus playlists (elegidas al azar)
* quiere tomar las canciones para la mezcla.
*/
export default function SurpriseGlobalDialog({
  isOpen,
  onClose,
  onConfirm,
}: SurpriseGlobalDialogProps) {
  const [count, setCount] = useState('50'); // Usamos string para el input
  
  const handleConfirm = () => {
    // Usamos 50 como valor por defecto si el input está vacío o es inválido.
    onConfirm(parseInt(count, 10) || 50);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Megalista Sorpresa Global</DialogTitle>
    </DialogHeader>
    <Label>
    ¿De cuántas de tus playlists (elegidas al azar) quieres tomar las canciones?
    </Label>
    <Input
    type="number"
    value={count}
    onChange={(e) => setCount(e.target.value)}
    placeholder="Por defecto: 50"
    autoFocus
    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
    <DialogFooter>
    <Button variant="outline" onClick={onClose}>
    Cancelar
    </Button>
    <Button onClick={handleConfirm}>Crear</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}