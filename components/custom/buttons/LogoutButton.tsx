// /components/custom/LogoutButton.tsx
'use client';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import HeaderIconButton from './buttons/HeaderIconButton';

export default function LogoutButton() {
  return (
    <HeaderIconButton
    tooltipText="Cerrar Sesión"
    onClick={() => signOut({ redirectTo: '/' })}
    >
    <LogOut className="h-5 w-5" />
    </HeaderIconButton>
  );
}