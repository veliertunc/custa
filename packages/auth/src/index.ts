import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { and, eq } from "@acme/db";
import { db } from "@acme/db/client";
import { account, user } from "@acme/db/schema";

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  secret: string | undefined;
  socialProviders?: BetterAuthOptions["socialProviders"];
  extraPlugins?: TExtraPlugins;
}) {
  const apple = options.socialProviders?.apple;
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [expo(), ...(options.extraPlugins ?? [])],
    socialProviders: {
      ...options.socialProviders,
      apple: apple && {
        ...apple,
        async mapProfileToUser(profile) {
          if (profile.email) return {};

          // Apple may omit the email after the first authorization.
          const [owner] = await db
            .select({ email: user.email, name: user.name })
            .from(account)
            .innerJoin(user, eq(account.userId, user.id))
            .where(
              and(
                eq(account.providerId, "apple"),
                eq(account.accountId, profile.sub),
              ),
            )
            .limit(1);
          return owner ?? {};
        },
      },
    },
    advanced: apple
      ? {
          cookies: {
            state: { attributes: { sameSite: "none", secure: true } },
          },
        }
      : undefined,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
    },
    trustedOrigins: apple
      ? ["expo://", "https://appleid.apple.com"]
      : ["expo://"],
    onAPIError: {
      onError(error) {
        console.error("Better Auth API error", error);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
