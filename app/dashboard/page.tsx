// /app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getUserPlaylists } from '@/lib/spotify';
import PlaylistDisplay from '@/components/custom/PlaylistDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LogoutButton from '@/components/custom/LogoutButton';

export default async function DashboardPage() {
  const session = await auth();
  
  // Aunque el middleware protege esta ruta, esta es una doble comprobación.
  // También nos asegura que el tipo de session.accessToken no es nulo.
  if (!session || !session.accessToken) {
    redirect('/');
  }
  
  const playlistsData = await getUserPlaylists(session.accessToken);
  const playlists = playlistsData.items;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
    <div className="max-w-7xl mx-auto">
    <header className="flex justify-between items-center mb-6">
    <h1 className="text-3xl font-bold text-green-500">
    Spotify Megamixer
    </h1>
    <LogoutButton />
    </header>
    
    <Card className="bg-gray-800 border-gray-700">
    <CardHeader>
    <CardTitle>Mis Playlists</CardTitle>
    </CardHeader>
    <CardContent>
    <PlaylistDisplay 
    initialPlaylists={playlistsData.items} 
    initialNextUrl={playlistsData.next}
    />
    </CardContent>
    </Card>
    </div>
    </div>
  );
}