'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { getFreshPlaylistDetailsAction } from '@/lib/actions/playlist.actions';
import { SpotifyPlaylist } from '@/types/spotify';

// Configuración para cada playlist sondeada
interface PollingConfig {
  isInitiallyEmpty: boolean; // La excepción para las listas creadas vacías
  startTime: number;        // Para implementar un timeout de seguridad
}

// Timeout de seguridad: 1 minuto
const POLLING_TIMEOUT_MS = 60 * 1000;

export function usePlaylistPoller() {
  const updatePlaylistInCache = usePlaylistStore(state => state.updatePlaylistInCache);
  const [pollingPlaylists, setPollingPlaylists] = useState<Map<string, PollingConfig>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const stopPollingForId = useCallback((id: string, finalData?: SpotifyPlaylist) => {
    // Si tenemos datos finales, actualizamos la caché una última vez
    if (finalData) {
      updatePlaylistInCache(finalData.id, {
        owner: finalData.owner,
        trackCount: finalData.tracks.total
      });
    }
    // Eliminamos la playlist del mapa de sondeo
    setPollingPlaylists(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, [updatePlaylistInCache]);
  
  useEffect(() => {
    const poll = async () => {
      if (pollingPlaylists.size === 0) return;
      
      for (const [id, config] of pollingPlaylists.entries()) {
        // Chequeo de timeout de seguridad
        if (Date.now() - config.startTime > POLLING_TIMEOUT_MS) {
          console.warn(`Polling para la playlist ${id} ha superado el tiempo límite. Deteniendo.`);
          stopPollingForId(id);
          continue;
        }
        
        const result = await getFreshPlaylistDetailsAction(id);
        
        if (result.success) {
          const playlist = result.data;
          const ownerExists = !!playlist.owner?.id;
          const hasTracks = playlist.tracks.total > 0;
          
          // Condición de parada: El owner existe y (tiene canciones O es una lista que empezó vacía)
          const shouldStop = ownerExists && (hasTracks || config.isInitiallyEmpty);
          
          if (shouldStop) {
            console.log(`Polling para ${id} completado. Datos consistentes recibidos.`);
            stopPollingForId(id, playlist);
          }
        }
      }
    };
    
    // Si hay playlists para sondear, iniciamos o mantenemos el intervalo
    if (pollingPlaylists.size > 0 && !intervalRef.current) {
      intervalRef.current = setInterval(poll, 5000); // Cada 5 segundos
    }
    
    // Si no quedan playlists, limpiamos el intervalo
    if (pollingPlaylists.size === 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Limpieza al desmontar el componente
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pollingPlaylists, stopPollingForId]);
  
  // Función que se llamará desde fuera para empezar a sondear una playlist
  const startPolling = useCallback((id: string, config: Omit<PollingConfig, 'startTime'>) => {
    setPollingPlaylists(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { ...config, startTime: Date.now() });
      return newMap;
    });
  }, []);
  
  return { startPolling };
}