import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

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
    <html lang="es" className="dark">
    <body
    className="antialiased"
    >
    {children}
    <Toaster richColors theme="dark" />
    </body>
    </html>
  );
}
