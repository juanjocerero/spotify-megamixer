import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { db } from "./lib/db";

const spotifyScopes = 'user-read-email playlist-read-private playlist-modify-public playlist-modify-private user-read-currently-playing';

if (!process.env.AUTH_SPOTIFY_ID || !process.env.AUTH_SPOTIFY_SECRET || !process.env.AUTH_URL) {
  throw new Error("Missing AUTH_SPOTIFY_ID, AUTH_SPOTIFY_SECRET, or AUTH_URL environment variables");
}

export const auth = betterAuth({
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
          redirectURI: `${process.env.AUTH_URL}/api/auth/oauth2/callback/spotify`,
          
          // Deshabilitamos la regla del linter para esta línea específica,
          // ya que la librería better-auth requiere esta firma de tipo exacta.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mapProfileToUser: (profile: Record<string, any>) => {
            return {
              id: profile.id,
              name: profile.display_name || profile.id,
              email: profile.email,
              image: profile.images?.[0]?.url,
            };
          },
        },
      ],
    }),
  ],
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