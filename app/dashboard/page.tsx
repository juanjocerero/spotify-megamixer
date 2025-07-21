// /app/dashboard/page.tsx

import { db } from '@/lib/db';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getUserPlaylists } from '@/lib/spotify';
import { MegalistClientData, SpotifyPlaylist } from '@/types/spotify';
import { Megalist } from '@prisma/client';

import { ActionProvider } from '@/lib/contexts/ActionProvider';

import LogoutButton from '@/components/custom/buttons/LogoutButton';
import DashboardClient from '@/components/custom/DashboardClient';
import FloatingActionBar from '@/components/custom/FloatingActionBar';
import SurpriseMixButton from '@/components/custom/buttons/SurpriseMixButton';
import HelpButton from '@/components/custom/buttons/HelpButton';
import SyncAllButton from '@/components/custom/buttons/SyncAllButton';
import ShuffleAllButton from '@/components/custom/buttons/ShuffleAllButton';
import CreateEmptyMegalistButton from '@/components/custom/buttons/CreateEmptyMegalistButton';
import Footer from '@/components/custom/Footer';
import StoreInitializer from '@/components/custom/StoreInitializer';

import { TooltipProvider } from '@/components/ui/tooltip';

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
  
  // Obtenemos las listas del usuario de la base de datos 
  // y creamos un Set con los ids para buscar rápidamente
  const userMegalists = await db.megalist.findMany({
    where: { spotifyUserId: session.user.id },
  });
  
  // Creamos un mapa para un enriquecimiento más eficiente
  const megalistDataMap = new Map<string, MegalistClientData>(
    userMegalists.map((m: Megalist) => [
      m.id,
      {
        isMegalist: true,
        // La lógica depende de si está congelada
        isSyncable: m.type === 'MEGALIST' && !m.isFrozen,
        type: m.type,
        isFrozen: m.isFrozen,
      },
    ])
  );
  
  const initialData = await getUserPlaylists(session.accessToken);
  const initialPlaylists = initialData.items;
  
  const finalPlaylists: SpotifyPlaylist[] = initialPlaylists.map(p => {
    const megalistData = megalistDataMap.get(p.id);
    if (megalistData) {
      return {
        ...p,
        isMegalist: megalistData.isMegalist,
        isSyncable: megalistData.isSyncable,
        playlistType: megalistData.type,
        isFrozen: megalistData.isFrozen,
      };
    }
    return p;
  });
  
  return (
    <ActionProvider>
    <StoreInitializer playlists={finalPlaylists} />
    <TooltipProvider delayDuration={100}>
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
    <div className="max-w-3xl mx-auto">
    <header className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-thin text-green-500">
    Spotify Megamixer
    </h1>
    
    {/* Agrupador de botones */}
    <div className="flex items-center gap-2">
    <HelpButton />
    <SurpriseMixButton />
    <ShuffleAllButton />
    <SyncAllButton />
    <CreateEmptyMegalistButton />
    <LogoutButton />
    </div>
    
    </header>
    
    {/* Pasamos los datos ya corregidos y enriquecidos al cliente */}
    <DashboardClient
    initialPlaylists={finalPlaylists}
    initialNextUrl={initialData.next}
    />
    <Footer />
    <FloatingActionBar />
    
    </div>
    </div>
    </TooltipProvider>
    </ActionProvider>
  );
}