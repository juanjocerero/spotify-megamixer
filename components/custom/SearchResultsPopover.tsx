'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { SearchResults } from '@/lib/actions/search.actions';
import SearchResultsDisplay from './SearchResultsDisplay';

interface SearchResultsPopoverProps {
  query: string;
  results: SearchResults | null;
  isLoading: boolean;
  setQuery: (query: string) => void;
}

// Hook para detectar clics fuera de un elemento
function useClickOutside(ref: React.RefObject<any>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export default function SearchResultsPopover({
  query,
  results,
  isLoading,
  setQuery,
}: SearchResultsPopoverProps) {
  const popoverRef = useRef(null);
  
  // Cierra el popover (limpiando el query) si se hace clic fuera
  useClickOutside(popoverRef, () => setQuery(''));
  
  // No renderizar nada si no hay búsqueda activa
  if (!query.trim()) {
    return null;
  }
  
  const noResultsFound =
  !isLoading &&
  results &&
  results.playlists.length === 0 &&
  results.albums.length === 0 &&
  results.tracks.length === 0;
  
  return (
    <div
    ref={popoverRef}
    className="absolute top-full mt-2 w-full bg-popover text-popover-foreground rounded-md border shadow-md z-20"
    >
    {isLoading && (
      <div className="flex items-center justify-center p-4">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )}
    
    {noResultsFound && (
      <div className="p-4 text-center text-sm text-muted-foreground">
      No se encontraron resultados.
      </div>
    )}
    
    {!isLoading && !noResultsFound && results && (
      <SearchResultsDisplay results={results} />
    )}
    </div>
  );
}