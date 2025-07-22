// /components/custom/StoreInitializer.tsx
'use client';

import { useRef } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { SpotifyPlaylist } from '@/types/spotify';

interface StoreInitializerProps {
  /** El array de playlists obtenido desde el Server Component en la carga inicial. */
  playlists: SpotifyPlaylist[];
}

/**
 * Componente "invisible" de importancia arquitectónica.
 *
 * Su ÚNICA función es tomar los datos obtenidos del lado del servidor (SSR)
 * y usarlos para hidratar (inicializar) el store de Zustand en el cliente.
 *
 * Utiliza un `useRef` para asegurar que el estado solo se establece UNA VEZ,
 * en el renderizado inicial. Esto es crucial para evitar que el estado del cliente,
 * que puede haber cambiado por acciones del usuario, sea sobrescrito en
 * re-renders posteriores (por ejemplo, al navegar entre páginas).
 *
 * @param {StoreInitializerProps} props - Las props del componente.
 * @returns {null} Este componente no renderiza nada en la UI.
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