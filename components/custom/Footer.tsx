'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail, Code } from 'lucide-react';
import ContactForm from './ContactForm';

export default function Footer() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  
  return (
    <>
    <footer className="w-full text-sm text-gray-400 mt-12">
    <div className="max-w-4xl mx-auto flex justify-between items-center border-t border-gray-700 pt-4 pb-2">
    <p>
    Hecho con 💚 por Juanjo Cerero en 2025.
    </p>
    <div className="flex items-center gap-2">
    <Tooltip>
    <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" onClick={() => setIsContactOpen(true)}>
    <Mail className="h-5 w-5" />
    </Button>
    </TooltipTrigger>
    <TooltipContent><p>Contacto</p></TooltipContent>
    </Tooltip>
    <Tooltip>
    <TooltipTrigger asChild>
    <Link href="https://github.com/juanjocerero/spotify-megamixer" target="_blank" rel="noopener noreferrer">
    <Button variant="ghost" size="icon">
    <Code className="h-5 w-5" />
    </Button>
    </Link>
    </TooltipTrigger>
    <TooltipContent><p>Ver en GitHub</p></TooltipContent>
    </Tooltip>
    </div>
    </div>
    </footer>
    <ContactForm isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
}