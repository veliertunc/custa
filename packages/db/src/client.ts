import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

export const db = drizzle({
  client: new pg.Pool({ connectionString: process.env.POSTGRES_URL }),
  schema,
  casing: "snake_case",
});
