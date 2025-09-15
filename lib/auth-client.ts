import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // The baseURL is not needed if the API is on the same domain.
});

export const { signIn, signOut, useSession } = authClient;
