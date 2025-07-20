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
  isOpen: boolean;
  isOverwrite: boolean;
  overwriteId?: string;
  onClose: () => void;
  onConfirm: (playlistName: string) => void;
}

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