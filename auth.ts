import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./lib/db";

const spotifyScopes = 'user-read-email playlist-read-private playlist-modify-public playlist-modify-private user-read-currently-playing';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  socialProviders: {
    spotify: {
      clientId: process.env.AUTH_SPOTIFY_ID!,
      clientSecret: process.env.AUTH_SPOTIFY_SECRET!,
      scopes: [spotifyScopes],
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