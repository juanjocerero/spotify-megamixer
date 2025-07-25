// /app/faq/page.tsx

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Wand2,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Eye,
  ListFilter,
  ListPlus,
  Snowflake,
  Sun,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200 p-4 sm:p-6 md:p-8">
    <div className="max-w-4xl mx-auto space-y-10">
    {/* Botón volver */}
    <Link href="/dashboard" passHref>
    <Button
    variant="ghost"
    className="mb-2 text-green-400 hover:text-green-300"
    >
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
    ¡Bienvenido a tu centro de control de playlists! Aquí te explicamos
    todo lo que puedes hacer con esta herramienta.
    </p>
    </header>
    
    {/* Conceptos Clave */}
    <SectionCard
    icon={<Plus className="h-6 w-6 text-green-400" />}
    title="1. Conceptos Clave: Tipos de Playlist"
    >
    <p>
    Spotify Megamixer introduce varios tipos de playlists inteligentes que
    puedes crear y gestionar:
    </p>
    <ul className="list-disc list-inside space-y-3 text-slate-300 pt-2">
    <li>
    <strong className="text-green-400">Megalista:</strong> Es la{' '}
    <strong>unión</strong> de las canciones de dos o más playlists. Su
    propósito es mantenerse sincronizada con los cambios de sus
    fuentes. Se identifica con una insignia <strong className="text-green-400">verde</strong>.
    </li>
    <li>
    <strong className="text-blue-400">Megalista Congelada:</strong> Es una Megalista que has marcado como no sincronizable. Es ideal para preservar una mezcla específica, protegiéndola de cambios automáticos. Se identifica con una insignia <strong className="text-blue-400">azul</strong>.
    </li>
    <li>
    <strong className="text-red-500">Megalista Vacía:</strong> Es una Megalista recién creada que aún no tiene fuentes. Está marcada como congelada por defecto y se &quot;activa&quot; (se vuelve sincronizable) cuando le añades su primera playlist. Se identifica con una insignia <strong className="text-red-500">roja</strong>.
    </li>
    <li>
    <strong className="text-purple-400">Lista Sorpresa:</strong> Es
    una <strong>selección aleatoria</strong> de canciones. Su
    propósito es crear una mezcla única y no se sincroniza. Se
    identifica con una insignia <strong className="text-purple-400">morada</strong>.
    </li>
    </ul>
    </SectionCard>
    
    {/* Búsqueda y Descubrimiento */}
    <SectionCard
    icon={<Search className="h-6 w-6 text-sky-400" />}
    title="2. Búsqueda y Descubrimiento Avanzados"
    >
    <p>
    La interfaz cuenta con dos potentes barras de búsqueda, cada una con sus propios controles:
    </p>
    <ul className="list-disc list-inside space-y-4 text-slate-300 pt-2">
    <li>
    <strong className="text-sky-300">Filtrar tus playlists:</strong> La primera barra te permite buscar entre tus playlists.
    <ul className="list-decimal list-inside space-y-2 pl-6 pt-2">
    <li>Usa el icono <ArrowUpDown className="inline h-4 w-4" /> para <strong>ordenar tu lista</strong> por nombre, número de canciones, etc.</li>
    <li>Usa las teclas <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">↑</kbd> <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">↓</kbd> para navegar y la <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">barra espaciadora</kbd> para seleccionar.</li>
    </ul>
    </li>
    <li>
    <strong className="text-sky-300">Buscar en todo Spotify:</strong> La segunda barra te permite descubrir nuevo contenido.
    <ul className="list-decimal list-inside space-y-2 pl-6 pt-2">
    <li>Los resultados aparecen en una ventana emergente (popover).</li>
    <li>Usa el filtro <ListFilter className="inline h-4 w-4" /> <strong>dentro de la ventana de resultados</strong> para ordenarlos por relevancia, o priorizando canciones, álbumes o listas.</li>
    <li>Cada resultado tiene un icono que identifica su tipo.</li>
    <li>Si un resultado de búsqueda es una playlist que ya sigues, aparecerá marcada con un discreto icono <CheckCircle2 className="inline h-4 w-4 text-green-500" /> sobre su carátula.</li>
    </ul>
    </li>
    </ul>
    </SectionCard>
    
    {/* Crear y gestionar */}
    <SectionCard
    icon={<Wand2 className="h-6 w-6 text-purple-400" />}
    title="3. Cómo Crear y Modificar Playlists"
    >
    <div className="space-y-4">
    <div>
    <h3 className="font-semibold text-purple-300">
    Crear una Megalista
    </h3>
    <p>
    Selecciona 2 o más playlists → pulsa el botón{' '}
    <Plus className="inline h-4 w-4 bg-primary text-primary-foreground p-0.5 rounded-sm" />{' '}
    en la barra inferior. La app te preguntará si quieres{' '}
    <strong className="text-orange-400">reordenar</strong> la mezcla.
    </p>
    </div>
    <div>
    <h3 className="font-semibold text-purple-300">
    Añadir a una Megalista Existente
    </h3>
    <p>
    Puedes enriquecer una Megalista de dos maneras:
    </p>
    <ul className="list-decimal list-inside space-y-2 pl-4 pt-2">
    <li>
    <strong>Añadir playlists enteras:</strong> Selecciona una o más playlists y usa la opción <ListPlus className="inline h-4 w-4" /> <strong>&quot;Añadir a Megalista&quot;</strong>. Las canciones que ya existían no se duplicarán.
    </li>
    <li>
    <strong>Añadir canciones/álbumes sueltos:</strong> Desde los resultados de la búsqueda de Spotify, pulsa el botón <Plus className="inline h-4 w-4" /> en cualquier canción o álbum para inyectarlo directamente en una Megalista de tu elección.
    </li>
    </ul>
    </div>
    <div>
    <h3 className="font-semibold text-purple-300 flex items-center gap-2">
    Crear una Lista Sorpresa ✨
    </h3>
    <p>
    Genera una playlist con un número de canciones aleatorias.
    Tienes varias formas:
    </p>
    <ul className="list-decimal list-inside space-y-2 pl-4 pt-2">
    <li>
    <strong>Desde una selección:</strong> Selecciona playlists y pulsa{' '}
    <Wand2 className="inline h-4 w-4" /> en la barra inferior.
    </li>
    <li>
    <strong>Desde una sola playlist:</strong> Usa el menú{' '}
    <code className="bg-slate-700 px-1 rounded">⋯</code> de
    cualquier playlist y elige &quot;Crear lista sorpresa&quot;.
    </li>
    <li>
    <strong>Totalmente aleatoria:</strong> Pulsa el botón{' '}
    <Wand2 className="inline h-4 w-4" /> en la cabecera para usar
    hasta 50 playlists al azar de toda tu librería.
    </li>
    </ul>
    </div>
    </div>
    </SectionCard>
    
    {/* Sincronización */}
    <SectionCard
    icon={<RefreshCw className="h-6 w-6 text-amber-400" />}
    title="4. Sincronización Inteligente de Megalistas"
    >
    <p>
    Esta función mantiene tus uniones al día. <strong className="text-amber-300">Solo se aplica a Megalistas no congeladas (verdes).</strong>
    </p>
    <ul className="list-disc list-inside space-y-3 text-slate-300 pt-2">
    <li>
    <strong>Previsualiza Antes de Actuar:</strong> La app te mostrará
    un resumen claro de cuántas canciones se van a añadir y eliminar.
    </li>
    <li>
    <strong>Conserva Fecha y Orden:</strong> La sincronización solo
    añade y quita lo necesario, por lo que las canciones que ya
    estaban conservan su fecha de adición y su orden original.
    </li>
    <li>
    <strong>Reordenado Post-Sincro:</strong> Después de confirmar,
    podrás elegir si quieres reordenar aleatoriamente la playlist
    resultante.
    </li>
    <li>
    <strong>Autocuración:</strong> Si borras una de las playlists de
    origen en Spotify, la app lo detecta y la limpia de la
    configuración.
    </li>
    </ul>
    </SectionCard>
    
    {/* Gestión avanzada */}
    <SectionCard
    icon={<Edit3 className="h-6 w-6 text-rose-400" />}
    title="5. Gestión y Acciones Universales"
    >
    <p>
    Puedes realizar estas acciones sobre cualquier playlist, sea creada
    por la app o no (salvo donde se indique).
    </p>
    <ul className="list-disc list-inside space-y-3 text-slate-300 pt-2">
    <li>
    <strong>Congelar / Descongelar:</strong> Desde el menú{' '}
    <code className="bg-slate-700 px-1 rounded">⋯</code> de una
    Megalista, puedes elegir <Snowflake className="inline h-4 w-4 text-blue-400" />{' '}
    <strong>Congelar</strong> para que deje de ser sincronizable o{' '}
    <Sun className="inline h-4 w-4 text-yellow-400" />{' '}
    <strong>Descongelar</strong> para que vuelva a serlo. Esta acción
    es reversible.
    </li>
    <li>
    <strong>Reordenado (Shuffle):</strong> Reordena aleatoriamente
    las canciones de cualquier playlist creada por la app, ya sea
    individualmente o en lote.
    </li>
    <li>
    <strong>Ver Canciones:</strong> Usa la opción{' '}
    <Eye className="inline h-4 w-4" /> en el menú. La carga está
    optimizada para playlists grandes.
    </li>
    <li>
    <strong>Editar Nombre/Descripción:</strong> Funciona para
    CUALQUIER playlist de tu propiedad desde el menú{' '}
    <code className="bg-slate-700 px-1 rounded">⋯</code>.
    </li>
    <li>
    <strong>Eliminar Playlists:</strong> Individualmente desde el menú
    o en lote con el botón <Trash2 className="inline h-4 w-4 text-rose-500" />.
    Esta acción deja de seguir la playlist.
    </li>
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
function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-700/50 space-y-4">
    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-100">
    {icon}
    {title}
    </h2>
    <div className="text-slate-300 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}