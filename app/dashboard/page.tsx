// /app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getUserPlaylists } from '@/lib/spotify';
import PlaylistDisplay from '@/components/custom/PlaylistDisplay';
import LogoutButton from '@/components/custom/LogoutButton';
import DashboardClient from '@/components/custom/DashboardClient';
import FloatingActionBar from '@/components/custom/FloatingActionBar';

export default async function DashboardPage() {
  const session = await auth();
  
  // Nueva lógica de validación:
  // Si la sesión tiene el error de refresco O si no hay token, la consideramos inválida.
  if (session?.error === 'RefreshAccessTokenError' || !session?.accessToken) {
    // Opcional pero recomendado: Forzar el cierre de la sesión en el backend
    // para limpiar la cookie problemática.
    // await signOut({ redirect: false }); // Descomentar si la redirección sola no es suficiente
    
    // Redirigir al usuario a la página de inicio para que se vuelva a autenticar.
    redirect('/');
  }
  
  // Aunque el middleware protege esta ruta, esta es una doble comprobación.
  // También nos asegura que el tipo de session.accessToken no es nulo.
  if (!session || !session.accessToken) {
    redirect('/');
  }
  
  const playlistsData = await getUserPlaylists(session.accessToken);
  // const playlists = playlistsData.items;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
    <div className="max-w-7xl mx-auto">
    <header className="flex justify-between items-center mb-6">
    <h1 className="text-3xl font-bold text-green-500">
    Spotify Megamixer
    </h1>
    <LogoutButton />
    </header>

    {/* 2. Renderizamos el componente cliente y le pasamos los datos iniciales */}
    <DashboardClient
      initialPlaylists={playlistsData.items}
      initialNextUrl={playlistsData.next}
    />
    
    <FloatingActionBar />
    
    </div>
    </div>
  );
}