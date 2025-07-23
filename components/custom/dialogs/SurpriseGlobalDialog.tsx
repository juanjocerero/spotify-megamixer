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
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

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
  const [count, setCount] = useState(50);
  
  const handleConfirm = () => {
    // Aseguramos que el valor es válido antes de confirmar
    onConfirm(Math.min(count, totalPlaylists));
  };
  
  // Handler para el cambio en el slider
  const handleSliderChange = (value: number[]) => {
    setCount(value[0]);
  };
  
  // Handler para el cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Si el input está vacío, lo tratamos como 0 para no romper el slider
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue)) {
      // Forzamos que el valor esté dentro de los límites permitidos
      setCount(Math.max(1, Math.min(numValue, totalPlaylists)));
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Megalista Sorpresa Global</DialogTitle>
    <DialogDescription>
    Elige de cuántas de tus playlists (seleccionadas al azar de un total de{' '}
      <strong>{totalPlaylists}</strong>) quieres tomar las canciones.
      </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
      <Label htmlFor="playlist-count">Número de playlists</Label>
      <div className="text-center font-bold text-lg">{count}</div>
      <Slider
      value={[count]}
      max={totalPlaylists}
      min={1}
      step={1}
      onValueChange={handleSliderChange}
      disabled={totalPlaylists === 0}
      />
      <div className="flex items-center gap-2 justify-center">
      <Input
      id="playlist-count"
      type="number"
      value={count}
      onChange={handleInputChange}
      className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      disabled={totalPlaylists === 0}
      />
      <span className="text-sm text-muted-foreground">/ {totalPlaylists}</span>
      </div>
      </div>
      <DialogFooter>
      <Button variant="outline" onClick={onClose}>
      Cancelar
      </Button>
      <Button onClick={handleConfirm} disabled={totalPlaylists === 0}>Crear</Button>
      </DialogFooter>
      </DialogContent>
      </Dialog>
    );
  }