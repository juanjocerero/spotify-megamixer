// /components/custom/SurpriseMixButton.tsx
'use client';

import { useState } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { SpotifyPlaylist } from '@/types/spotify';
import { shuffleArray } from '@/lib/utils';
import { createSurpriseMegalist } from '@/lib/action';

// UI Components
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Wand2, Loader2 } from 'lucide-react';

export default function SurpriseMixButton() {
  
  const { 
    selectedPlaylistIds, 
    playlistCache, 
    addPlaylistToCache, 
    clearSelection 
  } = usePlaylistStore();
  
  // Estado para manejar el flujo de los diálogos y los datos
  const [dialogStep, setDialogStep] = useState<'idle' | 'askingCount' | 'askingName'>('idle');
  const [sourcePlaylists, setSourcePlaylists] = useState<SpotifyPlaylist[]>([]);
  const [trackCount, setTrackCount] = useState(50);
  const [playlistName, setPlaylistName] = useState('Megamix Sorpresa');
  const [isProcessing, setIsProcessing] = useState(false); // Para el Hito 3
  
  // Inicia el flujo: determina las fuentes y abre el primer diálogo
  const handleInitiateMix = () => {
    let sources: SpotifyPlaylist[] = [];
    
    if (selectedPlaylistIds.length >= 2) {
      // Caso 1: El usuario ha seleccionado playlists
      sources = playlistCache.filter(p => selectedPlaylistIds.includes(p.id));
    } else {
      // Caso 2: Sin selección, coger hasta 10 al azar de la caché
      const shuffledCache = shuffleArray([...playlistCache]);
      sources = shuffledCache.slice(0, 10);
    }
    
    if (sources.length === 0) {
      toast.error('No hay playlists disponibles para crear un mix.', {
        description: 'Carga más playlists o selecciona algunas para empezar.'
      });
      return;
    }
    
    setSourcePlaylists(sources);
    setDialogStep('askingCount');
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
      
      // Si la acción tiene éxito, actualizamos la UI
      addPlaylistToCache(newPlaylist);
      clearSelection(); // Limpiamos la selección por si el usuario usó esa vía
      toast.success(`¡"${newPlaylist.name}" creada con éxito!`, { id: toastId });
      
      resetState(); // Cierra los diálogos y resetea el estado
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la playlist.';
      toast.error(message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetState = () => {
    setDialogStep('idle');
    setSourcePlaylists([]);
    setPlaylistName('Megamix Sorpresa');
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
    {/* Contenido vacío para renderizar solo el icono*/}
    </TooltipContent>
    </Tooltip>
    
    {/* --- Diálogo 1: Preguntar número de canciones --- */}
    <Dialog open={dialogStep === 'askingCount'} onOpenChange={(isOpen) => !isOpen && resetState()}>
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
    <Input
    id="track-count"
    type="number"
    value={trackCount}
    onChange={(e) => setTrackCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
    />
    </div>
    <DialogFooter>
    <Button variant="outline" onClick={resetState}>Cancelar</Button>
    <Button onClick={() => setDialogStep('askingName')}>Continuar</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    {/* --- Diálogo 2: Preguntar nombre de la playlist --- */}
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
    <Input
    id="playlist-name"
    value={playlistName}
    onChange={(e) => setPlaylistName(e.target.value)}
    />
    </div>
    <DialogFooter className="sm:justify-between">
    <Button variant="ghost" onClick={() => setDialogStep('askingCount')}>Atrás</Button>
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
    </TooltipProvider>
  );
}