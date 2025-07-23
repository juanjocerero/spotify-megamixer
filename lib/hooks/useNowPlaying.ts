// lib/hooks/useNowPlaying.ts

'use client';

import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlaylistStore } from '../store';
import { getCurrentlyPlayingAction } from '../actions/player.actions';

/**
* Hook que gestiona la lógica de polling para obtener la canción
* que se está reproduciendo actualmente y la guarda en el estado global.
*/
export function useNowPlaying() {
  const { setCurrentlyPlayingTrack } = usePlaylistStore(
    useShallow((state) => ({
      setCurrentlyPlayingTrack: state.setCurrentlyPlayingTrack,
    })),
  );
  
  useEffect(() => {
    const fetchCurrentlyPlaying = async () => {
      const result = await getCurrentlyPlayingAction();
      if (result.success) {
        // Si la acción fue exitosa, actualizamos el store.
        // `result.data?.track` será el objeto de la canción o `undefined`,
        // y el operador `??` lo convertirá en `null` si es `undefined`.
        setCurrentlyPlayingTrack(result.data?.track ?? null);
      } else {
        // Si hubo un error en la llamada, nos aseguramos de limpiar el estado.
        setCurrentlyPlayingTrack(null);
        console.error('Error fetching currently playing track:', result.error);
      }
    };
    
    // Llamamos a la función una vez de inmediato al montar el componente.
    fetchCurrentlyPlaying();
    
    // Configuramos un intervalo para que se repita cada 5 segundos.
    const intervalId = setInterval(fetchCurrentlyPlaying, 5000);
    
    // Es crucial limpiar el intervalo cuando el componente se desmonte
    // para evitar fugas de memoria y llamadas innecesarias.
    return () => {
      clearInterval(intervalId);
    };
  }, [setCurrentlyPlayingTrack]);
}