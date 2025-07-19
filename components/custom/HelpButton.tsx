// /components/custom/HelpButton.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

export default function HelpButton() {
  return (
    <TooltipProvider>
    <Tooltip>
    <TooltipTrigger asChild>
    <Link href="/faq" passHref>
    <Button variant="ghost" size="icon">
    <HelpCircle className="h-5 w-5" />
    </Button>
    </Link>
    </TooltipTrigger>
    <TooltipContent>
    <p>Ayuda y Guía</p>
    </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}