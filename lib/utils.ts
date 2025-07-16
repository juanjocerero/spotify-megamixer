import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
* Baraja un array in-place usando el algoritmo Fisher-Yates y lo devuelve.
* @param array El array a barajar.
* @returns El mismo array, pero barajado.
*/
export function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  
  // Mientras queden elementos por barajar.
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