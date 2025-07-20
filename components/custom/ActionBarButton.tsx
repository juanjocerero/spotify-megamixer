// components/custom/ActionBarButton.tsx
'use client';

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Usamos React.ComponentProps para obtener los tipos del Button de forma segura.
interface ActionBarButtonProps extends React.ComponentProps<typeof Button> {
  tooltipText: React.ReactNode;
}

export default function ActionBarButton({
  tooltipText,
  children,
  className,
  ...props // Todas las demás props de un botón (onClick, disabled, etc.) son capturadas aquí
}: ActionBarButtonProps) {
  return (
    // Se ha eliminado el <TooltipProvider> de aquí.
    // El consumidor del botón (FloatingActionBar) será el responsable de proveerlo.
    <Tooltip>
    <TooltipTrigger asChild>
    <Button
    variant="ghost"
    size="lg"
    className={cn(
      'h-14 w-14 sm:h-auto sm:w-auto sm:flex-row sm:gap-2 sm:px-4 sm:py-2',
      className
    )}
    {...props}
    >
    {children}
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    <p>{tooltipText}</p>
    </TooltipContent>
    </Tooltip>
  );
}