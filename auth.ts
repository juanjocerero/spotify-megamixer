import NextAuth from 'next-auth';
import Spotify from 'next-auth/providers/spotify';

// Define the scopes required by the application as a single space-separated string.
const spotifyScopes = 'user-read-email playlist-read-private playlist-modify-public playlist-modify-private user-read-currently-playing';

export const {
  handlers,
  auth,
  signIn,
  signOut
} = NextAuth({
  
  providers: [
    Spotify({
      clientId: process.env.AUTH_SPOTIFY_ID,
      clientSecret: process.env.AUTH_SPOTIFY_SECRET,
      // Provide the authorization URL as a complete string to inject custom scopes.
      authorization: `https://accounts.spotify.com/authorize?scope=${spotifyScopes}`,
    }),
  ],
  
  callbacks: {
    // This callback logic is crucial for handling token expiration and refresh.
    async jwt({ token, account }) {
      if (account) {
        // This is the initial sign-in. Persist the tokens and expiration time.
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
      }
      
      // If the access token has not expired, return it.
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }
      
      // If the access token has expired, try to refresh it.
      if (!token.refreshToken) {
        // If there's no refresh token, the session cannot be refreshed.
        return { ...token, error: 'RefreshAccessTokenError' };
      }
      
      // Attempt to refresh the token.
      try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
        });
        
        const refreshedTokens = await response.json();
        if (!response.ok) throw refreshedTokens;
        
        // Return the updated token.
        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
          // Spotify might return a new refresh token, so use it if available.
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        // If refreshing fails, return an error.
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },
    async session({ session, token }) {
      // Pass the access token and any potential errors to the client-side session.
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      
      return session;
    },
  },
});