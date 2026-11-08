import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export function authEnv() {
  return createEnv({
    server: {
      PROJECT_PRODUCTION_URL: z
        .url({ protocol: /^https?$/ })
        .transform((value, ctx) => {
          const url = new URL(value);
          if (
            url.pathname !== "/" ||
            url.username ||
            url.password ||
            url.search ||
            url.hash
          ) {
            ctx.addIssue({
              code: "custom",
              message:
                "Use a full HTTP(S) origin without a path or credentials.",
            });
            return z.NEVER;
          }
          return url.origin;
        })
        .optional(),
      AUTH_SECRET:
        process.env.NODE_ENV === "production"
          ? z.string().min(32)
          : z.string().min(1).optional(),
      NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
