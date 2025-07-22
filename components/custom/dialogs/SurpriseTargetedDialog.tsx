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
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Crear Lista Sorpresa</DialogTitle>
    </DialogHeader>
    <Label>¿Cuántas canciones aleatorias quieres en tu nueva lista?</Label>
    <div className="text-center font-bold text-lg">{sliderValue[0]}</div>
    <Slider
    value={sliderValue}
    max={uniqueTrackCount}
    min={1}
    step={1}
    onValueChange={setSliderValue}
    disabled={uniqueTrackCount === 0}
    />
    <div className="text-xs text-muted-foreground text-center">
    Total de canciones únicas disponibles: {uniqueTrackCount}
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