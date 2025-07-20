// lib/contexts/ActionProvider.tsx

'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { usePlaylistActions, ActionPlaylist } from '@/lib/hooks/usePlaylistActions';
import { usePlaylistStore } from '@/lib/store';

// Componentes de Diálogo y UI
import ConfirmationDialog from '@/components/custom/ConfirmationDialog';
import ShuffleChoiceDialog from '@/components/custom/ShuffleChoiceDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

// Definición del tipo para el contexto
interface ActionContextType {
  isProcessing: boolean;
  openDeleteDialog: (playlists: ActionPlaylist[]) => void;
  openShuffleDialog: (playlists: ActionPlaylist[]) => void;
  openSyncDialog: (playlists: ActionPlaylist[]) => Promise<void>;
  openCreateMegalistDialog: (sourceIds: string[]) => void;
  openAddToMegalistDialog: (sourceIds: string[]) => void;
  openSurpriseMixDialog: (sourceIds?: string[]) => Promise<void>;
}

// Creación del Contexto
const ActionContext = createContext<ActionContextType | undefined>(undefined);

// El Provider
export function ActionProvider({ children }: { children: React.ReactNode }) {
  const {
    isProcessing,
    dialogState,
    dialogCallbacks,
    openDeleteDialog,
    openShuffleDialog,
    openSyncDialog,
    openCreateMegalistDialog,
    openAddToMegalistDialog,
    openSurpriseMixDialog,
  } = usePlaylistActions();
  
  // El valor del contexto solo expone lo que los componentes hijos necesitan llamar
  const contextValue = useMemo(() => ({
    isProcessing,
    openDeleteDialog,
    openShuffleDialog,
    openSyncDialog,
    openCreateMegalistDialog,
    openAddToMegalistDialog,
    openSurpriseMixDialog,
  }), [isProcessing, openDeleteDialog, openShuffleDialog, openSyncDialog, openCreateMegalistDialog, openAddToMegalistDialog, openSurpriseMixDialog]);
  
  // --- Componente interno para renderizar los diálogos ---
  const DialogRenderer = () => {
    // Estado local para los inputs dentro de los diálogos
    const [inputValue, setInputValue] = useState('');
    const [sliderValue, setSliderValue] = useState([50]);
    const { megamixCache } = usePlaylistStore();
    
    // Resetea los valores de los inputs cuando se cierra un diálogo
    if (dialogState.variant === 'none' && (inputValue !== '' || sliderValue[0] !== 50)) {
      setInputValue('');
      setSliderValue([50]);
    }
    
    switch (dialogState.variant) {
      case 'delete': {
        const playlists = dialogState.props.playlists || [];
        const description = playlists.length === 1
        ? `Esta acción es irreversible. Vas a eliminar la playlist "${playlists[0].name}".`
        : `Vas a eliminar permanentemente ${playlists.length} playlist(s). Esta acción es irreversible.`;
        return (
          <ConfirmationDialog
          isOpen={true}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmDelete}
          isLoading={isProcessing}
          title="¿Estás absolutamente seguro?"
          description={description}
          confirmButtonText="Sí, eliminar"
          confirmButtonVariant="destructive"
          />
        );
      }
      
      case 'shuffle': {
        const playlists = dialogState.props.playlists || [];
        const description = playlists.length === 1
        ? `Vas a reordenar todas las canciones de la playlist "${playlists[0].name}". Esta acción no se puede deshacer.`
        : `Vas a reordenar las canciones de ${playlists.length} playlist(s) seleccionada(s). Esta acción no se puede deshacer.`;
        return (
          <ConfirmationDialog
          isOpen={true}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmShuffle}
          isLoading={isProcessing}
          title="Confirmar Reordenado"
          description={description}
          confirmButtonText="Sí, reordenar"
          confirmButtonVariant="destructive"
          />
        );
      }
      
      case 'syncPreview': {
        const { playlists = [], syncStats } = dialogState.props;
        const title = playlists.length === 1 ? `"${playlists[0].name}"` : `${playlists.length} Megalista(s)`;
        const description = (
          <div className="text-sm text-slate-400">
          Vas a sincronizar <strong className="text-white">{title}</strong>.
          <ul className="list-disc pl-5 mt-3 space-y-1">
          <li className="text-green-400"> Se añadirán <strong className="text-green-300">{syncStats?.added ?? 0}</strong> canciones. </li>
          <li className="text-red-400"> Se eliminarán <strong className="text-red-300">{syncStats?.removed ?? 0}</strong> canciones. </li>
          </ul>
          <p className="mt-3">¿Deseas continuar?</p>
          </div>
        );
        return (
          <ConfirmationDialog
          isOpen={true}
          onClose={dialogCallbacks.onClose}
          onConfirm={dialogCallbacks.onConfirmSyncPreview}
          isLoading={isProcessing}
          title="Resumen de Sincronización"
          description={description}
          confirmButtonText="Sí, continuar"
          />
        );
      }
      
      case 'syncShuffleChoice':
      case 'createShuffleChoice':
      case 'addToShuffleChoice': {
        const onConfirm = dialogState.variant === 'syncShuffleChoice' ? dialogCallbacks.onConfirmSyncShuffleChoice :
        dialogState.variant === 'createShuffleChoice' ? dialogCallbacks.onConfirmCreateShuffleChoice :
        dialogCallbacks.onConfirmAddToShuffleChoice;
        return (
          <ShuffleChoiceDialog
          isOpen={true}
          onClose={dialogCallbacks.onClose}
          onConfirm={onConfirm}
          />
        );
      }
      
      case 'createName':
      return (
        <Dialog open={true} onOpenChange={(open) => !open && dialogCallbacks.onClose()}>
        <DialogContent>
        <DialogHeader><DialogTitle>Paso 1: Ponle un nombre</DialogTitle></DialogHeader>
        <Input placeholder="Ej: Mi Megalista Épica" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
        <DialogFooter>
        <Button variant="outline" onClick={dialogCallbacks.onClose}>Cancelar</Button>
        <Button onClick={() => dialogCallbacks.onConfirmCreateName(inputValue)}>Siguiente</Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
      );
      
      case 'createOverwrite':
      return (
        <Dialog open={true} onOpenChange={(open) => !open && dialogCallbacks.onClose()}>
        <DialogContent>
        <DialogHeader>
        <DialogTitle>Playlist Existente</DialogTitle>
        <DialogDescription>
        La playlist "<strong className="text-white">{dialogState.props.playlistName}</strong>" ya existe. ¿Qué quieres hacer?
        </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={() => dialogCallbacks.onConfirmOverwrite('update')}>
        Añadir Canciones
        </Button>
        <Button variant="destructive" className="flex-1" onClick={() => dialogCallbacks.onConfirmOverwrite('replace')}>
        Reemplazarla por Completo
        </Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
      );
      
      case 'addToSelect':
      return (
        <Dialog open={true} onOpenChange={(open) => !open && dialogCallbacks.onClose()}>
        <DialogContent>
        <DialogHeader>
        <DialogTitle>Añadir a una Megalista</DialogTitle>
        <DialogDescription>Elige la Megalista a la que quieres añadir las canciones seleccionadas.</DialogDescription>
        </DialogHeader>
        <Select onValueChange={(value) => setInputValue(value)}>
        <SelectTrigger><SelectValue placeholder="Selecciona una Megalista..." /></SelectTrigger>
        <SelectContent>
        {megamixCache.filter(p => p.playlistType === 'MEGALIST').map(p => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
        </SelectContent>
        </Select>
        <DialogFooter>
        <Button variant="outline" onClick={dialogCallbacks.onClose}>Cancelar</Button>
        <Button onClick={() => dialogCallbacks.onConfirmAddToSelect(inputValue)}>Siguiente</Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
      );
      
      case 'surpriseGlobal':
      return (
        <Dialog open={true} onOpenChange={(open) => !open && dialogCallbacks.onClose()}>
        <DialogContent>
        <DialogHeader><DialogTitle>Megalista Sorpresa Global</DialogTitle></DialogHeader>
        <Label>¿De cuántas de tus playlists (elegidas al azar) quieres tomar las canciones?</Label>
        <Input type="number" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Por defecto: 50" />
        <DialogFooter>
        <Button variant="outline" onClick={dialogCallbacks.onClose}>Cancelar</Button>
        <Button onClick={() => dialogCallbacks.onConfirmSurpriseGlobal(parseInt(inputValue, 10) || 50)}>Crear</Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
      );
      
      case 'surpriseTargeted': {
        const maxTracks = dialogState.props.uniqueTrackCount ?? 0;
        return (
          <Dialog open={true} onOpenChange={(open) => !open && dialogCallbacks.onClose()}>
          <DialogContent>
          <DialogHeader><DialogTitle>Crear Lista Sorpresa</DialogTitle></DialogHeader>
          <Label>¿Cuántas canciones aleatorias quieres en tu nueva lista?</Label>
          <div className='text-center font-bold text-lg'>{sliderValue[0]}</div>
          <Slider 
          defaultValue={[50]} 
          value={sliderValue}
          max={maxTracks} 
          min={1}
          step={1} 
          onValueChange={setSliderValue}
          />
          <div className='text-xs text-muted-foreground text-center'>Total de canciones únicas disponibles: {maxTracks}</div>
          <DialogFooter>
          <Button variant="outline" onClick={dialogCallbacks.onClose}>Cancelar</Button>
          <Button onClick={() => dialogCallbacks.onConfirmSurpriseTargeted(sliderValue[0])}>Siguiente</Button>
          </DialogFooter>
          </DialogContent>
          </Dialog>
        );
      }
      
      case 'surpriseName':
      const title = dialogState.props.isOverwrite ? "Actualizar Lista Sorpresa" : "Paso Final: Nombra tu Lista Sorpresa";
      return (
        <Dialog open={true} onOpenChange={(open) => !open && dialogCallbacks.onClose()}>
        <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input placeholder="Ej: Sorpresa de Viernes" defaultValue={dialogState.props.isOverwrite ? dialogState.props.playlistName : ''} onChange={(e) => setInputValue(e.target.value)} />
        <DialogFooter>
        <Button variant="outline" onClick={dialogCallbacks.onClose}>Cancelar</Button>
        <Button onClick={() => dialogCallbacks.onConfirmSurpriseName(inputValue)}>
        {dialogState.props.isOverwrite ? "Actualizar Lista" : "Crear Lista"}
        </Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
      );
      
      default:
      return null;
    }
  };
  
  return (
    <ActionContext.Provider value={contextValue}>
    {children}
    <DialogRenderer />
    </ActionContext.Provider>
  );
}

// Hook para consumir el contexto fácilmente
export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActions debe ser usado dentro de un ActionProvider');
  }
  return context;
};