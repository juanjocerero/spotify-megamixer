// /auth.ts
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import type { JWT } from "next-auth/jwt";
import type { Account, Session } from "next-auth";

// --- Verificación de Variables de Entorno (¡AHORA CON LOS NOMBRES CORRECTOS!) ---
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const authSecret = process.env.AUTH_SECRET; // <-- CAMBIO AQUÍ

if (!spotifyClientId || !spotifyClientSecret || !authSecret) { // <-- Y AQUÍ
  throw new Error("ERROR CRÍTICO: Faltan una o más variables de entorno en .env.local. Asegúrate de que SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, y AUTH_SECRET están definidos.");
}
// -----------------------------------------------------------------------------

// ... (el resto del archivo: scopes, authorization, refreshAccessToken... se queda exactamente igual)

const scopes = "user-read-email playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing user-library-read user-library-modify";
const authorization = `https://accounts.spotify.com/authorize?scope=${scopes}`;

async function refreshAccessToken(token: JWT): Promise<JWT> {
    // ... esta función no necesita cambios
    try {
        const params = new URLSearchParams();
        params.append("grant_type", "refresh_token");
        params.append("refresh_token", token.refreshToken as string);
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: { "Authorization": "Basic " + Buffer.from(spotifyClientId + ":" + spotifyClientSecret).toString("base64") },
          body: params,
        });
        const refreshedTokens = await response.json();
        if (!response.ok) throw refreshedTokens;
        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        console.error("Error al refrescar el token de acceso", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
}


// La llamada a NextAuth NO necesita el secret aquí si AUTH_SECRET está definido en el entorno.
// Auth.js v5 está diseñado para cogerlo automáticamente. Lo quitamos de aquí para mayor limpieza
// y para confiar en el mecanismo estándar de la librería.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: spotifyClientId,
      clientSecret: spotifyClientSecret,
      authorization,
    }),
  ],
  callbacks: {
    async jwt({ token, account }): Promise<JWT> {
        if (account) {
            return {
              accessToken: account.access_token,
              accessTokenExpires: Date.now() + (account.expires_in as number) * 1000,
              refreshToken: account.refresh_token,
              user: account.providerAccountId,
            } as JWT;
          }
          if (Date.now() < (token.accessTokenExpires as number)) {
            return token;
          }
          return refreshAccessToken(token);
    },
    async session({ session, token }): Promise<Session> {
        if (session.user) { (session.user as any).id = token.user; }
        (session as any).accessToken = token.accessToken;
        (session as any).error = token.error;
        return session;
    },
  },
});