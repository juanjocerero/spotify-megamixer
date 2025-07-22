// /lib/contexts/PlaylistStoreProvider.tsx
'use client';

import { type ReactNode, createContext, useRef, useContext } from 'react';
import { type StoreApi } from 'zustand';

import { type PlaylistStore, createPlaylistStore } from '@/lib/store';

// El tipado del contexto ahora sabe que puede ser `undefined`
export const PlaylistStoreContext = createContext<StoreApi<PlaylistStore> | undefined>(
  undefined,
);

export interface PlaylistStoreProviderProps {
  children: ReactNode;
}

export const PlaylistStoreProvider = ({
  children,
}: PlaylistStoreProviderProps) => {
  const storeRef = useRef<StoreApi<PlaylistStore> | null>(null);
  
  if (!storeRef.current) {
    storeRef.current = createPlaylistStore();
  }
  
  return (
    <PlaylistStoreContext.Provider value={storeRef.current}>
    {children}
    </PlaylistStoreContext.Provider>
  );
};