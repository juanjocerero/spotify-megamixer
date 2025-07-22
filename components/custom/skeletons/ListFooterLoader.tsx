// /components/custom/skeletons/ListFooterLoader.tsx
import { Loader2 } from 'lucide-react';

/**
* Un spinner simple que se muestra al final de una lista para indicar
* que se están cargando más elementos (paginación).
*/
export function ListFooterLoader() {
  return (
    <div className="flex justify-center items-center py-4">
    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
    </div>
  );
}