// /app/faq/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wand2 } from 'lucide-react';

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 md:p-8">
    <div className="max-w-3xl mx-auto prose prose-invert prose-headings:text-green-500 prose-a:text-green-400 hover:prose-a:text-green-300">
    
    <Link href="/dashboard" passHref>
    <Button variant="ghost" className="mb-8">
    <ArrowLeft className="mr-2 h-4 w-4" />
    Volver al Dashboard
    </Button>
    </Link>
    
    <h1>Guía de Funcionalidades de Spotify Megamixer</h1>
    
    <p>
    ¡Bienvenido a la guía de Spotify Megamixer! Esta aplicación ha sido diseñada para darte superpoderes sobre tus playlists. Aquí te explicamos todo lo que puedes hacer.
    </p>
    
    <h2>Concepto Básico: Mezcla y Carga de Playlists</h2>
    <p>
    La función principal de la aplicación es solucionar una carencia de Spotify: la capacidad de mezclar el contenido de varias playlists en una sola. Al entrar, la aplicación carga tus playlists de Spotify. Si tienes muchas, simplemente haz scroll hacia abajo y la aplicación cargará más automáticamente gracias a la **carga infinita**.
    </p>
    
    <h2>Búsqueda y Navegación</h2>
    <ul>
    <li><strong>Búsqueda Inteligente:</strong> Usa la barra de búsqueda para filtrar tus playlists en tiempo real. La búsqueda perdona errores tipográficos, así que no te preocupes si escribes algo mal.</li>
    <li><strong>Seleccionar Búsqueda:</strong> Cuando filtras, aparece un botón para seleccionar todos los resultados de la búsqueda con un solo clic.</li>
    <li><strong>Navegación por Teclado:</strong> Usa las teclas <kbd>↑</kbd> y <kbd>↓</kbd> para moverte por la lista, y la <kbd>barra espaciadora</kbd> para seleccionar o deseleccionar la playlist enfocada.</li>
    </ul>
    
    <h2>Crear y Gestionar Megalistas</h2>
    <h3>Crear una Nueva Megalista</h3>
    <p>
    Selecciona dos o más playlists. En la barra de acciones inferior, pulsa el botón verde "Crear". La aplicación unificará todas las canciones, eliminará duplicados, las barajará y creará una nueva playlist en tu cuenta de Spotify.
    </p>
    <h3>Añadir a una Megalista Existente</h3>
    <p>
    Selecciona una o más playlists y pulsa el botón "Añadir". Se abrirá un diálogo donde podrás elegir una de tus Megalistas creadas previamente para añadirle las nuevas canciones.
    </p>
    <h3>Megamix Sorpresa ✨</h3>
    <p>
    Pulsa el botón de la varita mágica (<Wand2 className="inline h-4 w-4" />) en la cabecera. Esta función te permite crear una playlist con un número determinado de canciones aleatorias.
    </p>
    <ul>
    <li><strong>Con selección:</strong> Si tienes playlists seleccionadas, las usará como fuente.</li>
    <li><strong>Sin selección:</strong> Si no tienes nada seleccionado, usará hasta 10 playlists al azar de tu librería para crear la mezcla.</li>
    </ul>
    
    <h2>Sincronización Inteligente</h2>
    <p>
    Las Megalistas creadas con la app guardan la información de sus playlists de origen. Esto permite una sincronización inteligente.
    </p>
    <ul>
    <li><strong>Sincronización Individual:</strong> En el menú de acciones (`...`) de una Megalista, pulsa "Sincronizar" para actualizarla con las últimas canciones de sus fuentes.</li>
    <li><strong>Sincronización en Lote:</strong> Si tienes playlists seleccionadas, aparecerá un botón "Sincronizar" en la barra inferior para actualizar todas tus Megalistas a la vez.</li>
    <li><strong>Autocuración:</strong> Si eliminas una de las playlists que componían una Megalista, la aplicación lo detectará en la siguiente sincronización y la eliminará de las fuentes para evitar errores. ¡Se arregla sola!</li>
    </ul>
    
    <h2>Gestión Avanzada de Playlists</h2>
    <h3>Menús de Acciones</h3>
    <p>
    Cada playlist en la lista tiene un menú de acciones (`...`) a la derecha. Este menú te da acceso a funciones de gestión para esa playlist específica.
    </p>
    <h3>Editar Nombre y Descripción</h3>
    <p>
    Desde el menú de acciones de cualquier playlist, puedes elegir "Editar detalles" para cambiar su nombre y descripción directamente desde la aplicación.
    </p>
    <h3>Eliminar Playlists</h3>
    <p>
    Puedes eliminar playlists de dos maneras:
    </p>
    <ul>
    <li><strong>Individual:</strong> Desde el menú de acciones (`...`) de cualquier playlist.</li>
    <li><strong>En Lote:</strong> Seleccionando una o más playlists y usando el botón "Eliminar" de la barra de acciones inferior.</li>
    </ul>
    
    <h2>Tolerancia a Fallos</h2>
    <h3>Reanudar Mezclas Fallidas</h3>
    <p>
    Si estás creando una Megalista muy grande y el proceso falla (por ejemplo, por una pérdida de conexión), ¡no te preocupes! La barra de acciones se transformará y te dará la opción de **reanudar la mezcla** desde el punto exacto donde se detuvo.
    </p>
    </div>
    </div>
  );
}