// /components/custom/ContactForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { sendContactEmailAction } from '@/lib/actions/email.action';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

/** Estructura de los valores del formulario de contacto. */
interface ContactFormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ContactFormProps {
  /** Controla si el diálogo del formulario está visible. */
  isOpen: boolean;
  /** Función a llamar para cerrar el diálogo. */
  onClose: () => void;
}

/**
* Un formulario de contacto modal que permite a los usuarios enviar un correo electrónico.
*
* Responsabilidades:
* - Se muestra como un diálogo (`Dialog`).
* - Utiliza `react-hook-form` para la gestión del estado, la validación y el envío del formulario.
* - Muestra un estado de carga (`isSubmitting`) mientras se envía el correo.
* - Llama a la Server Action `sendContactEmailAction` para procesar el envío.
* - Muestra notificaciones de éxito o error al usuario usando `toast`.
*
* @param {ContactFormProps} props - Las props del componente.
*/
export default function ContactForm({ isOpen, onClose }: ContactFormProps) {
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  /**
  * Maneja el envío del formulario. Llama a la server action y gestiona la UI.
  */
  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    const result = await sendContactEmailAction(data);
    
    if (result.success) {
      toast.success('¡Gracias por tu mensaje! Te responderé pronto.');
      reset();
      onClose();
    } else {
      toast.error('Hubo un error al enviar el mensaje.', {
        description: result.error,
      });
    }
    setIsSubmitting(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Contacto</DialogTitle>
    <DialogDescription>
    Si tienes dudas, sugerencias o has encontrado un error, no dudes en escribirme.
    </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
    <div className="grid gap-2">
    <Label htmlFor="name">Tu nombre</Label>
    <Input id="name" {...register('name', { required: 'El nombre es obligatorio' })} />
    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
    </div>
    <div className="grid gap-2">
    <Label htmlFor="email">Tu dirección de correo</Label>
    <Input id="email" type="email" {...register('email', { required: 'El email es obligatorio' })} />
    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
    </div>
    <div className="grid gap-2">
    <Label htmlFor="subject">Asunto</Label>
    <Input id="subject" {...register('subject', { required: 'El asunto es obligatorio' })} />
    {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
    </div>
    <div className="grid gap-2">
    <Label htmlFor="message">Mensaje</Label>
    <Textarea id="message" {...register('message', { required: 'El mensaje no puede estar vacío' })} />
    {errors.message && <p className="text-xs text-red-500">{errors.message.message}</p>}
    </div>
    <DialogFooter>
    <Button type="submit" disabled={isSubmitting}>
    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
    </Button>
    </DialogFooter>
    </form>
    </DialogContent>
    </Dialog>
  );
}