// /auth.ts
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import type { JWT } from "next-auth/jwt";
import type { Account, Session } from "next-auth";

// --- Función helper para obtener variables de entorno (solo cuando se llama) ---
const getEnv = (name: string) => {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing env variable: ${name}`);
  }
  return val;
};
// -----------------------------------------------------------------------------

const scopes =
"user-read-email playlist-read-private playlist-read-collaborative " +
"playlist-modify-private playlist-modify-public user-read-playback-state " +
"user-modify-playback-state user-read-currently-playing user-library-read " +
"user-library-modify";

const authorization = `https://accounts.spotify.com/authorize?scope=${encodeURIComponent(
  scopes
)}`;

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", token.refreshToken as string);
    
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization:
        "Basic " +
        Buffer.from(
          getEnv("SPOTIFY_CLIENT_ID") + ":" + getEnv("SPOTIFY_CLIENT_SECRET")
        ).toString("base64"),
      },
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: getEnv("SPOTIFY_CLIENT_ID"),
      clientSecret: getEnv("SPOTIFY_CLIENT_SECRET"),
      authorization,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_in as number) * 1000,
          refreshToken: account.refresh_token,
          user: account.providerAccountId,
        };
      }
      
      if (token.error) return token;
      
      if (Date.now() < (token.accessTokenExpires as number)) return token;
      
      console.log("El token de acceso ha expirado, refrescando...");
      return refreshAccessToken(token);
    },
    
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string;
      if (session.user) {
        session.user.id = token.user as string;
      }
      return session;
    },
  },
});