// /components/custom/LogoutButton.tsx
'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  return (
    <Button variant="ghost" onClick={() => signOut({ redirectTo: '/' })}>
    <LogOut className="mr-2 h-4 w-4" />
    Cerrar sesión
    </Button>
  );
}