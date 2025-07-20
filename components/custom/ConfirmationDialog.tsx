'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ConfirmationDialogProps {
  // Controla si el diálogo está visible o no.
  isOpen: boolean;
  // Función que se llama cuando el diálogo se cierra sin tomar una decisión (ej. clic en Cancelar, fuera o tecla Esc).
  onClose: () => void;
  // Función que se ejecuta cuando el usuario hace clic en el botón de confirmación.
  onConfirm: () => void;
  // El título principal del diálogo.
  title: string;
  // El cuerpo del diálogo. Puede ser un string o JSX para descripciones más ricas.
  description: React.ReactNode;
  /**
  * El texto que se mostrará en el botón de confirmación.
  * @default "Confirmar"
  */
  confirmButtonText?: string;
  /**
  * El estilo del botón de confirmación (ej. 'destructive' para rojo, 'default' para el color primario).
  * @default "default"
  */
  confirmButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /**
  * Si es `true`, muestra un spinner en el botón de confirmación y deshabilita ambos botones.
  * @default false
  */
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmButtonText = 'Confirmar',
  confirmButtonVariant = 'default',
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
    <AlertDialogHeader>
    <AlertDialogTitle>{title}</AlertDialogTitle>
    <AlertDialogDescription asChild>
    {/* Usamos asChild para permitir pasar JSX complejo en la descripción */}
    <div>{description}</div>
    </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
    <AlertDialogCancel onClick={onClose} disabled={isLoading}>
    Cancelar
    </AlertDialogCancel>
    {/* 
      Usamos un <Button> personalizado en lugar de AlertDialogAction directamente 
      para poder controlar mejor el estado de carga y el estilo.
      */}
      <Button
      className={cn(buttonVariants({ variant: confirmButtonVariant }))}
      disabled={isLoading}
      onClick={onConfirm}
      >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? 'Procesando...' : confirmButtonText}
      </Button>
      </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
    );
  }