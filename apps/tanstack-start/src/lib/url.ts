import { env } from "~/env";

export function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (env.PROJECT_PRODUCTION_URL) return env.PROJECT_PRODUCTION_URL;

  // eslint-disable-next-line no-restricted-properties
  return `http://localhost:${process.env.PORT ?? 3001}`;
}
