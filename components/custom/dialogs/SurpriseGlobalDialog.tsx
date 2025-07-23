// components/custom/dialogs/SurpriseGlobalDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SurpriseGlobalDialogProps {
  /** Controla si el diálogo está visible. */
  isOpen: boolean;
  /** Número total de playlists del usuario */
  totalPlaylists: number;
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
  totalPlaylists,
}: SurpriseGlobalDialogProps) {
  const [count, setCount] = useState('50'); // Usamos string para el input
  
  const handleConfirm = () => {
    const numCount = parseInt(count, 10) || 50;
    // Aseguramos que el valor no exceda el máximo
    onConfirm(Math.min(numCount, totalPlaylists));
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Megalista Sorpresa Global</DialogTitle>
    </DialogHeader>
    <DialogDescription>
    Elige de cuántas de tus playlists (seleccionadas al azar de un total de{' '}
      <strong>{totalPlaylists}</strong>) quieres tomar las canciones.
      </DialogDescription>
      <Input
      type="number"
      value={count}
      onChange={(e) => setCount(e.target.value)}
      placeholder="Por defecto: 50" 
      max={totalPlaylists}
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