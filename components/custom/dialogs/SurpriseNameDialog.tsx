// components/custom/dialogs/SurpriseNameDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlaylistStore } from '@/lib/store';

interface SurpriseNameDialogProps {
  /** Controla si el diálogo está visible. */
  isOpen: boolean;
  /** Indica si estamos actualizando una lista existente. */
  isOverwrite: boolean;
  /** El ID de la playlist a sobrescribir, si aplica. */
  overwriteId?: string;
  /** Función a llamar cuando el diálogo se cierra. */
  onClose: () => void;
  /** Función a llamar al confirmar, pasando el nombre final de la playlist. */
  onConfirm: (playlistName: string) => void;
}

/**
* El último paso en el flujo de creación de una Lista Sorpresa.
* Pide al usuario que nombre la nueva playlist. También se reutiliza para el
* flujo de sobrescritura, pre-rellenando el nombre de la lista existente.
*/
export default function SurpriseNameDialog({
  isOpen,
  isOverwrite,
  overwriteId,
  onClose,
  onConfirm,
}: SurpriseNameDialogProps) {
  const { playlistCache } = usePlaylistStore();
  const [name, setName] = useState('');
  
  // Sincronizamos el nombre por defecto si estamos en modo de sobrescritura
  useEffect(() => {
    if (isOverwrite && overwriteId) {
      const existingPlaylist = playlistCache.find(p => p.id === overwriteId);
      setName(existingPlaylist?.name || '');
    }
  }, [isOverwrite, overwriteId, playlistCache]);
  
  const handleConfirm = () => {
    // Si el input está vacío, usamos el nombre original, si no, el nuevo.
    onConfirm(name.trim());
  };
  
  const title = isOverwrite
  ? 'Actualizar Lista Sorpresa'
  : 'Paso Final: Nombra tu Lista Sorpresa';
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    <Input
    placeholder="Ej: Sorpresa de Viernes"
    value={name}
    onChange={(e) => setName(e.target.value)}
    autoFocus
    />
    <DialogFooter>
    <Button variant="outline" onClick={onClose}>
    Cancelar
    </Button>
    <Button onClick={handleConfirm} disabled={!name.trim()}>
    {isOverwrite ? 'Actualizar Lista' : 'Crear Lista'}
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}