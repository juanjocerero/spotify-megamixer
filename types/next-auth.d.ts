// /types/next-auth.d.ts

import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "@auth/core/jwt";

// Extiende los tipos por defecto de NextAuth para incluir nuestras propiedades personalizadas

declare module "next-auth" {
  /**
  * La forma del objeto de sesión que devolvemos desde `auth()` y usamos en la aplicación.
  * Estamos añadiendo `accessToken` y un posible `error`.
  */
  interface Session extends DefaultSession {
    accessToken?: string;
    error?: string;
    user: {
      id: string;
    } & DefaultSession["user"]; // Mantiene los campos originales de user (name, email, image) y añade 'id'
  }
}

declare module "@auth/core/jwt" {
  /**
  * La forma del token JWT que manejamos en el callback `jwt`.
  * Estamos añadiendo las propiedades que guardamos del proveedor de Spotify.
  */
  interface JWT extends DefaultJWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    user?: string; // Esto guardará el ID de usuario de Spotify
    error?: string;
  }
}