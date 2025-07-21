// components/custom/dialogs/AddToMegalistDialog.tsx
'use client';

import { useState } from 'react';
import { usePlaylistStore } from '@/lib/store';

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
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddToMegalistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetId: string) => void;
  isAddingTracks?: boolean;
}

export default function AddToMegalistDialog({
  isOpen,
  onClose,
  onConfirm, 
  isAddingTracks = false,
}: AddToMegalistDialogProps) {
  // Obtenemos las Megalistas directamente desde el store
  const { playlistCache } = usePlaylistStore();
  
  // Gestionamos el ID de la playlist seleccionada con nuestro propio estado
  const [selectedId, setSelectedId] = useState<string>('');
  
  const [error, setError] = useState<string | null>(null);
  
  const megalists = playlistCache.filter(p => p.playlistType === 'MEGALIST');
  
  const handleValueChange = (id: string) => {
    setSelectedId(id);
    setError(null); // Limpiar error al cambiar la selección
    
    if (isAddingTracks) {
      const selectedPlaylist = megalists.find(p => p.id === id);
      if (selectedPlaylist?.isFrozen) {
        setError('No se pueden añadir pistas a una Megalista congelada.');
      } else if (selectedPlaylist?.tracks.total === 0) {
        setError('No se pueden añadir pistas a una Megalista vacía. Añade primero una lista completa como fuente.');
      }
    }
  };
  
  const handleConfirm = () => {
    if (selectedId && !error) {
      onConfirm(selectedId);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Añadir a una Megalista</DialogTitle>
    <DialogDescription>
    Elige la Megalista de destino.
    </DialogDescription>
    </DialogHeader>
    <div className="flex flex-col gap-4">
    <Select onValueChange={handleValueChange} value={selectedId}>
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
    
    {error && (
      <Alert variant="destructive" className="py-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-xs">
      {error}
      </AlertDescription>
      </Alert>
    )}
    </div>
    <DialogFooter>
    <Button variant="outline" onClick={onClose}> Cancelar </Button>
    <Button onClick={handleConfirm} disabled={!selectedId || !!error}>
    Siguiente
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}