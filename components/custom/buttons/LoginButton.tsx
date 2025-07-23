// components/custom/buttons/LoginButton.tsx
'use client';

import { signIn } from 'next-auth/react'; // Importa desde 'next-auth/react' en el cliente
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function LoginButton() {
  const handleLogin = async () => {
    try {
      // Intentamos iniciar el flujo de login
      console.log("Iniciando signIn con el proveedor 'spotify'...");
      await signIn('spotify', { redirectTo: '/dashboard' });
      console.log("La función signIn se completó sin lanzar un error inmediato.");
      
    } catch (error) {
      // Si hay un error INMEDIATO al invocar la acción, lo veremos aquí.
      console.error("Error capturado en el cliente al llamar a signIn:", error);
      
      // Puedes añadir un toast para notificar al usuario
      // toast.error("No se pudo iniciar el proceso de login.");
    }
  };
  
  return (
    <Button size="lg" onClick={handleLogin}>
    <LogIn className="mr-2 h-5 w-5" /> Iniciar sesión con Spotify
    </Button>
  );
}