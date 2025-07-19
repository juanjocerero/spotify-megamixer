// /app/faq/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wand2, Search, Plus, RefreshCw, Trash2, Edit3 } from 'lucide-react';

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200 p-4 sm:p-6 md:p-8">
    <div className="max-w-4xl mx-auto space-y-10">
    
    {/* Botón volver */}
    <Link href="/dashboard" passHref>
    <Button variant="ghost" className="mb-2 text-green-400 hover:text-green-300">
    <ArrowLeft className="mr-2 h-4 w-4" />
    Volver al Dashboard
    </Button>
    </Link>
    
    {/* Hero */}
    <header className="space-y-2">
    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
    🎧 Guía de Spotify Megamixer
    </h1>
    <p className="text-slate-300 text-lg">
    Bienvenido a tu nueva super-poderosa herramienta de playlists. ¡Aquí te explicamos todo lo que puedes hacer!
    </p>
    </header>
    
    {/* Concepto básico */}
    <SectionCard icon={<Plus className="h-6 w-6 text-green-400" />} title="1. ¿Qué hace Megamixer?">
    <p>
    Spotify no permite mezclar varias playlists en una sola… ¡hasta ahora!  
    Megamixer carga todas tus playlists y te deja combinarlas, sincronizarlas y administrarlas como un jefe.
    </p>
    <p>
    Con <strong className="text-green-400">carga infinita</strong> solo sigue haciendo scroll y más playlists aparecerán automáticamente.
    </p>
    </SectionCard>
    
    {/* Búsqueda */}
    <SectionCard icon={<Search className="h-6 w-6 text-sky-400" />} title="2. Búsqueda y navegación rápida">
    <ul className="list-disc list-inside space-y-2 text-slate-300">
    <li><strong>Búsqueda inteligente:</strong> Filtra en tiempo real y perdona errores tipográficos.</li>
    <li><strong>Seleccionar todo:</strong> Un botón aparece para marcar todos los resultados de golpe.</li>
    <li><strong>Atajos de teclado:</strong> <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">↑</kbd> <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">↓</kbd> para moverte y <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">barra espaciadora</kbd> para marcar.</li>
    </ul>
    </SectionCard>
    
    {/* Crear megalistas */}
    <SectionCard icon={<Plus className="h-6 w-6 text-purple-400" />} title="3. Crear y gestionar Megalistas">
    <div className="space-y-4">
    <div>
    <h3 className="font-semibold text-purple-300">Crear una nueva Megalista</h3>
    <p>Selecciona 2 o más playlists → botón verde <strong>&quot;Crear&quot;</strong>. Se unen, se quitan duplicados, se barajan y se crea la playlist en tu cuenta.</p>
    </div>
    <div>
    <h3 className="font-semibold text-purple-300">Añadir a una Megalista existente</h3>
    <p>Selecciona playlists → botón <strong>&quot;Añadir&quot;</strong> → elige la Megalista destino.</p>
    </div>
    <div>
    <h3 className="font-semibold text-purple-300 flex items-center gap-2">
    <Wand2 className="h-5 w-5" /> Megamix Sorpresa ✨
    </h3>
    <p>Crea una playlist aleatoria eligiendo cuántas canciones quieres. Si hay playlists seleccionadas, usa esas; si no, elige 10 al azar de tu librería.</p>
    </div>
    </div>
    </SectionCard>
    
    {/* Sincronización */}
    <SectionCard icon={<RefreshCw className="h-6 w-6 text-amber-400" />} title="4. Sincronización inteligente">
    <ul className="list-disc list-inside space-y-2 text-slate-300">
    <li><strong>Individual:</strong> En el menú <code className="bg-slate-700 px-1 rounded">⋯</code> de una Megalista pulsa <strong>&quot;Sincronizar&quot;</strong>.</li>
    <li><strong>En lote:</strong> Selecciona varias → botón <strong>&quot;Sincronizar&quot;</strong> en la barra inferior.</li>
    <li><strong>Autocuración:</strong> Si borras una playlist origen, la Megalista se actualiza sola y la quita de sus fuentes.</li>
    </ul>
    </SectionCard>
    
    {/* Gestión avanzada */}
    <SectionCard icon={<Edit3 className="h-6 w-6 text-rose-400" />} title="5. Gestión avanzada">
    <ul className="list-disc list-inside space-y-2 text-slate-300">
    <li><strong>Editar nombre/descripción:</strong> Desde el menú <code className="bg-slate-700 px-1 rounded">⋯</code> → <strong>&quot;Editar detalles&quot;</strong>.</li>
    <li><strong>Eliminar:</strong> Individualmente desde <code className="bg-slate-700 px-1 rounded">⋯</code> o en lote tras seleccionar varias → botón <Trash2 className="inline h-4 w-4 text-rose-500" />.</li>
    </ul>
    </SectionCard>
    
    {/* Tolerancia a fallos */}
    <SectionCard icon={<RefreshCw className="h-6 w-6 text-indigo-400" />} title="6. Tolerancia a fallos">
    <p>
    ¿Se interrumpió una mezcla por un corte de red?  
    Aparecerá un botón <strong>&quot;Reanudar mezcla&quot;</strong> para continuar justo donde la dejaste. Sin pérdidas.
    </p>
    </SectionCard>
    
    {/* Footer */}
    <footer className="text-center text-slate-500 text-sm">
    💚 ¡A disfrutar de la música sin límites!
    </footer>
    </div>
    </div>
  );
}

/* Componente auxiliar para las cards */
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-700/50 space-y-4">
    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-100">
    {icon}
    {title}
    </h2>
    <div className="text-slate-300 leading-relaxed space-y-2">
    {children}
    </div>
    </section>
  );
}