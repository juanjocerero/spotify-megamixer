// /lib/hooks/usePlaylistKeyboardNavigation.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { type Virtualizer } from '@tanstack/react-virtual';
// La importación de SpotifyPlaylist ya no es necesaria, el hook ahora es agnóstico al tipo de dato interno.
import { ListItem } from '@/components/custom/playlist/PlaylistDisplay';

/**
* Props para el hook de navegación por teclado.
* Se ha eliminado la prop `playlists` para usar `items` como única fuente de verdad.
*/
interface KeyboardNavigationProps {
  items: ListItem[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  togglePlaylistSelection: (id: string) => void;
  toggleFolderExpansion: (id: string) => void;
  onClearSearch: () => void;
  isEnabled: boolean;
}

/**
* Hook que gestiona la navegación con teclado (flechas, espacio, escape)
* sobre una lista virtualizada que puede contener diferentes tipos de elementos.
* @param {KeyboardNavigationProps} props - La lista de items y los callbacks de acción.
* @returns El índice del elemento enfocado y una función para resetear el foco.
*/
export function usePlaylistKeyboardNavigation({
  items,
  rowVirtualizer,
  togglePlaylistSelection,
  toggleFolderExpansion,
  onClearSearch,
  isEnabled,
}: KeyboardNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  const resetFocus = useCallback(() => {
    setFocusedIndex(null);
  }, []);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // CORRECCIÓN: La comprobación ahora se hace contra la longitud de `items`.
    if (!isEnabled || items.length === 0) return;
    
    let newIndex = focusedIndex;
    
    switch (event.key) {
      case 'ArrowDown':
      event.preventDefault();
      // CORRECCIÓN: El límite superior ahora es `items.length - 1`.
      newIndex = focusedIndex === null ? 0 : Math.min(focusedIndex + 1, items.length - 1);
      break;
      case 'ArrowUp':
      event.preventDefault();
      // El límite inferior (0) ya era correcto.
      newIndex = focusedIndex === null ? 0 : Math.max(focusedIndex - 1, 0);
      break;
      case ' ': 
      if (focusedIndex !== null) {
        event.preventDefault();
        const item = items[focusedIndex];
        // La lógica para actuar según el tipo de item ya era correcta.
        if (item.type === 'playlist') {
          togglePlaylistSelection(item.data.id); // Selecciona si es playlist
        } else if (item.type === 'folder') {
          toggleFolderExpansion(item.data.id); // Expande si es carpeta
        }
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
  }, [focusedIndex, items, togglePlaylistSelection, toggleFolderExpansion, onClearSearch, rowVirtualizer, isEnabled]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  return { focusedIndex, resetFocus };
}