// Fichero: /auth.ts (Versión de Diagnóstico)

import NextAuth from 'next-auth';
import Spotify from 'next-auth/providers/spotify';

// --- BLOQUE DE DIAGNÓSTICO ---
// Este bloque se ejecutará en el servidor cuando se inicialice la ruta de la API.
console.log("--- VERIFYING ENVIRONMENT VARIABLES ---");
console.log(`AUTH_URL: ${process.env.AUTH_URL}`);
console.log(`AUTH_SECRET Exists: ${!!process.env.AUTH_SECRET}, Length: ${process.env.AUTH_SECRET?.length}`);
console.log(`AUTH_SPOTIFY_ID Exists: ${!!process.env.AUTH_SPOTIFY_ID}, Value (start): ${process.env.AUTH_SPOTIFY_ID?.substring(0, 4)}`);
console.log(`AUTH_SPOTIFY_SECRET Exists: ${!!process.env.AUTH_SPOTIFY_SECRET}, Length: ${process.env.AUTH_SPOTIFY_SECRET?.length}`);
console.log("-------------------------------------");
// -----------------------------

export const {
  handlers,
  auth,
  signIn,
  signOut
} = NextAuth({
  // Mantenemos la configuración simplificada y correcta
  providers: [
    Spotify({
      authorization: {
        params: {
          scope: 'user-read-email playlist-read-private playlist-modify-public playlist-modify-private user-read-currently-playing',
        },
      },
    }),
  ],
  
  callbacks: {
    // ...tus callbacks correctos...
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
      }
      
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }
      
      if (!token.refreshToken) {
        return { ...token, error: 'RefreshAccessTokenError' };
      }
      
      try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
          }),
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
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      
      return session;
    },
  },
});