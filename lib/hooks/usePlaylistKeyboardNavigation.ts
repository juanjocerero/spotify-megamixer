// lib/hooks/usePlaylistKeyboardNavigation.ts

'use client';
import { useState, useEffect, useCallback } from 'react';
import { type Virtualizer } from '@tanstack/react-virtual';
import { SpotifyPlaylist } from '@/types/spotify';

interface KeyboardNavigationProps {
  playlists: SpotifyPlaylist[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  togglePlaylistSelection: (id: string) => void;
  onClearSearch: () => void;
  isEnabled: boolean;
}

export function usePlaylistKeyboardNavigation({
  playlists,
  rowVirtualizer,
  togglePlaylistSelection,
  onClearSearch,
  isEnabled,
}: KeyboardNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  const resetFocus = useCallback(() => {
    setFocusedIndex(null);
  }, []);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled || playlists.length === 0) return;
    
    let newIndex = focusedIndex;
    
    switch (event.key) {
      case 'ArrowDown':
      event.preventDefault();
      newIndex = focusedIndex === null ? 0 : Math.min(focusedIndex + 1, playlists.length - 1);
      break;
      case 'ArrowUp':
      event.preventDefault();
      newIndex = focusedIndex === null ? 0 : Math.max(focusedIndex - 1, 0);
      break;
      case ' ':
      if (focusedIndex !== null) {
        event.preventDefault();
        togglePlaylistSelection(playlists[focusedIndex].id);
      }
      return;
      case 'Escape':
      event.preventDefault();
      setFocusedIndex(null);
      onClearSearch();
      return;
      default:
      return;
    }
    
    if (newIndex !== null && newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      rowVirtualizer.scrollToIndex(newIndex, { align: 'auto' });
    }
  }, [focusedIndex, playlists, togglePlaylistSelection, onClearSearch, rowVirtualizer, isEnabled]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  return { focusedIndex, resetFocus };
}