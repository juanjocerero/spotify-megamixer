'use client';

import { createContext, useContext, useState, useMemo } from 'react';
import { usePlaylistActions } from '../hooks/usePlaylistActions';
import { usePlaylistStore } from '../store';

import ConfirmationDialog from '@/components/custom/ConfirmationDialog';
import ShuffleChoiceDialog from '@/components/custom/ShuffleChoiceDialog';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Definimos la forma del contexto que los componentes consumirán.
type ActionContextType = {
  actions: ReturnType<typeof usePlaylistActions>['actions'];
  isProcessing: boolean;
  // Funciones para iniciar los flujos desde la UI
  openCreateMegalistDialog: (sourceIds: string[]) => void;
  openAddToMegalistDialog: (sourceIds: string[]) => void;
};

// Creamos el contexto.
const ActionContext = createContext<ActionContextType | undefined>(undefined);

// Creamos el componente Provider.
export function ActionProvider({ children }: { children: React.ReactNode }) {
  const { 
    isProcessing, 
    progress,
    actions, 
    syncPreviewDialogState,
    syncPreviewDialogCallbacks,
    syncShuffleChoiceDialogState, 
    syncShuffleChoiceDialogCallbacks,  
    shuffleDialogState, 
    shuffleDialogCallbacks, 
    deletionDialogState, 
    deletionDialogCallbacks 
  } = usePlaylistActions();
  
  const { megamixCache } = usePlaylistStore();
  
  // Estados para controlar los diálogos del flujo de creación, actualización, reordenado y sobrescritura
  const [createState, setCreateState] = useState({ isOpen: false, sourceIds: [] as string[], playlistName: '' });
  const [shuffleState, setShuffleState] = useState({ isOpen: false, onConfirm: (shouldShuffle: boolean) => {} });
  const [overwriteState, setOverwriteState] = useState({ isOpen: false, playlistName: '', onConfirm: (mode: 'update' | 'replace') => {} });
  const [addToState, setAddToState] = useState({ isOpen: false, sourceIds: [] as string[], targetId: '' });
  
  // Manejador que inicia el flujo de creación de megalistas
  const openCreateMegalistDialog = (sourceIds: string[]) => {
    setCreateState({ isOpen: true, sourceIds, playlistName: '' });
  };
  
  // Pide el nombre de la lista y pregunta por el proceso de reordenado
  const handleCreateNameConfirm = () => {
    if (!createState.playlistName.trim()) {
      toast.error('El nombre no puede estar vacío.');
      return;
    }
    setCreateState(prev => ({ ...prev, isOpen: false }));
    setShuffleState({
      isOpen: true,
      onConfirm: (shouldShuffle) => handleCreateExecution(shouldShuffle),
    });
  };
  
  // Ejecuta la creación de la megalista
  const handleCreateExecution = async (shouldShuffle: boolean) => {
    setShuffleState({ isOpen: false, onConfirm: () => {} });
    const result = await actions.createMegalist(createState.sourceIds, createState.playlistName, shouldShuffle);
    
    // Si la playlist existe, pide confirmación para sobrescribir/actualizar
    if (result.requiresOverwrite && result.playlistId) {
      const targetId = result.playlistId;
      setOverwriteState({
        isOpen: true,
        playlistName: createState.playlistName,
        onConfirm: (mode) => {
          setOverwriteState({ isOpen: false, playlistName: '', onConfirm: () => {} });
          // Llama a la acción de actualizar en el modo elegido
          actions.updateMegalist(targetId, createState.sourceIds, shouldShuffle, mode);
        }
      });
    }
  };
  
  // Flujo "Añadir a existente"
  const openAddToMegalistDialog = (sourceIds: string[]) => {
    setAddToState({ isOpen: true, sourceIds, targetId: '' });
  };
  
  const handleAddToConfirm = () => {
    if (!addToState.targetId) {
      toast.error('Debes seleccionar una Megalista de destino.');
      return;
    }
    setAddToState(prev => ({ ...prev, isOpen: false }));
    setShuffleState({
      isOpen: true,
      onConfirm: (shouldShuffle) => {
        setShuffleState({ isOpen: false, onConfirm: () => {} });
        actions.updateMegalist(addToState.targetId, addToState.sourceIds, shouldShuffle, 'update');
      }
    });
  };
  
  // Descripción para el diálogo de sincronización
  const syncPreviewDescription = useMemo(() => {
    const count = syncPreviewDialogState.playlists.length;
    const title = count === 1 ? `"${syncPreviewDialogState.playlists[0].name}"` : `${count} Megalista(s)`;
    return (
      <div className="text-sm text-slate-400">
      Vas a sincronizar <strong className="text-white">{title}</strong>.
      <ul className="list-disc pl-5 mt-3 space-y-1">
      <li className="text-green-400">
      Se añadirán <strong className="text-green-300">{syncPreviewDialogState.added}</strong> canciones.
      </li>
      <li className="text-red-400">
      Se eliminarán <strong className="text-red-300">{syncPreviewDialogState.removed}</strong> canciones.
      </li>
      </ul>
      <p className="mt-3">¿Deseas continuar?</p>
      </div>
    );
  }, [syncPreviewDialogState]);
  
  // Descripción para el diálogo de reordenado
  const shuffleDescription = useMemo(() => {
    const count = shuffleDialogState.playlists.length;
    if (count === 1) {
      return (
        <span>
        Vas a reordenar todas las canciones de la playlist{' '}
        <strong className="text-white">&quot;{shuffleDialogState.playlists[0].name}&quot;</strong>. Esta acción no se puede deshacer.
        </span>
      );
    }
    return (
      <span>
      Vas a reordenar las canciones de{' '}
      <strong className="text-white">{count}</strong> playlist(s) seleccionada(s). Esta acción no se puede deshacer.
      </span>
    );
  }, [shuffleDialogState.playlists]);
  
  // Descripción para el diálogo de eliminación.
  const deletionDescription = useMemo(() => {
    if (deletionDialogState.playlists.length === 1) {
      return (
        <span>
        Esta acción es irreversible. Vas a eliminar la playlist{' '}
        <strong className="text-white">
        &quot;{deletionDialogState.playlists[0].name}&quot;
        </strong>.
        </span>
      );
    }
    return (
      <span>
      Vas a eliminar permanentemente{' '}
      <strong className="text-white">{deletionDialogState.playlists.length} playlist(s)</strong>{' '}
      de tu librería. Esta acción es irreversible.
      </span>
    );
  }, [deletionDialogState.playlists]);
  
  // Memoizamos el valor del contexto para evitar re-renders innecesarios.
  // Esta declaración debe estar al final para resultar sincronizada
  // con todos los procesos declarados anteriormente.
  const contextValue = useMemo(() => ({ 
    actions, 
    isProcessing,
    openCreateMegalistDialog,
    openAddToMegalistDialog,
  }), [actions, isProcessing]);
  
  return (
    <ActionContext.Provider value={contextValue}>
    {children}
    
    {/* Pide el nombre para una nueva megalista */}
    <Dialog open={createState.isOpen} onOpenChange={(open) => !open && setCreateState({ ...createState, isOpen: false })}>
    <DialogContent>
    <DialogHeader><DialogTitle>Crear Nueva Megalista</DialogTitle></DialogHeader>
    <Label htmlFor="playlist-name">Nombre de la Megalista</Label>
    <Input id="playlist-name" value={createState.playlistName} onChange={(e) => setCreateState(prev => ({...prev, playlistName: e.target.value}))} placeholder="Ej: Mix Definitivo" />
    <DialogFooter>
    <Button variant="outline" onClick={() => setCreateState({ ...createState, isOpen: false })}>Cancelar</Button>
    <Button onClick={handleCreateNameConfirm}>Continuar</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    {/* Preguntar por reordenado (genérico) */}
    <ShuffleChoiceDialog
    isOpen={shuffleState.isOpen}
    onClose={() => setShuffleState({ isOpen: false, onConfirm: () => {} })}
    onConfirm={shuffleState.onConfirm}
    />
    
    {/* Preguntar por sobrescritura si la playlist ya existe */}
    <Dialog open={overwriteState.isOpen} onOpenChange={(open) => !open && setOverwriteState({...overwriteState, isOpen: false})}>
    <DialogContent>
    <DialogHeader><DialogTitle>Playlist Existente</DialogTitle></DialogHeader>
    <DialogDescription>La playlist &quot;{overwriteState.playlistName}&quot; ya existe. ¿Qué quieres hacer?</DialogDescription>
    <DialogFooter className="gap-2">
    <Button variant="outline" onClick={() => setOverwriteState({...overwriteState, isOpen: false})}>Cancelar</Button>
    <Button variant="destructive" onClick={() => overwriteState.onConfirm('replace')}>Reemplazar</Button>
    <Button onClick={() => overwriteState.onConfirm('update')}>Actualizar</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    {/* Preguntar a qué Megalista añadir */}
    <Dialog open={addToState.isOpen} onOpenChange={(open) => !open && setAddToState({...addToState, isOpen: false})}>
    <DialogContent>
    <DialogHeader><DialogTitle>Añadir a Megalista Existente</DialogTitle></DialogHeader>
    <Select onValueChange={(value) => setAddToState(prev => ({...prev, targetId: value}))}>
    <SelectTrigger><SelectValue placeholder="Elige una playlist..." /></SelectTrigger>
    <SelectContent>{megamixCache.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
    </Select>
    <DialogFooter>
    <Button variant="outline" onClick={() => setAddToState({...addToState, isOpen: false})}>Cancelar</Button>
    <Button onClick={handleAddToConfirm}>Confirmar y Añadir</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    
    {/* Mostrar progreso */}
    <Dialog open={isProcessing && progress.total > 0}>
    <DialogContent>
    <DialogHeader><DialogTitle>Procesando...</DialogTitle></DialogHeader>
    <div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div></div>
    <p className="text-center text-sm">{progress.current} / {progress.total} canciones procesadas</p>
    </DialogContent>
    </Dialog>
    
    {/* Diálogo de sincronización */}
    <ConfirmationDialog
    isOpen={syncPreviewDialogState.isOpen}
    onClose={syncPreviewDialogCallbacks.onClose}
    onConfirm={syncPreviewDialogCallbacks.onConfirm}
    isLoading={isProcessing}
    title="Confirmar Sincronización"
    description={syncPreviewDescription}
    confirmButtonText="Sí, continuar"
    />
    
    {/* Diálogo de reordenado. */}
    <ConfirmationDialog
    isOpen={shuffleDialogState.isOpen}
    onClose={shuffleDialogCallbacks.onClose}
    onConfirm={shuffleDialogCallbacks.onConfirm}
    isLoading={isProcessing}
    title="Confirmar Reordenado"
    description={shuffleDescription}
    confirmButtonText="Sí, reordenar"
    confirmButtonVariant="destructive"
    />
    
    {/* Diálogo de eliminación. */}
    <ConfirmationDialog
    isOpen={deletionDialogState.isOpen}
    onClose={deletionDialogCallbacks.onClose}
    onConfirm={deletionDialogCallbacks.onConfirm}
    isLoading={isProcessing}
    title="¿Estás absolutamente seguro?"
    description={deletionDescription}
    confirmButtonText="Sí, eliminar"
    confirmButtonVariant="destructive"
    />
    </ActionContext.Provider>
  );
}

// Hook personalizado para consumir el contexto fácilmente.
export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActions debe ser usado dentro de un ActionProvider');
  }
  return context;
};