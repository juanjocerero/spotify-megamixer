// /middleware.ts
export { auth as default } from "@/auth"

// Opcional: Configura qué rutas quieres proteger.
// Por ahora, protegeremos el futuro dashboard.
// Cualquier intento de acceder a /dashboard sin iniciar sesión
// será redirigido a la página de login.
export const config = {
  matcher: ["/dashboard"],
}