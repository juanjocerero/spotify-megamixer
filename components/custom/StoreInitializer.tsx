'use client';

import { useRef } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { SpotifyPlaylist } from '@/types/spotify';

interface StoreInitializerProps {
  playlists: SpotifyPlaylist[];
}

/**
* Componente "invisible" cuya única función es inicializar el store de Zustand
* con los datos obtenidos desde un Server Component. Utiliza un `useRef` para
* asegurar que el estado solo se establece UNA VEZ, en el renderizado inicial,
* evitando sobrescribir el estado del cliente en re-renders posteriores.
*/
function StoreInitializer({ playlists }: StoreInitializerProps) {
  const initialized = useRef(false);
  
  if (!initialized.current) {
    usePlaylistStore.setState({ playlistCache: playlists });
    initialized.current = true;
  }
  
  return null; // Este componente no renderiza nada en la UI.
}

export default StoreInitializer;