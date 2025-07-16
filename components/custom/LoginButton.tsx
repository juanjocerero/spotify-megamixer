// /components/custom/LoginButton.tsx
'use client'; // Directiva obligatoria para componentes con interactividad

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function LoginButton() {
  const handleLogin = async () => {
    // Al hacer clic, iniciamos el flujo de autenticación con el proveedor 'spotify'.
    // Le indicamos que, tras un inicio de sesión exitoso, redirija al usuario a '/dashboard'.
    await signIn('spotify', { redirectTo: '/dashboard' });
  };

  return (
    <Button size="lg" onClick={handleLogin}>
      <LogIn className="mr-2 h-5 w-5" />
      Iniciar sesión con Spotify
    </Button>
  );
}