// Fichero: /auth.ts

import NextAuth from 'next-auth';
import Spotify from 'next-auth/providers/spotify';

export const {
  handlers,
  auth,
  signIn,
  signOut
} = NextAuth({
  // Usamos las firmas de función correctas para cada evento del logger.
  logger: {
    // El evento 'error' solo recibe un objeto 'Error'.
    error(error) {
      console.error(`[AUTH.JS ERROR]`, error);
    },
    // 'warn' recibe un código de tipo string.
    warn(code: string) {
      console.warn(`[AUTH.JS WARNING] Código: ${code}`);
    },
    // 'debug' recibe un código y metadatos opcionales.
    debug(code: string, metadata: unknown) {
      console.log(`[AUTH.JS DEBUG] Código: ${code}`, metadata);
    }
  },
  providers: [
    Spotify({
      clientId: process.env.AUTH_SPOTIFY_CLIENT_ID,
      clientSecret: process.env.AUTH_SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'user-read-email playlist-read-private playlist-modify-public playlist-modify-private user-read-currently-playing',
        },
      },
    }),
  ],
  
  callbacks: {
    // Las callbacks anteriores son correctas, las mantenemos.
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
            Authorization: `Basic ${Buffer.from(`${process.env.AUTH_SPOTIFY_CLIENT_ID}:${process.env.AUTH_SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
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