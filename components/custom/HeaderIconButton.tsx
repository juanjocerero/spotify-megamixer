// components/custom/HeaderIconButton.tsx 
'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface HeaderIconButtonProps extends React.ComponentProps<typeof Button> {
  tooltipText: React.ReactNode;
}

export default function HeaderIconButton({
  tooltipText,
  children,
  ...props
}: HeaderIconButtonProps) {
  return (
    <TooltipProvider>
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
    </TooltipProvider>
  );
}