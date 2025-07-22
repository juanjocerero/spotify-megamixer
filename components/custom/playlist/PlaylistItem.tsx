'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useActions } from '@/lib/contexts/ActionProvider';
import { SpotifyPlaylist } from '@/types/spotify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Music,
  Music2,
  Eye,
  Pencil,
  Shuffle,
  Trash2,
  Wand2,
  RefreshCw,
  Snowflake,
  Sun,
  ListPlus,
  CheckSquare,
  Square
} from 'lucide-react';

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
    openAddToMegalistDialog,
    openEditDialog,
    openSyncDialog,
    openShuffleDialog,
    openDeleteDialog,
    openSurpriseMixDialog,
    openFreezeDialog,
  } = useActions();
  
  const isSyncable = playlist.isSyncable ?? false;
  const playlistType = playlist.playlistType;
  
  const getBadgeVariant = () => {
    if (playlistType === 'MEGALIST') {
      if (playlist.tracks.total === 0) return 'border-red-500 text-red-500';
      return playlist.isFrozen ? 'border-blue-500 text-blue-500' : 'border-green-500 text-green-500';
    }
    if (playlistType === 'SURPRISE') return 'border-purple-500 text-purple-500';
    return null;
  };
  
  const getBadgeText = () => {
    if (playlistType === 'MEGALIST') {
      if (playlist.tracks.total === 0) return 'Vacía';
      return playlist.isFrozen ? 'Congelada' : 'Megalista';
    }
    if (playlistType === 'SURPRISE') return 'Sorpresa';
    return null;
  };
  
  const badgeVariant = getBadgeVariant();
  const badgeText = getBadgeText();
  
  return (
    <div
    style={style}
    className={cn(
      'group absolute top-0 left-0 flex w-full items-center p-2 border-b border-gray-800 transition-colors duration-200 cursor-pointer',
      {
        'bg-green-900/40 hover:bg-green-900/60': isSelected,
        'hover:bg-white/5': !isSelected,
        'outline outline-2 outline-offset-[-2px] outline-blue-500': isFocused,
      }
    )}
    onClick={() => onToggleSelect(playlist.id)}
    >
    {/* SECCIÓN IZQUIERDA: AVATAR Y CHECKBOX */}
    <div className="flex items-center flex-shrink-0 pr-3 sm:pr-4">
    <div className={cn(
      'hidden sm:block transition-opacity duration-200',
      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
    )}>
    {isSelected ? <CheckSquare className="h-5 w-5 text-green-400 mr-3" /> : <Square className="h-5 w-5 text-gray-500 mr-3" />}
    </div>
    <Avatar className="h-12 w-12 rounded-md">
    <AvatarImage src={playlist.images?.[0]?.url} alt={playlist.name} />
    <AvatarFallback className="rounded-md"><Music /></AvatarFallback>
    </Avatar>
    </div>
    
    {/* SECCIÓN CENTRAL: NOMBRE, BADGE Y PROPIETARIO */}
    <div className="flex-grow min-w-0 pr-2">
    {/* CAMBIO: Contenedor siempre vertical */}
    <div className="flex flex-col">
    {badgeText && badgeVariant && (
      <Badge variant="outline" className={cn(
        'whitespace-nowrap h-5 w-fit mb-1 text-xs', // Eliminado sm:mb-0
        badgeVariant
      )}>
      {badgeText}
      </Badge>
    )}
    <span className="text-xs sm:text-sm font-medium text-white truncate">{playlist.name}</span>
    </div>
    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
    de {playlist.owner.display_name}
    </p>
    </div>
    
    {/* SECCIÓN DERECHA: CONTEO Y MENÚ */}
    <div className="flex items-center gap-x-2 sm:gap-x-4 flex-shrink-0 pl-2">
    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
    <Music2 className="h-4 w-4" />
    <span>{playlist.tracks.total}</span>
    </div>
    
    <div className={cn(
      'transition-opacity duration-200',
      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
    )}>
    <DropdownMenu>
    <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={(e) => e.stopPropagation()}>
    <MoreHorizontal className="h-5 w-5" />
    </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="mr-2">
    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShowTracks(playlist); }}>
    <Eye className="mr-2 h-4 w-4" /> <span>Ver Canciones</span>
    </DropdownMenuItem>
    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(playlist); }}>
    <Pencil className="mr-2 h-4 w-4" /> <span>Editar detalles</span>
    </DropdownMenuItem>
    {playlistType === 'MEGALIST' && (
      <DropdownMenuItem disabled={isProcessing} onClick={(e) => { e.stopPropagation(); openFreezeDialog(playlist); }} >
      {playlist.isFrozen ? ( <Sun className="mr-2 h-4 w-4 text-yellow-500" /> ) : ( <Snowflake className="mr-2 h-4 w-4 text-blue-500" /> )}
      <span>{playlist.isFrozen ? 'Descongelar' : 'Congelar'}</span>
      </DropdownMenuItem>
    )}
    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openAddToMegalistDialog([playlist.id]); }} >
    <ListPlus className="mr-2 h-4 w-4 text-blue-500" /> <span>Añadir a Megalista</span>
    </DropdownMenuItem>
    {isSyncable && (
      <DropdownMenuItem disabled={isProcessing} onClick={(e) => { e.stopPropagation(); openSyncDialog([playlist]); }}>
      <RefreshCw className="mr-2 h-4 w-4" /> <span>Sincronizar</span>
      </DropdownMenuItem>
    )}
    <DropdownMenuItem disabled={isProcessing} onClick={(e) => { e.stopPropagation(); openShuffleDialog([playlist]); }}>
    <Shuffle className="mr-2 h-4 w-4" /> <span>Reordenar</span>
    </DropdownMenuItem>
    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openSurpriseMixDialog([playlist.id]); }}>
    <Wand2 className="mr-2 h-4 w-4" /> <span>Crear lista sorpresa</span>
    </DropdownMenuItem>
    <DropdownMenuItem className="text-red-500 focus:text-red-500" disabled={isProcessing} onClick={(e) => { e.stopPropagation(); openDeleteDialog([playlist]); }}>
    <Trash2 className="mr-2 h-4 w-4" /> <span>Eliminar</span>
    </DropdownMenuItem>
    </DropdownMenuContent>
    </DropdownMenu>
    </div>
    </div>
    </div>
  );
}

export default memo(PlaylistItem);