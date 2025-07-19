// /app/faq/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wand2, Search, Plus, RefreshCw, Trash2, Edit3, Shuffle, Eye, ListFilter } from 'lucide-react';

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
    ¡Bienvenido a tu centro de control de playlists! Aquí te explicamos todo lo que puedes hacer con esta herramienta.
    </p>
    </header>
    
    {/* Concepto básico */}
    <SectionCard icon={<Plus className="h-6 w-6 text-green-400" />} title="1. ¿Qué es una Megalista?">
    <p>
    Spotify no permite mezclar varias playlists en una sola... ¡hasta ahora! Megamixer te permite combinar las canciones de varias de tus playlists en una única &quot;Megalista&quot;, eliminando duplicados automáticamente.
    </p>
    <p>
    Además, la aplicación está optimizada para el rendimiento: usa <strong className="text-green-400">scroll infinito y virtualización</strong>, lo que garantiza una navegación fluida incluso si tienes miles de playlists.
    </p>
    </SectionCard>
    
    {/* Búsqueda y Ordenación */}
    <SectionCard icon={<ListFilter className="h-6 w-6 text-sky-400" />} title="2. Búsqueda, Ordenación y Navegación">
    <ul className="list-disc list-inside space-y-3 text-slate-300">
    <li><strong>Búsqueda Inteligente:</strong> Usa el campo <Search className="inline h-4 w-4" /> para filtrar en tiempo real. La búsqueda perdona errores tipográficos.</li>
    <li><strong>Ordenación Flexible:</strong> Organiza tu lista por defecto, nombre, número de canciones, propietario o mostrando las Megalistas primero.</li>
    <li><strong>Selección Rápida:</strong> Un botón aparece en la búsqueda para seleccionar todos los resultados de una vez.</li>
    <li><strong>Atajos de Teclado:</strong> Usa <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">↑</kbd> <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">↓</kbd> para navegar por la lista y la <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">barra espaciadora</kbd> para seleccionar.</li>
    </ul>
    </SectionCard>
    
    {/* Crear y gestionar Megalistas */}
    <SectionCard icon={<Plus className="h-6 w-6 text-purple-400" />} title="3. Cómo Crear y Modificar Megalistas">
    <div className="space-y-4">
    <div>
    <h3 className="font-semibold text-purple-300">Crear una Nueva Megalista</h3>
    <p>Selecciona 2 o más playlists → pulsa el botón verde <strong>&quot;Crear&quot;</strong>. Esto une todas las canciones y quita los duplicados. La mezcla inicial no se baraja para preservar el orden.</p>
    </div>
    <div>
    <h3 className="font-semibold text-purple-300">Añadir a una Megalista Existente</h3>
    <p>Selecciona playlists → pulsa el botón <strong>&quot;Añadir&quot;</strong> → elige la Megalista de destino en el diálogo. Se añadirán solo las canciones que no estuvieran ya.</p>
    </div>
    <div>
    <h3 className="font-semibold text-purple-300 flex items-center gap-2">
    <Wand2 className="h-5 w-5" /> Megamix Sorpresa ✨
    </h3>
    <p>Crea una playlist con un número de canciones aleatorias. Puedes usar tus playlists seleccionadas como fuente o, si no hay ninguna, la app te permite elegir hasta 50 playlists al azar de tu librería.</p>
    </div>
    </div>
    </SectionCard>
    
    {/* Barajado */}
    <SectionCard icon={<Shuffle className="h-6 w-6 text-orange-400" />} title="4. La Nueva Función de Barajado">
    <p>
    Para darte más control, el barajado ahora es una acción explícita. ¡Así no pierdes el orden de tus canciones si no quieres!
    </p>
    <ul className="list-disc list-inside space-y-2 text-slate-300">
    <li><strong>Barajado Individual:</strong> En el menú <code className="bg-slate-700 px-1 rounded">⋯</code> de una Megalista, pulsa <strong>&quot;Reordenar&quot;</strong>.</li>
    <li><strong>Barajado en Lote:</strong> Selecciona varias Megalistas → botón <Shuffle className="inline h-4 w-4" /> en la barra inferior.</li>
    <li><strong>Barajado Global:</strong> Pulsa el botón <Shuffle className="inline h-4 w-4" /> en la cabecera para reordenar todas tus Megalistas a la vez.</li>
    </ul>
    </SectionCard>
    
    {/* Sincronización */}
    <SectionCard icon={<RefreshCw className="h-6 w-6 text-amber-400" />} title="5. Sincronización Inteligente (¡Mejorado!)">
    <p>
    Esta es la función estrella. Mantiene tus Megalistas al día con los cambios en sus playlists de origen, pero de forma mucho más eficiente.
    </p>
    <ul className="list-disc list-inside space-y-3 text-slate-300">
    <li><strong>Previsualiza Antes de Actuar:</strong> Antes de aplicar cualquier cambio, la app te mostrará un resumen de cuántas canciones se van a añadir y cuántas se van a eliminar. ¡Tú tienes la última palabra!</li>
    <li><strong className="text-amber-300">Conserva Fecha y Orden:</strong> La nueva sincronización es incremental. Solo añade y quita lo necesario, por lo que las canciones que ya estaban en tu playlist conservan su fecha de adición y su orden original.</li>
    <li><strong>Sincronización Múltiple:</strong> Puedes sincronizar una Megalista desde su menú <code className="bg-slate-700 px-1 rounded">⋯</code>, varias a la vez desde la barra inferior, o todas con el botón <RefreshCw className="inline h-4 w-4" /> de la cabecera.</li>
    <li><strong>Autocuración:</strong> Si borras una playlist que era fuente de una Megalista, la app lo detecta y la limpia de la configuración para evitar errores.</li>
    </ul>
    </SectionCard>
    
    {/* Gestión avanzada */}
    <SectionCard icon={<Edit3 className="h-6 w-6 text-rose-400" />} title="6. Gestión Avanzada de Playlists">
    <ul className="list-disc list-inside space-y-3 text-slate-300">
    <li><strong>Ver Canciones:</strong> ¿No recuerdas qué hay en una playlist? Usa la opción <Eye className="inline h-4 w-4" /> <strong>&quot;Ver Canciones&quot;</strong> en su menú para ver la lista completa en un panel lateral.</li>
    <li><strong>Editar Nombre/Descripción:</strong> Desde el menú <code className="bg-slate-700 px-1 rounded">⋯</code> → <strong>&quot;Editar detalles&quot;</strong>. Funciona para CUALQUIER playlist, no solo Megalistas.</li>
    <li><strong>Eliminar Playlists:</strong> Individualmente desde el menú <code className="bg-slate-700 px-1 rounded">⋯</code> o en lote seleccionando varias y usando el botón <Trash2 className="inline h-4 w-4 text-rose-500" /> de la barra inferior.</li>
    <li><strong>Reanudar Mezclas:</strong> Si una creación de playlist muy grande falla (por ej. por un corte de red), aparecerá un botón para <strong>reanudarla</strong> justo donde se quedó.</li>
    </ul>
    </SectionCard>
    
    {/* Footer */}
    <footer className="text-center text-slate-500 text-sm py-8">
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