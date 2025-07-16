import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="es" className="dark">
    <body
    className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
    {children}
    <Toaster richColors theme="dark" />
    </body>
    </html>
  );
}
