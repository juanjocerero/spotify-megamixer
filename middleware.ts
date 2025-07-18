// /middleware.ts
import { auth } from "@/auth";
import { NextResponse } from 'next/server';

export default auth((req) => {
  // Obtenemos la sesión del request. `req.auth` será un objeto de sesión si existe, o null si no.
  const isLoggedIn = !!req.auth;
  
  // Obtenemos la ruta que el usuario está intentando visitar.
  const { pathname } = req.nextUrl;
  
  // --- Lógica de redirección ---
  
  // Si el usuario está logueado y visita la página raíz ('/'),
  // lo redirigimos directamente al dashboard.
  if (isLoggedIn && pathname === '/') {
    // Creamos una URL absoluta para el dashboard y devolvemos la redirección.
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // Si el usuario no está logueado y visita una ruta protegida
  // (en este caso, /dashboard), el middleware `auth` de NextAuth se encarga
  // de redirigirlo a la página de login.
});

// -- Configuración del middleware --
export const config = {
  // Aplicamos el middleware a la ruta raíz y al dashboard.
  // Esto asegura que se ejecute en ambas páginas para poder tomar decisiones.
  matcher: ['/', '/dashboard'],
};