// components/custom/SessionRecoveryUI.tsx
'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SessionRecoveryUI() {
  const router = useRouter();
  
  useEffect(() => {
    // Comprueba si ya se ha intentado una recuperación en esta sesión del navegador.
    if (sessionStorage.getItem('recovery_attempted') === 'true') {
      // Si es así, el error es persistente. Limpia la bandera y redirige a la página de inicio con un mensaje de error.
      sessionStorage.removeItem('recovery_attempted');
      router.replace('/?error=session_expired');
    } else {
      // Si es el primer intento, establece la bandera y recarga la página para obtener una nueva sesión.
      sessionStorage.setItem('recovery_attempted', 'true');
      window.location.reload();
    }
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
    <Loader2 className="h-12 w-12 animate-spin text-green-500 mb-4" />
    <h1 className="text-xl font-semibold">Problema de Sesión</h1>
    <p className="text-gray-400 mt-2">
    Hubo un problema temporal con tu sesión. Refrescando automáticamente...
    </p>
    </div>
  );
}