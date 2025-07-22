// components/custom/search/SearchResultsPopover.tsx

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { SearchResults } from '@/lib/actions/search.actions';
import SearchResultsDisplay from './SearchResultsDisplay';
import { Button } from '@/components/ui/button';
import { ListFilter, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

// Tipos y etiquetas para la ordenación
type SpotifySortOption =
| 'relevance'
| 'playlists_first'
| 'albums_first'
| 'tracks_first';

const spotifySortLabels: Record<SpotifySortOption, string> = {
  relevance: 'Relevancia',
  playlists_first: 'Listas primero',
  albums_first: 'Álbumes primero',
  tracks_first: 'Canciones primero',
};

// Interfaz de props
interface SearchResultsPopoverProps {
  query: string;
  results: SearchResults | null;
  isLoading: boolean;
  setQuery: (query: string) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  followedPlaylistIds: string[];
}

// Hook para detectar clics fuera
function useClickOutside(
  popoverRef: React.RefObject<HTMLElement | null>,
  anchorRef: React.RefObject<HTMLElement | null>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (
        !popoverRef.current ||
        popoverRef.current.contains(event.target as Node) ||
        (anchorRef.current && anchorRef.current.contains(event.target as Node))
      ) {
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
  }, [popoverRef, anchorRef, handler]);
}

export default function SearchResultsPopover({
  query,
  results,
  isLoading,
  setQuery,
  anchorRef, 
  followedPlaylistIds
}: SearchResultsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [spotifySortOption, setSpotifySortOption] =useState<SpotifySortOption>('relevance');
  
  // Efecto para calcular la posición del popover
  useEffect(() => {
    if (anchorRef.current && query.trim()) {
      const anchor = anchorRef.current;
      setStyle({
        position: 'absolute',
        top: `${anchor.offsetTop + anchor.offsetHeight + 8}px`,
        left: `${anchor.offsetLeft}px`,
        width: `${anchor.offsetWidth}px`,
        opacity: 1,
        transition: 'opacity 0.2s ease-in-out',
        display: 'block',
      });
    } else {
      setStyle({ opacity: 0, display: 'none' });
    }
  }, [anchorRef, query, results]);
  
  const closePopoverHandler = useCallback(() => {
    // Solo cierra el popover si el menú de ordenación NO está abierto.
    if (!isSortMenuOpen) {
      setQuery('');
    }
  }, [isSortMenuOpen, setQuery]);
  
  useClickOutside(popoverRef, anchorRef, closePopoverHandler);
  
  if (!query.trim()) {
    return null;
  }
  
  const hasResults =
  !isLoading &&
  results &&
  (results.tracks.length > 0 ||
    results.albums.length > 0 ||
    results.playlists.length > 0);
    
    return (
      <div
      ref={popoverRef}
      style={style}
      className="bg-popover text-popover-foreground rounded-md border shadow-md z-50 overflow-y-auto max-h-[60vh]"
      >
      {/* Cabecera del Popover con el control de ordenación */}
      {hasResults && (
        <div className="sticky top-0 z-10 flex justify-end items-center p-1 border-b bg-popover">
        <DropdownMenu onOpenChange={setIsSortMenuOpen}> 
        <Tooltip>
        <TooltipTrigger asChild>
        <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
        <ListFilter className="mr-2 h-4 w-4" />
        {spotifySortLabels[spotifySortOption]}
        </Button>
        </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
        <p>Ordenar resultados</p>
        </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
        
        <DropdownMenuItem
        onSelect={() => {
          setSpotifySortOption('relevance');
        }}
        >
        Relevancia
        </DropdownMenuItem>
        <DropdownMenuItem
        onSelect={() => {
          setSpotifySortOption('playlists_first');
        }}
        >
        Listas primero
        </DropdownMenuItem>
        <DropdownMenuItem
        onSelect={() => {
          setSpotifySortOption('albums_first');
        }}
        >
        Álbumes primero
        </DropdownMenuItem>
        <DropdownMenuItem
        onSelect={() => {
          setSpotifySortOption('tracks_first');
        }}
        >
        Canciones primero
        </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
        </div>
      )}
      
      {/* Contenido scrolleable del popover */}
       <div>
      {isLoading && (
        <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && results && !hasResults && (
        <div className="p-4 text-center text-sm text-muted-foreground">
        No se encontraron resultados.
        </div>
      )}
      {!isLoading && results && (
        <SearchResultsDisplay
        results={results}
        spotifySortOption={spotifySortOption} 
        followedPlaylistIds={followedPlaylistIds}
        />
      )}
      </div>
      </div>
    );
  }