// components/custom/dialogs/EditPlaylistDialog.tsx

'use client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { SpotifyPlaylist } from '@/types/spotify';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useActions } from '@/lib/contexts/ActionProvider';

interface EditPlaylistDialogProps {
  isOpen: boolean;
  playlist: SpotifyPlaylist;
  onClose: () => void;
  onConfirm: (newName: string, newDescription: string) => void;
}

export default function EditPlaylistDialog({
  isOpen,
  playlist,
  onClose,
  onConfirm,
}: EditPlaylistDialogProps) {
  const { isProcessing } = useActions();
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || '');
  
  useEffect(() => {
    if (isOpen) {
      setName(playlist.name);
      setDescription(playlist.description || '');
    }
  }, [isOpen, playlist]);
  
  const handleConfirm = () => {
    if (!name.trim()) {
      toast.error('El nombre de la playlist no puede estar vacío.');
      return;
    }
    onConfirm(name.trim(), description.trim());
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Editar: {playlist.name}</DialogTitle>
    <DialogDescription>
    Modifica el nombre y la descripción de tu playlist. Los cambios se reflejarán en Spotify.
    </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
    <div className="grid gap-2">
    <Label htmlFor="playlist-name">Nombre</Label>
    <Input
    id="playlist-name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    disabled={isProcessing}
    />
    </div>
    <div className="grid gap-2">
    <Label htmlFor="playlist-description">Descripción</Label>
    <Textarea
    id="playlist-description"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="Añade una descripción (opcional)"
    disabled={isProcessing}
    />
    </div>
    </div>
    <DialogFooter>
    <Button variant="outline" onClick={onClose} disabled={isProcessing}>
    Cancelar
    </Button>
    <Button onClick={handleConfirm} disabled={isProcessing}>
    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isProcessing ? 'Guardando...' : 'Guardar Cambios'}
    </Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}