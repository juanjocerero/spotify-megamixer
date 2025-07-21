'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SearchResults, searchSpotifyAction } from '@/lib/actions/search.actions';

/**
* Hook personalizado para gestionar la búsqueda de contenido en Spotify.
* Incluye lógica de debouncing para optimizar las llamadas a la API.
*/
export function useSpotifySearch() {
  // El término de búsqueda introducido por el usuario en tiempo real.
  const [query, setQuery] = useState('');
  // El término de búsqueda estabilizado (debounced) que se usará para la API.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // Los resultados de la búsqueda obtenidos de la API.
  const [results, setResults] = useState<SearchResults | null>(null);
  // Estado para saber si una búsqueda está en curso.
  const [isLoading, setIsLoading] = useState(false);
  // Para almacenar cualquier mensaje de error de la API.
  const [error, setError] = useState<string | null>(null);
  
  // Efecto #1: Debouncing.
  // Se ejecuta cada vez que el `query` (input del usuario) cambia.
  useEffect(() => {
    // Inicia un temporizador. Si el usuario sigue escribiendo, el temporizador
    // anterior se limpia y se inicia uno nuevo.
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // Espera 500ms después de la última pulsación.
    
    // Función de limpieza: se ejecuta cuando el componente se desmonta
    // o antes de que el efecto se vuelva a ejecutar.
    return () => {
      clearTimeout(handler);
    };
  }, [query]);
  
  // Efecto #2: Fetching de datos.
  // Se ejecuta solo cuando `debouncedQuery` cambia.
  useEffect(() => {
    // Usamos una función asíncrona autoejecutable (IIFE)
    // para poder usar async/await dentro de useEffect.
    (async () => {
      // Si no hay término de búsqueda, reseteamos el estado y no hacemos nada.
      if (!debouncedQuery) {
        setResults(null);
        setIsLoading(false);
        setError(null);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      const result = await searchSpotifyAction(debouncedQuery);
      
      if (result.success) {
        setResults(result.data);
      } else {
        setError(result.error);
        toast.error('Error en la búsqueda', {
          description: result.error,
        });
        setResults(null); // Limpiamos resultados anteriores si hay un error
      }
      
      setIsLoading(false);
    })();
  }, [debouncedQuery]);
  
  return { query, setQuery, results, isLoading, error };
}