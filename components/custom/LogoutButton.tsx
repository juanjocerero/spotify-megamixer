// /components/custom/LogoutButton.tsx
'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function LogoutButton() {
  return (
    <TooltipProvider>
    <Tooltip>
    <TooltipTrigger asChild>
    <Button
    variant="ghost"
    size="icon" // Usamos 'icon' para que sea un botón cuadrado como los demás
    onClick={() => signOut({ redirectTo: '/' })}
    >
    {/* Se elimina el margen (mr-2) para que el icono quede centrado */}
    <LogOut className="h-5 w-5" />
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    <p>Cerrar Sesión</p>
    </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}