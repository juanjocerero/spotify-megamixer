// components/custom/StoreInitializer.tsx
'use client';

import { useRef } from 'react';
import { usePlaylistStore } from '@/lib/store';
import { SpotifyPlaylist } from '@/types/spotify';

interface StoreInitializerProps {
  playlists: SpotifyPlaylist[];
}

function StoreInitializer({ playlists }: StoreInitializerProps) {
  const initialized = useRef(false);
  if (!initialized.current) {
    usePlaylistStore.setState({ playlistCache: playlists });
    initialized.current = true;
  }
  return null;
}

export default StoreInitializer;