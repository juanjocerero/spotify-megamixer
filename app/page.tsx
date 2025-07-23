// /app/page.tsx
import { Suspense } from 'react';
import LoginButton from '@/components/custom/buttons/LoginButton';
import LoginErrorHandler from '@/components/custom/LoginErrorHandler';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-8 text-center">
    {/* Como LoginErrorHandler lee la URL para funcionar, se considera dinámico. Lo envolvemos en <Suspense> para que el resto de la página de inicio (texto y botón) pueda cargarse de forma instantánea y estática, mejorando el rendimiento. */}
    
    <Suspense fallback={null}>
    <LoginErrorHandler />
    </Suspense>
    
    <div className="space-y-6">
    <h1 className="text-5xl font-thin tracking-tight">
    Bienvenido a <span className="text-green-500 font-medium">Spotify Megamixer</span>
    </h1>
    <p className="text-lg text-gray-400 max-w-xl mx-auto">
    La herramienta definitiva para combinar tus playlists favoritas. Selecciona, mezcla y disfruta de una lista de reproducción unificada y perfectamente aleatorizada en cualquier dispositivo.
    </p>
    <div>
    <LoginButton />
    </div>
    </div>
    </main>
  );
}