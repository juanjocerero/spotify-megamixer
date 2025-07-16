// /app/page.tsx
import LoginButton from "@/components/custom/LoginButton";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-8 text-center">
    <div className="space-y-6">
    <h1 className="text-5xl font-extrabold tracking-tight">
    Bienvenido a <span className="text-green-500">Spotify Megamixer</span>
    </h1>
    <p className="text-lg text-gray-400 max-w-xl mx-auto">
    La herramienta definitiva para combinar tus playlists favoritas. Selecciona, mezcla y disfruta de una lista de reproducción unificada y perfectamente aleatorizada en cualquier dispositivo.
    </p>
    <div>
    <LoginButton />
    </div>
    </div>
    </main>
  );
}