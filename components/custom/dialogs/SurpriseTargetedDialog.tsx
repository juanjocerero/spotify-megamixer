// components/custom/dialogs/SurpriseTargetedDialog.tsx
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
import { Slider } from '@/components/ui/slider';

interface SurpriseTargetedDialogProps {
  /** Controla si el diálogo está visible. */
  isOpen: boolean;
  /** El número total de canciones únicas disponibles en la selección. */
  uniqueTrackCount: number;
  /** Función a llamar cuando el diálogo se cierra. */
  onClose: () => void;
  /** Función a llamar al confirmar, pasando el número de canciones elegidas. */
  onConfirm: (trackCount: number) => void;
}

/**
* Diálogo para el flujo de "Lista Sorpresa" a partir de una selección de playlists.
* Permite al usuario elegir cuántas canciones aleatorias (de entre las disponibles)
* quiere que tenga la nueva lista, utilizando un slider.
*/
export default function SurpriseTargetedDialog({
  isOpen,
  uniqueTrackCount,
  onClose,
  onConfirm,
}: SurpriseTargetedDialogProps) {
  // El estado del slider ahora vive aquí, con un valor inicial más inteligente.
  const initialValue = Math.min(50, uniqueTrackCount > 0 ? uniqueTrackCount : 50);
  const [sliderValue, setSliderValue] = useState([initialValue]);
  
  const handleConfirm = () => {
    onConfirm(sliderValue[0]);
  };
  
  // Handler para el cambio en el input numérico
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue)) {
      // Forzamos que el valor esté dentro de los límites (1 y el máximo)
      const clampedValue = Math.max(1, Math.min(numValue, uniqueTrackCount));
      setSliderValue([clampedValue]);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Crear Lista Sorpresa</DialogTitle>
    </DialogHeader>
    <div className="grid gap-4 pt-2">
    <Label htmlFor="track-count">¿Cuántas canciones aleatorias quieres en tu nueva lista?</Label>
    <div className="text-center font-bold text-lg">{sliderValue[0]}</div>
    <Slider
    value={sliderValue}
    max={uniqueTrackCount}
    min={1}
    step={1}
    onValueChange={setSliderValue}
    disabled={uniqueTrackCount === 0}
    />
    <div className="flex items-center gap-2 justify-center">
    <Input
    id="track-count"
    type="number"
    // Mostramos el valor del slider. Usamos [0] porque el estado es un array.
    value={sliderValue[0]}
    onChange={handleInputChange}
    className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    disabled={uniqueTrackCount === 0}
    />
    <span className="text-sm text-muted-foreground">/ {uniqueTrackCount}</span>
    </div>
    </div>
    <DialogFooter>
    <Button variant="outline" onClick={onClose}>
    Cancelar
    </Button>
    <Button onClick={handleConfirm} disabled={uniqueTrackCount === 0}>
    Siguiente
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}