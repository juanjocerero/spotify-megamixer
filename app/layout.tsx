// app/layout.tsx
import { Inter } from 'next/font/google';
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from '@/lib/utils';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['100', '300', '400', '500', '700', '900'],
});

export const metadata: Metadata = {
  title: "Spotify Megamixer",
  description: "La herramienta definitiva para combinar tus playlists favoritas de Spotify.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
    suppressHydrationWarning
    lang="es" 
    className={inter.variable}
    >
    <body className={cn(
      "antialiased font-sans dark scrollbar-thin scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-600 scrollbar-track-zinc-900"
    )}>
    {children}
    <Toaster richColors theme="dark" />
    </body>
    </html>
  );
}