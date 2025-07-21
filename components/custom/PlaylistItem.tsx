// components/custom/PlaylistItem.tsx

'use client';
import { memo } from 'react';

import {
  MoreHorizontal,
  Music,
  Eye,
  Pencil,
  Shuffle,
  Trash2,
  Wand2,
  RefreshCw,
  Snowflake, 
  Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActions } from '@/lib/contexts/ActionProvider';
import { SpotifyPlaylist } from '@/types/spotify';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PlaylistItemProps {
  playlist: SpotifyPlaylist;
  isSelected: boolean;
  isFocused: boolean;
  style: React.CSSProperties;
  onToggleSelect: (id: string) => void;
  onShowTracks: (playlist: SpotifyPlaylist) => void;
}

function PlaylistItem({
  playlist,
  isSelected,
  isFocused,
  style,
  onToggleSelect,
  onShowTracks,
}: PlaylistItemProps) {
  const { 
    isProcessing, 
    openEditDialog, 
    openSyncDialog, 
    openShuffleDialog, 
    openDeleteDialog, 
    openSurpriseMixDialog, 
    openFreezeDialog,
  } = useActions();
  
  const isSyncable = playlist.isSyncable ?? false;
  
  return (
    <div
    style={style}
    className={cn(
      'absolute top-0 left-0 flex w-full items-center border-b border-gray-800 transition-colors cursor-pointer',
      {
        'bg-green-900/40 hover:bg-green-900/60': isSelected,
        'hover:bg-white/5': !isSelected,
        'outline outline-2 outline-offset-[-2px] outline-blue-500': isFocused,
      }
    )}
    onClick={() => onToggleSelect(playlist.id)}
    >
    <div className="pl-4 py-2 w-[60px] sm:w-[80px] flex-shrink-0">
    <Avatar className="h-12 w-12">
    <AvatarImage src={playlist.images?.[0]?.url} alt={playlist.name} />
    <AvatarFallback><Music /></AvatarFallback>
    </Avatar>
    </div>
    <div className="font-medium py-2 flex-grow min-w-0 px-4">
    <div className="flex items-start justify-between gap-x-3">
    <div className="flex-grow min-w-0">
    <span className="block break-words pr-2">{playlist.name}</span>
    <span className="block text-xs text-muted-foreground sm:hidden break-words">
    {playlist.owner.display_name}
    </span>
    </div>
    
    {/* Lógica condicional de badges para las megalistas */}
    {playlist.playlistType === 'MEGALIST' &&
      playlist.tracks.total === 0 ? (
        <Badge
        variant="outline"
        className="whitespace-nowrap shrink-0 mt-1 sm:mt-0 border-red-500 text-red-500"
        >
        Vacía
        </Badge>
      ) : playlist.playlistType === 'MEGALIST' ? (
        <Badge
        variant="outline"
        className={cn(
          'whitespace-nowrap shrink-0 mt-1 sm:mt-0',
          playlist.isFrozen
          ? 'border-blue-500 text-blue-500'
          : 'border-green-500 text-green-500'
        )}
        >
        {playlist.isFrozen ? 'Congelada' : 'Megalista'}
        </Badge>
      ) : playlist.playlistType === 'SURPRISE' ? (
        <Badge
        variant="outline"
        className="whitespace-nowrap shrink-0 mt-1 sm:mt-0 border-purple-500 text-purple-500"
        >
        Sorpresa
        </Badge>
      ) : null}
      
      </div>
      </div>
      <div className="hidden sm:flex items-center px-4 py-2 w-[120px] break-words flex-shrink-0">
      {playlist.owner.display_name}
      </div>
      <div className="px-4 py-2 text-right w-[80px] sm:w-[100px] flex-shrink-0">
      {playlist.tracks.total}
      </div>
      <div className="px-4 py-2 w-[50px] flex-shrink-0">
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
      <MoreHorizontal className="h-4 w-4" />
      </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="mr-6">
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShowTracks(playlist); }}>
      <Eye className="mr-2 h-4 w-4" />
      <span>Ver Canciones</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(playlist); }}>
      <Pencil className="mr-2 h-4 w-4" />
      <span>Editar detalles</span>
      </DropdownMenuItem>
      
      {/* Congelación condicional */}
      {playlist.playlistType === 'MEGALIST' && (
        <DropdownMenuItem
        disabled={isProcessing}
        onClick={(e) => { e.stopPropagation(); openFreezeDialog(playlist); }}
        >
        {playlist.isFrozen ? (
          <Sun className="mr-2 h-4 w-4 text-yellow-500" />
        ) : (
          <Snowflake className="mr-2 h-4 w-4 text-blue-500" />
        )}
        <span>{playlist.isFrozen ? 'Descongelar' : 'Congelar'}</span>
        </DropdownMenuItem>
      )}
      
      {isSyncable && (
        <DropdownMenuItem disabled={isProcessing} onClick={(e) => { e.stopPropagation(); openSyncDialog([playlist]); }}>
        <RefreshCw className="mr-2 h-4 w-4" />
        <span>Sincronizar</span>
        </DropdownMenuItem>
      )}
      
      <DropdownMenuItem disabled={isProcessing} onClick={(e) => { e.stopPropagation(); openShuffleDialog([playlist]); }}>
      <Shuffle className="mr-2 h-4 w-4" />
      <span>Reordenar</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openSurpriseMixDialog([playlist.id]); }}>
      <Wand2 className="mr-2 h-4 w-4" />
      <span>Crear lista sorpresa</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="text-red-500 focus:text-red-500" disabled={isProcessing} onClick={(e) => { e.stopPropagation(); openDeleteDialog([playlist]); }}>
      <Trash2 className="mr-2 h-4 w-4" />
      <span>Eliminar</span>
      </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
      </div>
      </div>
    );
  }
  
  export default memo(PlaylistItem);