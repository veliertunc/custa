import "server-only";

import { isIP } from "node:net";
import { cache } from "react";
import { headers } from "next/headers";
import { nextCookies } from "better-auth/next-js";

import { initAuth } from "@acme/auth";

import { env } from "~/env";

function ownerProvider(clientId?: string, clientSecret?: string) {
  if (clientId && clientSecret)
    return { clientId, clientSecret, disableSignUp: true };
}

const baseUrl = env.PROJECT_PRODUCTION_URL ?? "http://localhost:3000";
const { protocol, hostname } = new URL(baseUrl);
const appleOrigin =
  protocol === "https:" && hostname.includes(".") && !isIP(hostname);
const socialProviders = {
  google: ownerProvider(
    env.AUTH_GOOGLE_CLIENT_ID,
    env.AUTH_GOOGLE_CLIENT_SECRET,
  ),
  apple: appleOrigin
    ? ownerProvider(env.AUTH_APPLE_CLIENT_ID, env.AUTH_APPLE_CLIENT_SECRET)
    : undefined,
  linkedin: ownerProvider(
    env.AUTH_LINKEDIN_CLIENT_ID,
    env.AUTH_LINKEDIN_CLIENT_SECRET,
  ),
};

export const signInProviders = (
  ["google", "apple", "linkedin"] as const
).filter((provider) => socialProviders[provider] !== undefined);

export const auth = initAuth({
  baseUrl,
  secret: env.AUTH_SECRET,
  socialProviders,
  extraPlugins: [nextCookies()],
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
