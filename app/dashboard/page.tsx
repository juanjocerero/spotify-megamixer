// /app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SpotifyPlaylist } from '@/types/spotify';
import { getUserPlaylists, getPlaylistDetails } from '@/lib/spotify';
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
  
  const initialData = await getUserPlaylists(session.accessToken);
  const initialPlaylists = initialData.items;
  
  const playlistsData = await getUserPlaylists(session.accessToken);
  
  
  // --- Lógica de hidratación ---
  
  // Identificamos las Megalistas basándonos en el nuevo marcador
  const megalistPromises: Promise<SpotifyPlaylist>[] = initialPlaylists
  .filter(p => p.description?.includes('__MEGAMIXER_APP_V1__'))
  .map(p => getPlaylistDetails(session.accessToken!, p.id));
  
  // Hacemos una llamada a la API para cada Megalista para obtener sus datos frescos
  // Promise.all se ejecuta en paralelo, por lo que es muy eficiente.
  const freshMegalists = await Promise.all(megalistPromises);
  
  // Creamos un mapa para una búsqueda rápida (ID -> Objeto de Playlist Fresco)
  const freshDataMap = new Map(freshMegalists.map(p => [p.id, p]));
  
  // Construimos la lista final: si una playlist está en el mapa, usamos la versión
  // fresca; si no, usamos la original.
  const finalPlaylists = initialPlaylists.map(p => freshDataMap.get(p.id) || p);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
    <div className="max-w-7xl mx-auto">
    <header className="flex justify-between items-center mb-6">
    <h1 className="text-3xl font-bold text-green-500">
    Spotify Megamixer
    </h1>
    <LogoutButton />
    </header>
    
    {/* 6. Pasamos los datos ya corregidos y enriquecidos al cliente */}
    <DashboardClient
    initialPlaylists={finalPlaylists}
    initialNextUrl={initialData.next}
    />
    
    <FloatingActionBar />
    </div>
    </div>
  );
}