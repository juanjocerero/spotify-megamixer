// /components/custom/PlaylistDisplay.tsx
'use client';

import { SpotifyPlaylist } from '@/types/spotify.d';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Music } from 'lucide-react';

interface PlaylistDisplayProps {
  playlists: SpotifyPlaylist[];
}

export default function PlaylistDisplay({ playlists }: PlaylistDisplayProps) {
  return (
    <Table>
    <TableHeader>
    <TableRow className="border-gray-800">
    <TableHead className="w-[50px] text-muted-foreground"></TableHead>
    <TableHead className="w-[80px] text-muted-foreground">Cover</TableHead>
    <TableHead className="text-muted-foreground">Nombre</TableHead>
    <TableHead className="text-muted-foreground">Propietario</TableHead>
    <TableHead className="text-right text-muted-foreground">Nº de Canciones</TableHead>
    </TableRow>
    </TableHeader>
    <TableBody>
    {playlists.map((playlist) => (
      <TableRow key={playlist.id} className="border-gray-800 hover:bg-gray-800/50">
      {/* MEJORA 1 y 2: Celda más alta y estable para el checkbox */}
      <TableCell className="py-3">
      <Checkbox
      id={`select-${playlist.id}`}
      aria-label={`Seleccionar playlist ${playlist.name}`}
      />
      </TableCell>
      
      {/* MEJORA 2: Celda y Avatar más grandes */}
      <TableCell className="py-3">
      <Avatar className="h-12 w-12">
      <AvatarImage src={playlist.images?.[0]?.url} alt={playlist.name} />
      <AvatarFallback>
      <Music className="h-6 w-6" />
      </AvatarFallback>
      </Avatar>
      </TableCell>
      
      <TableCell className="font-medium py-3">{playlist.name}</TableCell>
      <TableCell className="py-3">{playlist.owner.display_name}</TableCell>
      <TableCell className="text-right py-3">{playlist.tracks.total}</TableCell>
      </TableRow>
    ))}
    </TableBody>
    </Table>
  );
}