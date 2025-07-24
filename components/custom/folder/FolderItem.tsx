'use client';

import { memo } from 'react';
import { Folder as FolderIcon, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Folder } from '@/types/spotify';
import { Button } from '@/components/ui/button';

interface FolderItemProps {
  folder: Folder;
  playlistCount: number;
  isExpanded: boolean;
  isFocused: boolean;
  style: React.CSSProperties;
  onToggleExpand: (folderId: string) => void;
}

function FolderItem({
  folder,
  playlistCount,
  isExpanded,
  isFocused,
  style,
  onToggleExpand,
}: FolderItemProps) {
  
  const handleToggle = () => {
    onToggleExpand(folder.id);
  };
  
  return (
    <div
    style={style}
    className={cn(
      'group absolute top-0 left-0 flex w-full items-center p-2 border-b border-gray-800 transition-colors duration-200 cursor-pointer bg-gray-800/50 hover:bg-gray-700/60',
      { 'outline outline-2 outline-offset-[-2px] outline-blue-500': isFocused }
    )}
    onClick={handleToggle}
    >
    {/* Icono y Expansor */}
    <div className="flex items-center flex-shrink-0 pr-3 sm:pr-4">
    <ChevronRight
    className={cn('h-5 w-5 mr-3 transition-transform duration-200', {
      'rotate-90': isExpanded,
    })}
    />
    <FolderIcon className="h-10 w-10 text-yellow-500" />
    </div>
    
    {/* Nombre y Contador */}
    <div className="flex-grow min-w-0 pr-2">
    <span className="text-sm font-semibold text-white truncate">{folder.name}</span>
    <p className="text-xs text-muted-foreground">
    {playlistCount} {playlistCount === 1 ? 'playlist' : 'playlists'}
    </p>
    </div>
    
    {/* Menú de Acciones (se implementará en Hito 4) */}
    <div className="flex items-center flex-shrink-0 pl-2">
    <div
    className={cn(
      'transition-opacity duration-200 opacity-0 group-hover:opacity-100'
    )}
    >
    <Button
    variant="ghost"
    size="icon"
    className="h-9 w-9"
    onClick={(e) => {
      e.stopPropagation(); // Evita que el clic se propague al div principal
      // La lógica para abrir el DropdownMenu irá aquí en el Hito 4
    }}
    >
    <MoreHorizontal className="h-5 w-5" />
    </Button>
    </div>
    </div>
    </div>
  );
}

export default memo(FolderItem);