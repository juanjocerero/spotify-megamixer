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
  tooltipText: React.ReactNode;
}

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