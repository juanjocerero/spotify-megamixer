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
  Shuffle,
  Eye,
  ListFilter,
} from 'lucide-react';

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
            ¡Bienvenido a tu centro de control de playlists! Aquí te explicamos
            todo lo que puedes hacer con esta herramienta.
          </p>
        </header>

        {/* Conceptos Clave */}
        <SectionCard
          icon={<Plus className="h-6 w-6 text-green-400" />}
          title="1. Conceptos Clave: Megalista vs. Sorpresa"
        >
          <p>
            Spotify Megamixer introduce dos tipos de playlists inteligentes que
            puedes crear y gestionar:
          </p>
          <ul className="list-disc list-inside space-y-3 text-slate-300 pt-2">
            <li>
              <strong className="text-green-400">Megalista:</strong> Es la{' '}
              <strong className="text-green-400">unión</strong> de todas las
              canciones de dos o más playlists de origen. Su propósito es
              mantenerse sincronizada con los cambios de sus fuentes. Se
              identifican con una insignia verde.
            </li>
            <li>
              <strong className="text-blue-400">Lista Sorpresa:</strong> Es una{' '}
              <strong className="text-blue-400">selección aleatoria</strong> de
              canciones extraídas de una o más playlists de origen. Su propósito
              es crear una mezcla nueva y única en un momento dado, y no se
              sincroniza. Se identifican con una insignia azul.
            </li>
          </ul>
        </SectionCard>

        {/* Búsqueda y Ordenación */}
        <SectionCard
          icon={<ListFilter className="h-6 w-6 text-sky-400" />}
          title="2. Búsqueda, Ordenación y Navegación"
        >
          <ul className="list-disc list-inside space-y-3 text-slate-300">
            <li>
              <strong>Búsqueda Inteligente:</strong> Usa el campo{' '}
              <Search className="inline h-4 w-4" /> para filtrar en tiempo real.
              La búsqueda perdona errores tipográficos.
            </li>
            <li>
              <strong>Ordenación Flexible:</strong> Organiza tu lista por
              defecto, nombre, número de canciones, propietario o mostrando las
              Megalistas y Sorpresas primero.
            </li>
            <li>
              <strong>Selección Rápida:</strong> Un botón aparece en la búsqueda
              para seleccionar todos los resultados de una vez.
            </li>
            <li>
              <strong>Atajos de Teclado:</strong> Usa{' '}
              <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">↑</kbd>{' '}
              <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">↓</kbd> para
              navegar por la lista y la{' '}
              <kbd className="px-2 py-1 rounded bg-slate-700 text-xs">
                barra espaciadora
              </kbd>{' '}
              para seleccionar.
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
                Selecciona 2 o más playlists → pulsa el botón verde{' '}
                <strong>&quot;Crear&quot;</strong>. Tras confirmar el nombre, la
                app te preguntará si quieres{' '}
                <strong className="text-orange-400">reordenar</strong> la mezcla
                inicial o mantener el orden original.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-purple-300">
                Añadir a una Playlist Existente
              </h3>
              <p>
                Selecciona playlists → pulsa el botón{' '}
                <strong>&quot;Añadir&quot;</strong> → elige la playlist de
                destino. Tras añadir las canciones nuevas, se te preguntará si
                quieres <strong className="text-orange-400">reordenar</strong> el
                resultado.{' '}
                <strong className="text-amber-300">Importante:</strong> si
                añades canciones a una &quot;Lista Sorpresa&quot;, esta se
                convertirá automáticamente en una &quot;Megalista&quot;.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-purple-300 flex items-center gap-2">
                Crear una Lista Sorpresa ✨
              </h3>
              <p>
                Genera una playlist con un número de canciones aleatorias.
                Tienes tres formas de hacerlo:
              </p>
              <ul className="list-decimal list-inside space-y-2 pl-4 pt-2">
                <li>
                  <strong>Desde una playlist:</strong> Pulsa el menú{' '}
                  <code className="bg-slate-700 px-1 rounded">⋯</code> de
                  cualquier playlist y elige &quot;Crear lista sorpresa&quot;.
                </li>
                <li>
                  <strong>Desde varias playlists:</strong> Selecciona varias
                  playlists y pulsa el botón{' '}
                  <Wand2 className="inline h-4 w-4 text-blue-400" /> de la barra
                  inferior.
                </li>
                <li>
                  <strong>Totalmente aleatoria:</strong> Pulsa el botón{' '}
                  <Wand2 className="inline h-4 w-4" /> en la cabecera de la
                  aplicación para usar hasta 50 playlists al azar de toda tu
                  librería.
                </li>
              </ul>
            </div>
          </div>
        </SectionCard>

        {/* Reordenado */}
        <SectionCard
          icon={<Shuffle className="h-6 w-6 text-orange-400" />}
          title="4. El Poder del Reordenado"
        >
          <p>
            El reordenado te da control total sobre el orden de las canciones.
            Puedes usarlo de dos maneras:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li>
              <strong>Como Acción Explícita:</strong> Puedes reordenar cualquier
              playlist creada por la app en cualquier momento, ya sea
              individualmente (desde su menú{' '}
              <code className="bg-slate-700 px-1 rounded">⋯</code>), en lote
              (barra inferior) o de forma global (botón{' '}
              <Shuffle className="inline h-4 w-4" /> en la cabecera).
            </li>
            <li>
              <strong>Como Paso Opcional:</strong> Después de crear, añadir
              canciones o sincronizar una playlist, la aplicación siempre te
              preguntará si quieres reordenar el contenido como último paso,
              dándote la opción de mantener el orden si lo prefieres.
            </li>
          </ul>
        </SectionCard>

        {/* Sincronización */}
        <SectionCard
          icon={<RefreshCw className="h-6 w-6 text-amber-400" />}
          title="5. Sincronización Inteligente de Megalistas"
        >
          <p>
            Esta función mantiene tus Megalistas al día con los cambios en sus
            playlists de origen de forma eficiente.
          </p>
          <ul className="list-disc list-inside space-y-3 text-slate-300">
            <li>
              <strong>Previsualiza Antes de Actuar:</strong> Antes de aplicar
              cualquier cambio, la app te mostrará un resumen de cuántas
              canciones se van a añadir y eliminar.
            </li>
            <li>
              <strong className="text-amber-300">
                Conserva Fecha y Orden:
              </strong>{' '}
              La sincronización solo añade y quita lo necesario, por lo que las
              canciones que ya estaban conservan su fecha de adición y su orden
              original por defecto.
            </li>
            <li>
              <strong className="text-orange-400">
                Reordenado Post-Sincro:
              </strong>{' '}
              Después de confirmar una sincronización con cambios, podrás
              elegir si quieres reordenar aleatoriamente la playlist o dejarla
              como está.
            </li>
            <li>
              <strong>Autocuración:</strong> Si borras una playlist fuente en
              Spotify, la app lo detecta en la siguiente sincronización y la
              limpia de la configuración para evitar errores futuros.
            </li>
          </ul>
        </SectionCard>

        {/* Gestión avanzada */}
        <SectionCard
          icon={<Edit3 className="h-6 w-6 text-rose-400" />}
          title="6. Gestión Avanzada de Playlists"
        >
          <ul className="list-disc list-inside space-y-3 text-slate-300">
            <li>
              <strong>Ver Canciones:</strong> Usa la opción{' '}
              <Eye className="inline h-4 w-4" />{' '}
              <strong>&quot;Ver Canciones&quot;</strong> en el menú de cualquier
              playlist para ver su contenido en un panel lateral.
            </li>
            <li>
              <strong>Editar Nombre/Descripción:</strong> Desde el menú{' '}
              <code className="bg-slate-700 px-1 rounded">⋯</code> →{' '}
              <strong>&quot;Editar detalles&quot;</strong>. Funciona para
              CUALQUIER playlist de tu propiedad.
            </li>
            <li>
              <strong>Eliminar Playlists:</strong> Individualmente desde el menú{' '}
              <code className="bg-slate-700 px-1 rounded">⋯</code> o en lote con
              el botón <Trash2 className="inline h-4 w-4 text-rose-500" /> de la
              barra inferior.
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
      <div className="text-slate-300 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}