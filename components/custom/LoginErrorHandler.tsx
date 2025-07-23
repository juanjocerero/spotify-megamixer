// components/custom/LoginErrorHandler.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginErrorHandler() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'session_expired') {
      toast.error('Tu sesión ha caducado', {
        description: 'Por favor, inicia sesión de nuevo para continuar.',
        duration: 5000,
      });
    }
  }, [searchParams]);
  
  return null; // Este componente no renderiza nada visible.
}