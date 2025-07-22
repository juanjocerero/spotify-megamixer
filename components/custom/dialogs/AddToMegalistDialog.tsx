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
  /** Controla si el diálogo está visible. */
  isOpen: boolean;
  /** Función a llamar cuando el diálogo se cierra (ej. clic fuera, Esc). */
  onClose: () => void;
  /** Función a llamar cuando el usuario confirma la selección, pasando el ID de la Megalista de destino. */
  onConfirm: (targetId: string) => void;
  /** Si es `true`, el diálogo se adapta para el flujo de añadir pistas sueltas, mostrando validaciones adicionales. */
  isAddingTracks?: boolean;
}

/**
* Diálogo que permite al usuario seleccionar una Megalista existente de una lista desplegable.
* Se utiliza en dos flujos:
* 1.  Para añadir playlists completas como nuevas fuentes a una Megalista.
* 2.  Para añadir canciones sueltas (desde la búsqueda) a una Megalista (`isAddingTracks = true`).
*/
export default function AddToMegalistDialog({
  isOpen,
  onClose,
  onConfirm, 
  isAddingTracks = false,
}: AddToMegalistDialogProps) {
  
  // Obtenemos las Megalistas directamente desde el store
  const playlistCache = usePlaylistStore((state) => state.playlistCache);
  
  // Gestionamos el ID de la playlist seleccionada con nuestro propio estado
  const [selectedId, setSelectedId] = useState<string>('');
  
  const [error, setError] = useState<string | null>(null);
  
  const megalists = playlistCache.filter(p => p.playlistType === 'MEGALIST');
  
  const handleValueChange = (id: string) => {
    setSelectedId(id);
    setError(null); // Limpiar error al cambiar la selección
    
    // Validaciones específicas para cuando se añaden pistas sueltas
    if (isAddingTracks) {
      const selectedPlaylist = megalists.find(p => p.id === id);
      if (selectedPlaylist?.isFrozen) {
        setError('No se pueden añadir pistas a una Megalista congelada o vacía.');
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