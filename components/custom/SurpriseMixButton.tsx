'use client';
import { useActions } from '@/lib/contexts/ActionProvider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wand2 } from 'lucide-react';

export default function SurpriseMixButton() {
  const { openSurpriseMixDialog } = useActions();
  
  return (
    <TooltipProvider>
    <Tooltip>
    <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" onClick={() => openSurpriseMixDialog()}>
    <Wand2 className="h-5 w-5" />
    </Button>
    </TooltipTrigger>
    <TooltipContent>Crear Megamix Sorpresa Global</TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}