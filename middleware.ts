// /middleware.ts
import { auth } from "@/auth";
import { NextResponse } from 'next/server';

/**
 * El middleware de la aplicación, que se ejecuta en las rutas definidas en `config`.
 * Utiliza `auth()` de NextAuth.js para gestionar la lógica de autenticación.
 *
 * Lógica principal:
 * 1.  Si un usuario ya autenticado (`isLoggedIn`) intenta acceder a la página de inicio (`/`),
 *     se le redirige automáticamente al dashboard (`/dashboard`) para una mejor experiencia de usuario.
 * 2.  Para las rutas protegidas (en este caso, `/dashboard`), el propio `auth()` se encarga
 *     de la protección: si un usuario no está autenticado, será redirigido a la página de
 *     inicio de sesión configurada en `auth.ts`.
 */
export default auth((req) => {
  // Obtenemos la sesión del request. `req.auth` será un objeto de sesión si existe, o null si no.
  const isLoggedIn = !!req.auth;
  
  // Obtenemos la ruta que el usuario está intentando visitar.
  const { pathname } = req.nextUrl;
  
  // Lógica de redirección
  
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

/**
 * Configuración del middleware.
 * El `matcher` especifica en qué rutas se debe ejecutar el middleware.
 */
export const config = {
  // Aplicamos el middleware a la ruta raíz y al dashboard.
  // Esto asegura que se ejecute en ambas páginas para poder tomar decisiones.
  matcher: ['/', '/dashboard'],
};