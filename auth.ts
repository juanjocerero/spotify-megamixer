import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { db } from "./lib/db";

const spotifyScopes = 'user-read-email playlist-read-private playlist-modify-public playlist-modify-private user-read-currently-playing';

if (!process.env.AUTH_SPOTIFY_ID || !process.env.AUTH_SPOTIFY_SECRET) {
  throw new Error("Missing AUTH_SPOTIFY_ID or AUTH_SPOTIFY_SECRET environment variables");
}

// Interfaz para tipar el perfil de usuario de Spotify y evitar el 'any'
interface SpotifyProfile {
  id: string;
  display_name: string;
  email: string;
  images?: Array<{ url: string; }>;
}

export const auth = betterAuth({
  authUrl: process.env.AUTH_URL,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "spotify",
          clientId: process.env.AUTH_SPOTIFY_ID,
          clientSecret: process.env.AUTH_SPOTIFY_SECRET,
          scopes: spotifyScopes.split(" "),
          authorizationUrl: "https://accounts.spotify.com/authorize",
          tokenUrl: "https://accounts.spotify.com/api/token",
          userInfoUrl: "https://api.spotify.com/v1/me",
          // La función 'profile' se ha eliminado de aquí
        },
      ],
    }),
  ],
  // La lógica de mapeo de perfil se mueve a este nuevo bloque 'callbacks'
  callbacks: {
    profile: (profile: SpotifyProfile, providerId: string) => {
      if (providerId === "spotify") {
        return {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
          image: profile.images?.[0]?.url,
        };
      }
      return profile;
    },
  },
  account: {
    fields: {
      accountId: "providerAccountId",
      refreshToken: "refresh_token",
      accessToken: "access_token",
      accessTokenExpiresAt: "expires_at",
      idToken: "id_token",
    }
  },
  session: {
    fields: {
      expiresAt: "expires",
      token: "sessionToken"
    }
  },
});