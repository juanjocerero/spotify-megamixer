'use client';

import { useActions } from '@/lib/contexts/ActionProvider';
import { PlusSquare } from 'lucide-react';
import HeaderIconButton from './HeaderIconButton';

export default function CreateEmptyMegalistButton() {
  const { openCreateEmptyMegalistDialog, isProcessing } = useActions();
  
  return (
    <HeaderIconButton
    tooltipText="Crear nueva lista vacía"
    onClick={openCreateEmptyMegalistDialog}
    disabled={isProcessing}
    >
    <PlusSquare className="h-5 w-5" />
    </HeaderIconButton>
  );
}