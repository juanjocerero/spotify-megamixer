// /app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ActionProvider } from '@/lib/contexts/ActionProvider';
import { getInitialDashboardDataAction } from '@/lib/actions/playlist.actions';

import StoreInitializer from '@/components/custom/StoreInitializer';
import DashboardClient from '@/components/custom/dashboard/DashboardClient';
import Footer from '@/components/custom/Footer';
import HelpButton from '@/components/custom/buttons/HelpButton';
import SurpriseMixButton from '@/components/custom/buttons/SurpriseMixButton';
import ShuffleAllButton from '@/components/custom/buttons/ShuffleAllButton';
import SyncAllButton from '@/components/custom/buttons/SyncAllButton';
import CreateEmptyMegalistButton from '@/components/custom/buttons/CreateEmptyMegalistButton';
import LogoutButton from '@/components/custom/buttons/LogoutButton';

import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * La página principal del Dashboard. Este es un Server Component.
 *
 * Responsabilidades:
 * 1. **Autenticación:** Verifica la sesión del usuario. Si el token ha expirado o no es válido, redirige a la página de inicio.
 * 2. **Carga de Datos Inicial (SSR):** Llama a `getInitialDashboardDataAction` en el servidor para obtener la primera página de playlists.
 *    Esto permite que el HTML inicial ya contenga los datos del usuario, evitando cargas en el lado del cliente.
 * 3. **Inicialización de Estado:** Pasa los datos iniciales al componente `StoreInitializer` para hidratar el store de Zustand en el cliente.
 * 4. **Provisión de Contexto:** Envuelve la aplicación en los proveedores necesarios, como `ActionProvider` (para la lógica de acciones)
 *    y `TooltipProvider` (para los tooltips de la UI).
 * 5. **Renderizado de Layout:** Dibuja la estructura base de la página, incluyendo la cabecera estática y el componente `DashboardClient`,
 *    que se encargará de toda la interactividad del cliente.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (session?.error === 'RefreshAccessTokenError' || !session?.accessToken) {
    redirect('/');
  }

  const initialDataResult = await getInitialDashboardDataAction();
  const initialPlaylists = initialDataResult.success
    ? initialDataResult.data.playlists
    : [];
  const initialNextUrl = initialDataResult.success
    ? initialDataResult.data.nextUrl
    : null;
  
  return (
    <ActionProvider>
    <StoreInitializer playlists={initialPlaylists} />
    <TooltipProvider delayDuration={100}>
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
    <div className="max-w-3xl mx-auto">
    <header className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-thin text-green-500">
    Spotify Megamixer
    </h1>
    <div className="flex items-center gap-2">
    <HelpButton />
    <SurpriseMixButton />
    <ShuffleAllButton />
    <SyncAllButton />
    <CreateEmptyMegalistButton />
    <LogoutButton />
    </div>
    </header>
    
    {/* DashboardClient ahora se encarga de su propia carga de datos */}
    <DashboardClient initialNextUrl={initialNextUrl} />
    
    <Footer />
    </div>
    </div>
    </TooltipProvider>
    </ActionProvider>
  );
}