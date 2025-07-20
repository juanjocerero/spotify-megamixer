// /components/custom/HelpButton.tsx

'use client';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import HeaderIconButton from './HeaderIconButton';

export default function HelpButton() {
  return (
    <Link href="/faq" passHref legacyBehavior>
    <HeaderIconButton tooltipText="Ayuda y Guía" asChild>
    <HelpCircle className="h-5 w-5" />
    </HeaderIconButton>
    </Link>
  );
}