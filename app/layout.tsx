import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

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
    <html lang="es" className="dark scrollbar-thin scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-600 scrollbar-track-zinc-900">
    <body className="antialiased">
    {children}
    <Toaster richColors theme="dark" />
    </body>
    </html>
  );
}
