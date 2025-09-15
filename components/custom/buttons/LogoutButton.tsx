// /components/custom/LogoutButton.tsx
'use client';
import { signOut } from '@/lib/auth-client';
import { LogOut } from 'lucide-react';
import HeaderIconButton from '../buttons/HeaderIconButton';

export default function LogoutButton() {
  return (
    <HeaderIconButton
    tooltipText="Cerrar Sesión"
    onClick={() => signOut({ fetchOptions: { onSuccess: () => window.location.href = '/' } })}
    >
    <LogOut className="h-5 w-5" />
    </HeaderIconButton>
  );
}