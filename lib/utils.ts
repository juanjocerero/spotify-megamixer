// /lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina múltiples clases de CSS en una sola cadena, manejando conflictos de Tailwind CSS.
 * Es una función de utilidad estándar en proyectos que usan `shadcn/ui` y `tailwind-merge`.
 * @param inputs - Una secuencia de valores de clase (strings, arrays, objetos).
 * @returns Una cadena de clases CSS optimizada y sin conflictos.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Reordena un array de forma aleatoria utilizando el algoritmo Fisher-Yates (moderno).
 * La modificación se hace "in-place" (muta el array original) para mayor eficiencia.
 * @template T - El tipo de los elementos en el array.
 * @param array - El array a reordenar.
 * @returns El mismo array, pero con sus elementos reordenados aleatoriamente.
 */
export function shuffleArray<T>(array: T[]): T[] {
  
  let currentIndex = array.length, randomIndex;
  
  // Mientras queden elementos por reordenar.
  while (currentIndex !== 0) {
    // Escoge un elemento restante.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    
    // Y lo intercambia con el elemento actual.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
    }
    
    return array;
  }