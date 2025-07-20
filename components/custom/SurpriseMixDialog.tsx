// /components/custom/SurpriseMixDialog.tsx

'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { getUniqueTrackCountFromPlaylistsAction, createTargetedSurpriseMixAction } from '@/lib/action';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SurpriseMixDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceIds: string[];
}

export default function SurpriseMixDialog({ isOpen, onClose, sourceIds }: SurpriseMixDialogProps) {
  const { addPlaylistToCache, clearSelection, playlistCache } = usePlaylistStore();
  const [step, setStep] = useState<'loading' | 'askCount' | 'askName'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [totalTracks, setTotalTracks] = useState(0);
  const [trackCount, setTrackCount] = useState(50);
  const [playlistName, setPlaylistName] = useState('Lista Sorpresa');
  const [error, setError] = useState<string | null>(null);
  
  const resetAndClose = useCallback(() => {
    setStep('loading');
    setIsLoading(false);
    setError(null);
    onClose();
  }, [onClose]);
  
  useEffect(() => {
    if (!isOpen || sourceIds.length === 0) {
      return;
    }
    
    const getTrackCount = async () => {
      setStep('loading');
      setIsLoading(true);
      setError(null);
      
      try {
        let count = 0;
        if (sourceIds.length === 1) {
          // Ruta rápida: Obtiene el total desde la caché del cliente. Instantáneo.
          const playlist = playlistCache.find((p) => p.id === sourceIds[0]);
          if (playlist) {
            count = playlist.tracks.total;
          } else {
            // Fallback por si la playlist no estuviera en caché (improbable)
            count = await getUniqueTrackCountFromPlaylistsAction(sourceIds);
          }
        } else {
          // Ruta lenta: Necesaria para múltiples playlists para eliminar duplicados.
          count = await getUniqueTrackCountFromPlaylistsAction(sourceIds);
        }
        setTotalTracks(count);
        setStep('askCount');
      } catch (err) {
        console.error('No se pudo calcular el total de canciones.', err)
        toast.error('No se pudo calcular el total de canciones.');
        resetAndClose();
      } finally {
        setIsLoading(false);
      }
    };
    
    getTrackCount();
  }, [isOpen, sourceIds, playlistCache, resetAndClose, error]);
  
  const handleContinue = () => {
    if (trackCount <= 0) {
      setError('El número debe ser mayor que cero.');
      return;
    }
    if (trackCount > totalTracks) {
      setError(`El máximo de canciones disponibles es ${totalTracks}.`);
      return;
    }
    setError(null);
    setStep('askName');
  };
  
  const handleCreate = async () => {
    if (!playlistName.trim()) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    setIsLoading(true);
    const toastId = toast.loading('Creando tu Lista Sorpresa...');
    try {
      const newPlaylist = await createTargetedSurpriseMixAction(sourceIds, trackCount, playlistName);
      addPlaylistToCache(newPlaylist);
      clearSelection();
      toast.success(`¡"${newPlaylist.name}" creada con éxito!`, { id: toastId });
      resetAndClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      if (message.startsWith('PLAYLIST_EXISTS')) {
        toast.error('Ya existe una playlist con ese nombre.', { id: toastId });
      } else {
        toast.error(message, { id: toastId });
      }
      setIsLoading(false);
    }
  };
  
  const renderContent = () => {
    if (step === 'loading' || isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    if (step === 'askCount') {
      return (
        <>
        <DialogHeader>
        <DialogTitle>Crear Lista Sorpresa</DialogTitle>
        <DialogDescription>
        Se usarán canciones de <strong>{sourceIds.length} playlist(s)</strong>, con un total de <strong>{totalTracks}</strong> canciones únicas. ¿Cuántas quieres en tu nueva lista?
        </DialogDescription>
        </DialogHeader>
        <div className="py-4">
        <Label htmlFor="track-count">Número de canciones</Label>
        <Input id="track-count" type="number" value={trackCount} onChange={(e) => setTrackCount(parseInt(e.target.value, 10) || 1)} />
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
        <DialogFooter>
        <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
        <Button onClick={handleContinue}>Continuar</Button>
        </DialogFooter>
        </>
      );
    }
    if (step === 'askName') {
      return (
        <>
        <DialogHeader>
        <DialogTitle>Un último paso...</DialogTitle>
        <DialogDescription>Elige un nombre para tu nueva lista de <strong>{trackCount} canciones</strong>.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
        <Label htmlFor="playlist-name">Nombre de la playlist</Label>
        <Input id="playlist-name" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} />
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
        <DialogFooter className="sm:justify-between">
        <Button variant="ghost" onClick={() => setStep('askCount')}>Atrás</Button>
        <div className="flex gap-2">
        <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
        <Button onClick={handleCreate}>Crear Playlist</Button>
        </div>
        </DialogFooter>
        </>
      );
    }
    return null;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
    <DialogContent>{renderContent()}</DialogContent>
    </Dialog>
  );
}