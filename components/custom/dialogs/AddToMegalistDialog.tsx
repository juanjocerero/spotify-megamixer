// components/custom/dialogs/AddToMegalistDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { usePlaylistStore } from '@/lib/store';

interface AddToMegalistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetId: string) => void;
}

export default function AddToMegalistDialog({
  isOpen,
  onClose,
  onConfirm,
}: AddToMegalistDialogProps) {
  // Obtenemos las Megalistas directamente desde el store
  const { playlistCache } = usePlaylistStore();
  
  // Gestionamos el ID de la playlist seleccionada con nuestro propio estado
  const [selectedId, setSelectedId] = useState<string>('');
  
  const megalists = playlistCache.filter(p => p.playlistType === 'MEGALIST');
  
  const handleConfirm = () => {
    if (selectedId) {
      onConfirm(selectedId);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Añadir a una Megalista</DialogTitle>
    <DialogDescription>
    Elige la Megalista a la que quieres añadir las canciones seleccionadas.
    </DialogDescription>
    </DialogHeader>
    <Select onValueChange={setSelectedId} value={selectedId}>
    <SelectTrigger className="w-full">
    <SelectValue placeholder="Selecciona una Megalista..." />
    </SelectTrigger>
    <SelectContent>
    {megalists.map(p => (
      <SelectItem key={p.id} value={p.id}>
      {p.name}
      </SelectItem>
    ))}
    </SelectContent>
    </Select>
    <DialogFooter>
    <Button variant="outline" onClick={onClose}>
    Cancelar
    </Button>
    <Button onClick={handleConfirm} disabled={!selectedId}>
    Siguiente
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}