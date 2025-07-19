// /components/custom/SurpriseMixButton.tsx
'use client';

import { useState } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { SpotifyPlaylist } from '@/types/spotify';
import { shuffleArray } from '@/lib/utils';
import { createSurpriseMegalist, overwriteSurpriseMegalist } from '@/lib/action';

// UI Components
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Wand2, Loader2 } from 'lucide-react';

export default function SurpriseMixButton() {
  
  const { 
    selectedPlaylistIds, 
    playlistCache, 
    addPlaylistToCache, 
    updatePlaylistInCache, 
    clearSelection 
  } = usePlaylistStore();
  
  // Estado para manejar el flujo de los diálogos y los datos
  const [dialogStep, setDialogStep] = useState<'idle' | 'askingSourceCount' | 'askingTrackCount' | 'askingName'>('idle');
  const [sourcePlaylists, setSourcePlaylists] = useState<SpotifyPlaylist[]>([]);
  const [sourceCount, setSourceCount] = useState(10);
  const [trackCount, setTrackCount] = useState(50);
  const [playlistName, setPlaylistName] = useState('Megamix Sorpresa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [overwriteAlert, setOverwriteAlert] = useState<{ open: boolean; playlistId: string | null }>({
    open: false,
    playlistId: null,
  });
  
  // Inicia el flujo: determina las fuentes y abre el primer diálogo
  const handleInitiateMix = () => {
    
    if (selectedPlaylistIds.length >= 1) {
      // El usuario ha seleccionado playlists, saltamos al paso de contar canciones
      const sources = playlistCache.filter(p => selectedPlaylistIds.includes(p.id));
      setSourcePlaylists(sources);
      setDialogStep('askingTrackCount');
    } else {
      // Sin selección, preguntamos cuántas playlists al azar usar
      if (playlistCache.length === 0) {
        toast.error('No hay playlists cargadas para crear un mix.');
        return;
      }
      setDialogStep('askingSourceCount');
    }
  };
  
  const handleSelectSources = () => {
    // Esta función se llama después de que el usuario elige el número de fuentes
    const shuffledCache = shuffleArray([...playlistCache]);
    // Nos aseguramos de no coger más de las que hay o del máximo de 50
    const finalSourceCount = Math.min(sourceCount, playlistCache.length, 50);
    const sources = shuffledCache.slice(0, finalSourceCount);
    
    if (sources.length === 0) {
      toast.error('No se pudieron seleccionar playlists de origen.');
      resetState();
      return;
    }
    
    setSourcePlaylists(sources);
    setDialogStep('askingTrackCount'); // Avanzamos al siguiente paso
  };
  
  const handleCreateSurpriseMix = async () => {
    if (!playlistName.trim()) {
      toast.error('El nombre de la playlist no puede estar vacío.');
      return;
    }
    
    setIsProcessing(true);
    const toastId = toast.loading('Creando tu Megamix Sorpresa...');
    
    try {
      const newPlaylist = await createSurpriseMegalist(
        sourcePlaylists.map(p => p.id),
        trackCount,
        playlistName
      );
      
      addPlaylistToCache(newPlaylist);
      clearSelection();
      toast.success(`¡"${newPlaylist.name}" creada con éxito!`, { id: toastId });
      resetState();
      
    } catch (error) {
      // --- Lógica para manejar la sobrescritura ---
      if (error instanceof Error && error.message.startsWith('PLAYLIST_EXISTS::')) {
        const existingPlaylistId = error.message.split('::')[1];
        setOverwriteAlert({ open: true, playlistId: existingPlaylistId });
        toast.dismiss(toastId); // Cerramos el toast de "cargando"
      } else {
        const message = error instanceof Error ? error.message : 'No se pudo crear la playlist.';
        toast.error(message, { id: toastId });
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleConfirmOverwrite = async () => {
    if (!overwriteAlert.playlistId) return;
    
    setOverwriteAlert({ open: false, playlistId: null }); // Cerramos la alerta
    setIsProcessing(true);
    const toastId = toast.loading(`Sobrescribiendo "${playlistName}"...`);
    
    try {
      const updatedPlaylist = await overwriteSurpriseMegalist(
        overwriteAlert.playlistId,
        sourcePlaylists.map(p => p.id),
        trackCount
      );
      
      // Actualizamos la playlist en la caché local
      updatePlaylistInCache(updatedPlaylist.id, {
        trackCount: updatedPlaylist.tracks.total
      });
      clearSelection();
      toast.success(`¡"${updatedPlaylist.name}" sobrescrita con éxito!`, { id: toastId });
      resetState();
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo sobrescribir la playlist.';
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetState = () => {
    setDialogStep('idle');
    setSourcePlaylists([]);
    setPlaylistName('Megamix Sorpresa');
    setOverwriteAlert({ open: false, playlistId: null });
  };
  
  return (
    <TooltipProvider>
    <Tooltip>
    <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" onClick={handleInitiateMix}>
    <Wand2 className="h-5 w-5" />
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    Crear Megamix Sorpresa
    </TooltipContent>
    </Tooltip>
    
    {/* --- Preguntar número de fuentes --- */}
    <Dialog open={dialogStep === 'askingSourceCount'} onOpenChange={(isOpen) => !isOpen && resetState()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Megamix Sorpresa</DialogTitle>
    <DialogDescription>
    Primero, elige de cuántas playlists aleatorias quieres obtener las canciones.
    </DialogDescription>
    </DialogHeader>
    <div className="py-4">
    <Label htmlFor="source-count">Número de Playlists (máx. 50)</Label>
    <div className="mt-3">
    <Input
    id="source-count"
    type="number"
    value={sourceCount}
    onChange={(e) => setSourceCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))} 
    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
    </div>
    </div>
    <DialogFooter>
    <Button variant="outline" onClick={resetState}>Cancelar</Button>
    <Button onClick={handleSelectSources}>Continuar</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    {/* --- Preguntar número de canciones --- */}
    <Dialog open={dialogStep === 'askingTrackCount'} onOpenChange={(isOpen) => !isOpen && resetState()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Megamix Sorpresa</DialogTitle>
    <DialogDescription>
    Se usarán canciones de <strong>{sourcePlaylists.length} playlist(s)</strong>.
    ¿Cuántas canciones quieres en tu nueva playlist?
    </DialogDescription>
    </DialogHeader>
    <div className="py-4">
    <Label htmlFor="track-count">Número de canciones</Label>
    <div className="mt-3">
    <Input
    id="track-count"
    type="number"
    value={trackCount}
    onChange={(e) => setTrackCount(Math.max(1, parseInt(e.target.value, 10) || 1))} 
    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    /></div>
    </div>
    <DialogFooter className="sm:justify-between">
    <Button variant="ghost" onClick={() => selectedPlaylistIds.length >= 1 ? resetState() : setDialogStep('askingSourceCount')}>Atrás</Button>
    <div className="flex gap-2">
    <Button variant="outline" onClick={resetState}>Cancelar</Button>
    <Button onClick={() => setDialogStep('askingName')}>Continuar</Button>
    </div>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    {/* --- Preguntar nombre de la playlist --- */}
    <Dialog open={dialogStep === 'askingName'} onOpenChange={(isOpen) => !isOpen && resetState()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Un último paso...</DialogTitle>
    <DialogDescription>
    Elige un nombre para tu nueva Megalista Sorpresa de <strong>{trackCount} canciones</strong>.
    </DialogDescription>
    </DialogHeader>
    <div className="py-4">
    <Label htmlFor="playlist-name">Nombre de la playlist</Label>
    <div className="mt-3">
    <Input
    id="playlist-name"
    value={playlistName}
    onChange={(e) => setPlaylistName(e.target.value)} 
    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
    </div>
    </div>
    <DialogFooter className="sm:justify-between">
    <Button variant="ghost" onClick={() => setDialogStep('askingTrackCount')}>Atrás</Button>
    <div className="flex gap-2">
    <Button variant="outline" onClick={resetState}>Cancelar</Button>
    <Button onClick={handleCreateSurpriseMix} disabled={isProcessing}>
    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isProcessing ? 'Creando...' : 'Crear Playlist'}
    </Button>
    </div>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    {/* --- Confirmar sobrescritura --- */}
    <AlertDialog open={overwriteAlert.open} onOpenChange={(isOpen) => !isOpen && setOverwriteAlert({ open: false, playlistId: null })}>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>La playlist ya existe</AlertDialogTitle>
    <AlertDialogDescription>
    Ya tienes una playlist llamada &quot;{playlistName}&quot;. ¿Quieres reemplazar su contenido con este nuevo Megamix? Esta acción no se puede deshacer.
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel onClick={() => setOverwriteAlert({ open: false, playlistId: null })}>Cancelar</AlertDialogCancel>
    <AlertDialogAction onClick={handleConfirmOverwrite}>Sí, sobrescribir</AlertDialogAction>
    </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
    
    </TooltipProvider>
  );
}