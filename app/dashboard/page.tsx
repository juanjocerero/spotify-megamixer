import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ActionProvider } from '@/lib/contexts/ActionProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import HelpButton from '@/components/custom/buttons/HelpButton';
import SurpriseMixButton from '@/components/custom/buttons/SurpriseMixButton';
import ShuffleAllButton from '@/components/custom/buttons/ShuffleAllButton';
import SyncAllButton from '@/components/custom/buttons/SyncAllButton';
import CreateEmptyMegalistButton from '@/components/custom/buttons/CreateEmptyMegalistButton';
import LogoutButton from '@/components/custom/buttons/LogoutButton';
import DashboardClient from '@/components/custom/DashboardClient';
import Footer from '@/components/custom/Footer';

export default async function DashboardPage() {
  const session = await auth();
  if (session?.error === 'RefreshAccessTokenError' || !session?.accessToken) {
    redirect('/');
  }
  
  return (
    <ActionProvider>
    {/* El StoreInitializer ya no es necesario aquí */}
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
    <DashboardClient />
    
    <Footer />
    </div>
    </div>
    </TooltipProvider>
    </ActionProvider>
  );
}