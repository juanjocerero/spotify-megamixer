// components/custom/SurpriseMixButton.tsx 

'use client';
import { Wand2 } from 'lucide-react';
import { useActions } from '@/lib/contexts/ActionProvider';
import HeaderIconButton from '../buttons/HeaderIconButton';

export default function SurpriseMixButton() {
  const { openSurpriseMixDialog } = useActions();
  return (
    <HeaderIconButton
    tooltipText="Crear Megamix Sorpresa Global"
    onClick={() => openSurpriseMixDialog()}
    >
    <Wand2 className="h-5 w-5" />
    </HeaderIconButton>
  );
}