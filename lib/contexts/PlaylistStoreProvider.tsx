// /lib/contexts/PlaylistStoreProvider.tsx
'use client';

import { type ReactNode, createContext, useRef } from 'react';
import { type StoreApi } from 'zustand';

import { type PlaylistStore, createPlaylistStore } from '@/lib/store';
import type { SpotifyPlaylist } from '@/types/spotify';


/**
 * Context de React para mantener y proveer la instancia del store de Zustand.
 * Su valor será la API completa del store, o `undefined` si se usa fuera del Provider.
 */
export const PlaylistStoreContext = createContext<StoreApi<PlaylistStore> | undefined>(
  undefined,
);


/**
 * Define las props que el componente `PlaylistStoreProvider` aceptará.
 */
export interface PlaylistStoreProviderProps {
  initialPlaylists: SpotifyPlaylist[];
  children: ReactNode;
  initialNextUrl: string | null;
}

/**
 * Componente Provider que crea y provee la instancia del store de playlists.
 * Este es el componente clave para el patrón de estado con SSR.
 * 1. Se renderiza en el servidor y en el cliente.
 * 2. En el primer render del cliente, crea la instancia del store usando `createPlaylistStore`.
 * 3. Usa la prop `initialPlaylists` para hidratar el store con los datos del servidor.
 * 4. Almacena la instancia en un `useRef` para que persista durante todo el ciclo de vida del cliente.
 * 5. Pone la instancia del store a disposición de todos sus componentes hijos a través del `PlaylistStoreContext`.
 */
export const PlaylistStoreProvider = ({
  initialPlaylists,
  initialNextUrl,
  children,
}: PlaylistStoreProviderProps) => {
  const storeRef = useRef<StoreApi<PlaylistStore> | null>(null);
  
  if (!storeRef.current) {
    // La pasamos aquí para que el estado inicial del store contenga la URL
    storeRef.current = createPlaylistStore({
      playlistCache: initialPlaylists,
      nextUrl: initialNextUrl,
    });
  }
  
  return (
    <PlaylistStoreContext.Provider value={storeRef.current}>
    {children}
    </PlaylistStoreContext.Provider>
  );
};