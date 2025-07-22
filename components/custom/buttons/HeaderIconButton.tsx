// components/custom/buttons/HeaderIconButton.tsx
'use client';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import React from 'react';

interface HeaderIconButtonProps extends React.ComponentProps<typeof Button> {
  /** El texto o nodo React que se mostrará dentro del tooltip. */
  tooltipText: React.ReactNode;
}

/**
* Un componente de botón de icono reutilizable diseñado para la cabecera principal de la página.
* Combina un `Button` (con estilos predefinidos `variant="ghost"` y `size="icon"`)
* con un `Tooltip` para una UI limpia y accesible.
*
* @param {HeaderIconButtonProps} props - Las props del componente.
*/
export default function HeaderIconButton({
  tooltipText,
  children,
  ...props
}: HeaderIconButtonProps) {
  return (
    <Tooltip>
    <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" {...props}>
    {children}
    </Button>
    </TooltipTrigger>
    <TooltipContent>
    <p>{tooltipText}</p>
    </TooltipContent>
    </Tooltip>
  );
}